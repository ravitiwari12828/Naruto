const { EmbedBuilder } = require('discord.js');

// Global Advanced Log Configuration Store (guildId -> { enabled, channels: Map(type -> channelId) })
const advLogStore = new Map();

function getOrCreateAdvLogStore(guildId) {
  if (!advLogStore.has(guildId)) {
    advLogStore.set(guildId, {
      enabled: true,
      channels: new Map()
    });
  }
  return advLogStore.get(guildId);
}

/**
 * Routes and dispatches a structured log embed to the dedicated channel for that event type.
 */
async function dispatchLog(guild, logType, embedData) {
  if (!guild) return;
  const store = getOrCreateAdvLogStore(guild.id);
  if (!store.enabled) return;

  // Find target channel ID for this log type
  let channelId = store.channels.get(logType);

  // Fallback search by channel name in guild cache if not mapped explicitly
  if (!channelId) {
    const channelNameMap = {
      modlogs: 'modlogs',
      antinuke: 'bot-antinuke-logs',
      automod: 'olympus-automod',
      modlimits: 'olympus-limit-logs',
      messages: 'msgs-log',
      invites: 'invites-log',
      channels: 'channel-logs',
      roles: 'role-logs',
      members: 'member-logs',
      joinleave: 'join-leave-logs',
      voice: 'vc-logs',
      webhooks: 'webhook-logs',
      banunban: 'ban-unban-logs',
      antiraid: 'anti-raid-logs',
      botlogging: 'bot-logging',
      safety: 'safety-logs',
      ticketlogs: 'ticket-logs',
      transcripts: 'ticket-transcripts',
      server: 'server-logs'
    };

    const targetName = channelNameMap[logType] || logType;
    const foundChan = guild.channels.cache.find(c => c.name === targetName || c.name.includes(logType));
    if (foundChan) {
      channelId = foundChan.id;
      store.channels.set(logType, channelId);
    }
  }

  if (!channelId) return;
  const targetChannel = guild.channels.cache.get(channelId);
  if (!targetChannel || !targetChannel.isTextBased()) return;

  try {
    let embed;
    if (embedData instanceof EmbedBuilder) {
      embed = embedData;
    } else {
      embed = new EmbedBuilder()
        .setColor(embedData.color || 0x00E5FF)
        .setTitle(embedData.title || `📜 ${logType.toUpperCase()} Log`)
        .setDescription(embedData.description || '')
        .setTimestamp();

      if (embedData.fields) {
        embedData.fields.forEach(f => embed.addFields(f));
      }
      if (embedData.footer) {
        embed.setFooter({ text: embedData.footer });
      }
    }

    await targetChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (e) {
    console.error(`Error sending log [${logType}]:`, e.message);
  }
}

module.exports = {
  advLogStore,
  getOrCreateAdvLogStore,
  dispatchLog
};
