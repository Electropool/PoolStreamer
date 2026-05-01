'use strict';

const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/embedBuilder');
const { checkCooldown, isSpamming } = require('../utils/antiSpam');
const { checkMusicPermission } = require('../utils/permissionChecker');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    // ── Slash Commands ─────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(client, interaction);
      return;
    }

    // ── Button Interactions ────────────────────────────────────────────────
    if (interaction.isButton()) {
      await handleButton(client, interaction);
      return;
    }
  },
};

// ── Slash Command Handler ──────────────────────────────────────────────────────
async function handleSlashCommand(client, interaction) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Anti-spam check
  if (isSpamming(client, interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed('Slow down!', 'You are sending commands too fast.')],
      ephemeral: true,
    }).catch(() => {});
  }

  // Cooldown check
  const remaining = checkCooldown(client, interaction.user.id, interaction.commandName);
  if (remaining > 0) {
    return interaction.reply({
      embeds: [errorEmbed('Cooldown', `Please wait **${(remaining / 1000).toFixed(1)}s** before using this command again.`)],
      ephemeral: true,
    }).catch(() => {});
  }

  // Music permission check (only for music commands)
  if (command.category === 'music') {
    const { allowed, reason } = await checkMusicPermission(interaction);
    if (!allowed) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', reason)],
        ephemeral: true,
      }).catch(() => {});
    }
  }

  try {
    await command.execute(client, interaction);
  } catch (err) {
    logger.error(`Command ${interaction.commandName} error: ${err.message}\n${err.stack}`);

    const errEmbed = errorEmbed('An error occurred', 'Something went wrong. Please try again.');
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
    }
  }
}

// ── Button Handler ─────────────────────────────────────────────────────────────
async function handleButton(client, interaction) {
  const { customId, guild, member } = interaction;

  if (!customId.startsWith('music_')) return;

  await interaction.deferUpdate().catch(() => {});

  const player = client.manager.players.get(guild.id);
  if (!player) {
    return interaction.followUp({
      embeds: [errorEmbed('No Player', 'No music is currently playing.')],
      ephemeral: true,
    }).catch(() => {});
  }

  // User must be in same VC
  const botVC = guild.members.me?.voice?.channel;
  const userVC = member.voice?.channel;
  if (botVC && (!userVC || userVC.id !== botVC.id)) {
    return interaction.followUp({
      embeds: [errorEmbed('Wrong Channel', 'You must be in the same voice channel as the bot.')],
      ephemeral: true,
    }).catch(() => {});
  }

  const { buildNowPlayingEmbed, buildMusicButtons, buildQueueEmbed, successEmbed } = require('../utils/embedBuilder');

  switch (customId) {
    case 'music_playpause':
      if (player.paused) {
        player.resume();
      } else {
        player.pause(true);
      }
      await updateNowPlayingMessage(client, player);
      break;

    case 'music_skip':
      if (!player.queue.current) break;
      player.skip();
      await interaction.followUp({
        embeds: [successEmbed('Skipped', `Skipped **${player.queue.current?.title ?? 'current track'}**`)],
        ephemeral: true,
      }).catch(() => {});
      break;

    case 'music_stop':
      player.queue.clear();
      player.skip();
      await interaction.followUp({
        embeds: [successEmbed('Stopped', 'Music stopped and queue cleared.')],
        ephemeral: true,
      }).catch(() => {});
      break;

    case 'music_loop': {
      const modes = ['off', 'track', 'queue'];
      const current = modes.indexOf(player.loop || 'off');
      const next = modes[(current + 1) % modes.length];
      player.setLoop(next);
      await updateNowPlayingMessage(client, player);
      await interaction.followUp({
        embeds: [successEmbed('Loop Mode', `Loop set to **${next}**`)],
        ephemeral: true,
      }).catch(() => {});
      break;
    }

    case 'music_like': {
      const GuildSettings = require('../database/models/GuildSettings');
      const track = player.queue.current;
      if (track) {
        const settings = await GuildSettings.getOrCreate(guild.id).catch(() => null);
        if (settings) {
          const userId = member.id;
          const liked = settings.likedSongs.get(userId) || [];
          if (!liked.includes(track.uri)) {
            liked.push(track.uri);
            settings.likedSongs.set(userId, liked);
            await settings.save().catch(() => {});
          }
        }
      }
      await interaction.followUp({
        embeds: [successEmbed('Liked!', `Added **${track?.title}** to your liked songs.`)],
        ephemeral: true,
      }).catch(() => {});
      break;
    }

    case 'music_dislike':
      await interaction.followUp({
        embeds: [successEmbed('Noted', 'Thanks for your feedback!')],
        ephemeral: true,
      }).catch(() => {});
      break;

    case 'music_queue': {
      const embed = buildQueueEmbed(player);
      await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
      break;
    }

    case 'music_leave':
      player.destroy();
      await interaction.followUp({
        embeds: [successEmbed('Left', 'Disconnected from voice channel.')],
        ephemeral: true,
      }).catch(() => {});
      break;
  }
}

async function updateNowPlayingMessage(client, player) {
  const msg = client.nowPlayingMessages.get(player.guildId);
  if (!msg) return;
  const { buildNowPlayingEmbed, buildMusicButtons } = require('../utils/embedBuilder');
  const track = player.queue.current;
  if (!track) return;
  await msg.edit({
    embeds: [buildNowPlayingEmbed(player, track)],
    components: buildMusicButtons(player),
  }).catch(() => {});
}
