'use strict';

const logger = require('../utils/logger');
const GuildSettings = require('../database/models/GuildSettings');

// ── guildCreate ───────────────────────────────────────────────────────────────
module.exports = [
  {
    name: 'guildCreate',
    async execute(client, guild) {
      logger.info(`📥 Joined guild: ${guild.name} (${guild.id}) — Members: ${guild.memberCount}`);
      // Pre-create settings
      await GuildSettings.getOrCreate(guild.id).catch((err) =>
        logger.error(`guildCreate DB error: ${err.message}`)
      );
    },
  },
  {
    name: 'guildDelete',
    async execute(client, guild) {
      logger.info(`📤 Left guild: ${guild.name} (${guild.id})`);
      // Clean up player if exists
      const player = client.manager.players.get(guild.id);
      if (player) player.destroy();
    },
  },
];
