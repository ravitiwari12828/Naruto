const { EmbedBuilder } = require('discord.js');
const emojis = require('../utils/emojis');
const db = require('../database/db');

// Global Advanced Logging Store (Backed by DB)
const advLogStore = new Map();

function saveAdvLogGuild(guildId) {
  const store = advLogStore.get(guildId);
  if (!store) return;
  const channelsObj = {};
  for (const [k, v] of store.channels.entries()) {
    channelsObj[k] = v;
  }
  db.setGuildEntry('advLogs', guildId, {
    enabled: Boolean(store.enabled),
    channels: channelsObj
  });
}

function makeTrackedChannelsMap(guildId, entries = []) {
  const m = new Map(entries);
  const origSet = m.set.bind(m);
  const origDel = m.delete.bind(m);
  m.set = (k, v) => {
    const res = origSet(k, v);
    saveAdvLogGuild(guildId);
    return res;
  };
  m.delete = (k) => {
    const res = origDel(k);
    saveAdvLogGuild(guildId);
    return res;
  };
  return m;
}

function buildAdvStoreFromSaved(guildId, savedAdv, legacyLogChannels) {
  const entries = [];
  if (legacyLogChannels && typeof legacyLogChannels === 'object') {
    for (const [k, v] of Object.entries(legacyLogChannels)) {
      if (v) entries.push([k, v]);
    }
  }
  if (savedAdv?.channels && typeof savedAdv.channels === 'object') {
    for (const [k, v] of Object.entries(savedAdv.channels)) {
      if (v) entries.push([k, v]);
    }
  }
  return {
    enabled: savedAdv?.enabled !== undefined ? Boolean(savedAdv.enabled) : true,
    channels: makeTrackedChannelsMap(guildId, entries)
  };
}

function hydrateAdvLogStores() {
  const savedAll = db.getSection('advLogs', {});
  const legacyAll = db.getSection('logChannels', {});
  const guildIds = new Set([...Object.keys(savedAll), ...Object.keys(legacyAll)]);
  advLogStore.clear();
  for (const gId of guildIds) {
    advLogStore.set(gId, buildAdvStoreFromSaved(gId, savedAll[gId], legacyAll[gId]));
  }
}

hydrateAdvLogStores();
db.onCloudRestore(hydrateAdvLogStores);

function getOrCreateAdvLogStore(guildId) {
  if (!advLogStore.has(guildId)) {
    const saved = db.getGuildEntry('advLogs', guildId, null);
    const legacy = db.getLogChannels ? db.getLogChannels(guildId) : null;
    advLogStore.set(guildId, buildAdvStoreFromSaved(guildId, saved, legacy));
  }
  return advLogStore.get(guildId);
}

async function dispatchLog(guild, logType, embedData, attachments = []) {
  if (!guild) return;

  const store = getOrCreateAdvLogStore(guild.id);
  if (!store.enabled) return;

  let channelId = store.channels.get(logType);

  if (!channelId) {
    const channelNameMap = {
      narutologs: ['naruto-logs', 'all-logs'],
      modlogs: ['mod-logs', 'modlogs', 'naruto-mod-logs'],
      antinuke: ['naruto-security-logs', 'security-logs', 'antinuke-logs', 'bot-antinuke-logs'],
      automod: ['automod-logs', 'olympus-automod', 'naruto-automod-logs'],
      automodrules: ['automod-logs', 'naruto-automod-logs'],
      messages: ['message-logs', 'msgs-log', 'message-log'],
      invites: ['invite-logs', 'invites-log'],
      channels: ['channel-logs', 'channel-log'],
      roles: ['role-logs', 'role-log'],
      members: ['member-logs', 'member-log', 'user-logs'],
      users: ['user-logs', 'member-logs', 'member-log'],
      joinleave: ['join-leave-logs', 'join-leave-log', 'welcome-logs'],
      voice: ['voice-logs', 'vc-logs', 'voice-log'],
      vc: ['voice-logs', 'vc-logs', 'voice-log'],
      webhooks: ['webhook-logs', 'webhooks-log'],
      banunban: ['ban-unban-logs', 'mod-logs'],
      ticketlogs: ['ticket-logs', 'tickets-log'],
      transcripts: ['ticket-transcripts'],
      modmaillogs: ['modmail-logs'],
      modmailtranscripts: ['modmail-transcripts'],
      emojis: ['emoji-logs', 'naruto-emoji-logs', 'emojis-log'],
      emojiaudit: ['emoji-logs', 'naruto-emoji-logs'],
      modcases: ['mod-cases', 'naruto-mod-cases', 'cases-log', 'mod-logs', 'naruto-mod-logs'],
      limitlogs: ['naruto-limit-logs', 'limit-logs', 'limitlogs', 'naruto-security-logs', 'security-logs', 'server-logs'],
      server: ['server-logs', 'server-log'],
      applications: ['application-logs', 'applications-log', 'apps-log'],
      events: ['event-logs', 'events-log', 'scheduled-events-logs'],
      polls: ['poll-logs', 'polls-log'],
      stage: ['stage-logs', 'stage-log'],
      stickers: ['sticker-logs', 'stickers-log', 'emoji-logs'],
      soundboard: ['soundboard-logs', 'soundboard-log'],
      threads: ['thread-logs', 'threads-log'],
      moderation: ['mod-logs', 'moderation-logs', 'naruto-mod-logs']
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
        .setColor(embedData.color || 0xED4245)
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

    const payload = {
      embeds: [embed],
      allowedMentions: { parse: [], users: [], roles: [] }
    };
    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.files = attachments;
    }

    await targetChannel.send(payload).catch(err => console.error(`[DispatchLog Send Fail]:`, err.message));
  } catch (e) {
    console.error(`Error sending log [${logType}]:`, e.message);
  }
}

function dispatchAntiNukeLog(guild, { rogueUser, targetUser, actionReason, banStatusText, roles, extraDetails, actionTaken, title }) {
  const descLines = [];

  if (rogueUser) {
    descLines.push(`• **Banned** <@${rogueUser.id || rogueUser}> from your server for **${actionReason || 'suspicious activity'}**.`);
  } else {
    descLines.push(`• **AntiNuke Defense Triggered:** ${actionReason || 'Suspicious Activity Blocked'}.`);
  }

  descLines.push(`• *If they are a trusted member, you can whitelist them for the future.*`);

  if (roles && roles.length > 0) {
    descLines.push(`• **Roles:** ${roles.map(r => `<@&${r.id || r}>`).join(' ')}`);
  }

  if (extraDetails) {
    descLines.push(`• **Details:** ${extraDetails}`);
  }

  const actionText = actionTaken || 'Member restored, Admin roles stripped & channel locked out!';
  descLines.push(`• **Action:** ${actionText}`);

  const clientUser = guild.client.user;

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setAuthor({
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`${emojis.SHIELD || '🛡️'} ${title || 'Anti Nuke'}`)
    .setDescription(descLines.join('\n\n'))
    .addFields(
      {
        name: 'Action',
        value: `**Ban Status :** ✅ | <@${rogueUser?.id || rogueUser || targetUser?.id || targetUser}> ${banStatusText || 'Successfully Banned'}`
      },
      {
        name: 'Moderator',
        value: `<@${clientUser.id}>\n\`(ID: ${clientUser.id})\``,
        inline: true
      },
      {
        name: 'Target',
        value: rogueUser
          ? `<@${rogueUser.id || rogueUser}>\n\`(ID: ${rogueUser.id || rogueUser})\``
          : (targetUser ? `<@${targetUser.id || targetUser}>\n\`(ID: ${targetUser.id || targetUser})\`` : '`N/A`'),
        inline: true
      }
    )
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || undefined)
    .setFooter({
      text: `${guild.name} • ${guild.id}`
    })
    .setTimestamp();

  dispatchLog(guild, 'antinuke', embed);
}

module.exports = {
  advLogStore,
  getOrCreateAdvLogStore,
  dispatchLog,
  dispatchAntiNukeLog
};
