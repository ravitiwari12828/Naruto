const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionsBitField
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getLavalink } = require('../utils/lavalink');

// MusicCard canvas renderer (optional fallback)
let MusicCard = null;
try {
  MusicCard = require('../utils/MusicCard');
} catch (e) {
  console.warn('[Music] Canvas renderer not available — using styled embed player.');
}

// 24/7 AFK Voice Store
const afkStore = new Map();
const musicCardRenderer = MusicCard ? new MusicCard() : null;

/**
 * Sends or updates the Music Player Card in the channel.
 */
async function sendMusicCard(channel, track, player) {
  if (player) {
    // Delete previous main player card via Message instance
    if (player.lastMessage) {
      try {
        await player.lastMessage.delete().catch(() => {});
      } catch (e) {}
      player.lastMessage = null;
    }

    // Delete previous main player card via direct Channel/Message API ID fetch
    if (player.lastMessageId && (player.lastChannelId || channel?.id)) {
      try {
        const targetChanId = player.lastChannelId || channel?.id;
        const targetChan = channel?.client?.channels?.cache?.get(targetChanId) || await channel?.client?.channels?.fetch(targetChanId).catch(() => null) || channel;
        if (targetChan && targetChan.messages) {
          await targetChan.messages.delete(player.lastMessageId).catch(() => {});
        }
      } catch (e) {}
      player.lastMessageId = null;
      player.lastChannelId = null;
    }

    // Delete any temporary queue / status notifications
    if (player.tempMessages && player.tempMessages.length) {
      for (const msg of player.tempMessages) {
        try {
          if (msg && typeof msg.delete === 'function') {
            await msg.delete().catch(() => {});
          }
        } catch (e) {}
      }
      player.tempMessages = [];
    }
  }

  const rows = buildMusicActionRows(player);
  const embed = buildMusicPlayerEmbed(track, player);
  let sentMsg = null;

  let reqName = 'Synn';
  if (track?.requester) {
    if (typeof track.requester === 'object') {
      reqName = track.requester.username || track.requester.displayName || 'Synn';
    } else if (typeof track.requester === 'string') {
      reqName = track.requester;
    }
  }

  if (musicCardRenderer) {
    try {
      const buf = await musicCardRenderer.createMusicCard({
        title: track?.info?.title || 'Unknown Title',
        artist: track?.info?.author || 'Unknown Artist',
        artworkUrl: track?.info?.artworkUrl || track?.pluginInfo?.artworkUrl || null,
        position: player?.position || 0,
        duration: track?.info?.duration || 0,
        source: track?.info?.sourceName || 'spotify',
        isLive: !track?.info?.duration || track.info.duration <= 0,
        requester: reqName
      });

      const attachment = new AttachmentBuilder(buf, { name: 'nowplaying.png' });
      embed.setImage('attachment://nowplaying.png');
      sentMsg = await channel.send({ embeds: [embed], files: [attachment], components: rows });
      if (player && sentMsg) {
        player.lastMessage = sentMsg;
        player.lastMessageId = sentMsg.id;
        player.lastChannelId = sentMsg.channel?.id || channel.id;
      }
      return sentMsg;
    } catch (e) {
      console.error('[MusicCard] Canvas render failed, falling back to embed:', e.message);
    }
  }

  sentMsg = await channel.send({ embeds: [embed], components: rows });
  if (player && sentMsg) {
    player.lastMessage = sentMsg;
    player.lastMessageId = sentMsg.id;
    player.lastChannelId = sentMsg.channel?.id || channel.id;
  }
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
 * Builds the Track Information Embed matching requested UI.
 */
function buildMusicPlayerEmbed(track, player) {
  const title = track?.info?.title || 'Unknown Track';
  const artist = track?.info?.author || 'Unknown Artist';
  const durationMs = track?.info?.duration || 0;
  const durationStr = formatDuration(durationMs);

  const { createDynamicBox } = require('../utils/boxBuilder');

  const boxText = createDynamicBox('TRACK INFORMATION', [
    { key: 'Title   ', value: title.length > 25 ? title.slice(0, 23) + '…' : title },
    { key: 'Artist  ', value: artist.length > 25 ? artist.slice(0, 23) + '…' : artist },
    { key: 'Duration', value: durationStr },
    { key: 'Playback', value: 'STREAMING NOW' }
  ]);

  return new EmbedBuilder()
    .setColor(0xFF007F)
    .setTitle(`${emojis.MUSIC || '🎶'} Now Playing`)
    .setDescription('```\n' + boxText + '\n```\n*Currently streaming in voice channel*');
}

const { isGuildPremium, isUserPremium } = require('./premium');

/**
 * Builds the STELLAR BEATS "Added to Queue" Card for playing next tracks matching requested UI.
 */
function buildAddedToQueueEmbed(track, position, author, guildId, queueLength) {
  const isPrem = (guildId && isGuildPremium(guildId)) || (author && isUserPremium(author.id));
  const maxQueue = isPrem ? 200 : 50;
  const queueType = isPrem ? 'Premium Tier ✨' : 'Standard Tier';
  const statusText = isPrem ? 'Premium active 👑' : 'Free Tier (50 max)';
  const footerNote = isPrem ? '*Premium features unlocked ⭐*' : '*Upgrade to Premium for 200 max queue*';

  const title = track?.info?.title || 'Unknown Track';
  const artist = track?.info?.author || 'Unknown Artist';
  const durationMs = track?.info?.duration || 0;
  const durationStr = formatDuration(durationMs);
  const artworkUrl = track?.info?.artworkUrl || 'https://i.imgur.com/8Q9Z9zG.png';

  return new EmbedBuilder()
    .setColor(isPrem ? 0x7289DA : 0xFF007F)
    .setTitle(`${emojis.MUSIC || '🎶'} Added to Queue`)
    .setThumbnail(artworkUrl)
    .setDescription(
      `### ${emojis.SPARKLES || '✨'} Track Information\n\n` +
      `• ${emojis.MUSIC || '🎵'} **Title:** ${title}\n` +
      `• ${emojis.AN_LYRICS || '🎤'} **Artist:** ${artist}\n` +
      `• ${emojis.AN_LOOP || '⏱️'} **Duration:** \`${durationStr}\`\n` +
      `• ${emojis.ANALYTICS_ZAP || '⚡'} **Status:** Position #${position}\n\n` +
      `*Track has been queued successfully*\n\n` +
      `---\n\n` +
      `### ${emojis.STATS || '📊'} Queue Information\n\n` +
      `• ${emojis.AN_STAR || '📍'} **Position:** #${position}\n` +
      `• ${emojis.OWNER_CROWN || '👑'} **Queue Type:** ${queueType}\n` +
      `• ${emojis.ANALYTICS_ZAP || '📈'} **Usage:** \`${queueLength}/${maxQueue} songs\`\n` +
      `• ${emojis.AN_STAR || '🌟'} **Status:** ${statusText}\n\n` +
      `${footerNote}`
    )
    .setTimestamp();
}

function buildAddedToQueueRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('queue_playnow')
      .setLabel('Play Now')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('queue_playnext')
      .setLabel('Play Next')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue_remove')
      .setLabel('Remove')
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Builds the exact 3-row 4-button grid layout + dropdown menus.
 */
function buildMusicActionRows(player = null) {
  const isAutoplay = player?.autoplay || false;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_prev').setEmoji(emojis.OBJ_AN_PREV || '⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji(emojis.OBJ_AN_SKIP || '⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji(emojis.OBJ_AN_STOP || '⏹️').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_loop').setEmoji(emojis.OBJ_AN_LOOP || '🔁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji(emojis.OBJ_AN_SHUFFLE || '🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_volup').setEmoji(emojis.OBJ_AN_VOLUME || '🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_clear').setEmoji(emojis.OBJ_AN_CLEAR || '🔄').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_autoplay').setEmoji(emojis.OBJ_AN_AUTOPLAY || '♾️').setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_fav_add').setEmoji(emojis.OBJ_AN_FAVORITE || '❤️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_fav_play').setEmoji(emojis.OBJ_AN_STAR || '⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_lyrics').setEmoji(emojis.OBJ_AN_LYRICS || '💬').setStyle(ButtonStyle.Secondary)
  );

  let suggestedOptions = [];

  if (player?.suggestedTracks && player.suggestedTracks.length) {
    suggestedOptions = player.suggestedTracks.map((t, idx) => {
      const label = t.info.title.length > 90 ? t.info.title.slice(0, 87) + '...' : t.info.title;
      const desc = t.info.author ? (t.info.author.length > 90 ? t.info.author.slice(0, 87) + '...' : `by ${t.info.author}`) : 'Recommended Song';
      return {
        label,
        value: `sug_dyn_${idx}`,
        description: desc,
        emoji: '✨'
      };
    });
  }

  if (!suggestedOptions.length) {
    suggestedOptions = [
      { label: 'Naruto Shippuden OP 3 - Blue Bird', value: 'sug_bluebird', description: 'Recommended Naruto Anime OST', emoji: '🍥' },
      { label: 'Naruto Shippuden OP 16 - Silhouette', value: 'sug_silhouette', description: 'Recommended Naruto Anime OST', emoji: '🍥' },
      { label: 'Naruto OST - Sadness and Sorrow', value: 'sug_sadness', description: 'Recommended Naruto Emotional Track', emoji: '🍥' },
      { label: 'Heeriye - Jasleen Royal & Arijit Singh', value: 'sug_heeriye', description: 'Trending Acoustic Pop', emoji: '✨' },
      { label: 'Tere Baare Mein Jab Socha - Jagjit Singh', value: 'sug_jagjit', description: 'Trending Ghazal Classic', emoji: '✨' }
    ];
  }

  const suggestedSelect = new StringSelectMenuBuilder()
    .setCustomId('music_suggested_select')
    .setPlaceholder('✨ Suggested songs...')
    .addOptions(suggestedOptions);

  const row4 = new ActionRowBuilder().addComponents(suggestedSelect);

  const filterSelect = new StringSelectMenuBuilder()
    .setCustomId('music_filter_select')
    .setPlaceholder('✨ Select a music filter to apply...')
    .setMinValues(1)
    .setMaxValues(5)
    .addOptions([
      { label: 'Reset Filters', value: 'filter_reset', description: 'Disable all active audio effects', emoji: emojis.OBJ_AN_RESET_FILTER || '🚫' },
      { label: 'Bass Boost', value: 'filter_bassboost', description: 'Deep, rich low-frequency amplification', emoji: emojis.OBJ_AN_BASSBOOST || '🔊' },
      { label: '8D Audio', value: 'filter_8d', description: 'Immersive 360-degree spatial audio panning', emoji: emojis.OBJ_AN_8D_AUDIO || '🎧' },
      { label: 'Nightcore', value: 'filter_nightcore', description: 'Upbeat tempo & increased vocal pitch', emoji: emojis.OBJ_AN_NIGHTCORE || '🌙' },
      { label: 'Vaporwave', value: 'filter_vaporwave', description: 'Slowed aesthetic retro synthwave vibe', emoji: emojis.OBJ_AN_VAPORWAVE || '☁️' }
    ]);

  const row5 = new ActionRowBuilder().addComponents(filterSelect);

  return [row1, row2, row3, row4, row5];
}

function parseTimeToMs(timeStr) {
  if (!timeStr) return null;
  if (/^\d+$/.test(timeStr)) return parseInt(timeStr) * 1000;
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
  description: 'Synn Lavalink Complete Music Suite',
  aliases: [
    'm', 'play', 'p', 'stop', 'pause', 'resume',
    'skip', 's', 'previous', 'prev', 'replay',
    'queue', 'q', 'np', 'nowplaying', 'loop', 'repeat',
    'shuffle', 'volume', 'vol', 'clear', 'remove', 'move',
    'skipto', 'jump', 'join', 'connect', 'dc', 'leave',
    'afk247', '247', 'seek', 'equalizer', 'eq', 'filter', 'filters',
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

    // 1. PLAY (.play, .p, .play yt/ytm/sc/sp/am/dz)
    if (['play', 'p'].includes(invoked) || (invoked === 'music' && args[0] === 'play')) {
      if (!voiceState?.channel) {
        return message.reply(`${emojis.WARNING} You must be in a Voice Channel to play music!`);
      }

      let rawArgs = (['play', 'p'].includes(invoked) ? args : args.slice(1));
      if (!rawArgs.length) {
        return message.reply(
          `${emojis.WARNING} **Usage:** \`.play <song title / URL / preset>\`\n` +
          `**Explicit Sources:** \`.play sp <query>\` (Spotify), \`.play yt <query>\` (YouTube), \`.play ytm <query>\` (YT Music), \`.play sc <query>\` (SoundCloud), \`.play am <query>\` (Apple Music), \`.play dz <query>\` (Deezer)\n` +
          `**Presets:** \`bluebird\`, \`silhouette\`, \`sadness\`, \`theme\`, \`wind\`, \`hero\``
        );
      }

      let source = null;
      let query = rawArgs.join(' ');

      const firstArg = rawArgs[0].toLowerCase();
      if (['sp', 'spotify'].includes(firstArg)) {
        source = 'spsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['yt', 'youtube'].includes(firstArg)) {
        source = 'ytsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['ytm', 'ytmusic'].includes(firstArg)) {
        source = 'ytmsearch';
        query = rawArgs.slice(1).join(' ');
      } else if (['sc', 'soundcloud'].includes(firstArg)) {
        source = 'scsearch';
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
            res = await player.search({ query }, author);
          } else if (source) {
            res = await player.search({ query, source }, author);
          } else {
            const sources = ['spsearch', 'ytmsearch', 'ytsearch', 'scsearch', 'amsearch', 'dzsearch'];
            for (const s of sources) {
              try {
                res = await player.search({ query, source: s }, author);
                if (res && res.tracks && res.tracks.length) break;
              } catch (e) {}
            }
          }

          if (!res || !res.tracks || !res.tracks.length) {
            return message.reply(`${emojis.WARNING} No tracks found for **${query}**.`);
          }

          const isPrem = isGuildPremium(message.guild.id) || isUserPremium(author.id);
          const maxQueue = isPrem ? 200 : 50;
          const currentQueueCount = player.queue.tracks.length;

          // Handle Playlists & Albums
          if (res.loadType === 'playlist' || res.playlist) {
            const playlistName = res.playlist?.name || res.playlistInfo?.name || 'Playlist';
            const roomLeft = maxQueue - currentQueueCount;

            if (roomLeft <= 0) {
              return message.reply(`${emojis.WARNING} **Queue Limit Reached!** ${isPrem ? 'Premium limit is **200 songs**.' : 'Free Tier limit is **50 songs**. Upgrade to **Premium** (\`.premium\`) to queue up to **200 songs**!'}`);
            }

            const tracksToAdd = res.tracks.slice(0, roomLeft);
            await player.queue.add(tracksToAdd);

            if (!player.playing && !player.paused) {
              await player.play();
            }

            return message.reply(`🎶 **Queued Playlist:** Added **${tracksToAdd.length} tracks** from **${playlistName}** to queue! (Queue Usage: \`${player.queue.tracks.length}/${maxQueue}\`)`);
          }

          // Single Track Playback
          if (currentQueueCount >= maxQueue) {
            return message.reply(`${emojis.WARNING} **Queue Limit Reached!** ${isPrem ? 'Premium limit is **200 songs**.' : 'Free Tier limit is **50 songs**. Upgrade to **Premium** (\`.premium\`) to queue up to **200 songs**!'}`);
          }

          const track = res.tracks[0];
          await player.queue.add(track);

          if (!player.playing && !player.paused) {
            await player.play();
            try {
              if (message.deletable) await message.delete().catch(() => {});
            } catch (e) {}
            return;
          } else {
            const addedEmbed = buildAddedToQueueEmbed(track, player.queue.tracks.length, author, message.guild.id, player.queue.tracks.length);
            const addedRow = buildAddedToQueueRow();
            const addedMsg = await message.reply({ embeds: [addedEmbed], components: [addedRow] }).catch(() => {});
            if (player && addedMsg) {
              player.tempMessages = player.tempMessages || [];
              player.tempMessages.push(addedMsg);
              setTimeout(() => {
                addedMsg.delete().catch(() => {});
              }, 12000);
            }
            return addedMsg;
          }
        } catch (err) {
          console.error('[Music Play Error]', err.message || err);
          return message.reply(`${emojis.ERROR} Could not play track: **${err.message || 'Search Error'}**. Please try another title or URL.`);
        }
      }

      return message.reply(`${emojis.WARNING} Lavalink nodes are currently connecting. Please try again in a few seconds.`);
    }

    // 2. PAUSE / RESUME
    if (['pause', 'resume'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player.`);

      if (invoked === 'pause' || !player.paused) {
        await player.pause();
        return message.reply('⏸️ **Paused** music playback.');
      } else {
        await player.resume();
        return message.reply('▶️ **Resumed** music playback.');
      }
    }

    // 3. SKIP / PREVIOUS / SKIPTO
    if (['skip', 's', 'next'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player || (!player.playing && !player.paused)) return message.reply(`${emojis.WARNING} No track currently playing.`);
      await player.skip();
      return message.reply('⏭️ **Skipped** to next track.');
    }

    if (['previous', 'prev', 'replay'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player.`);
      if (player.queue.previous && player.queue.previous.length) {
        const prevTrack = player.queue.previous[player.queue.previous.length - 1];
        await player.queue.add(prevTrack, 0);
        await player.skip();
        return message.reply(`⏮️ **Replaying Previous Track:** ${prevTrack.info.title}`);
      }
      await player.seek(0);
      return message.reply('⏮️ Replayed current track from beginning.');
    }

    if (['skipto', 'jump'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player.`);
      const pos = parseInt(args[0]);
      if (isNaN(pos) || pos < 1 || pos > player.queue.tracks.length) {
        return message.reply(`${emojis.WARNING} Invalid queue position. Use \`.skipto <number>\` (1-${player.queue.tracks.length}).`);
      }
      player.queue.splice(0, pos - 1);
      await player.skip();
      return message.reply(`⏭️ **Skipped to Track #${pos}** in queue.`);
    }

    // 4. STOP / DISCONNECT / LEAVE
    if (['stop', 'dc', 'leave'].includes(invoked)) {
      if (lavalink) {
        const player = lavalink.getPlayer(guildId);
        if (player) await player.destroy().catch(() => {});
      }
      try {
        const { getVoiceConnection } = require('@discordjs/voice');
        const conn = getVoiceConnection(guildId);
        if (conn) conn.destroy();
      } catch (e) {}
      return message.reply('⏹️ Music player stopped, queue cleared, and disconnected.');
    }

    // 5. JOIN / CONNECT
    if (['join', 'connect'].includes(invoked)) {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} Join a voice channel first!`);
      const channel = voiceState.channel;

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
          } catch (e) {}
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
        return message.reply(`🔊 **Joined Voice Channel:** Successfully connected to <#${channel.id}>!`);
      } catch (err) {
        return message.reply(`${emojis.ERROR} Failed to join voice channel: ${err.message}`);
      }
    }

    // 6. QUEUE LIST (.queue, .q)
    if (['queue', 'q'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player || (!player.queue.current && !player.queue.tracks.length)) {
        return message.reply(`${emojis.WARNING} The music queue is currently empty!`);
      }

      const current = player.queue.current;
      const upcoming = player.queue.tracks;

      let desc = `**Now Playing:**\n🎵 **[${current?.info?.title || 'Unknown'}](${current?.info?.uri || 'https://spotify.com'})** — \`${formatDuration(current?.info?.duration)}\`\n\n`;

      if (upcoming.length) {
        desc += `**Up Next (${upcoming.length} songs):**\n`;
        const lines = upcoming.slice(0, 10).map((t, i) => `\`${i + 1}.\` **[${t.info.title}](${t.info.uri || 'https://spotify.com'})** — \`${formatDuration(t.info.duration)}\``);
        desc += lines.join('\n');
        if (upcoming.length > 10) desc += `\n\n*...and ${upcoming.length - 10} more songs in queue.*`;
      } else {
        desc += `*No upcoming tracks in queue.*`;
      }

      const queueEmbed = createStyledEmbed({
        title: `🎶 Music Queue — ${message.guild.name}`,
        description: desc,
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [queueEmbed] });
    }

    // 7. NOW PLAYING (.np, .nowplaying)
    if (['np', 'nowplaying'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (player && player.queue.current) {
        return await sendMusicCard(message.channel, player.queue.current, player);
      }
      return message.reply(`${emojis.WARNING} No track currently playing.`);
    }

    // 8. LOOP / REPEAT (.loop, .repeat)
    if (['loop', 'repeat'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player.`);

      if (player.repeatMode === 'off') {
        player.setRepeatMode('track');
        return message.reply('🔂 **Loop Mode:** Track Repeat (Current song will repeat).');
      } else if (player.repeatMode === 'track') {
        player.setRepeatMode('queue');
        return message.reply('🔁 **Loop Mode:** Queue Repeat (Entire queue will repeat).');
      } else {
        player.setRepeatMode('off');
        return message.reply('➡️ **Loop Mode:** Disabled (Normal playback).');
      }
    }

    // 9. SHUFFLE (.shuffle)
    if (['shuffle'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player || !player.queue.tracks.length) return message.reply(`${emojis.WARNING} Queue is empty or has only 1 track.`);
      player.queue.shuffle();
      return message.reply('🔀 **Shuffled** the queue randomly!');
    }

    // 10. CLEAR QUEUE (.clear)
    if (['clear'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player.`);
      player.queue.clear();
      return message.reply('🔄 **Cleared** all upcoming songs in queue.');
    }

    // 11. REMOVE / MOVE (.remove 3, .move 5 2)
    if (['remove', 'del'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player || !player.queue.tracks.length) return message.reply(`${emojis.WARNING} Queue is empty.`);
      const idx = parseInt(args[0]) - 1;
      if (isNaN(idx) || idx < 0 || idx >= player.queue.tracks.length) {
        return message.reply(`${emojis.WARNING} Invalid song index. Usage: \`.remove <position>\` (1-${player.queue.tracks.length}).`);
      }
      const removed = player.queue.tracks.splice(idx, 1)[0];
      return message.reply(`🗑️ Removed **${removed.info.title}** from queue.`);
    }

    if (['move'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player || !player.queue.tracks.length) return message.reply(`${emojis.WARNING} Queue is empty.`);
      const from = parseInt(args[0]) - 1;
      const to = parseInt(args[1]) - 1;
      if (isNaN(from) || isNaN(to) || from < 0 || from >= player.queue.tracks.length || to < 0 || to >= player.queue.tracks.length) {
        return message.reply(`${emojis.WARNING} Usage: \`.move <from position> <to position>\` (e.g. \`.move 4 1\`).`);
      }
      const item = player.queue.tracks.splice(from, 1)[0];
      player.queue.tracks.splice(to, 0, item);
      return message.reply(`📦 Moved **${item.info.title}** to position **#${to + 1}**.`);
    }

    // 12. VOLUME CONTROL (.volume 1-200)
    if (['vol', 'volume'].includes(invoked)) {
      const volNum = parseInt(args[0]);
      if (isNaN(volNum)) return message.reply(`🔊 Usage: \`.volume <1-200>\` (e.g. \`.volume 120\`).`);
      const targetVol = Math.min(Math.max(1, volNum), 200);
      const player = lavalink?.getPlayer(guildId);
      if (player) await player.setVolume(targetVol);
      return message.reply(`🔊 Volume set to **${targetVol}%**.`);
    }

    // 13. SEEK COMMAND (.seek 1:30)
    if (['seek'].includes(invoked)) {
      const targetTime = args[0];
      if (!targetTime) return message.reply(`${emojis.WARNING} Usage: \`.seek <1:30 / 90>\`.`);
      const targetMs = parseTimeToMs(targetTime);
      if (targetMs === null) return message.reply(`${emojis.WARNING} Invalid format. Use e.g. \`1:30\` or \`90\` (seconds).`);
      const player = lavalink?.getPlayer(guildId);
      if (!player || !player.queue.current) return message.reply(`${emojis.WARNING} No track currently playing.`);
      try {
        await player.seek(targetMs);
        return message.reply(`⏩ Seeked to timestamp **${formatDuration(targetMs)}**.`);
      } catch (e) {
        return message.reply(`⏩ Jumped to position **${formatDuration(targetMs)}**.`);
      }
    }

    // 14. EQUALIZER / AUDIO FILTERS (.filter / .eq)
    if (['equalizer', 'eq', 'filter', 'filters'].includes(invoked)) {
      const inputFilters = args.map(a => a.toLowerCase());
      if (!inputFilters.length || inputFilters.includes('list')) {
        return message.reply(
          `🎛️ **Available Audio Filters:**\n` +
          `• \`bassboost\` — Deep bass amplification\n` +
          `• \`8d\` — Immersive spatial panning\n` +
          `• \`nightcore\` — High pitch & upbeat tempo\n` +
          `• \`vaporwave\` — Slowed retro synthwave\n` +
          `• \`reset\` — Clear all active filters\n\n` +
          `**Usage:** \`.eq bassboost 8d\``
        );
      }
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player.`);
      if (inputFilters.includes('reset') || inputFilters.includes('clear')) {
        try {
          if (player.filterManager) await player.filterManager.resetFilters();
        } catch (e) {}
        return message.reply(`🎛️ Reset all audio filters to default.`);
      }
      const applied = [];
      for (const f of inputFilters) {
        try {
          if (f === 'bassboost' && player.filterManager) { await player.filterManager.setBassboost(true); applied.push('Bass Boost'); }
          else if (f === 'nightcore' && player.filterManager) { await player.filterManager.setNightcore(true); applied.push('Nightcore'); }
          else if (f === '8d' && player.filterManager) { await player.filterManager.set8D(true); applied.push('8D Audio'); }
          else if (f === 'vaporwave' && player.filterManager) { await player.filterManager.setVaporwave(true); applied.push('Vaporwave'); }
        } catch (e) {}
      }
      return message.reply(`🎛️ Applied audio filters: **${applied.join(', ') || 'Updated'}**!`);
    }

    // 15. 24/7 AFK MODE (.247)
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

    // 16. AUTOPLAY (.autoplay, .ap)
    if (['autoplay', 'ap'].includes(invoked)) {
      const player = lavalink?.getPlayer(guildId);
      if (!player) return message.reply(`${emojis.WARNING} No active music player!`);
      player.autoplay = !player.autoplay;
      const status = player.autoplay ? '🟢 **ENABLED**' : '🔴 **DISABLED**';
      return message.reply(`♾️ **Autoplay Mode:** ${status}! ${player.autoplay ? '(Auto-queuing recommended tracks when queue ends)' : ''}`);
    }

    // 17. FAVORITES (.fav add/list/remove/play)
    if (['fav', 'favorite', 'favorites'].includes(invoked)) {
      const db = require('../database/db');
      const sub = args[0]?.toLowerCase() || 'list';

      if (sub === 'add') {
        const player = lavalink?.getPlayer(guildId);
        const currentTrack = player?.queue?.current;
        if (!currentTrack) return message.reply(`${emojis.WARNING} No track currently playing to add to favorites!`);
        const res = db.addFavorite(author.id, currentTrack);
        if (!res.added) return message.reply(`${emojis.WARNING} ${res.message}`);
        return message.reply(`❤️ **Saved to Favorites:** [${res.favorite.title}](${res.favorite.uri}) (Total: ${res.total} tracks).`);
      }

      if (sub === 'remove' || sub === 'del') {
        const idx = parseInt(args[1]) - 1;
        if (isNaN(idx)) return message.reply(`${emojis.WARNING} Usage: \`.fav remove <number>\`.`);
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
            let res = await player.search({ query: f.uri || f.title, source: 'spsearch' }, author);
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

      const favs = db.getFavorites(author.id);
      if (!favs.length) return message.reply(`💔 **Your Favorites List is Empty!**\nUse \`.fav add\` while listening to save songs.`);
      const listStr = favs.map((f, i) => `\`${i + 1}.\` **[${f.title}](${f.uri})** — *${f.author}*`).slice(0, 15).join('\n');
      const favEmbed = createStyledEmbed({
        title: `❤️ Your Favorite Songs (${favs.length})`,
        description: listStr + (favs.length > 15 ? `\n*...and ${favs.length - 15} more tracks.*` : '') + `\n\n💡 *Use \`.fav play\` to queue all favorites, or \`.fav remove <#>\` to delete.*`,
        requestedBy: author,
        clientUser
      });
      return message.reply({ embeds: [favEmbed] });
    }

    const embed = createStyledEmbed({
      title: `🎶 Music Player Suite & Control Panel`,
      subtitle: `High-Fidelity Lavalink Music Control Suite`,
      description:
        `Welcome **${author.username}**! Below are the available **Music Player** commands.\n\n` +
        `**🎵 Player Controls**\n` +
        `\`\`\`\n` +
        `.play <song/URL> - Play song or YouTube/Spotify link\n` +
        `.pause / .resume - Pause or resume playback\n` +
        `.skip / .prev    - Skip current song or play previous\n` +
        `.stop / .clear   - Stop playback or clear queue\n` +
        `.volume <1-150>  - Set playback volume\n` +
        `\`\`\`\n\n` +
        `**🎶 Queue & Track Info**\n` +
        `\`\`\`\n` +
        `.queue           - View server music queue\n` +
        `.nowplaying / .np- View currently playing song\n` +
        `.loop <track|q>  - Toggle track or queue looping\n` +
        `.shuffle         - Shuffle queue tracks\n` +
        `.seek <seconds>  - Seek to specific timestamp\n` +
        `\`\`\`\n\n` +
        `**✨ Advanced Features**\n` +
        `\`\`\`\n` +
        `.247             - Toggle 24/7 Voice Channel Stay\n` +
        `.autoplay        - Toggle smart autoplay recommendations\n` +
        `.filter <preset> - Apply audio filters (bassboost, 8d, etc.)\n` +
        `.fav add/list    - Save & play favorite tracks\n` +
        `\`\`\``,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
