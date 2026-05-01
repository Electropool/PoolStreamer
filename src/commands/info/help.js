'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
  category: 'info',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('ℹ️ Show information about commands and features'),

  async execute(client, interaction) {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🎵 PoolStreamer Help')
      .setDescription('A professional-grade Discord music bot with automatic playback support.')
      .addFields(
        { 
          name: '🚀 Commands', 
          value: '`/play` - Play music globally\n`/setup` - Configure music channel (Admin only)\n`/test` - Run diagnostic playback\n`/queue` - Show current queue\n`/controls` - Show playback buttons' 
        },
        { 
          name: '✨ Auto-Music Channel', 
          value: 'In the channel created via `/setup`, you can simply paste a **YouTube**, **Spotify**, or **SoundCloud** link. The bot will automatically detect it, join your voice channel, and start playing without any commands!' 
        },
        { 
          name: '🛡️ Permissions', 
          value: 'Everyone can queue songs. However, only users with the **Whitelisted Role** (set during setup) can skip, pause, or stop the music.' 
        },
        {
          name: '🔗 Supported Links',
          value: '• YouTube (Tracks/Playlists)\n• Spotify (Converted to YT)\n• SoundCloud'
        }
      )
      .setFooter({ text: `PoolStreamer v${config.bot.version} • Optimized for Production` });

    await interaction.reply({ embeds: [embed] });
  },
};
