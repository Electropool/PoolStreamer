'use strict';

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { Kazagumo, Plugins } = require('kazagumo');
const { Connectors } = require('shoukaku');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');

const logger = require('./utils/logger');
const config = require('../config.json');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { loadMusicEvents } = require('./handlers/musicEventHandler');

// ── Discord Client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
  rest: { timeout: 15000 },
});

// ── Client Collections ────────────────────────────────────────────────────────
client.commands    = new Collection();
client.cooldowns   = new Collection();
client.spamMap     = new Collection();
client.twentyFourSeven = new Collection(); // guildId → boolean
client.nowPlayingMessages = new Collection(); // guildId → Message

// ── Lavalink / Kazagumo Setup ─────────────────────────────────────────────────
const lavalinkNodes = [
  {
    name: 'PoolStreamer-Node-1',
    url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
    auth: process.env.LAVALINK_PASSWORD,
    secure: process.env.LAVALINK_SECURE === 'true',
  },
];

client.manager = new Kazagumo(
  {
    defaultSearchEngine: 'youtube',
    plugins: [new Plugins.PlayerMoved(client)],
  },
  new Connectors.DiscordJS(client),
  lavalinkNodes,
  {
    clientName: config.lavalink.clientName,
    reconnectTries: config.lavalink.reconnectTries,
    reconnectTimeout: config.lavalink.reconnectTimeout,
    resumeByLibrary: config.lavalink.resumeByLibrary,
    voiceConnectionTimeout: 45,
  }
);

// ── MongoDB ───────────────────────────────────────────────────────────────────
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ MongoDB connected successfully');
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected');
});

// ── Health Check Server ───────────────────────────────────────────────────────
function startHealthServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'online',
      bot: client.user?.tag ?? 'connecting',
      guilds: client.guilds.cache.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (req, res) => {
    res.json({ name: 'PoolStreamer', version: config.bot.version, status: 'running' });
  });

  app.listen(PORT, () => {
    logger.info(`🌐 Health server running on port ${PORT}`);
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  logger.info('🚀 Starting PoolStreamer...');

  await connectDatabase();

  loadCommands(client);
  loadEvents(client);
  loadMusicEvents(client);

  startHealthServer();
  
  // Login
  await client.login(process.env.DISCORD_TOKEN);

  // Post-login initialization
  client.once('ready', async () => {
    // Note: Initialization logic is handled in events/ready.js
    // We just start the watchdog here or in ready.js
    startWatchdog(client);
  });
}

/**
 * Periodically checks for stuck players or ghost connections
 */
function startWatchdog(client) {
  setInterval(() => {
    client.manager.players.forEach(async (player) => {
      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) return;

      // 1. Check if bot is alone in VC (unless 24/7)
      const voiceChannel = guild.channels.cache.get(player.voiceChannelId);
      if (voiceChannel && voiceChannel.members.filter(m => !m.user.bot).size === 0) {
        const is247 = client.twentyFourSeven.get(player.guildId);
        if (!is247) {
          logger.info(`🧹 Watchdog: No users in VC for ${guild.name}. Destroying player.`);
          player.destroy();
        }
      }

      // 2. Check for stuck playback (position not moving while playing)
      if (player.playing && !player.paused) {
        const lastPos = player.lastPosition || 0;
        if (player.position === lastPos && player.position > 0) {
          player.stuckCount = (player.stuckCount || 0) + 1;
          if (player.stuckCount >= 3) { // 3 cycles (e.g., 90s)
            logger.warn(`⚠️ Watchdog: Player stuck in ${guild.name}. Attempting skip...`);
            player.skip();
            player.stuckCount = 0;
          }
        } else {
          player.stuckCount = 0;
        }
        player.lastPosition = player.position;
      }
    });
  }, 30000); // Every 30 seconds
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down PoolStreamer (SIGINT)...');
  await cleanup();
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down PoolStreamer (SIGTERM)...');
  await cleanup();
});

async function cleanup() {
  try {
    // Optional: Save state if needed
    await mongoose.disconnect();
    client.destroy();
    logger.info('👋 Shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during cleanup: ${err.message}`);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}\nReason: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}\n${err.stack}`);
  // In production, we might want to let PM2 restart it
  process.exit(1);
});

bootstrap();
