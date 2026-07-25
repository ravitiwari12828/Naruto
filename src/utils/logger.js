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
      narutologs: ['naruto-logs', 'all-logs'],
      modlogs: ['mod-logs', 'modlogs'],
      antinuke: ['antinuke-logs', 'bot-antinuke-logs'],
      automod: ['automod-logs', 'olympus-automod'],
      messages: ['message-logs', 'msgs-log', 'message-log'],
      invites: ['invite-logs', 'invites-log'],
      channels: ['channel-logs', 'channel-log'],
      roles: ['role-logs', 'role-log'],
      members: ['member-logs', 'member-log'],
      joinleave: ['join-leave-logs', 'join-leave-log', 'welcome-logs'],
      voice: ['voice-logs', 'vc-logs', 'voice-log'],
      vc: ['voice-logs', 'vc-logs', 'voice-log'],
      webhooks: ['webhook-logs'],
      banunban: ['ban-unban-logs'],
      ticketlogs: ['ticket-logs', 'tickets-log'],
      transcripts: ['ticket-transcripts'],
      modmaillogs: ['modmail-logs'],
      modmailtranscripts: ['modmail-transcripts'],
      server: ['server-logs', 'server-log']
    };

    const targets = channelNameMap[logType] || [logType];
    const foundChan = guild.channels.cache.find(c => targets.includes(c.name) || c.name.includes(logType));
    if (foundChan) {
      channelId = foundChan.id;
      store.channels.set(logType, channelId);
    }
  }

  // Master Fallback: If specific channel is missing, try naruto-logs
  if (!channelId) {
    const narutoChan = guild.channels.cache.find(c => c.name === 'naruto-logs' || c.name === 'all-logs');
    if (narutoChan) channelId = narutoChan.id;
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
