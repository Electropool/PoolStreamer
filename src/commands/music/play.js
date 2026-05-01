'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed, buildNowPlayingEmbed, buildMusicButtons } = require('../../utils/embedBuilder');
const { isInSameVoiceChannel } = require('../../utils/permissionChecker');
const config = require('../../../config.json');

module.exports = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Play a song or add it to the queue')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Song name, YouTube/Spotify/SoundCloud URL')
        .setRequired(true)
    ),

  async execute(client, interaction) {
    await interaction.deferReply();

    const { member, guild, channel } = interaction;
    const query = interaction.options.getString('query');

    // Must be in a VC
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.editReply({ embeds: [errorEmbed('Not in Voice Channel', 'Please join a voice channel first.')] });
    }

    // Check bot permissions in VC
    const botPerms = voiceChannel.permissionsFor(guild.members.me);
    if (!botPerms.has('Connect') || !botPerms.has('Speak')) {
      return interaction.editReply({ embeds: [errorEmbed('Missing Permissions', 'I need **Connect** and **Speak** permissions in that voice channel.')] });
    }

    // Max queue size check
    let player = client.manager.players.get(guild.id);
    if (player && player.queue.length >= config.music.maxQueueSize) {
      return interaction.editReply({ embeds: [errorEmbed('Queue Full', `The queue can hold a maximum of **${config.music.maxQueueSize}** tracks.`)] });
    }

    // Detect source engine and query format
    let finalQuery = query;
    let engine = 'youtube'; // Default engine

    if (!query.startsWith('http')) {
      finalQuery = `ytsearch:${query}`;
    } else {
      // Handle known link types
      if (query.includes('spotify.com')) {
        engine = 'spotify'; 
      } else if (query.includes('soundcloud.com')) {
        engine = 'soundcloud';
      } else if (query.includes('youtube.com') || query.includes('youtu.be')) {
        engine = 'youtube';
      }
    }

    // Search
    let result;
    try {
      result = await client.manager.search(finalQuery, { 
        requester: member,
        engine: engine
      });
    } catch (err) {
      logger.error(`Search error for "${query}": ${err.message}`);
      return interaction.editReply({ 
        embeds: [errorEmbed('Search Failed', `An error occurred while searching. Please try again later.\n\`${err.message}\``)] 
      });
    }

    if (!result || !result.tracks || result.tracks.length === 0) {
      return interaction.editReply({ 
        embeds: [errorEmbed('No Results', `No results found for: **${query}**\nTry being more specific or use a direct link.`)] 
      });
    }

    // Create or get player
    if (!player) {
      player = await client.manager.createPlayer({
        guildId: guild.id,
        textChannelId: channel.id,
        voiceChannelId: voiceChannel.id,
        shardId: guild.shardId ?? 0,
        volume: config.music.defaultVolume,
      });
    }

    // Add tracks to queue
    let addedCount = 0;
    let addedTitle = '';

    if (result.type === 'PLAYLIST') {
      const remaining = config.music.maxQueueSize - player.queue.length;
      const tracks = result.tracks.slice(0, remaining);
      for (const track of tracks) {
        track.requester = member;
        player.queue.add(track);
        addedCount++;
      }
      addedTitle = result.playlistName || 'Playlist';
    } else {
      const track = result.tracks[0];
      // Max duration check
      if (track.length > config.music.maxSongDuration * 1000) {
        return interaction.editReply({ embeds: [errorEmbed('Track Too Long', `Max duration is **${Math.floor(config.music.maxSongDuration / 60)} minutes**.`)] });
      }
      track.requester = member;
      player.queue.add(track);
      addedCount = 1;
      addedTitle = track.title;
    }

    // Start playing if not already
    if (!player.playing && !player.paused) {
      await player.play();
    }

    if (result.type === 'PLAYLIST') {
      return interaction.editReply({
        embeds: [successEmbed('Playlist Added', `Added **${addedCount}** tracks from **${addedTitle}** to the queue.`)],
      });
    }

    // If something is already playing, show queued message
    if (player.queue.current) {
      return interaction.editReply({
        embeds: [successEmbed('Added to Queue', `**${addedTitle}**\nPosition: **#${player.queue.length}** in queue`)],
      });
    }

    // First track — now-playing embed will be sent by playerStart event
    return interaction.editReply({
      embeds: [successEmbed('Playing Now', `Started playing **${addedTitle}**`)],
    });
  },
};
