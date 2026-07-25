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
      defaultSearchPlatform: 'ytmsearch',
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
  // AUTOPLAY ENGINE: Automatically fetch & queue recommended songs
  // ─────────────────────────────────────────
  lavalink.on('trackEnd', async (player, track, reason) => {
    if (!player) return;

    // Check if Autoplay is enabled and queue is empty
    if (player.autoplay && player.queue.tracks.length === 0) {
      try {
        console.log(`♾️ [Autoplay] Queue ended for guild ${player.guildId}. Searching related tracks for "${track?.info?.title}"...`);

        // Search YouTube Music for related artist & genre tracks
        const searchQuery = `${track?.info?.author || ''} ${track?.info?.title || ''} song`.trim();
        let res = await player.search({ query: searchQuery, source: 'ytmsearch' }, client.user);
        if (!res || !res.tracks.length) {
          res = await player.search({ query: searchQuery, source: 'ytsearch' }, client.user);
        }

        if (res && res.tracks.length) {
          // Filter out the exact same song
          const nextTrack = res.tracks.find(t => t.info.identifier !== track?.info?.identifier) || res.tracks[0];
          await player.queue.add(nextTrack);

          const channel = client.channels.cache.get(player.textChannelId);
          if (channel) {
            channel.send(`♾️ **Autoplay:** Automatically playing recommended track **[${nextTrack.info.title}](${nextTrack.info.uri})**!`).catch(() => {});
          }

          await player.play();
        }
      } catch (err) {
        console.error('[Autoplay Engine Error]', err.message || err);
      }
    }
  });

  // Automatically send Now Playing card when a new track starts
  lavalink.on('trackStart', async (player, track) => {
    if (!player || !player.textChannelId) return;
    try {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        const musicCmd = client.commands?.get('music');
        if (musicCmd && musicCmd.buildMusicPlayerEmbed) {
          const embed = musicCmd.buildMusicPlayerEmbed(track, player);
          const rows = musicCmd.buildMusicActionRows(player);
          await channel.send({ embeds: [embed], components: rows }).catch(() => {});
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
