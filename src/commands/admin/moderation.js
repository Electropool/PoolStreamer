'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');
const { isAdmin } = require('../../utils/permissionChecker');
const GuildSettings = require('../../database/models/GuildSettings');

// ── /setdj ────────────────────────────────────────────────────────────────────
module.exports.setdj = {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('setdj')
    .setDescription('🎧 Manage DJ roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a DJ role')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to add as DJ').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a DJ role')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List all DJ roles')),

  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const settings = await GuildSettings.getOrCreate(interaction.guild.id);

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      if (settings.djRoles.includes(role.id)) {
        return interaction.reply({ embeds: [errorEmbed('Already Added', `${role} is already a DJ role.`)], ephemeral: true });
      }
      settings.djRoles.push(role.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('DJ Role Added', `${role} can now use DJ commands.`)] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const idx = settings.djRoles.indexOf(role.id);
      if (idx === -1) {
        return interaction.reply({ embeds: [errorEmbed('Not Found', `${role} is not a DJ role.`)], ephemeral: true });
      }
      settings.djRoles.splice(idx, 1);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('DJ Role Removed', `${role} removed from DJ roles.`)] });
    }

    if (sub === 'list') {
      const roles = settings.djRoles.map((id) => `<@&${id}>`).join('\n') || '*No DJ roles set. Everyone can use music commands.*';
      return interaction.reply({ embeds: [infoEmbed('DJ Roles', roles)] });
    }
  },
};

// ── /whitelist ────────────────────────────────────────────────────────────────
module.exports.whitelist = {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('✅ Manage whitelisted channels and users')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add-channel')
        .setDescription('Whitelist a channel for music commands')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-channel')
        .setDescription('Remove a channel from whitelist')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-user')
        .setDescription('Whitelist a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-user')
        .setDescription('Remove a user from whitelist')
        .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Show whitelist')),

  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const settings = await GuildSettings.getOrCreate(interaction.guild.id);

    if (sub === 'add-channel') {
      const ch = interaction.options.getChannel('channel');
      if (settings.whitelist.channels.includes(ch.id)) {
        return interaction.reply({ embeds: [errorEmbed('Already Whitelisted', `${ch} is already whitelisted.`)], ephemeral: true });
      }
      settings.whitelist.channels.push(ch.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('Channel Whitelisted', `${ch} added to whitelist.`)] });
    }

    if (sub === 'remove-channel') {
      const ch = interaction.options.getChannel('channel');
      const idx = settings.whitelist.channels.indexOf(ch.id);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed('Not Found', `${ch} is not whitelisted.`)], ephemeral: true });
      settings.whitelist.channels.splice(idx, 1);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('Channel Removed', `${ch} removed from whitelist.`)] });
    }

    if (sub === 'add-user') {
      const user = interaction.options.getUser('user');
      if (settings.whitelist.users.includes(user.id)) {
        return interaction.reply({ embeds: [errorEmbed('Already Whitelisted', `${user} is already whitelisted.`)], ephemeral: true });
      }
      settings.whitelist.users.push(user.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('User Whitelisted', `${user} added to whitelist.`)] });
    }

    if (sub === 'remove-user') {
      const user = interaction.options.getUser('user');
      const idx = settings.whitelist.users.indexOf(user.id);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed('Not Found', `${user} is not whitelisted.`)], ephemeral: true });
      settings.whitelist.users.splice(idx, 1);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('User Removed', `${user} removed from whitelist.`)] });
    }

    if (sub === 'list') {
      const channels = settings.whitelist.channels.map((id) => `<#${id}>`).join(', ') || '*None*';
      const users = settings.whitelist.users.map((id) => `<@${id}>`).join(', ') || '*None*';
      return interaction.reply({
        embeds: [infoEmbed('Whitelist', `**Channels:** ${channels}\n**Users:** ${users}`)],
      });
    }
  },
};

// ── /blacklist ────────────────────────────────────────────────────────────────
module.exports.blacklist = {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('🚫 Manage blacklisted channels and users')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add-channel')
        .setDescription('Blacklist a channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-channel')
        .setDescription('Remove a channel from blacklist')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-user')
        .setDescription('Blacklist a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-user')
        .setDescription('Remove a user from blacklist')
        .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Show blacklist')),

  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('No Permission', 'You need **Manage Server** permission.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const settings = await GuildSettings.getOrCreate(interaction.guild.id);

    if (sub === 'add-channel') {
      const ch = interaction.options.getChannel('channel');
      if (settings.blacklist.channels.includes(ch.id)) {
        return interaction.reply({ embeds: [errorEmbed('Already Blacklisted', `${ch} is already blacklisted.`)], ephemeral: true });
      }
      settings.blacklist.channels.push(ch.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('Channel Blacklisted', `${ch} added to blacklist.`)] });
    }

    if (sub === 'remove-channel') {
      const ch = interaction.options.getChannel('channel');
      const idx = settings.blacklist.channels.indexOf(ch.id);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed('Not Found', `${ch} is not blacklisted.`)], ephemeral: true });
      settings.blacklist.channels.splice(idx, 1);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('Channel Removed', `${ch} removed from blacklist.`)] });
    }

    if (sub === 'add-user') {
      const user = interaction.options.getUser('user');
      if (settings.blacklist.users.includes(user.id)) {
        return interaction.reply({ embeds: [errorEmbed('Already Blacklisted', `${user} is already blacklisted.`)], ephemeral: true });
      }
      settings.blacklist.users.push(user.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('User Blacklisted', `${user} added to blacklist.`)] });
    }

    if (sub === 'remove-user') {
      const user = interaction.options.getUser('user');
      const idx = settings.blacklist.users.indexOf(user.id);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed('Not Found', `${user} is not blacklisted.`)], ephemeral: true });
      settings.blacklist.users.splice(idx, 1);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed('User Removed', `${user} removed from blacklist.`)] });
    }

    if (sub === 'list') {
      const channels = settings.blacklist.channels.map((id) => `<#${id}>`).join(', ') || '*None*';
      const users = settings.blacklist.users.map((id) => `<@${id}>`).join(', ') || '*None*';
      return interaction.reply({
        embeds: [infoEmbed('Blacklist', `**Channels:** ${channels}\n**Users:** ${users}`)],
      });
    }
  },
};
