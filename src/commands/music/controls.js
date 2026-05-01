'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embedBuilder');
const { canDJ, isInSameVoiceChannel } = require('../../utils/permissionChecker');

// ── Helper: get player or reply with error ────────────────────────────────────
async function getPlayer(client, interaction) {
  const player = client.manager.players.get(interaction.guild.id);
  if (!player || !player.queue.current) {
    await interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'No music is currently playing.')], ephemeral: true });
    return null;
  }
  if (!isInSameVoiceChannel(interaction.member, interaction.guild)) {
    await interaction.reply({ embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel as the bot.')], ephemeral: true });
    return null;
  }
  return player;
}

// ── /skip ─────────────────────────────────────────────────────────────────────
module.exports.skip = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('⏭️ Skip the current track')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Number of tracks to skip').setMinValue(1).setMaxValue(50)
    ),
  async execute(client, interaction) {
    const player = await getPlayer(client, interaction);
    if (!player) return;

    const amount = interaction.options.getInteger('amount') ?? 1;
    const title = player.queue.current?.title;

    if (amount > 1) {
      // Remove (amount-1) from front of queue before skipping current
      player.queue.splice(0, amount - 1);
    }

    player.skip();

    return interaction.reply({ embeds: [successEmbed('Skipped', `Skipped **${amount}** track(s). Was playing: **${title}**`)] });
  },
};

// ── /pause ────────────────────────────────────────────────────────────────────
module.exports.pause = {
  category: 'music',
  data: new SlashCommandBuilder().setName('pause').setDescription('⏸️ Pause the current track'),
  async execute(client, interaction) {
    const player = await getPlayer(client, interaction);
    if (!player) return;

    if (player.paused) {
      return interaction.reply({ embeds: [errorEmbed('Already Paused', 'The player is already paused.')] });
    }

    player.pause(true);
    return interaction.reply({ embeds: [successEmbed('Paused', 'Music paused. Use `/resume` to continue.')] });
  },
};

// ── /resume ───────────────────────────────────────────────────────────────────
module.exports.resume = {
  category: 'music',
  data: new SlashCommandBuilder().setName('resume').setDescription('▶️ Resume paused music'),
  async execute(client, interaction) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'No music player found.')], ephemeral: true });
    }
    if (!player.paused) {
      return interaction.reply({ embeds: [errorEmbed('Not Paused', 'The player is not paused.')], ephemeral: true });
    }

    player.resume();
    return interaction.reply({ embeds: [successEmbed('Resumed', `Now playing: **${player.queue.current?.title}**`)] });
  },
};

// ── /stop ─────────────────────────────────────────────────────────────────────
module.exports.stop = {
  category: 'music',
  data: new SlashCommandBuilder().setName('stop').setDescription('⏹️ Stop music and clear the queue'),
  async execute(client, interaction) {
    const player = await getPlayer(client, interaction);
    if (!player) return;

    player.queue.clear();
    player.setLoop('off');
    player.skip();

    return interaction.reply({ embeds: [successEmbed('Stopped', 'Music stopped and queue cleared.')] });
  },
};

// ── /leave ────────────────────────────────────────────────────────────────────
module.exports.leave = {
  category: 'music',
  data: new SlashCommandBuilder().setName('leave').setDescription('❌ Disconnect from voice channel'),
  async execute(client, interaction) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({ embeds: [errorEmbed('Not Connected', 'I am not in a voice channel.')], ephemeral: true });
    }
    if (!isInSameVoiceChannel(interaction.member, interaction.guild)) {
      return interaction.reply({ embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel.')], ephemeral: true });
    }

    // Disable 24/7 if active
    client.twentyFourSeven.delete(interaction.guild.id);
    const GuildSettings = require('../../database/models/GuildSettings');
    await GuildSettings.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { twentyFourSeven: false }
    ).catch(() => {});

    player.destroy();
    return interaction.reply({ embeds: [successEmbed('Left', 'Disconnected from voice channel.')] });
  },
};
