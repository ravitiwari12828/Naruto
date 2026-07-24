const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

const WINDOWS = {
  '1d': 86400 * 1000,
  '7d': 7 * 86400 * 1000,
  '14d': 14 * 86400 * 1000,
  '30d': 30 * 86400 * 1000,
  'lifetime': null
};

const TIMEFRAME_NAMES = {
  '1d': 'Daily (24 Hours)',
  '7d': '7-Day (1 Week)',
  '14d': '14-Day (2 Weeks)',
  '30d': '30-Day (1 Month)',
  'lifetime': 'Overall (Lifetime)'
};

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function buildTimeframeRow(activeKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tf_1d')
      .setLabel('1D')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeKey === '1d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_7d')
      .setLabel('7D')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeKey === '7d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_14d')
      .setLabel('14D')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeKey === '14d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_30d')
      .setLabel('30D')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeKey === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_lifetime')
      .setLabel('Overall')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeKey === 'lifetime' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildPaginationRow(currentPage, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('page_first')
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId('page_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId('page_refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('page_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages),
    new ButtonBuilder()
      .setCustomId('page_last')
      .setEmoji('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages)
  );
}

function buildUserMetricRow(activeCat) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ucat_messages')
      .setLabel('Messages')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeCat === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_voice')
      .setLabel('Voice Time')
      .setEmoji(emojis.OBJ_VOICE || emojis.OBJ_ZAP)
      .setStyle(activeCat === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_invites')
      .setLabel('Invites')
      .setEmoji(emojis.OBJ_ZAP)
      .setStyle(activeCat === 'invites' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_shinobi')
      .setLabel('Shinobi Rank')
      .setEmoji(emojis.OBJ_NINJUTSU || emojis.OBJ_ZAP)
      .setStyle(activeCat === 'shinobi' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_all')
      .setLabel('All Metrics')
      .setEmoji(emojis.OBJ_PROFILE || emojis.OBJ_ZAP)
      .setStyle(activeCat === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function renderUserStatsPanel(guild, targetUser, activeCat = 'all', author, clientUser) {
  const dbUser = db.getUser(targetUser.id);
  const s1d = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['1d']);
  const s7d = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['7d']);
  const s30d = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['30d']);
  const sLife = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['lifetime']);

  let title = `${emojis.PROFILE} ${targetUser.username}'s Activity Dashboard`;
  let description = `Messages & Voice activity are being updated in real-time!\n`;
  let fields = [];

  if (activeCat === 'messages') {
    title = `${emojis.MESSAGES} ${targetUser.username}'s Chat Messages`;
    description += `\n` +
      `• **All time** • **${(dbUser.messages || sLife.messages).toLocaleString()}** messages in this server!\n` +
      `• **This month (30d)** • **${s30d.messages.toLocaleString()}** messages in this server\n` +
      `• **This week (7d)** • **${s7d.messages.toLocaleString()}** messages in this server\n` +
      `• **Today (24h)** • **${s1d.messages.toLocaleString()}** messages in this server`;
  } else if (activeCat === 'voice') {
    title = `${emojis.VOICE} ${targetUser.username}'s Voice Duration`;
    description += `\n` +
      `• **All time** • **${formatDuration(dbUser.voiceSeconds || sLife.voiceSeconds)}** in voice channels!\n` +
      `• **This month (30d)** • **${formatDuration(s30d.voiceSeconds)}** in voice channels\n` +
      `• **This week (7d)** • **${formatDuration(s7d.voiceSeconds)}** in voice channels\n` +
      `• **Today (24h)** • **${formatDuration(s1d.voiceSeconds)}** in voice channels`;
  } else if (activeCat === 'invites') {
    title = `${emojis.INVITES} ${targetUser.username}'s Server Invites`;
    description += `\n` +
      `• **All time** • **${(dbUser.invites || sLife.invites).toLocaleString()}** members invited!\n` +
      `• **This month (30d)** • **${s30d.invites.toLocaleString()}** members invited\n` +
      `• **This week (7d)** • **${s7d.invites.toLocaleString()}** members invited\n` +
      `• **Today (24h)** • **${s1d.invites.toLocaleString()}** members invited`;
  } else if (activeCat === 'shinobi') {
    title = `${emojis.SHINOBI} ${targetUser.username}'s Shinobi Profile`;
    fields = [
      { name: '📜 Ninja Rank', value: `\`${dbUser.rank || 'Academy Student'}\``, inline: true },
      { name: '⚡ Level / XP', value: `\`Lvl ${dbUser.level || 1}\` (${dbUser.xp || 0} XP)`, inline: true },
      { name: '🔮 Chakra / Ryo', value: `\`${dbUser.chakra || 100} Chakra\` | \`${dbUser.ryo || 500} Ryo\``, inline: true },
      { name: '🌀 Equipped Jutsu', value: `\`${(dbUser.jutsuList || ['Rasengan']).join(', ')}\``, inline: false }
    ];
  } else {
    // ALL METRICS OVERVIEW
    fields = [
      { name: '💬 Chat Messages (24h / All-time)', value: `\`${s1d.messages.toLocaleString()}\` / \`${(dbUser.messages || sLife.messages).toLocaleString()}\` msgs`, inline: true },
      { name: '🔊 Voice Time (24h / All-time)', value: `\`${formatDuration(s1d.voiceSeconds)}\` / \`${formatDuration(dbUser.voiceSeconds || sLife.voiceSeconds)}\``, inline: true },
      { name: '📨 Invites (24h / All-time)', value: `\`${s1d.invites.toLocaleString()}\` / \`${(dbUser.invites || sLife.invites).toLocaleString()}\` joins`, inline: true },
      { name: '📜 Shinobi Rank', value: `\`${dbUser.rank || 'Academy Student'}\` (Lvl \`${dbUser.level || 1}\`)`, inline: true },
      { name: '🔮 Chakra & Ryo', value: `\`${dbUser.chakra || 100} Chakra\` | \`${dbUser.ryo || 500} Ryo\``, inline: true }
    ];
  }

  return createStyledEmbed({
    title,
    subtitle: `Member Activity Audit — ${guild.name}`,
    description,
    fields: fields.length > 0 ? fields : undefined,
    thumbnailUrl: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
    footerText: `Real-time Live Sync • Naruto One Bot`,
    requestedBy: author,
    clientUser
  });
}

// 💬 1. TOP MESSAGES LEADERBOARD (.serverstats / .topmessages / .msgstats)
function renderMessagesLeaderboard(guild, timeframeKey, page = 1, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const allLeaderboard = db.getTopLeaderboard(guild.id, 'message', windowMs, 100);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(allLeaderboard.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageEntries = allLeaderboard.slice(startIdx, startIdx + perPage);

  let listText = '';
  if (pageEntries.length === 0) {
    listText = '*No chat activity recorded for this timeframe.*';
  } else {
    listText = pageEntries.map((item, idx) => {
      const rankNum = startIdx + idx + 1;
      let rankPrefix = `**#${rankNum}**`;
      if (rankNum === 1) rankPrefix = `${emojis.OWNER_CROWN} **#1**`;

      return `${rankPrefix} <@${item.userId}> • **${item.total.toLocaleString()}** messages`;
    }).join('\n');
  }

  const embed = createStyledEmbed({
    title: `${emojis.MESSAGES} ${label} Messages Leaderboard`,
    subtitle: `Realtime Server Chat Ranking — ${guild.name}`,
    description:
      `The messages are being updated in real-time!\n\n` +
      `${listText}`,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Page ${currentPage}/${totalPages} • Real-time Live Sync • Naruto One Bot`,
    requestedBy: author,
    clientUser
  });

  return { embed, currentPage, totalPages };
}

// 🔊 2. TOP VOICE LEADERBOARD (.topvoice / .voicestats)
function renderVoiceLeaderboard(guild, timeframeKey, page = 1, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const allLeaderboard = db.getTopLeaderboard(guild.id, 'voice', windowMs, 100);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(allLeaderboard.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageEntries = allLeaderboard.slice(startIdx, startIdx + perPage);

  let listText = '';
  if (pageEntries.length === 0) {
    listText = '*No voice activity recorded for this timeframe.*';
  } else {
    listText = pageEntries.map((item, idx) => {
      const rankNum = startIdx + idx + 1;
      let rankPrefix = `**#${rankNum}**`;
      if (rankNum === 1) rankPrefix = `${emojis.OWNER_CROWN} **#1**`;

      return `${rankPrefix} <@${item.userId}> • **${formatDuration(item.total)}** in voice`;
    }).join('\n');
  }

  const embed = createStyledEmbed({
    title: `${emojis.VOICE} ${label} Voice Leaderboard`,
    subtitle: `Realtime Voice Activity Duration — ${guild.name}`,
    description:
      `Active voice durations are being updated in real-time!\n\n` +
      `${listText}`,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Page ${currentPage}/${totalPages} • Real-time Live Sync • Naruto One Bot`,
    requestedBy: author,
    clientUser
  });

  return { embed, currentPage, totalPages };
}

// 📨 3. TOP INVITES LEADERBOARD (.topinvites / .invitestats)
function renderInvitesLeaderboard(guild, timeframeKey, page = 1, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const allLeaderboard = db.getTopLeaderboard(guild.id, 'invite', windowMs, 100);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(allLeaderboard.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageEntries = allLeaderboard.slice(startIdx, startIdx + perPage);

  let listText = '';
  if (pageEntries.length === 0) {
    listText = '*No invite joins recorded for this timeframe.*';
  } else {
    listText = pageEntries.map((item, idx) => {
      const rankNum = startIdx + idx + 1;
      let rankPrefix = `**#${rankNum}**`;
      if (rankNum === 1) rankPrefix = `${emojis.OWNER_CROWN} **#1**`;

      return `${rankPrefix} <@${item.userId}> • **${item.total.toLocaleString()}** invites`;
    }).join('\n');
  }

  const embed = createStyledEmbed({
    title: `${emojis.INVITES} ${label} Invite Recruiters Leaderboard`,
    subtitle: `Realtime Server Invitations — ${guild.name}`,
    description:
      `Top recruiter invitations are being updated in real-time!\n\n` +
      `${listText}`,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Page ${currentPage}/${totalPages} • Real-time Live Sync • Naruto One Bot`,
    requestedBy: author,
    clientUser
  });

  return { embed, currentPage, totalPages };
}

// 📥 4. JOINS & LEAVES FLOW (.joinsleaves / .memberflow)
function renderJoinsLeavesPanel(guild, timeframeKey, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);
  const net = stats.joins - stats.leaves;

  return createStyledEmbed({
    title: `📥 Member Traffic & Retention Flow [${label}]`,
    subtitle: `Server Joins vs Leaves — ${guild.name}`,
    fields: [
      { name: '📥 Total Member Joins', value: `\`+${stats.joins.toLocaleString()}\` members`, inline: true },
      { name: '📤 Total Member Leaves', value: `\`-${stats.leaves.toLocaleString()}\` members`, inline: true },
      { name: '📈 Net Server Growth', value: `\`${net >= 0 ? '+' : ''}${net.toLocaleString()}\` members`, inline: true }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

// ⚡ 5. TOP COMMANDS (.topcommands / .commandstats)
function renderTopCommandsPanel(guild, timeframeKey, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  return createStyledEmbed({
    title: `⚡ Bot Command Analytics [${label}]`,
    subtitle: `Automation & Feature Usage — ${guild.name}`,
    fields: [
      { name: '⚡ Total Commands Executed', value: `\`${stats.commands.toLocaleString()}\` commands`, inline: true },
      { name: '🏰 Target Server', value: `\`${guild.name}\``, inline: true }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

// 🎟️ 6. TICKET STATS (.ticketstats / .ticketanalytics)
function renderTicketStatsPanel(guild, timeframeKey, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  return createStyledEmbed({
    title: `🎟️ Support Ticket Resolution Analytics [${label}]`,
    subtitle: `ModMail Ticket Metrics — ${guild.name}`,
    fields: [
      { name: '🟢 Tickets Opened', value: `\`${stats.ticketsCreated.toLocaleString()}\` tickets`, inline: true },
      { name: '🔴 Tickets Closed', value: `\`${stats.ticketsClosed.toLocaleString()}\` tickets`, inline: true },
      { name: '⚖️ Resolution Rate', value: `\`${stats.ticketsCreated > 0 ? Math.round((stats.ticketsClosed / stats.ticketsCreated) * 100) : 100}%\``, inline: true }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

module.exports = {
  name: 'analytics',
  description: 'Analytics, Leaderboards, User & Server Metrics Suite',
  aliases: [
    'tracker', 'userstats', 'serverstats', 'serveranalytics', 'useranalytics',
    'topmessages', 'msgstats', 'topvoice', 'voicestats', 'vctiming',
    'topinvites', 'invitestats', 'joinsleaves', 'memberflow', 'joinleavestats',
    'topcommands', 'commandstats', 'ticketstats', 'ticketanalytics'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    // Category direct aliases
    if (['topmessages', 'msgstats', 'messages', 'chat', 'serverstats', 'serveranalytics', 'server', 'analytics', 'tracker'].includes(invoked)) sub = 'messages';
    if (['topvoice', 'voicestats', 'vctiming', 'voice'].includes(invoked)) sub = 'voice';
    if (['topinvites', 'invitestats', 'invites'].includes(invoked)) sub = 'invites';
    if (['joinsleaves', 'memberflow', 'joinleavestats', 'joins', 'leaves'].includes(invoked)) sub = 'joins';
    if (['topcommands', 'commandstats', 'commands'].includes(invoked)) sub = 'commands';
    if (['ticketstats', 'ticketanalytics', 'tickets'].includes(invoked)) sub = 'tickets';
    if (['userstats', 'useranalytics', 'user'].includes(invoked)) sub = 'user';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // H. DEDICATED USER STATS DASHBOARD (.userstats @user)
    if (sub === 'user') {
      const targetUser = message.mentions.users.first() || (args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : null) || author;
      let activeCat = 'all';

      let embed = renderUserStatsPanel(guild, targetUser, activeCat, author, clientUser);
      let metricRow = buildUserMetricRow(activeCat);

      const msg = await message.channel.send({ embeds: [embed], components: [metricRow] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('ucat_')) {
          activeCat = i.customId.replace('ucat_', '');
        }

        const newEmbed = renderUserStatsPanel(guild, targetUser, activeCat, author, clientUser);
        const newMetricRow = buildUserMetricRow(activeCat);

        return i.update({ embeds: [newEmbed], components: [newMetricRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // B. DEDICATED TOP MESSAGES LEADERBOARD (.serverstats / .topmessages / .msgstats)
    if (sub === 'messages' || !sub) {
      let activeKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
      if (!WINDOWS[activeKey]) activeKey = '1d';
      let page = 1;

      let { embed, currentPage, totalPages } = renderMessagesLeaderboard(guild, activeKey, page, author, clientUser);
      let tfRow = buildTimeframeRow(activeKey);
      let pageRow = buildPaginationRow(currentPage, totalPages);

      const msg = await message.channel.send({ embeds: [embed], components: [tfRow, pageRow] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace('tf_', '');
          page = 1;
        } else if (i.customId === 'page_first') {
          page = 1;
        } else if (i.customId === 'page_prev') {
          page = Math.max(1, page - 1);
        } else if (i.customId === 'page_next') {
          page++;
        } else if (i.customId === 'page_last') {
          page = 999;
        }

        const res = renderMessagesLeaderboard(guild, activeKey, page, author, clientUser);
        page = res.currentPage;
        const newTfRow = buildTimeframeRow(activeKey);
        const newPageRow = buildPaginationRow(res.currentPage, res.totalPages);
        return i.update({ embeds: [res.embed], components: [newTfRow, newPageRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // C. DEDICATED TOP VOICE LEADERBOARD (.topvoice / .voicestats)
    if (sub === 'voice') {
      let activeKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
      if (!WINDOWS[activeKey]) activeKey = '1d';
      let page = 1;

      let { embed, currentPage, totalPages } = renderVoiceLeaderboard(guild, activeKey, page, author, clientUser);
      let tfRow = buildTimeframeRow(activeKey);
      let pageRow = buildPaginationRow(currentPage, totalPages);

      const msg = await message.channel.send({ embeds: [embed], components: [tfRow, pageRow] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace('tf_', '');
          page = 1;
        } else if (i.customId === 'page_first') {
          page = 1;
        } else if (i.customId === 'page_prev') {
          page = Math.max(1, page - 1);
        } else if (i.customId === 'page_next') {
          page++;
        } else if (i.customId === 'page_last') {
          page = 999;
        }

        const res = renderVoiceLeaderboard(guild, activeKey, page, author, clientUser);
        page = res.currentPage;
        const newTfRow = buildTimeframeRow(activeKey);
        const newPageRow = buildPaginationRow(res.currentPage, res.totalPages);
        return i.update({ embeds: [res.embed], components: [newTfRow, newPageRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // D. DEDICATED TOP INVITES LEADERBOARD (.topinvites / .invitestats)
    if (sub === 'invites') {
      let activeKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
      if (!WINDOWS[activeKey]) activeKey = '1d';
      let page = 1;

      let { embed, currentPage, totalPages } = renderInvitesLeaderboard(guild, activeKey, page, author, clientUser);
      let tfRow = buildTimeframeRow(activeKey);
      let pageRow = buildPaginationRow(currentPage, totalPages);

      const msg = await message.channel.send({ embeds: [embed], components: [tfRow, pageRow] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace('tf_', '');
          page = 1;
        } else if (i.customId === 'page_first') {
          page = 1;
        } else if (i.customId === 'page_prev') {
          page = Math.max(1, page - 1);
        } else if (i.customId === 'page_next') {
          page++;
        } else if (i.customId === 'page_last') {
          page = 999;
        }

        const res = renderInvitesLeaderboard(guild, activeKey, page, author, clientUser);
        page = res.currentPage;
        const newTfRow = buildTimeframeRow(activeKey);
        const newPageRow = buildPaginationRow(res.currentPage, res.totalPages);
        return i.update({ embeds: [res.embed], components: [newTfRow, newPageRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // E. DEDICATED JOINS & LEAVES FLOW (.joinsleaves)
    if (sub === 'joins' || sub === 'leaves') {
      let activeKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
      if (!WINDOWS[activeKey]) activeKey = '1d';

      const embed = renderJoinsLeavesPanel(guild, activeKey, author, clientUser);
      const row = buildTimeframeRow(activeKey);
      const msg = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (!i.customId.startsWith('tf_')) return;
        const newKey = i.customId.replace('tf_', '');
        const newEmbed = renderJoinsLeavesPanel(guild, newKey, author, clientUser);
        const newRow = buildTimeframeRow(newKey);
        return i.update({ embeds: [newEmbed], components: [newRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // F. DEDICATED TOP COMMANDS (.topcommands)
    if (sub === 'commands') {
      let activeKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
      if (!WINDOWS[activeKey]) activeKey = '1d';

      const embed = renderTopCommandsPanel(guild, activeKey, author, clientUser);
      const row = buildTimeframeRow(activeKey);
      const msg = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (!i.customId.startsWith('tf_')) return;
        const newKey = i.customId.replace('tf_', '');
        const newEmbed = renderTopCommandsPanel(guild, newKey, author, clientUser);
        const newRow = buildTimeframeRow(newKey);
        return i.update({ embeds: [newEmbed], components: [newRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // G. DEDICATED TICKET STATS (.ticketstats)
    if (sub === 'tickets') {
      let activeKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
      if (!WINDOWS[activeKey]) activeKey = '1d';

      const embed = renderTicketStatsPanel(guild, activeKey, author, clientUser);
      const row = buildTimeframeRow(activeKey);
      const msg = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (!i.customId.startsWith('tf_')) return;
        const newKey = i.customId.replace('tf_', '');
        const newEmbed = renderTicketStatsPanel(guild, newKey, author, clientUser);
        const newRow = buildTimeframeRow(newKey);
        return i.update({ embeds: [newEmbed], components: [newRow] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }
  }
};
