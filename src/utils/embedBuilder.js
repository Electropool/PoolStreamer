'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

const { color, emoji, progressBar: pbConfig } = config.bot;

/**
 * Build a music "Now Playing" embed.
 */
function buildNowPlayingEmbed(player, track) {
  const position = player.position || 0;
  const duration = track.length || 0;
  const progress = buildProgressBar(position, duration);
  const loopIcon = player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '➡️';

  const embed = new EmbedBuilder()
    .setColor(color.music)
    .setAuthor({ name: '🎵 Now Playing — PoolStreamer' })
    .setTitle(truncate(track.title, 256))
    .setURL(track.uri)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
      { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
      { name: `${loopIcon} Loop`, value: capitalize(player.loop || 'off'), inline: true },
      { name: `🔊 Volume`, value: `${player.volume}%`, inline: true },
      { name: `${emoji.queue} Queue`, value: `${player.queue.length} track(s)`, inline: true },
      {
        name: '👤 Requested By',
        value: track.requester ? `<@${track.requester.id}>` : 'Unknown',
        inline: true,
      },
      { name: `\u200B`, value: progress, inline: false }
    )
    .setFooter({ text: `PoolStreamer Music • Source: ${track.sourceName || 'Unknown'}` })
    .setTimestamp();

  return embed;
}

/**
 * Build a queue embed (paginated).
 */
function buildQueueEmbed(player, page = 1) {
  const TRACKS_PER_PAGE = 10;
  const queue = player.queue;
  const totalPages = Math.ceil(queue.length / TRACKS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * TRACKS_PER_PAGE;
  const end = start + TRACKS_PER_PAGE;

  const currentTrack = player.queue.current;
  const tracks = [...queue].slice(start, end);

  const totalDuration = [...queue].reduce((acc, t) => acc + (t.length || 0), 0);

  const description = tracks.length
    ? tracks
        .map((t, i) => {
          const pos = start + i + 1;
          return `\`${String(pos).padStart(2, '0')}.\` [${truncate(t.title, 45)}](${t.uri}) — ${formatDuration(t.length)} | <@${t.requester?.id ?? 'Unknown'}>`;
        })
        .join('\n')
    : '*Queue is empty.*';

  return new EmbedBuilder()
    .setColor(color.music)
    .setAuthor({ name: '📃 Queue — PoolStreamer' })
    .setTitle(
      currentTrack ? `▶️ Now: ${truncate(currentTrack.title, 50)}` : 'Nothing playing'
    )
    .setDescription(description)
    .addFields(
      { name: 'Total Tracks', value: `${queue.length}`, inline: true },
      { name: 'Total Duration', value: formatDuration(totalDuration), inline: true },
      { name: 'Loop Mode', value: capitalize(player.loop || 'off'), inline: true }
    )
    .setFooter({ text: `Page ${safePage}/${totalPages} • Use /queue to navigate` })
    .setTimestamp();
}

/**
 * Build the music control buttons row.
 */
function buildMusicButtons(player) {
  const isPaused = player.paused;
  const isLoopTrack = player.loop === 'track';
  const isLoopQueue = player.loop === 'queue';

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_playpause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji('🔁')
      .setLabel(isLoopTrack ? 'Loop: Track' : isLoopQueue ? 'Loop: Queue' : 'Loop: Off')
      .setStyle(isLoopTrack || isLoopQueue ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_like')
      .setEmoji('❤️')
      .setLabel('Like')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_dislike')
      .setEmoji('👎')
      .setLabel('Dislike')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setEmoji('📃')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_leave')
      .setEmoji('❌')
      .setLabel('Leave')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

/**
 * Build a simple success embed.
 */
function successEmbed(message, description) {
  return new EmbedBuilder()
    .setColor(color.success)
    .setDescription(`${emoji.success} **${message}**${description ? `\n${description}` : ''}`)
    .setTimestamp();
}

/**
 * Build a simple error embed.
 */
function errorEmbed(message, description) {
  return new EmbedBuilder()
    .setColor(color.error)
    .setDescription(`${emoji.error} **${message}**${description ? `\n${description}` : ''}`)
    .setTimestamp();
}

/**
 * Build a simple info embed.
 */
function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(color.info)
    .setTitle(title)
    .setDescription(description || '\u200B')
    .setTimestamp();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildProgressBar(position, duration) {
  if (!duration || duration === Infinity) return '`[──────────────────────]` `0:00 / 0:00`';
  
  const barLength = 18;
  const filledCount = Math.round((position / duration) * barLength);
  
  // Create a more "premium" looking bar
  const filledPart = '━'.repeat(Math.max(0, filledCount));
  const emptyPart = '─'.repeat(Math.max(0, barLength - filledCount));
  const thumb = '🔘'; // Or 🟢/🔵

  const bar = `${filledPart}${thumb}${emptyPart}`;
  return `\`${bar}\` \`${formatDuration(position)} / ${formatDuration(duration)}\``;
}

function formatDuration(ms) {
  if (!ms || ms === Infinity) return '∞';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function truncate(str, max) {
  if (!str) return 'Unknown';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function capitalize(str) {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  buildNowPlayingEmbed,
  buildQueueEmbed,
  buildMusicButtons,
  successEmbed,
  errorEmbed,
  infoEmbed,
  formatDuration,
  truncate,
  capitalize,
};
