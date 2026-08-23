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
        retryAmount: 20,
        retryDelay: 2000
      },
      {
        id: 'synn-node-serenetia',
        host: 'lavalink.serenetia.com',
        port: 443,
        authorization: 'youshallnotpass',
        secure: true,
        retryAmount: 10,
        retryDelay: 3000
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
  // AUTOPLAY ENGINE: Instant pre-fetched + fallback recommendation engine
  // ─────────────────────────────────────────
  lavalink.on('trackEnd', async (player, track, reason) => {
    if (!player) return;

    const reasonStr = typeof reason === 'object' ? (reason?.reason || '') : String(reason || '');
    const cleanReason = reasonStr.toLowerCase();

    // Ignore stopped or replaced tracks to prevent rapid infinite autoplay loops
    if (cleanReason === 'replaced' || cleanReason === 'stopped') return;

    // Initialize Autoplay History Set on player
    if (!player.autoplayHistory) player.autoplayHistory = new Set();

    if (track?.info) {
      if (track.info.identifier) player.autoplayHistory.add(track.info.identifier);
      if (track.info.title) player.autoplayHistory.add(track.info.title.toLowerCase().trim());
    }

    const musicCmd = client.commands?.get('music');
    const autoplayStore = musicCmd?.autoplayStore;
    const isAutoplay = player.autoplay || (autoplayStore ? autoplayStore.get(player.guildId) : false);

    // Autoplay trigger ONLY when queue is empty and autoplay is enabled and not already searching
    if (isAutoplay && player.queue.tracks.length === 0 && !player.isAutoplaySearching) {
      player.isAutoplaySearching = true;
      try {
        console.log(`♾️ [Autoplay Engine] Triggering smart recommendation for "${track?.info?.title}" by "${track?.info?.author}"...`);

        let nextTrack = null;

        // 1. Instant Pick from Pre-fetched Suggested Tracks
        if (player.suggestedTracks && player.suggestedTracks.length > 0) {
          nextTrack = player.suggestedTracks.find(t => {
            const tId = t.info?.identifier;
            const tTitle = t.info?.title?.toLowerCase()?.trim();
            return tId !== track?.info?.identifier &&
                   !player.autoplayHistory.has(tId) &&
                   !player.autoplayHistory.has(tTitle);
          });
        }

        // 2. High-Reliability Search if suggestedTracks candidate is missing
        if (!nextTrack) {
          const artist = track?.info?.author || '';
          const title = track?.info?.title || '';
          const cleanTitle = title.replace(/\(Official Video\)/gi, '').replace(/\[Official Music Video\]/gi, '').trim();

          const searchQueries = [
            `ytsearch:${cleanTitle} ${artist}`.trim(),
            `scsearch:${artist} ${cleanTitle}`.trim(),
            `ytsearch:${artist} songs`.trim(),
            `scsearch:${cleanTitle}`.trim()
          ];

          for (const query of searchQueries) {
            if (!query.replace(/^(ytsearch:|scsearch:)/, '').trim()) continue;
            try {
              const res = await player.search({ query }, client.user);
              if (res && res.tracks && res.tracks.length) {
                const candidate = res.tracks.find(t => {
                  const tId = t.info?.identifier;
                  const tTitle = t.info?.title?.toLowerCase()?.trim();
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
        }

        if (nextTrack) {
          console.log(`▶️ [Autoplay Engine] Successfully queued and playing: "${nextTrack.info.title}" by "${nextTrack.info.author}"`);
          if (nextTrack.info?.identifier) player.autoplayHistory.add(nextTrack.info.identifier);
          if (nextTrack.info?.title) player.autoplayHistory.add(nextTrack.info.title.toLowerCase().trim());

          await player.queue.add(nextTrack);
          if (!player.playing && !player.paused) {
            await player.play({ track: nextTrack }).catch(async () => {
              await player.play().catch(() => {});
            });
          }

          if (player.textChannelId) {
            const channel = client.channels.cache.get(player.textChannelId) || await client.channels.fetch(player.textChannelId).catch(() => null);
            if (channel) {
              channel.send(`♾️ **Autoplay Recommended:** Now playing **[${nextTrack.info.title}](${nextTrack.info.uri || 'https://spotify.com'})** by \`${nextTrack.info.author}\``).catch(() => {});
            }
          }
        } else {
          console.warn('[Autoplay Engine] No new similar track candidates found.');
        }
      } catch (err) {
        console.error('[Autoplay Engine Error]', err.message || err);
      } finally {
        setTimeout(() => { player.isAutoplaySearching = false; }, 2000);
      }
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

    // If Autoplay is enabled, trackEnd handles loading recommended tracks
    if (player.autoplay) return;

    try {
      const channel = client.channels.cache.get(player.textChannelId);
      const musicCmd = client.commands?.get('music');
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
    try {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) channel.send(`${emojis.WARNING} **Playback Error:** Failed to stream \`${track?.info?.title || 'Track'}\`. Auto-skipping...`).catch(() => {});
      await player.skip().catch(() => {});
    } catch (e) {}
  });

  lavalink.on('trackStuck', async (player, track, payload) => {
    console.warn(`${emojis.WARNING} [Lavalink Track Stuck] ${track?.info?.title}`);
    if (!player) return;
    try {
      await player.skip().catch(() => {});
    } catch (e) {}
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
