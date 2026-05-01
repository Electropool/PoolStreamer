'use strict';

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../../config.json');

const activities = [
  { name: '/play • PoolStreamer', type: ActivityType.Listening },
  { name: 'Music for everyone 🎵', type: ActivityType.Playing },
  { name: 'your requests • /help', type: ActivityType.Listening },
];

let activityIndex = 0;

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`✅ Logged in as ${client.user.tag}`);
    logger.info(`📡 Serving ${client.guilds.cache.size} guild(s): ${client.guilds.cache.map(g => g.id).join(', ')}`);
    logger.info(`🎵 PoolStreamer v${config.bot.version} is online`);

    // Restore 24/7 players from DB on startup
    restorePlayers(client);

    // Rotating presence
    setActivity(client);
    setInterval(() => setActivity(client), 30_000);
  },
};

function setActivity(client) {
  const activity = activities[activityIndex % activities.length];
  client.user.setPresence({
    status: 'online',
    activities: [activity],
  });
  activityIndex++;
}

async function restorePlayers(client) {
  const GuildSettings = require('../database/models/GuildSettings');
  try {
    const guildsWith247 = await GuildSettings.find({ twentyFourSeven: true });
    if (guildsWith247.length === 0) return;

    logger.info(`🌙 Restoring 24/7 mode for ${guildsWith247.length} guild(s)...`);

    for (const settings of guildsWith247) {
      const guild = client.guilds.cache.get(settings.guildId);
      if (!guild) continue;

      client.twentyFourSeven.set(guild.id, true);

      const voiceChannelId = settings.twentyFourSevenChannel;
      if (!voiceChannelId) continue;

      const voiceChannel = guild.channels.cache.get(voiceChannelId);
      if (!voiceChannel || !voiceChannel.viewable) continue;

      // Create player if not exists
      let player = client.manager.players.get(guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: guild.id,
          textChannelId: settings.whitelist?.channels?.[0] || voiceChannelId,
          voiceChannelId: voiceChannelId,
          shardId: guild.shardId ?? 0,
          volume: settings.defaultVolume || 80,
        });
        logger.info(`🔋 [Restore] Player created for ${guild.name}`);
      }
    }
  } catch (err) {
    logger.error(`❌ Failed to restore 24/7 players: ${err.message}`);
  }
}
