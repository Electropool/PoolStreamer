'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../database/models/GuildSettings');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚙️ Interactive setup for the music bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('admin_role').setDescription('Role that can manage the bot').setRequired(true))
    .addRoleOption(opt => opt.setName('whitelist_role').setDescription('Role that can control playback (skip, pause)').setRequired(true))
    .addChannelOption(opt => opt.setName('category').setDescription('Category to create the music channel in').addChannelTypes(ChannelType.GuildCategory).setRequired(true)),

  async execute(client, interaction) {
    await interaction.deferReply();

    const adminRole = interaction.options.getRole('admin_role');
    const whitelistRole = interaction.options.getRole('whitelist_role');
    const category = interaction.options.getChannel('category');
    const guild = interaction.guild;

    try {
      // 1. Create Music Channel
      const musicChannel = await guild.channels.create({
        name: '🎵-pool-requests',
        type: ChannelType.GuildText,
        parent: category.id,
        topic: 'Send links here to play music automatically! No commands needed.',
        permissionOverwrites: [
          {
            id: guild.id, // Everyone
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: whitelistRole.id,
            allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
          }
        ]
      });

      // 2. Save to DB
      const settings = await GuildSettings.getOrCreate(guild.id);
      settings.adminRole = adminRole.id;
      settings.whitelistedRoles = [whitelistRole.id];
      settings.musicChannelId = musicChannel.id;
      await settings.save();

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('✅ Setup Complete')
        .setDescription(`PoolStreamer has been configured for **${guild.name}**.`)
        .addFields(
          { name: 'Admin Role', value: `${adminRole}`, inline: true },
          { name: 'Whitelisted Role', value: `${whitelistRole}`, inline: true },
          { name: 'Music Channel', value: `${musicChannel}`, inline: true }
        )
        .setFooter({ text: 'You can now send YouTube/Spotify links in the music channel!' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`Setup error in ${guild.id}: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Setup Failed', 'An error occurred while creating channels or saving settings.')] });
    }
  },
};
