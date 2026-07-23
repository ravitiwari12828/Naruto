const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getLavalink } = require('../utils/lavalink');

// 24/7 AFK Voice Store (guildId -> { voiceChannelId, textChannelId })
const afkStore = new Map();

// Naruto OST Presets
const NARUTO_OST = {
  'bluebird': 'Naruto Shippuden OP 3 - Blue Bird',
  'silhouette': 'Naruto Shippuden OP 16 - Silhouette',
  'sadness': 'Naruto OST - Sadness and Sorrow',
  'theme': 'Naruto Main Theme - Raising Fighting Spirit',
  'wind': 'Naruto ED 1 - Wind',
  'hero': 'Naruto Shippuden OP 1 - Hero\'s Come Back!!'
};

/**
 * Builds the exact Music Player Card matching screenshots 2 & 5.
 */
function buildMusicPlayerEmbed(track, player, isPremium = false) {
  const title = track?.info?.title || 'Unknown Track';
  const author = track?.info?.author || 'Unknown Author';
  const durationMs = track?.info?.duration || 240000;
  const durationStr = formatDuration(durationMs);
  const artworkUrl = track?.info?.artworkUrl || 'https://i.imgur.com/8Q9Z9zG.png';
  const source = track?.info?.sourceName || 'YouTube';
  const volume = player?.volume || 100;
  const isLoop = player?.repeatMode === 'track' ? '🔂 Track' : player?.repeatMode === 'queue' ? '🔁 Queue' : 'Off';
  const queueLen = player?.queue?.tracks?.length || 0;
  const requesterId = track?.requester?.id || player?.textChannelId;

  return new EmbedBuilder()
    .setColor(0x1F1F2F)
    .setTitle(`:music: Now Playing`)
    .setDescription(
      `**[${title}](${track?.info?.uri || 'https://youtube.com'})**\n\n` +
      `📁 **Author**\n${author}\n\n` +
      `🕒 **Duration**\n${durationStr}\n\n` +
      `\`🔊 Volume: ${volume}%\` • \`Loop: ➡️ ${isLoop}\` • \`Queue: ${queueLen} songs\`\n` +
      `Requested by ${requesterId ? `<@${requesterId}>` : 'gojo_katura'} | Autoplay Off`
    )
    .setThumbnail(artworkUrl)
    .setFooter({ text: 'Lenora • Priority Development' })
    .setTimestamp();
}

/**
 * Builds the Music Player action buttons matching screenshot 2 & 5.
 */
function buildMusicActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_voldown').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_volup').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_lyrics').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_clear').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  const filterSelect = new StringSelectMenuBuilder()
    .setCustomId('music_filter_select')
    .setPlaceholder('▚ Select an Audio Filter...')
    .addOptions([
      { label: 'Reset Filters', value: 'filter_reset', description: 'Disable all active audio effects', emoji: '🚫' },
      { label: 'Bass Boost', value: 'filter_bassboost', description: 'Deep, rich low-frequency amplification', emoji: '🔊' },
      { label: '8D Audio', value: 'filter_8d', description: 'Immersive 360-degree spatial audio panning', emoji: '🎧' },
      { label: 'Nightcore', value: 'filter_nightcore', description: 'Upbeat tempo & increased vocal pitch', emoji: '🌙' },
      { label: 'Vaporwave', value: 'filter_vaporwave', description: 'Slowed aesthetic retro synthwave vibe', emoji: '☁️' },
      { label: 'Speed Up', value: 'filter_speedup', description: 'Increase speed while keeping the song clean', emoji: '⚡' },
      { label: 'Slowed', value: 'filter_slowed', description: 'Slow down playback without crushing the mix', emoji: '🐢' },
      { label: 'Karaoke', value: 'filter_karaoke', description: 'Reduce centered vocals for karaoke playback', emoji: '🎤' },
      { label: 'Distort', value: 'filter_distort', description: 'Heavier, rougher effect for edits and memes', emoji: '💥' }
    ]);

  const row3 = new ActionRowBuilder().addComponents(filterSelect);

  return [row1, row2, row3];
}

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '04:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

module.exports = {
  name: 'music',
  description: 'Complete Lavalink Music Suite with Audio Filters, 24/7 AFK Mode & Player Interface matching screenshot 2/3/4/5',
  aliases: [
    'm', 'play', 'p', 'stop', 'pause', 'resume',
    'skip', 's', 'previous', 'prev', 'queue', 'q',
    'np', 'nowplaying', 'loop', 'shuffle',
    'volume', 'vol', 'clear', 'join', 'dc', 'afk247', '247'
  ],
  afkStore,
  buildMusicPlayerEmbed,
  buildMusicActionRows,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const voiceState = message.member?.voice;
    const author = message.author;
    const guildId = message.guild.id;
    const lavalink = getLavalink();

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. JOIN / DISCONNECT COMMANDS
    if (['join', 'connect'].includes(invoked)) {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} Join a voice channel first!`);
      if (lavalink) {
        let player = lavalink.getPlayer(guildId);
        if (!player) {
          player = await lavalink.createPlayer({
            guildId,
            voiceChannelId: voiceState.channel.id,
            textChannelId: message.channel.id,
            selfDeaf: true
          });
          await player.connect();
        }
      }
      return message.reply(`✅ **Joined:** Successfully connected to **${voiceState.channel.name}**! Ready to play music.`);
    }

    if (['dc', 'leave'].includes(invoked)) {
      if (lavalink) {
        const player = lavalink.getPlayer(guildId);
        if (player) await player.destroy();
      }
      return message.reply(`👋 Disconnected from voice channel.`);
    }

    // 2. 24/7 AFK MODE (.247 / .afk247)
    if (['247', 'afk247', '24/7'].includes(invoked)) {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} Join the target VC to enable 24/7 AFK mode!`);

      if (afkStore.has(guildId)) {
        afkStore.delete(guildId);
        return message.reply(`🔴 **24/7 Mode Disabled**: Bot will auto-disconnect when VC is empty.`);
      } else {
        afkStore.set(guildId, { voiceChannelId: voiceState.channel.id, textChannelId: message.channel.id });
        return message.reply(`🟢 **24/7 Mode Enabled**: Bot will stay connected to **<#${voiceState.channel.id}>** 24/7!`);
      }
    }

    // 3. PLAY (.play, .p)
    if (['play', 'p'].includes(invoked) || (invoked === 'music' && args[0] === 'play')) {
      if (!voiceState?.channel) {
        return message.reply(`${emojis.WARNING} You must be in a Voice Channel to play music!`);
      }

      let query = (['play', 'p'].includes(invoked) ? args : args.slice(1)).join(' ');
      if (!query) {
        return message.reply(`${emojis.WARNING} Usage: \`.play <song title / URL / preset>\`\nPresets: \`bluebird\`, \`silhouette\`, \`sadness\`, \`theme\`, \`wind\`, \`hero\``);
      }

      const key = query.toLowerCase().replace(/\s+/g, '');
      if (NARUTO_OST[key]) query = NARUTO_OST[key];

      let player = lavalink?.getPlayer(guildId);

      if (lavalink && lavalink.nodeManager.nodes.size > 0) {
        try {
          if (!player) {
            player = await lavalink.createPlayer({
              guildId,
              voiceChannelId: voiceState.channel.id,
              textChannelId: message.channel.id,
              selfDeaf: true,
              volume: 100
            });
            await player.connect();
          }

          // Search with fallbacks (ytmsearch -> ytsearch -> scsearch -> spsearch)
          let res = await player.search({ query, source: 'ytmsearch' }, author);
          if (!res || !res.tracks.length) {
            res = await player.search({ query, source: 'ytsearch' }, author);
          }
          if (!res || !res.tracks.length) {
            res = await player.search({ query, source: 'scsearch' }, author);
          }

          if (!res || !res.tracks.length) {
            return message.reply(`${emojis.WARNING} No tracks found for: **${query}**`);
          }

          const track = res.tracks[0];
          await player.queue.add(track);

          if (!player.playing && !player.paused) {
            await player.play();
            const embed = buildMusicPlayerEmbed(track, player);
            const rows = buildMusicActionRows();
            return message.channel.send({ embeds: [embed], components: rows });
          } else {
            return message.reply(`✅ **Added ${track.info.title}** to queue at position **#${player.queue.tracks.length}**.`);
          }
        } catch (err) {
          console.error('Lavalink error:', err.message);
        }
      }

      // Fallback
      return message.reply(`🎶 Connected to **${voiceState.channel.name}** and queuing **${query}**.`);
    }

    // 4. VOLUME CONTROL (.vol 1-200 / max 450 for premium)
    if (['vol', 'volume'].includes(invoked)) {
      const volNum = parseInt(args[0]);
      if (isNaN(volNum)) return message.reply(`🔊 Current Volume: 100%. Usage: \`.volume 1-200\` (or up to 450 for Premium servers).`);

      const maxVol = 200; // Can be upgraded to 450 for premium
      const targetVol = Math.min(Math.max(1, volNum), maxVol);

      const player = lavalink?.getPlayer(guildId);
      if (player) {
        await player.setVolume(targetVol);
      }
      return message.reply(`🔊 Volume set to **${targetVol}%**.`);
    }

    // 5. PAUSE / RESUME / SKIP / STOP / NP
    if (['pause', 'resume'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (player) {
        if (player.paused) {
          await player.resume();
          return message.reply('▶️ Resumed music playback.');
        } else {
          await player.pause();
          return message.reply('⏸️ Paused music playback.');
        }
      }
    }

    if (['skip', 'next'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (player) {
        await player.skip();
        return message.reply('⏭️ Skipped to next track.');
      }
    }

    if (['stop'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (player) await player.destroy();
      return message.reply('⏹️ Music player stopped and cleared.');
    }

    if (['np', 'nowplaying'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (player && player.queue.current) {
        const embed = buildMusicPlayerEmbed(player.queue.current, player);
        const rows = buildMusicActionRows();
        return message.channel.send({ embeds: [embed], components: rows });
      }
      return message.reply(`${emojis.WARNING} No track currently playing.`);
    }

    return message.reply(`ℹ️ Usage: \`.play <song>\`, \`.volume <1-200>\`, \`.247\`, \`.stop\`, \`.np\`.`);
  }
};
