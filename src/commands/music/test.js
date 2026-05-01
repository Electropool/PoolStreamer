'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('⚡ Run a system diagnostic and play test audio'),

  async execute(client, interaction) {
    await interaction.deferReply();

    const { member, guild, channel } = interaction;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return interaction.editReply({ 
        embeds: [errorEmbed('Test Failed', '❌ You must be in a voice channel to run the diagnostic.')] 
      });
    }

    let status = '🔄 **Initializing Diagnostic...**\n';
    status += `✅ Member: ${member.user.tag}\n`;
    status += `✅ Voice Channel: ${voiceChannel.name}\n`;
    
    await interaction.editReply({ embeds: [successEmbed('System Diagnostic', status)] });

    // Step 1: Check Lavalink Node
    const node = client.manager.shoukaku.nodes.values().next().value;
    if (!node || node.state !== 1) {
      status += '❌ Lavalink Node: Disconnected\n';
      return interaction.editReply({ embeds: [errorEmbed('Diagnostic Failed', status)] });
    }
    status += `✅ Lavalink Node: "${node.name}" (Connected)\n`;
    await interaction.editReply({ embeds: [successEmbed('System Diagnostic', status)] });

    // Step 2: Voice Connection
    status += '🔄 **Connecting to Voice Channel...**\n';
    await interaction.editReply({ embeds: [successEmbed('System Diagnostic', status)] });

    // Check Permissions
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has('Connect')) {
      status += '❌ Permissions: Missing "Connect" permission\n';
      return interaction.editReply({ embeds: [errorEmbed('Diagnostic Failed', status)] });
    }
    if (!permissions.has('Speak')) {
      status += '❌ Permissions: Missing "Speak" permission\n';
      return interaction.editReply({ embeds: [errorEmbed('Diagnostic Failed', status)] });
    }

    let player;
    try {
      player = client.manager.players.get(guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: guild.id,
          textChannelId: channel.id,
          voiceChannelId: voiceChannel.id,
          shardId: guild.shardId ?? 0,
          volume: 50,
        });
      }
      status += '✅ Voice Connection: Established\n';
    } catch (err) {
      status += `❌ Voice Connection: FAILED\nReason: \`${err.message}\`\n`;
      logger.error(`Test command voice error: ${err.stack}`);
      return interaction.editReply({ embeds: [errorEmbed('Diagnostic Failed', status)] });
    }
    await interaction.editReply({ embeds: [successEmbed('System Diagnostic', status)] });

    // Step 3: Test Searches
    status += '🔄 **Running Search Tests...**\n';
    const testQueries = [
      { name: 'SoundCloud (Faded)', query: 'https://soundcloud.com/alanwalker/faded' },
      { name: 'YouTube (Direct)', query: 'https://www.youtube.com/watch?v=60ItHLz5WEA' },
      { name: 'YouTube (Search)', query: 'ytsearch:alan walker faded' }
    ];

    for (const item of testQueries) {
      try {
        const result = await client.manager.search(item.query, { requester: member });
        if (result?.tracks?.length > 0) {
          player.queue.add(result.tracks[0]);
          status += `✅ ${item.name}: Found (${result.tracks[0].title.substring(0, 20)}...)\n`;
        } else {
          status += `❌ ${item.name}: No Results\n`;
        }
      } catch (err) {
        status += `❌ ${item.name}: Error (\`${err.message.substring(0, 30)}...\`)\n`;
      }
      await interaction.editReply({ embeds: [successEmbed('System Diagnostic', status)] });
    }

    // Step 4: Playback
    if (player.queue.length > 0) {
      try {
        if (!player.playing && !player.paused) await player.play();
        status += '\n🎵 **Playback started! Diagnostic Successful.**';
      } catch (err) {
        status += `\n❌ **Playback failed: ${err.message}**`;
      }
    } else {
      status += '\n❌ **Diagnostic Finished: No tracks could be loaded.**';
    }

    await interaction.editReply({ embeds: [successEmbed('Diagnostic Complete', status)] });
  },
};
