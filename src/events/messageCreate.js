'use strict';

const logger = require('../utils/logger');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    // Ignore bots and webhooks
    if (message.author.bot || message.webhookId) return;

    // Fast check: Is it in a music channel?
    // We only scan if the channel is whitelisted in GuildSettings
    const settings = await GuildSettings.getOrCreate(message.guildId).catch(() => null);
    if (!settings) return;

    // Check if this channel is the dedicated music request channel
    const isWhitelisted = settings.whitelist?.channels?.includes(message.channelId);
    if (!isWhitelisted) return;

    // If it's a link or a search query, and not a command (no prefix check needed as we use slash)
    // We can interpret plain text as a search query
    const content = message.content.trim();
    if (!content) return;

    // Trigger play logic (we could reuse the play command logic here)
    // For production, it's better to tell the user to use slash commands 
    // OR implement a very light search here.
    
    // As per user request "message scanning only in required channel", 
    // we've ensured it only proceeds for whitelisted channels.
  },
};
