'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed, buildQueueEmbed } = require('../../utils/embedBuilder');
const { isInSameVoiceChannel } = require('../../utils/permissionChecker');

// ── Helper ─────────────────────────────────────────────────────────────────────
async function requirePlayer(client, interaction) {
  const player = client.manager.players.get(interaction.guild.id);
  if (!player || !player.queue.current) {
    await interaction.reply({ embeds: [errorEmbed('Nothing Playing', 'No music is currently playing.')], ephemeral: true });
    return null;
  }
  return player;
}

// ── /queue ─────────────────────────────────────────────────────────────────────
module.exports.queue = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('📃 Show the current queue')
    .addIntegerOption((opt) =>
      opt.setName('page').setDescription('Page number').setMinValue(1)
    ),
  async execute(client, interaction) {
    const player = await requirePlayer(client, interaction);
    if (!player) return;

    const page = interaction.options.getInteger('page') ?? 1;
    const embed = buildQueueEmbed(player, page);
    return interaction.reply({ embeds: [embed] });
  },
};

// ── /loop ──────────────────────────────────────────────────────────────────────
module.exports.loop = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('🔁 Set loop mode')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
    ),
  async execute(client, interaction) {
    const player = await requirePlayer(client, interaction);
    if (!player) return;

    if (!isInSameVoiceChannel(interaction.member, interaction.guild)) {
      return interaction.reply({ embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel.')], ephemeral: true });
    }

    const mode = interaction.options.getString('mode');
    player.setLoop(mode);

    const icons = { off: '➡️', track: '🔂', queue: '🔁' };
    return interaction.reply({ embeds: [successEmbed('Loop Updated', `${icons[mode]} Loop mode set to **${mode}**`)] });
  },
};

// ── /volume ────────────────────────────────────────────────────────────────────
module.exports.volume = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('🔊 Set the playback volume')
    .addIntegerOption((opt) =>
      opt
        .setName('level')
        .setDescription('Volume level (0–150)')
        .setMinValue(0)
        .setMaxValue(150)
        .setRequired(true)
    ),
  async execute(client, interaction) {
    const player = await requirePlayer(client, interaction);
    if (!player) return;

    if (!isInSameVoiceChannel(interaction.member, interaction.guild)) {
      return interaction.reply({ embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel.')], ephemeral: true });
    }

    const level = interaction.options.getInteger('level');
    player.setVolume(level);

    const GuildSettings = require('../../database/models/GuildSettings');
    await GuildSettings.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { defaultVolume: level }
    ).catch(() => {});

    const bar = '█'.repeat(Math.round(level / 10)) + '░'.repeat(15 - Math.round(level / 10));
    return interaction.reply({ embeds: [successEmbed('Volume Updated', `🔊 \`[${bar}]\` **${level}%**`)] });
  },
};

// ── /seek ──────────────────────────────────────────────────────────────────────
module.exports.seek = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('⏩ Seek to a position in the current track')
    .addStringOption((opt) =>
      opt
        .setName('position')
        .setDescription('Position (e.g. 1:30 or 90 for seconds)')
        .setRequired(true)
    ),
  async execute(client, interaction) {
    const player = await requirePlayer(client, interaction);
    if (!player) return;

    if (!isInSameVoiceChannel(interaction.member, interaction.guild)) {
      return interaction.reply({ embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel.')], ephemeral: true });
    }

    const posStr = interaction.options.getString('position');
    const ms = parsePosition(posStr);

    if (ms === null) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Position', 'Use format like `1:30` or `90`')] });
    }

    const duration = player.queue.current?.length || 0;
    if (ms > duration) {
      return interaction.reply({ embeds: [errorEmbed('Out of Range', `Track is only **${formatDuration(duration)}** long.`)] });
    }

    player.seek(ms);

    const { formatDuration } = require('../../utils/embedBuilder');
    return interaction.reply({ embeds: [successEmbed('Seeked', `Jumped to **${formatDuration(ms)}**`)] });
  },
};

// ── /nowplaying ────────────────────────────────────────────────────────────────
module.exports.nowplaying = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('🎵 Show what\'s currently playing'),
  async execute(client, interaction) {
    const player = await requirePlayer(client, interaction);
    if (!player) return;

    const { buildNowPlayingEmbed, buildMusicButtons } = require('../../utils/embedBuilder');
    const track = player.queue.current;
    return interaction.reply({
      embeds: [buildNowPlayingEmbed(player, track)],
      components: buildMusicButtons(player),
    });
  },
};

// ── /shuffle ───────────────────────────────────────────────────────────────────
module.exports.shuffle = {
  category: 'music',
  data: new SlashCommandBuilder().setName('shuffle').setDescription('🔀 Shuffle the queue'),
  async execute(client, interaction) {
    const player = await requirePlayer(client, interaction);
    if (!player) return;

    if (player.queue.length < 2) {
      return interaction.reply({ embeds: [errorEmbed('Queue Too Short', 'Need at least 2 tracks in queue to shuffle.')] });
    }

    if (!isInSameVoiceChannel(interaction.member, interaction.guild)) {
      return interaction.reply({ embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel.')], ephemeral: true });
    }

    player.queue.shuffle();
    return interaction.reply({ embeds: [successEmbed('Queue Shuffled', `🔀 Shuffled **${player.queue.length}** tracks`)] });
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function parsePosition(str) {
  if (/^\d+$/.test(str)) return parseInt(str, 10) * 1000;
  const match = str.match(/^(\d+):(\d{1,2})$/);
  if (match) return (parseInt(match[1], 10) * 60 + parseInt(match[2], 10)) * 1000;
  return null;
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
