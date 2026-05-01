'use strict';

const logger = require('../utils/logger');
const { buildNowPlayingEmbed, buildMusicButtons, errorEmbed } = require('../utils/embedBuilder');
const GuildSettings = require('../database/models/GuildSettings');

function loadMusicEvents(client) {
  const manager = client.manager;

  // ── Node Events ────────────────────────────────────────────────────────────
  manager.shoukaku.on('ready', (name) => {
    logger.info(`✅ [Lavalink] Node "${name}" connected and ready.`);
  });

  manager.shoukaku.on('error', (name, error) => {
    logger.error(`❌ [Lavalink] Node "${name}" error: ${error.message}`);
  });

  manager.shoukaku.on('close', (name, code, reason) => {
    logger.warn(`⚠️ [Lavalink] Node "${name}" connection closed [Code: ${code}]. Reason: ${reason || 'None'}`);
  });

  manager.shoukaku.on('disconnect', (name, moved) => {
    logger.warn(`⚠️ [Lavalink] Node "${name}" disconnected. Moved: ${moved}`);
  });

  manager.shoukaku.on('reconnecting', (name) => {
    logger.info(`🔄 Lavalink node "${name}" reconnecting...`);
  });

  // ── Player Events ──────────────────────────────────────────────────────────

  manager.on('playerStart', async (player, track) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const settings = await GuildSettings.getOrCreate(player.guildId).catch(() => null);
    if (settings && !settings.announceNowPlaying) return;

    const channel = guild.channels.cache.get(player.textChannelId);
    if (!channel) return;

    const embed = buildNowPlayingEmbed(player, track);
    const buttons = buildMusicButtons(player);

    try {
      // Delete previous now-playing message
      const prevMsg = client.nowPlayingMessages.get(player.guildId);
      if (prevMsg) {
        await prevMsg.delete().catch(() => {});
        client.nowPlayingMessages.delete(player.guildId);
      }

      const msg = await channel.send({ embeds: [embed], components: buttons });
      client.nowPlayingMessages.set(player.guildId, msg);
    } catch (err) {
      logger.error(`playerStart send error [${player.guildId}]: ${err.message}`);
    }
  });

  manager.on('playerEnd', async (player) => {
    // Check autoplay
    const settings = await GuildSettings.getOrCreate(player.guildId).catch(() => null);
    if (!settings?.autoplay) return;
    if (player.queue.length > 0) return; // Queue has more tracks

    const current = player.queue.current;
    if (!current) return;

    try {
      const result = await manager.search(`${current.title} ${current.author} mix`, {
        engine: 'youtube',
      });

      if (!result?.tracks?.length) return;

      // Pick a track that's not the current one
      const next = result.tracks.find((t) => t.uri !== current.uri);
      if (!next) return;

      next.requester = { id: client.user.id, tag: client.user.tag };
      player.queue.add(next);
    } catch (err) {
      logger.error(`Autoplay error [${player.guildId}]: ${err.message}`);
    }
  });

  manager.on('playerEmpty', async (player) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    // Clear now-playing message
    const prevMsg = client.nowPlayingMessages.get(player.guildId);
    if (prevMsg) {
      await prevMsg.delete().catch(() => {});
      client.nowPlayingMessages.delete(player.guildId);
    }

    // Check 24/7 mode
    const is247 = client.twentyFourSeven.get(player.guildId);
    if (is247) {
      // Stay in VC but do nothing
      return;
    }

    // Leave VC after cooldown
    const cooldown = 30_000;
    setTimeout(() => {
      const p = manager.players.get(player.guildId);
      if (p && !p.queue.current && p.queue.length === 0) {
        p.destroy();
        const channel = guild.channels.cache.get(p.textChannelId);
        if (channel) {
          channel
            .send({ embeds: [errorEmbed('Queue ended.', 'Left the voice channel. Use /play to resume.')] })
            .catch(() => {});
        }
      }
    }, cooldown);
  });

  manager.on('playerDestroy', (player) => {
    client.nowPlayingMessages.delete(player.guildId);
    logger.debug(`Player destroyed for guild ${player.guildId}`);
  });

  manager.on('playerException', (player, track, error) => {
    logger.error(`Player exception [${player.guildId}] on "${track?.title}": ${error?.message}`);
    const guild = client.guilds.cache.get(player.guildId);
    const channel = guild?.channels.cache.get(player.textChannelId);
    if (channel) {
      channel
        .send({ embeds: [errorEmbed('Playback Error', `Could not play: **${track?.title}**\n\`${error?.message}\``)] })
        .catch(() => {});
    }
  });

  manager.on('playerStuck', (player, track) => {
    logger.warn(`Player stuck [${player.guildId}] on "${track?.title}". Skipping...`);
    player.skip();
  });

  logger.info('✅ Loaded music events');
}

module.exports = { loadMusicEvents };
