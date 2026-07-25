const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getLavalink } = require('../utils/lavalink');

// MusicCard canvas renderer (ported from synn reference)
let MusicCard = null;
try {
  MusicCard = require('../utils/MusicCard');
} catch (e) {
  console.warn('[Music] @napi-rs/canvas not available — falling back to embed player.');
}

// 24/7 AFK Voice Store
const afkStore = new Map();

// MusicCard singleton instance
const musicCardRenderer = MusicCard ? new MusicCard() : null;

/**
 * Sends a canvas-rendered music player card image + action buttons to the channel.
 * Falls back to a plain embed if canvas is unavailable.
 */
async function sendMusicCard(channel, track, player) {
  // Delete previous music card message if it exists
  if (player && player.lastMessage) {
    try {
      await player.lastMessage.delete().catch(() => {});
      player.lastMessage = null;
    } catch (e) {}
  }

  const rows = buildMusicActionRows(player);
  let sentMsg = null;

  // Try canvas card first
  if (musicCardRenderer) {
    try {
      const buf = await musicCardRenderer.createMusicCard({
        title: track?.info?.title || 'Unknown Title',
        artist: track?.info?.author || 'Unknown Artist',
        artworkUrl: track?.info?.artworkUrl || track?.pluginInfo?.artworkUrl || null,
        position: player?.position || 0,
        duration: track?.info?.duration || 0,
        source: track?.info?.sourceName || 'YouTube',
        isLive: !track?.info?.duration || track.info.duration <= 0,
      });

      const attachment = new AttachmentBuilder(buf, { name: 'nowplaying.png' });

      // Minimal embed as container for the image card
      const cardEmbed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setImage('attachment://nowplaying.png')
        .setFooter({
          text: `🍥 Naruto Music • Queue: ${player?.queue?.tracks?.length || 0} songs • Vol: ${player?.volume || 100}%`,
        });

      sentMsg = await channel.send({ embeds: [cardEmbed], files: [attachment], components: rows });
      if (player) player.lastMessage = sentMsg;
      return sentMsg;
    } catch (e) {
      console.error('[MusicCard] Canvas render failed, falling back to embed:', e.message);
    }
  }

  // Fallback: styled embed
  const embed = buildMusicPlayerEmbed(track, player);
  sentMsg = await channel.send({ embeds: [embed], components: rows });
  if (player) player.lastMessage = sentMsg;
  return sentMsg;
}

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
function buildMusicPlayerEmbed(track, player) {
  const title = track?.info?.title || 'Unknown Track';
  const author = track?.info?.author || 'Unknown Artist';
  const durationMs = track?.info?.duration || 240000;
  const durationStr = formatDuration(durationMs);
  const artworkUrl = track?.info?.artworkUrl || 'https://i.imgur.com/8Q9Z9zG.png';
  const volume = player?.volume || 100;

  let reqName = 'Member';
  let reqAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (track?.requester) {
    if (typeof track.requester === 'object') {
      reqName = track.requester.username || track.requester.displayName || 'Member';
      if (typeof track.requester.displayAvatarURL === 'function') {
        reqAvatar = track.requester.displayAvatarURL({ dynamic: true });
      }
    }
  }

  const engineName = track?.info?.sourceName ? (track.info.sourceName.charAt(0).toUpperCase() + track.info.sourceName.slice(1)) : 'Youtube';

  return new EmbedBuilder()
    .setColor(0xFF007F) // Vibrant Hot Pink / Magenta accent bar matching STELLAR BEATS!
    .setAuthor({ name: '💿 Starting playing...', iconURL: 'https://i.imgur.com/8Q9Z9zG.png' })
    .setDescription(`**[${title}](${track?.info?.uri || 'https://youtube.com'})**`)
    .addFields([
      { name: '👤 Author:', value: author, inline: true },
      { name: '🔊 Volume:', value: `${volume}%`, inline: true },
      { name: '🌐 Duration:', value: durationStr, inline: true }
    ])
    .setImage(artworkUrl) // Full-width banner image matching STELLAR BEATS screenshot!
    .setFooter({ text: `Engine: ${engineName} | Requested By ${reqName}`, iconURL: reqAvatar })
    .setTimestamp();
}

/**
 * Builds the exact 3-row 4-button grid layout matching user screenshot + dropdown menus.
 */
function buildMusicActionRows(player = null) {
  const isAutoplay = player?.autoplay || false;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_volup').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_clear').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_autoplay').setEmoji('♾️').setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_fav_add').setEmoji('❤️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_fav_play').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_lyrics').setEmoji('💬').setStyle(ButtonStyle.Secondary)
  );

  const suggestedSelect = new StringSelectMenuBuilder()
    .setCustomId('music_suggested_select')
    .setPlaceholder('✨ Suggested songs...')
    .addOptions([
      { label: 'Naruto Shippuden OP 3 - Blue Bird', value: 'sug_bluebird', description: 'Recommended Naruto Anime OST', emoji: '🍥' },
      { label: 'Naruto Shippuden OP 16 - Silhouette', value: 'sug_silhouette', description: 'Recommended Naruto Anime OST', emoji: '🍥' },
      { label: 'Naruto OST - Sadness and Sorrow', value: 'sug_sadness', description: 'Recommended Naruto Emotional Track', emoji: '🍥' },
      { label: 'Heeriye - Jasleen Royal & Arijit Singh', value: 'sug_heeriye', description: 'Trending Acoustic Pop', emoji: '✨' },
      { label: 'Tere Baare Mein Jab Socha - Jagjit Singh', value: 'sug_jagjit', description: 'Trending Ghazal Classic', emoji: '✨' }
    ]);

  const row4 = new ActionRowBuilder().addComponents(suggestedSelect);

  const filterSelect = new StringSelectMenuBuilder()
    .setCustomId('music_filter_select')
    .setPlaceholder('✨ Select a music filter to apply...')
    .setMinValues(1)
    .setMaxValues(5)
    .addOptions([
      { label: 'Reset Filters', value: 'filter_reset', description: 'Disable all active audio effects', emoji: '🚫' },
      { label: 'Bass Boost', value: 'filter_bassboost', description: 'Deep, rich low-frequency amplification', emoji: '🔊' },
      { label: '8D Audio', value: 'filter_8d', description: 'Immersive 360-degree spatial audio panning', emoji: '🎧' },
      { label: 'Nightcore', value: 'filter_nightcore', description: 'Upbeat tempo & increased vocal pitch', emoji: '🌙' },
      { label: 'Vaporwave', value: 'filter_vaporwave', description: 'Slowed aesthetic retro synthwave vibe', emoji: '☁️' }
    ]);

  const row5 = new ActionRowBuilder().addComponents(filterSelect);

  return [row1, row2, row3, row4, row5];
}

function parseTimeToMs(timeStr) {
  if (!timeStr) return null;
  if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr) * 1000;
  }
  const match = timeStr.match(/^(?:(\d+):)?(\d+)(?::(\d+))?$/);
  if (match) {
    if (match[3]) {
      const hrs = parseInt(match[1]) || 0;
      const mins = parseInt(match[2]) || 0;
      const secs = parseInt(match[3]) || 0;
      return (hrs * 3600 + mins * 60 + secs) * 1000;
    } else {
      const mins = parseInt(match[1]) || 0;
      const secs = parseInt(match[2]) || 0;
      return (mins * 60 + secs) * 1000;
    }
  }
  return null;
}

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

module.exports = {
  name: 'music',
  description: 'Complete Lavalink Music Suite: seek, equalizer, multi-filter selection, 24/7 AFK mode, autoplay, favorites',
  aliases: [
    'm', 'play', 'p', 'stop', 'pause', 'resume',
    'skip', 's', 'previous', 'prev', 'queue', 'q',
    'np', 'nowplaying', 'loop', 'shuffle',
    'volume', 'vol', 'clear', 'join', 'dc', 'afk247', '247',
    'seek', 'equalizer', 'eq', 'filter', 'filters',
    'autoplay', 'ap', 'fav', 'favorite', 'favorites'
  ],
  afkStore,
  buildMusicPlayerEmbed,
  buildMusicActionRows,
  sendMusicCard,

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

    // 1. SEEK COMMAND (.seek 1:30 / .seek 90)
    if (['seek'].includes(invoked) || (invoked === 'music' && args[0] === 'seek')) {
      const targetTime = (invoked === 'seek' ? args[0] : args[1]);
      if (!targetTime) return message.reply(`${emojis.WARNING} Usage: \`.seek <1:30 / 90>\` (Jump to specific timestamp in track).`);

      const targetMs = parseTimeToMs(targetTime);
      if (targetMs === null) return message.reply(`${emojis.WARNING} Invalid timestamp format. Use e.g. \`1:30\`, \`2:45\`, or \`90\` (seconds).`);

      const player = lavalink?.getPlayer(guildId);
      if (!player || !player.queue.current) return message.reply(`${emojis.WARNING} No track currently playing.`);

      try {
        await player.seek(targetMs);
        return message.reply(`⏩ Seeked to timestamp **${formatDuration(targetMs)}**.`);
      } catch (e) {
        return message.reply(`⏩ Jumped to position **${formatDuration(targetMs)}**.`);
      }
    }

    // 2. EQUALIZER / MULTI-FILTER COMMAND (.eq bassboost / .filter nightcore 8d)
    if (['equalizer', 'eq', 'filter', 'filters'].includes(invoked) || (invoked === 'music' && ['equalizer', 'eq', 'filter'].includes(args[0]))) {
      const inputFilters = (['equalizer', 'eq', 'filter', 'filters'].includes(invoked) ? args : args.slice(1)).map(a => a.toLowerCase());

      if (!inputFilters.length || inputFilters.includes('list')) {
        return message.reply(
          `🎛️ **Available Audio Filters & Equalizers:**\n` +
          `• \`bassboost\` — Deep bass amplification\n` +
          `• \`8d\` — Immersive spatial panning\n` +
          `• \`nightcore\` — High pitch & upbeat tempo\n` +
          `• \`vaporwave\` — Slowed retro synthwave\n` +
          `• \`speedup\` — Faster clean playback\n` +
          `• \`slowed\` — Slowed down playback\n` +
          `• \`reset\` — Clear all active filters\n\n` +
          `**Usage:** \`.eq bassboost 8d\` (Apply multiple filters simultaneously!)`
        );
      }

      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player found.`);

      if (inputFilters.includes('reset') || inputFilters.includes('clear')) {
        try {
          if (player.filterManager) await player.filterManager.resetFilters();
        } catch (e) {}
        return message.reply(`🎛️ Reset all audio filters to default.`);
      }

      const applied = [];
      for (const filterName of inputFilters) {
        try {
          if (filterName === 'bassboost' && player.filterManager) {
            await player.filterManager.setBassboost(true);
            applied.push('Bass Boost');
          } else if (filterName === 'nightcore' && player.filterManager) {
            await player.filterManager.setNightcore(true);
            applied.push('Nightcore');
          } else if (filterName === '8d' && player.filterManager) {
            await player.filterManager.set8D(true);
            applied.push('8D Audio');
          } else if (filterName === 'vaporwave' && player.filterManager) {
            await player.filterManager.setVaporwave(true);
            applied.push('Vaporwave');
          } else {
            applied.push(filterName.toUpperCase());
          }
        } catch (e) {
          applied.push(filterName.toUpperCase());
        }
      }

      return message.reply(`🎛️ Applied active filters: **${applied.join(', ')}**!`);
    }

    // 3. JOIN / DISCONNECT COMMANDS
    if (['join', 'connect'].includes(invoked)) {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} Join a voice channel first!`);

      const channel = voiceState.channel;
      const permissions = channel.permissionsFor(message.guild.members.me);
      if (permissions && !permissions.has(PermissionsBitField.Flags.Connect)) {
        return message.reply(`⚠️ I don't have permission to **CONNECT** to <#${channel.id}>!`);
      }
      if (permissions && !permissions.has(PermissionsBitField.Flags.Speak)) {
        return message.reply(`⚠️ I don't have permission to **SPEAK** in <#${channel.id}>!`);
      }

      try {
        let connected = false;
        if (lavalink) {
          try {
            let player = lavalink.getPlayer(guildId);
            if (!player) {
              player = await lavalink.createPlayer({
                guildId,
                voiceChannelId: channel.id,
                textChannelId: message.channel.id,
                selfDeaf: true
              });
            } else {
              player.voiceChannelId = channel.id;
              player.textChannelId = message.channel.id;
            }
            await player.connect();
            connected = true;
          } catch (e) {
            console.warn('[Lavalink Join Notice] Falling back to native voice connection:', e.message);
          }
        }

        if (!connected) {
          const { joinVoiceChannel } = require('@discordjs/voice');
          joinVoiceChannel({
            channelId: channel.id,
            guildId: guildId,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: true
          });
        }

        return message.reply(`🔊 **Joined Voice Channel:** Successfully connected to **<#${channel.id}>**!`);
      } catch (err) {
        console.error('[Music Join Error]', err);
        return message.reply(`❌ Failed to join **<#${channel.id}>**: ${err.message || 'Voice Connection Error'}`);
      }
    }

    if (['dc', 'leave'].includes(invoked)) {
      if (lavalink) {
        const player = lavalink.getPlayer(guildId);
        if (player) await player.destroy().catch(() => {});
      }
      try {
        const { getVoiceConnection } = require('@discordjs/voice');
        const conn = getVoiceConnection(guildId);
        if (conn) conn.destroy();
      } catch (e) {}

      return message.reply(`👋 Disconnected from voice channel.`);
    }

    // 4. 24/7 AFK MODE (.247)
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

    // 5. PLAY (.play, .p, .play yt/ytm/sc/sp/am/dz)
    if (['play', 'p'].includes(invoked) || (invoked === 'music' && args[0] === 'play')) {
      if (!voiceState?.channel) {
        return message.reply(`${emojis.WARNING} You must be in a Voice Channel to play music!`);
      }

      let rawArgs = (['play', 'p'].includes(invoked) ? args : args.slice(1));
      if (!rawArgs.length) {
        return message.reply(
          `${emojis.WARNING} **Usage:** \`.play <song title / URL / preset>\`\n` +
          `**Explicit Sources:** \`.play yt <query>\` (YouTube), \`.play ytm <query>\` (YT Music), \`.play sc <query>\` (SoundCloud), \`.play sp <query>\` (Spotify), \`.play am <query>\` (Apple Music), \`.play dz <query>\` (Deezer)\n` +
          `**Presets:** \`bluebird\`, \`silhouette\`, \`sadness\`, \`theme\`, \`wind\`, \`hero\``
        );
      }

      let source = null;
      let query = rawArgs.join(' ');

      // Check explicit source prefix
      const firstArg = rawArgs[0].toLowerCase();
      if (['yt', 'youtube'].includes(firstArg)) {
        source = 'ytsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['ytm', 'ytmusic'].includes(firstArg)) {
        source = 'ytmsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['sc', 'soundcloud'].includes(firstArg)) {
        source = 'scsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['sp', 'spotify'].includes(firstArg)) {
        source = 'spsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['am', 'applemusic'].includes(firstArg)) {
        source = 'amsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['dz', 'deezer'].includes(firstArg)) {
        source = 'dzsearch';
        query = rawArgs.slice(1).join(' ');
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

          let res = null;
          const isUrl = /^https?:\/\//i.test(query);

          if (isUrl) {
            // Direct URL search (Spotify, YouTube, SoundCloud, Apple Music, Deezer, HLS, Direct MP3)
            res = await player.search({ query }, author);
          } else if (source) {
            // Explicit user-chosen search platform
            res = await player.search({ query, source }, author);
          } else {
            // Primary Spotify Search Engine Cascade: Spotify -> YTM -> YT -> SoundCloud -> Apple Music -> Deezer
            const sources = ['spsearch', 'ytmsearch', 'ytsearch', 'scsearch', 'amsearch', 'dzsearch'];
            for (const s of sources) {
              try {
                res = await player.search({ query, source: s }, author);
                if (res && res.tracks && res.tracks.length) break;
              } catch (e) {}
            }
          }

          if (!res || !res.tracks || !res.tracks.length) {
            return message.reply(`${emojis.WARNING} No tracks found for **${query}** across all search engines.`);
          }

          // Handle Playlists & Albums
          if (res.loadType === 'playlist' || res.playlist) {
            const playlistName = res.playlist?.name || res.playlistInfo?.name || 'Playlist';
            const tracks = res.tracks;
            await player.queue.add(tracks);

            if (!player.playing && !player.paused) {
              await player.play();
            }

            return message.reply(`🎶 **Queued Playlist:** Added **${tracks.length} tracks** from **${playlistName}** to queue!`);
          }

          // Single Track Playback
          const track = res.tracks[0];
          await player.queue.add(track);

          if (!player.playing && !player.paused) {
            await player.play();
            return message.reply(`▶️ **Now Playing:** [${track.info.title}](${track.info.uri || 'https://spotify.com'})`);
          } else {
            return message.reply(`✅ **Added to Queue:** [${track.info.title}](${track.info.uri || 'https://spotify.com'}) at position **#${player.queue.tracks.length}**.`);
          }
        } catch (err) {
          console.error('[Music Play Error]', err.message || err);
          return message.reply(`❌ Could not play track: **${err.message || 'Search Error'}**. Please try another title or direct URL.`);
        }
      }

      return message.reply(`⚠️ Lavalink nodes are currently connecting. Please try again in a few seconds.`);
    }

    // 6. VOLUME CONTROL
    if (['vol', 'volume'].includes(invoked)) {
      const volNum = parseInt(args[0]);
      if (isNaN(volNum)) return message.reply(`🔊 Current Volume: 100%. Usage: \`.volume 1-200\` (or up to 450 for Premium servers).`);

      const targetVol = Math.min(Math.max(1, volNum), 200);

      const player = lavalink?.getPlayer(guildId);
      if (player) {
        await player.setVolume(targetVol);
      }
      return message.reply(`🔊 Volume set to **${targetVol}%**.`);
    }

    // 6.5 AUTOPLAY COMMAND
    if (['autoplay', 'ap'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player!`);

      player.autoplay = !player.autoplay;
      const status = player.autoplay ? '🟢 **ENABLED**' : '🔴 **DISABLED**';
      return message.reply(`♾️ **Autoplay Mode:** ${status}! ${player.autoplay ? '(Auto-queuing recommended tracks when queue ends)' : ''}`);
    }

    // 6.6 FAVORITES COMMAND (.fav add / .fav list / .fav remove / .fav play)
    if (['fav', 'favorite', 'favorites'].includes(invoked)) {
      const db = require('../database/db');
      const sub = args[0]?.toLowerCase() || 'list';

      if (sub === 'add') {
        const player = lavalink?.getPlayer(guildId);
        const currentTrack = player?.queue?.current;
        if (!currentTrack) return message.reply(`${emojis.WARNING} No track currently playing to add to favorites!`);

        const res = db.addFavorite(author.id, currentTrack);
        if (!res.added) return message.reply(`⚠️ ${res.message}`);
        return message.reply(`❤️ **Saved to Favorites:** [${res.favorite.title}](${res.favorite.uri}) (Total: ${res.total} tracks).`);
      }

      if (sub === 'remove' || sub === 'del') {
        const idx = parseInt(args[1]) - 1;
        if (isNaN(idx)) return message.reply(`${emojis.WARNING} Usage: \`.fav remove <number>\` (e.g. \`.fav remove 1\`).`);

        const removed = db.removeFavorite(author.id, idx);
        if (!removed) return message.reply(`${emojis.WARNING} Invalid favorite index.`);
        return message.reply(`🗑️ **Removed from Favorites:** ${removed.title}`);
      }

      if (sub === 'play') {
        const favs = db.getFavorites(author.id);
        if (!favs.length) return message.reply(`💔 You have no saved favorite tracks! Use \`.fav add\` while a track plays.`);
        if (!voiceState?.channel) return message.reply(`${emojis.WARNING} Join a voice channel first!`);

        let player = lavalink?.getPlayer(guildId);
        if (!player && lavalink) {
          player = await lavalink.createPlayer({
            guildId,
            voiceChannelId: voiceState.channel.id,
            textChannelId: message.channel.id,
            selfDeaf: true
          });
          await player.connect();
        }

        let queuedCount = 0;
        for (const f of favs) {
          try {
            let res = await player.search({ query: f.uri || f.title, source: 'ytmsearch' }, author);
            if (res && res.tracks.length) {
              await player.queue.add(res.tracks[0]);
              queuedCount++;
            }
          } catch (e) {}
        }

        if (!player.playing && !player.paused) {
          await player.play();
        }

        return message.reply(`⭐ **Queued ${queuedCount} Favorite Songs** into queue!`);
      }

      // Default: List Favorites
      const favs = db.getFavorites(author.id);
      if (!favs.length) {
        return message.reply(`💔 **Your Favorites List is Empty!**\nUse \`.fav add\` while listening to save your favorite songs.`);
      }

      const listStr = favs.map((f, i) => `\`${i + 1}.\` **[${f.title}](${f.uri})** — *${f.author}*`).slice(0, 15).join('\n');

      const favEmbed = createStyledEmbed({
        title: `❤️ Your Favorite Songs (${favs.length})`,
        description: listStr + (favs.length > 15 ? `\n*...and ${favs.length - 15} more tracks.*` : '') + `\n\n💡 *Use \`.fav play\` to queue all favorites, or \`.fav remove <#>\` to delete.*`,
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [favEmbed] });
    }

    // 7. PAUSE / RESUME / SKIP / STOP / NP
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
        return await sendMusicCard(message.channel, player.queue.current, player);
      }
      return message.reply(`${emojis.WARNING} No track currently playing.`);
    }

    return message.reply(`ℹ️ Usage: \`.play <song>\`, \`.seek <1:30>\`, \`.eq <bassboost 8d>\`, \`.volume <1-200>\`, \`.247\`, \`.stop\`, \`.np\`.`);
  }
};
