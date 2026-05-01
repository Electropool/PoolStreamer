'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const { isAdmin } = require('../../utils/permissionChecker');
const GuildSettings = require('../../database/models/GuildSettings');

// ── /247 ──────────────────────────────────────────────────────────────────────
module.exports.twentyFourSeven = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('🌙 Toggle 24/7 mode (bot stays in VC)')
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('Enable or disable')
        .setRequired(true)
        .addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })
    ),

  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** to toggle 24/7 mode.')], ephemeral: true });
    }

    const voiceChannel = interaction.member.voice?.channel;
    const action = interaction.options.getString('action');

    if (action === 'enable' && !voiceChannel) {
      return interaction.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first to enable 24/7 mode.')], ephemeral: true });
    }

    const settings = await GuildSettings.getOrCreate(interaction.guild.id);
    const enable = action === 'enable';

    settings.twentyFourSeven = enable;
    settings.twentyFourSevenChannel = enable ? voiceChannel?.id : null;
    await settings.save();

    if (enable) {
      client.twentyFourSeven.set(interaction.guild.id, true);

      // Join VC if not already in one
      let player = client.manager.players.get(interaction.guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: interaction.guild.id,
          textChannelId: interaction.channel.id,
          voiceChannelId: voiceChannel.id,
          deaf: true,
          shardId: interaction.guild.shardId ?? 0,
          volume: settings.defaultVolume,
        });
      }

      return interaction.reply({ embeds: [successEmbed('24/7 Enabled', `🌙 Bot will now stay in **${voiceChannel.name}** 24/7.`)] });
    } else {
      client.twentyFourSeven.delete(interaction.guild.id);
      return interaction.reply({ embeds: [successEmbed('24/7 Disabled', '24/7 mode has been turned off.')] });
    }
  },
};

// ── /autoplay ─────────────────────────────────────────────────────────────────
module.exports.autoplay = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('♾️ Toggle autoplay when queue ends')
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('Enable or disable')
        .setRequired(true)
        .addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })
    ),

  async execute(client, interaction) {
    const action = interaction.options.getString('action');
    const enable = action === 'enable';

    const settings = await GuildSettings.getOrCreate(interaction.guild.id);
    settings.autoplay = enable;
    await settings.save();

    return interaction.reply({
      embeds: [successEmbed('Autoplay Updated', `♾️ Autoplay is now **${enable ? 'enabled' : 'disabled'}**`)],
    });
  },
};
