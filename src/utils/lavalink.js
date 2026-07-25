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

  // Automatically send Now Playing card when a new track starts (and delete old panel)
  lavalink.on('trackStart', async (player, track) => {
    if (!player || !player.textChannelId) return;
    try {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        const musicCmd = client.commands?.get('music');
        if (musicCmd && musicCmd.sendMusicCard) {
          await musicCmd.sendMusicCard(channel, track, player);
        }
      }
    } catch (e) {}
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
