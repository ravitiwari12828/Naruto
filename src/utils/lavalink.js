const { LavalinkManager } = require('lavalink-client');

let lavalink = null;

function initLavalink(client) {
  lavalink = new LavalinkManager({
    nodes: [
      {
        id: 'node-jirayu',
        host: 'lavalink.jirayu.net',
        port: 443,
        authorization: 'youshallnotpass',
        secure: true,
        retryAmount: 15,
        retryDelay: 3000
      },
      {
        id: 'node-vost',
        host: 'lavalink.vost.pt',
        port: 443,
        authorization: 'youshallnotpass',
        secure: true,
        retryAmount: 10,
        retryDelay: 3000
      },
      {
        id: 'node-ajie',
        host: 'lava-v4.ajiehospitality.me',
        port: 443,
        authorization: 'ajiehospitality',
        secure: true,
        retryAmount: 10,
        retryDelay: 3000
      },
      {
        id: 'node-devamop',
        host: 'lavalink.devamop.ru',
        port: 443,
        authorization: 'youshallnotpass',
        secure: true,
        retryAmount: 10,
        retryDelay: 3000
      },
      {
        id: 'synn-node-main',
        host: process.env.LAVALINK_HOST || 'usa5.kerit.cloud',
        port: parseInt(process.env.LAVALINK_PORT) || 9013,
        authorization: process.env.LAVALINK_PASSWORD || '781312113c683e27',
        secure: process.env.LAVALINK_SECURE === 'true',
        retryAmount: 10,
        retryDelay: 3000
      }
    ],
    sendToShard: (guildId, payload) => {
      client.guilds.cache.get(guildId)?.shard?.send(payload);
    },
    client: {
      id: client.user.id,
      username: client.user.username
    },
    autoSkip: true,
    autoSkipOnResolveError: true,
    playerOptions: {
      defaultSearchPlatform: 'spsearch',
      applyVolumeAsFilter: false,
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
    console.log(`🎵 [Lavalink] Connected to Lavalink node: ${node.id} (${node.options.host}:${node.options.port})`);
  });

  lavalink.nodeManager.on('disconnect', (node, reason) => {
    console.log(`⚠️ [Lavalink] Node disconnected from ${node.id}:`, reason?.message || reason);
  });

  lavalink.nodeManager.on('reconnecting', (node) => {
    console.log(`🔄 [Lavalink] Reconnecting to Lavalink node ${node.id}...`);
  });

  lavalink.nodeManager.on('error', (node, error) => {
    console.log(`⚠️ [Lavalink] Node error on ${node.id}:`, error?.message || error);
  });

  // Forward raw gateway voice packets to Lavalink
  client.on('raw', (d) => {
    try {
      lavalink.sendRawData(d);
    } catch (e) {}
  });

  // ─────────────────────────────────────────
  // AUTOPLAY ENGINE: Smart recommendation engine for distinct similar songs
  // ─────────────────────────────────────────
  lavalink.on('trackEnd', async (player, track, reason) => {
    if (!player) return;

    // Initialize Autoplay History Set on player
    if (!player.autoplayHistory) player.autoplayHistory = new Set();

    if (track?.info) {
      if (track.info.identifier) player.autoplayHistory.add(track.info.identifier);
      if (track.info.title) player.autoplayHistory.add(track.info.title.toLowerCase().trim());
    }

    // Check if Autoplay is enabled and queue is empty
    if (player.autoplay && player.queue.tracks.length === 0) {
      try {
        console.log(`♾️ [Autoplay] Finding smart similar recommendations for "${track?.info?.title}" by "${track?.info?.author}"...`);

        const artist = track?.info?.author || '';
        const title = track?.info?.title || '';

        // Clean title for search
        const cleanTitle = title.replace(/\(Official Video\)/gi, '').replace(/\[Official Music Video\]/gi, '').trim();

        // Multi-query search candidates for distinct similar tracks
        const searchQueries = [
          `${artist} hits playlist`,
          `${artist} radio mix`,
          `${cleanTitle} similar songs`,
          `${artist} top songs`
        ];

        let nextTrack = null;

        for (const query of searchQueries) {
          if (!query.trim()) continue;

          // Search Spotify first, then YTM, then YT
          const sources = ['spsearch', 'ytmsearch', 'ytsearch'];
          for (const src of sources) {
            try {
              const res = await player.search({ query, source: src }, client.user);
              if (res && res.tracks && res.tracks.length) {
                // Find a track that hasn't been played in this session
                const candidate = res.tracks.find(t => {
                  const tId = t.info.identifier;
                  const tTitle = t.info.title.toLowerCase().trim();
                  return tId !== track?.info?.identifier &&
                         !player.autoplayHistory.has(tId) &&
                         !player.autoplayHistory.has(tTitle);
                });

                if (candidate) {
                  nextTrack = candidate;
                  break;
                }
              }
            } catch (e) {}
          }

          if (nextTrack) break;
        }

        if (nextTrack) {
          player.autoplayHistory.add(nextTrack.info.identifier);
          player.autoplayHistory.add(nextTrack.info.title.toLowerCase().trim());

          await player.queue.add(nextTrack);
          await player.play();
        }
      } catch (err) {
        console.error('[Autoplay Engine Error]', err.message || err);
      }
    }
  });

  // ─────────────────────────────────────────
  // TRACK START: Send STELLAR BEATS card & auto-delete previous card
  // ─────────────────────────────────────────
  lavalink.on('trackStart', async (player, track) => {
    if (!player || !player.textChannelId) return;
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

      const channel = client.channels.cache.get(player.textChannelId);
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
    if (!player || !player.textChannelId) return;

    // If Autoplay is enabled, trackEnd handles loading recommended tracks
    if (player.autoplay) return;

    try {
      const channel = client.channels.cache.get(player.textChannelId);
      const musicCmd = client.commands?.get('music');
      const afkStore = musicCmd?.afkStore;
      const isAfk247 = afkStore ? afkStore.has(player.guildId) : false;

      if (channel) {
        channel.send(`🎵 **Queue Ended:** All songs have finished playing. ${isAfk247 ? '*(24/7 AFK Mode Active)*' : ''}`).catch(() => {});
      }

      // If 24/7 mode is NOT active, auto-disconnect after 2 minutes of idle
      if (!isAfk247) {
        setTimeout(async () => {
          if (player && !player.playing && !player.paused && player.queue.tracks.length === 0) {
            await player.destroy().catch(() => {});
            if (channel) channel.send(`👋 Left voice channel due to inactivity.`).catch(() => {});
          }
        }, 120000);
      }
    } catch (e) {}
  });

  // ─────────────────────────────────────────
  // TRACK ERROR & STUCK HANDLERS: Smooth auto-skip
  // ─────────────────────────────────────────
  lavalink.on('trackError', async (player, track, payload) => {
    console.error(`⚠️ [Lavalink Track Error] ${track?.info?.title}:`, payload?.exception?.message || payload);
    if (!player) return;
    try {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) channel.send(`⚠️ **Playback Error:** Failed to stream \`${track?.info?.title || 'Track'}\`. Auto-skipping...`).catch(() => {});
      await player.skip().catch(() => {});
    } catch (e) {}
  });

  lavalink.on('trackStuck', async (player, track, payload) => {
    console.warn(`⚠️ [Lavalink Track Stuck] ${track?.info?.title}`);
    if (!player) return;
    try {
      await player.skip().catch(() => {});
    } catch (e) {}
  });

  // ─────────────────────────────────────────
  // PLAYER DESTROY: Clean up last message reference
  // ─────────────────────────────────────────
  lavalink.on('playerDestroy', async (player) => {
    if (player && player.lastMessage) {
      try {
        await player.lastMessage.delete().catch(() => {});
        player.lastMessage = null;
      } catch (e) {}
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
