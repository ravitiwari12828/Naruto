const emojis = require('../utils/emojis');
const { LavalinkManager } = require('lavalink-client');

let lavalink = null;

function initLavalink(client) {
  lavalink = new LavalinkManager({
    nodes: [
      {
        id: 'synn-node-main',
        host: process.env.LAVALINK_HOST || 'usa5.kerit.cloud',
        port: parseInt(process.env.LAVALINK_PORT) || 9013,
        authorization: process.env.LAVALINK_PASSWORD || '781312113c683e27',
        secure: process.env.LAVALINK_SECURE === 'true',
        retryAmount: 15,
        retryDelay: 5000
      }
    ],
    sendToShard: (guildId, payload) => {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          if (guild.shard && typeof guild.shard.send === 'function') {
            guild.shard.send(payload);
          } else if (client.ws && client.ws.shards) {
            const shard = client.ws.shards.get(guild.shardId || 0);
            if (shard && typeof shard.send === 'function') {
              shard.send(payload);
            }
          }
        }
      } catch (e) {}
    },
    client: {
      id: client.user.id,
      username: client.user.username
    },
    autoSkip: true,
    autoSkipOnResolveError: true,
    playerOptions: {
      defaultSearchPlatform: 'scsearch',
      applyVolumeAsFilter: true,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false
      }
    },
    queueOptions: {
      maxPreviousTracks: 20
    }
  });

  lavalink.nodeManager.on('connect', (node) => {
    console.log(`<a:musicplayer_animated:1537177445428633762> [Lavalink] Connected to Lavalink node: ${node.id} (${node.options.host}:${node.options.port})`);
  });

  lavalink.nodeManager.on('disconnect', (node, reason) => {
    console.log(`${emojis.WARNING} [Lavalink] Node disconnected from ${node.id}:`, reason?.message || reason);
  });

  lavalink.nodeManager.on('reconnecting', (node) => {
    console.log(`🔄 [Lavalink] Reconnecting to Lavalink node ${node.id}...`);
  });

  lavalink.nodeManager.on('error', (node, error) => {
    const errCode = error?.code || error?.message || 'Connection glitch';
    console.log(`<a:wrong_animated:1537179702928875631> [Lavalink Connection] Node ${node.id} network check (${errCode}) - Auto-reconnecting...`);
  });

  // Forward raw gateway voice packets to Lavalink
  client.on('raw', (d) => {
    try {
      lavalink.sendRawData(d);
    } catch (e) {}
  });

  // ─────────────────────────────────────────
  // SYNN REFERENCE AUTOPLAY ENGINE (Last.fm + Multi-Source Fallback Pool)
  // ─────────────────────────────────────────
  const LASTFM_API_KEY = '478947eed2f2b1dfa0c1306ca16700a7';
  const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

  function normalizeTrackTitle(title) {
    if (!title) return '';
    let core = title;
    const cutMatch = core.match(/\s*[\(\[|]|\s+-\s+|\s+[–—]\s+|\s+(ft\.?|feat\.?|prod\.?)\s+/i);
    if (cutMatch && cutMatch.index > 0) {
      core = core.slice(0, cutMatch.index);
    }
    const iSepMatch = core.match(/\s+I\s+/);
    if (iSepMatch && iSepMatch.index > 0) {
      core = core.slice(0, iSepMatch.index);
    }
    return core
      .toLowerCase()
      .replace(/\b(official|video|audio|lyrics?|lyric|remix|lofi|slowed|reverb|reverbed|extended|full song|with lyrics|mv|hd|4k|8d|cover|reprise|acoustic|version)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function fetchLastFmSimilarTracks(artist, title) {
    if (!artist || !title) return [];
    try {
      const params = new URLSearchParams({
        method: 'track.getsimilar',
        artist: artist,
        track: title,
        api_key: LASTFM_API_KEY,
        format: 'json',
        autocorrect: '1',
        limit: '30'
      });
      const res = await fetch(`${LASTFM_BASE_URL}?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const similarTracks = data.similartracks?.track;
      if (!similarTracks) return [];
      const list = Array.isArray(similarTracks) ? similarTracks : [similarTracks];
      return list.map(t => ({
        artist: t.artist?.name || t.artist || '',
        name: t.name || ''
      })).filter(t => t.name && t.artist);
    } catch (e) {
      return [];
    }
  }

  async function fetchFallbackSimilarTracks(artist, player, client) {
    if (!artist) return [];
    const queries = [
      `scsearch:${artist} mix`,
      `spsearch:${artist} radio`,
      `scsearch:${artist} best songs`
    ];
    const candidates = [];
    for (const q of queries) {
      try {
        const res = await player.search({ query: q }, client.user);
        if (res?.tracks?.length) {
          candidates.push(...res.tracks.slice(0, 5));
        }
      } catch (e) {}
    }
    return candidates;
  }

  async function handleAutoplay(player, lastTrack, client) {
    if (!player || player.isAutoplaySearching) return;
    player.isAutoplaySearching = true;

    if (!player.autoplayHistory) player.autoplayHistory = new Set();
    const artist = lastTrack?.info?.author || '';
    const title = lastTrack?.info?.title || '';
    const normLastTitle = normalizeTrackTitle(title);

    if (lastTrack?.info?.identifier) player.autoplayHistory.add(lastTrack.info.identifier);
    if (normLastTitle) player.autoplayHistory.add(normLastTitle);

    console.log(`♾️ [Autoplay Engine] Finding recommendations for "${title}" by "${artist}"...`);

    try {
      const candidates = [];

      // 1. Last.fm Similar Tracks Search
      const lastFmRecs = await fetchLastFmSimilarTracks(artist, title);
      for (const rec of lastFmRecs.slice(0, 15)) {
        try {
          const q = `scsearch:${rec.artist} ${rec.name}`;
          let res = await player.search({ query: q }, client.user);
          if (!res?.tracks?.length) {
            res = await player.search({ query: `spsearch:${rec.artist} ${rec.name}` }, client.user);
          }
          if (res?.tracks?.length) {
            candidates.push(res.tracks[0]);
          }
        } catch (e) {}
      }

      // 2. Fallback Multi-Query Search if Last.fm candidate count is low
      if (candidates.length < 5) {
        const fallbackTracks = await fetchFallbackSimilarTracks(artist, player, client);
        candidates.push(...fallbackTracks);
      }

      // 3. Filter candidate tracks against history & duplicates
      const validTracks = [];
      for (const cand of candidates) {
        const cId = cand.info?.identifier;
        const cNormTitle = normalizeTrackTitle(cand.info?.title);

        if (cId && player.autoplayHistory.has(cId)) continue;
        if (cNormTitle && player.autoplayHistory.has(cNormTitle)) continue;

        if (cId) player.autoplayHistory.add(cId);
        if (cNormTitle) player.autoplayHistory.add(cNormTitle);

        validTracks.push(cand);
        if (validTracks.length >= 5) break;
      }

      if (validTracks.length > 0) {
        for (const trk of validTracks) {
          await player.queue.add(trk);
        }

        console.log(`▶️ [Autoplay Engine] Successfully added ${validTracks.length} recommendation tracks to queue.`);

        if (!player.playing && !player.paused) {
          await player.play().catch(() => {});
        }

        if (player.textChannelId) {
          const channel = client.channels.cache.get(player.textChannelId) || await client.channels.fetch(player.textChannelId).catch(() => null);
          if (channel) {
            const addedNames = validTracks.slice(0, 3).map((t, i) => `\`${i + 1}.\` **[${t.info.title}](${t.info.uri || 'https://spotify.com'})** by \`${t.info.author}\``).join('\n');
            channel.send(`♾️ **Autoplay Active:** Added ${validTracks.length} similar tracks to queue:\n${addedNames}`).catch(() => {});
          }
        }
      } else {
        console.warn('[Autoplay Engine] No new unique recommendation candidates found.');
      }
    } catch (err) {
      console.error('[Autoplay Engine Error]', err.message || err);
    } finally {
      setTimeout(() => { player.isAutoplaySearching = false; }, 3000);
    }
  }

  lavalink.on('trackEnd', async (player, track, reason) => {
    if (!player) return;

    const reasonStr = typeof reason === 'object' ? (reason?.reason || '') : String(reason || '');
    const cleanReason = reasonStr.toLowerCase();
    if (cleanReason === 'replaced' || cleanReason === 'stopped') return;

    player.lastPlayedTrack = track;

    const musicCmd = client.commands?.get('music');
    const autoplayStore = musicCmd?.autoplayStore;
    const isAutoplay = player.autoplay || (autoplayStore ? autoplayStore.get(player.guildId) : false);

    if (isAutoplay && player.queue.tracks.length === 0) {
      await handleAutoplay(player, track, client);
    }
  });

  // 🎧 HELPER: DYNAMIC VOICE CHANNEL STATUS AUTO-SETTER
  async function updateVoiceChannelStatus(player, track) {
    if (!player || !player.voiceChannelId) return;
    try {
      const songTitle = track?.info?.title || 'Unknown Song';
      const artistName = track?.info?.author || 'Unknown Artist';
      let statusText = `<a:musicplayer_animated:1537177445428633762> ${songTitle} - ${artistName}`;
      if (statusText.length > 500) statusText = statusText.slice(0, 497) + '...';

      const vcId = player.voiceChannelId;
      const vcChannel = client.channels.cache.get(vcId) || await client.channels.fetch(vcId).catch(() => null);
      if (vcChannel) {
        if (typeof vcChannel.setVoiceStatus === 'function') {
          await vcChannel.setVoiceStatus(statusText).catch(() => {});
        } else {
          const { Routes } = require('discord.js');
          await client.rest.put(Routes.channelVoiceStatus(vcId), {
            body: { status: statusText }
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('[VoiceStatus Set Error]:', e.message);
    }
  }

  async function clearVoiceChannelStatus(player) {
    if (!player || !player.voiceChannelId) return;
    try {
      const vcId = player.voiceChannelId;
      const vcChannel = client.channels.cache.get(vcId) || await client.channels.fetch(vcId).catch(() => null);
      if (vcChannel) {
        if (typeof vcChannel.setVoiceStatus === 'function') {
          await vcChannel.setVoiceStatus('').catch(() => {});
        } else {
          const { Routes } = require('discord.js');
          await client.rest.put(Routes.channelVoiceStatus(vcId), {
            body: { status: '' }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  // ─────────────────────────────────────────
  // TRACK START: Send STELLAR BEATS card & set Voice Channel Status
  // ─────────────────────────────────────────
  lavalink.on('trackStart', async (player, track) => {
    if (!player) return;

    // Enforce 100% audio output volume
    await player.setVolume(100).catch(() => {});

    // Automatically set Voice Channel Status: <a:musicplayer_animated:1537177445428633762> Song Name - Artist Name
    await updateVoiceChannelStatus(player, track);

    if (!player.textChannelId) return;
    try {
      // Dynamically fetch 5 recommended songs matching current track's artist/genre
      const artist = track?.info?.author || '';
      const title = track?.info?.title || '';
      const searchQuery = `${artist} top hits song`.trim();

      try {
        let res = await player.search({ query: searchQuery, source: 'spsearch' }, client.user);
        if (!res || !res.tracks || !res.tracks.length) {
          res = await player.search({ query: searchQuery, source: 'ytmsearch' }, client.user);
        }

        if (res && res.tracks && res.tracks.length) {
          player.suggestedTracks = res.tracks
            .filter(t => t.info.identifier !== track?.info?.identifier)
            .slice(0, 5);
        }
      } catch (e) {}

      const channel = client.channels.cache.get(player.textChannelId) || await client.channels.fetch(player.textChannelId).catch(() => null);
      if (channel) {
        const musicCmd = client.commands?.get('music');
        if (musicCmd && musicCmd.sendMusicCard) {
          await musicCmd.sendMusicCard(channel, track, player);
        }
      }
    } catch (e) {}
  });

  // ─────────────────────────────────────────
  // QUEUE END: Handle queue completion & 24/7 AFK persistence
  // ─────────────────────────────────────────
  lavalink.on('queueEnd', async (player) => {
    if (!player) return;

    // Clear Voice Channel Status
    await clearVoiceChannelStatus(player);

    if (!player.textChannelId) return;

    const musicCmd = client.commands?.get('music');
    const autoplayStore = musicCmd?.autoplayStore;
    const isAutoplay = player.autoplay || (autoplayStore ? autoplayStore.get(player.guildId) : false);

    // If Autoplay is enabled, attempt to fetch autoplay tracks on queue end
    if (isAutoplay && player.lastPlayedTrack) {
      await handleAutoplay(player, player.lastPlayedTrack, client);
      if (player.queue.tracks.length > 0 || player.playing) return;
    }

    try {
      const channel = client.channels.cache.get(player.textChannelId);
      const afkStore = musicCmd?.afkStore;
      const isAfk247 = afkStore ? afkStore.has(player.guildId) : false;

      if (channel) {
        channel.send(`<a:musicplayer_animated:1537177445428633762> **Queue Ended:** All songs have finished playing. ${isAfk247 ? '*(24/7 AFK Mode Active)*' : ''}`).catch(() => {});
      }

      // If 24/7 mode is NOT active, auto-disconnect after 2 minutes of idle
      if (!isAfk247) {
        setTimeout(async () => {
          if (player && !player.playing && !player.paused && player.queue.tracks.length === 0) {
            await player.destroy().catch(() => {});
            if (channel) channel.send(`<a:wave_animated:1537179697421492304> Left voice channel due to inactivity.`).catch(() => {});
          }
        }, 120000);
      }
    } catch (e) {}
  });

  // ─────────────────────────────────────────
  // TRACK ERROR & STUCK HANDLERS: Smooth auto-skip
  // ─────────────────────────────────────────
  lavalink.on('trackError', async (player, track, payload) => {
    console.error(`${emojis.WARNING} [Lavalink Track Error] ${track?.info?.title}:`, payload?.exception?.message || payload);
    if (!player) return;

    if (player.isHandlingError) return;
    player.isHandlingError = true;

    try {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        channel.send(`${emojis.WARNING} **Playback Warning:** Could not stream \`${track?.info?.title || 'Track'}\`. Auto-skipping...`).catch(() => {});
      }
      if (player.queue.tracks.length > 0) {
        await player.skip().catch(() => {});
      } else {
        await player.stopPlaying().catch(() => {});
      }
    } catch (e) {
    } finally {
      setTimeout(() => { player.isHandlingError = false; }, 3000);
    }
  });

  lavalink.on('trackStuck', async (player, track, payload) => {
    console.warn(`${emojis.WARNING} [Lavalink Track Stuck] ${track?.info?.title}`);
    if (!player) return;
    if (player.isHandlingError) return;
    player.isHandlingError = true;

    try {
      if (player.queue.tracks.length > 0) {
        await player.skip().catch(() => {});
      }
    } catch (e) {
    } finally {
      setTimeout(() => { player.isHandlingError = false; }, 3000);
    }
  });

  // ─────────────────────────────────────────
  // PLAYER DESTROY: Clean up last message reference & voice status
  // ─────────────────────────────────────────
  lavalink.on('playerDestroy', async (player) => {
    if (player) {
      await clearVoiceChannelStatus(player);
      if (player.lastMessage) {
        try {
          await player.lastMessage.delete().catch(() => {});
          player.lastMessage = null;
        } catch (e) {}
      }
    }
  });

  try {
    lavalink.init({ id: client.user.id, username: client.user.username });
  } catch (e) {}

  return lavalink;
}

function getLavalink() {
  return lavalink;
}

module.exports = {
  initLavalink,
  getLavalink
};
