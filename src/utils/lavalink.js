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
