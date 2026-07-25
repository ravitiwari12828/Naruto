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
  '1d': '24 Hours',
  '7d': '7 Days',
  '14d': '14 Days',
  '30d': '30 Days',
  'lifetime': 'All Time'
};

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function buildTimeframeRow(activeKey = 'lifetime', prefix = 'stf_') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}1d`)
      .setLabel('24H')
      .setStyle(activeKey === '1d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${prefix}7d`)
      .setLabel('7D')
      .setStyle(activeKey === '7d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${prefix}14d`)
      .setLabel('14D')
      .setStyle(activeKey === '14d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${prefix}30d`)
      .setLabel('30D')
      .setStyle(activeKey === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${prefix}lifetime`)
      .setLabel('All')
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
      .setCustomId('page_stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
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

function buildServerStatsCategoryRow(activeCategory = 'overview') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('scat_overview')
      .setLabel('Overview')
      .setEmoji(emojis.OBJ_STATS || '📊')
      .setStyle(activeCategory === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('scat_chat')
      .setLabel('Chat')
      .setEmoji(emojis.OBJ_MESSAGES || '💬')
      .setStyle(activeCategory === 'chat' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('scat_voice')
      .setLabel('Voice')
      .setEmoji(emojis.OBJ_VOICE || '🔊')
      .setStyle(activeCategory === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('scat_invites')
      .setLabel('Invites')
      .setEmoji(emojis.OBJ_INVITES || '📨')
      .setStyle(activeCategory === 'invites' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildUserMetricRow(activeCat) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ucat_all')
      .setLabel('Overview')
      .setEmoji(emojis.OBJ_PROFILE || '👤')
      .setStyle(activeCat === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_messages')
      .setLabel('Msgs')
      .setEmoji(emojis.OBJ_MESSAGES || '💬')
      .setStyle(activeCat === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_voice')
      .setLabel('Voice')
      .setEmoji(emojis.OBJ_VOICE || '🔊')
      .setStyle(activeCat === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_invites')
      .setLabel('Invites')
      .setEmoji(emojis.OBJ_INVITES || '📨')
      .setStyle(activeCat === 'invites' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_shinobi')
      .setLabel('Rank')
      .setEmoji(emojis.OBJ_NINJUTSU || '🍥')
      .setStyle(activeCat === 'shinobi' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function renderServerStatsOverviewPanel(guild, timeframeKey = 'lifetime', activeCategory = 'overview', author, clientUser) {
  if (activeCategory === 'chat') {
    return renderMessagesLeaderboard(guild, timeframeKey, 1, author, clientUser).embed;
  }
  if (activeCategory === 'voice') {
    return renderVoiceLeaderboard(guild, timeframeKey, 1, author, clientUser).embed;
  }
  if (activeCategory === 'invites') {
    return renderInvitesLeaderboard(guild, timeframeKey, 1, author, clientUser).embed;
  }

  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = guild.memberCount - bots;

  const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
  const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased()).size;

  const boxText =
    '```\n' +
    '╭──────────────────────────╮\n' +
    '│  EXECUTIVE SERVER STATS  │\n' +
    '├──────────────────────────┤\n' +
    '│ Members   : ' + String(guild.memberCount).padEnd(12, ' ') + ' │\n' +
    '│ Humans    : ' + String(humans).padEnd(12, ' ') + ' │\n' +
    '│ Bots      : ' + String(bots).padEnd(12, ' ') + ' │\n' +
    '│ Messages  : ' + String(stats.messages + ' msgs').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Voice     : ' + String(formatDuration(stats.voiceSeconds)).slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Joins     : ' + String(stats.invites + ' joins').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Text Chans: ' + String(textChannels).padEnd(12, ' ') + ' │\n' +
    '│ VoiceChans: ' + String(voiceChannels).padEnd(12, ' ') + ' │\n' +
    '│ Roles     : ' + String(guild.roles.cache.size).padEnd(12, ' ') + ' │\n' +
    '╰──────────────────────────╯\n' +
    '```';

  const description =
    `Welcome **${author.username}**! Below is the executive **Server Analytics** dashboard.\n\n` +
    boxText;

  return createStyledEmbed({
    title: `${emojis.STATS || '📊'} ${guild.name} Analytics`,
    subtitle: `Server Performance Dashboard (${label})`,
    description,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Timeframe: ${label} • Live Sync • Naruto Executive`,
    requestedBy: author,
    clientUser
  });
}

function renderUserStatsPanel(guild, targetUser, activeCat = 'all', timeframeKey = 'lifetime', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey] || null;
  const label = TIMEFRAME_NAMES[timeframeKey] || 'All Time';
  const sTf = db.getUserAnalyticsStats(guild.id, targetUser.id, windowMs);
  const sLife = db.getUserAnalyticsStats(guild.id, targetUser.id, null);
  const dbUser = db.getUser(targetUser.id);

  let titleText = 'USER ACTIVITY STATS';
  let rows = [];

  if (activeCat === 'messages' || activeCat === 'msgs') {
    titleText = 'USER MESSAGES BREAKDOWN';
    rows = [
      { key: 'Username', val: targetUser.username },
      { key: 'Timeframe', val: label },
      { key: 'Period Msg', val: `${sTf.messages.toLocaleString()} msgs` },
      { key: 'Total Msgs', val: `${(dbUser.messages || sLife.messages || 0).toLocaleString()} msgs` }
    ];
  } else if (activeCat === 'voice') {
    titleText = 'USER VOICE BREAKDOWN';
    rows = [
      { key: 'Username', val: targetUser.username },
      { key: 'Timeframe', val: label },
      { key: 'Period Vc', val: formatDuration(sTf.voiceSeconds) },
      { key: 'Total Vc', val: formatDuration(dbUser.voiceSeconds || sLife.voiceSeconds || 0) }
    ];
  } else if (activeCat === 'invites') {
    titleText = 'USER INVITES BREAKDOWN';
    rows = [
      { key: 'Username', val: targetUser.username },
      { key: 'Timeframe', val: label },
      { key: 'Period Inv', val: `${sTf.invites.toLocaleString()} joins` },
      { key: 'Total Inv', val: `${(dbUser.invites || sLife.invites || 0).toLocaleString()} joins` }
    ];
  } else if (activeCat === 'shinobi' || activeCat === 'rank') {
    titleText = 'SHINOBI RANK PROGRESS';
    rows = [
      { key: 'Username', val: targetUser.username },
      { key: 'Rank', val: dbUser.rank || 'Student' },
      { key: 'Level', val: `Lvl ${dbUser.level || 1}` },
      { key: 'XP Points', val: `${(dbUser.xp || 0).toLocaleString()} XP` }
    ];
  } else {
    // OVERVIEW / ALL
    titleText = 'USER ACTIVITY STATS';
    rows = [
      { key: 'Username', val: targetUser.username },
      { key: 'Messages', val: `${(sTf.messages || 0).toLocaleString()} msgs` },
      { key: 'Voice', val: formatDuration(sTf.voiceSeconds || 0) },
      { key: 'Invites', val: `${(dbUser.invites || sLife.invites || 0).toLocaleString()} joins` },
      { key: 'Level', val: `Lvl ${dbUser.level || 1}` },
      { key: 'Rank', val: dbUser.rank || 'Student' }
    ];
  }

  const top = '╭──────────────────────────╮';
  const mid = '├──────────────────────────┤';
  const bot = '╰──────────────────────────╯';

  const titlePadded = titleText.slice(0, 24).padStart(Math.floor((24 + titleText.length) / 2), ' ').padEnd(24, ' ');
  const titleLine = '│ ' + titlePadded + ' │';

  const boxLines = [top, titleLine, mid];
  rows.forEach(r => {
    const keyStr = r.key.slice(0, 10).padEnd(10, ' ');
    const valStr = r.val.slice(0, 12).padEnd(12, ' ');
    boxLines.push('│ ' + keyStr + ': ' + valStr + ' │');
  });
  boxLines.push(bot);

  const boxText = '```\n' + boxLines.join('\n') + '\n```';

  return createStyledEmbed({
    title: `${emojis.PROFILE || '👤'} ${targetUser.username} — Activity [${label}]`,
    subtitle: `Member Activity Audit — ${guild.name}`,
    description: boxText,
    thumbnailUrl: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
    footerText: `Timeframe: ${label} • Live Sync • Naruto One`,
    requestedBy: author,
    clientUser
  });
}

function renderMessagesLeaderboard(guild, timeframeKey = 'lifetime', page = 1, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey] || null;
  const label = TIMEFRAME_NAMES[timeframeKey] || 'All Time';
  const allLeaderboard = db.getTopLeaderboard(guild.id, 'message', windowMs, 100);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(allLeaderboard.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageEntries = allLeaderboard.slice(startIdx, startIdx + perPage);

  const titlePadded = 'TOP 10 CHATTER LEADER'.padStart(Math.floor((24 + 21) / 2), ' ').padEnd(24, ' ');
  const boxLines = [
    '╭──────────────────────────╮',
    '│ ' + titlePadded + ' │',
    '├──────────────────────────┤'
  ];

  if (pageEntries.length === 0) {
    boxLines.push('│ ' + 'No recorded chat data'.padEnd(24, ' ') + ' │');
  } else {
    pageEntries.forEach((item, idx) => {
      const rankNum = '#' + (startIdx + idx + 1);
      const rankStr = rankNum.padEnd(4, ' ');
      const member = guild.members.cache.get(item.userId);
      const rawName = member ? member.user.username : `User${item.userId}`;
      const nameStr = rawName.slice(0, 8).padEnd(8, ' ');
      const valStr = `${item.total.toLocaleString()} msgs`.slice(0, 10).padEnd(10, ' ');
      boxLines.push('│ ' + rankStr + nameStr + ': ' + valStr + ' │');
    });
  }

  boxLines.push('╰──────────────────────────╯');
  const boxText = '```\n' + boxLines.join('\n') + '\n```';

  const embed = createStyledEmbed({
    title: `${emojis.MESSAGES || '💬'} Chat Leaderboard [${label}]`,
    subtitle: `Top Chatters in ${guild.name}`,
    description: boxText,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Page ${currentPage}/${totalPages} • Timeframe: ${label} • Naruto One`,
    requestedBy: author,
    clientUser
  });

  return { embed, currentPage, totalPages };
}

function renderVoiceLeaderboard(guild, timeframeKey = 'lifetime', page = 1, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey] || null;
  const label = TIMEFRAME_NAMES[timeframeKey] || 'All Time';
  const allLeaderboard = db.getTopLeaderboard(guild.id, 'voice', windowMs, 100);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(allLeaderboard.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageEntries = allLeaderboard.slice(startIdx, startIdx + perPage);

  const titlePadded = 'TOP 10 VOICE LEADER'.padStart(Math.floor((24 + 19) / 2), ' ').padEnd(24, ' ');
  const boxLines = [
    '╭──────────────────────────╮',
    '│ ' + titlePadded + ' │',
    '├──────────────────────────┤'
  ];

  if (pageEntries.length === 0) {
    boxLines.push('│ ' + 'No recorded voice data'.padEnd(24, ' ') + ' │');
  } else {
    pageEntries.forEach((item, idx) => {
      const rankNum = '#' + (startIdx + idx + 1);
      const rankStr = rankNum.padEnd(4, ' ');
      const member = guild.members.cache.get(item.userId);
      const rawName = member ? member.user.username : `User${item.userId}`;
      const nameStr = rawName.slice(0, 8).padEnd(8, ' ');
      const valStr = formatDuration(item.total).slice(0, 10).padEnd(10, ' ');
      boxLines.push('│ ' + rankStr + nameStr + ': ' + valStr + ' │');
    });
  }

  boxLines.push('╰──────────────────────────╯');
  const boxText = '```\n' + boxLines.join('\n') + '\n```';

  const embed = createStyledEmbed({
    title: `${emojis.VOICE || '🔊'} Voice Leaderboard [${label}]`,
    subtitle: `Top Voice Members in ${guild.name}`,
    description: boxText,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Page ${currentPage}/${totalPages} • Timeframe: ${label} • Naruto One`,
    requestedBy: author,
    clientUser
  });

  return { embed, currentPage, totalPages };
}

function renderInvitesLeaderboard(guild, timeframeKey = 'lifetime', page = 1, author, clientUser) {
  const windowMs = WINDOWS[timeframeKey] || null;
  const label = TIMEFRAME_NAMES[timeframeKey] || 'All Time';
  const allLeaderboard = db.getTopLeaderboard(guild.id, 'invite', windowMs, 100);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(allLeaderboard.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageEntries = allLeaderboard.slice(startIdx, startIdx + perPage);

  const titlePadded = 'TOP 10 INVITE LEADER'.padStart(Math.floor((24 + 20) / 2), ' ').padEnd(24, ' ');
  const boxLines = [
    '╭──────────────────────────╮',
    '│ ' + titlePadded + ' │',
    '├──────────────────────────┤'
  ];

  if (pageEntries.length === 0) {
    boxLines.push('│ ' + 'No recorded invite data'.padEnd(24, ' ') + ' │');
  } else {
    pageEntries.forEach((item, idx) => {
      const rankNum = '#' + (startIdx + idx + 1);
      const rankStr = rankNum.padEnd(4, ' ');
      const member = guild.members.cache.get(item.userId);
      const rawName = member ? member.user.username : `User${item.userId}`;
      const nameStr = rawName.slice(0, 8).padEnd(8, ' ');
      const valStr = `${item.total.toLocaleString()} joins`.slice(0, 10).padEnd(10, ' ');
      boxLines.push('│ ' + rankStr + nameStr + ': ' + valStr + ' │');
    });
  }

  boxLines.push('╰──────────────────────────╯');
  const boxText = '```\n' + boxLines.join('\n') + '\n```';

  const embed = createStyledEmbed({
    title: `${emojis.INVITES || '📨'} Invites Leaderboard [${label}]`,
    subtitle: `Top Recruiters in ${guild.name}`,
    description: boxText,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Page ${currentPage}/${totalPages} • Timeframe: ${label} • Naruto One`,
    requestedBy: author,
    clientUser
  });

  return { embed, currentPage, totalPages };
}

function renderJoinsLeavesPanel(guild, timeframeKey = '1d', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);
  const net = stats.joins - stats.leaves;

  const titlePadded = 'MEMBER FLOW & TRAFFIC'.padStart(Math.floor((24 + 21) / 2), ' ').padEnd(24, ' ');
  const boxText =
    '```\n' +
    '╭──────────────────────────╮\n' +
    '│ ' + titlePadded + ' │\n' +
    '├──────────────────────────┤\n' +
    '│ Joins     : ' + String('+' + stats.joins.toLocaleString() + ' members').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Leaves    : ' + String('-' + stats.leaves.toLocaleString() + ' members').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Net Growth: ' + String((net >= 0 ? '+' : '') + net.toLocaleString() + ' members').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '╰──────────────────────────╯\n' +
    '```';

  return createStyledEmbed({
    title: `📥 Member Flow & Traffic [${label}]`,
    subtitle: `Joins vs Leaves — ${guild.name}`,
    description: boxText,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Timeframe: ${label} • Live Sync • Naruto Executive`,
    requestedBy: author,
    clientUser
  });
}

function renderTopCommandsPanel(guild, timeframeKey = '1d', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  const titlePadded = 'COMMAND USAGE STATS'.padStart(Math.floor((24 + 19) / 2), ' ').padEnd(24, ' ');
  const boxText =
    '```\n' +
    '╭──────────────────────────╮\n' +
    '│ ' + titlePadded + ' │\n' +
    '├──────────────────────────┤\n' +
    '│ Executed  : ' + String(stats.commands.toLocaleString() + ' cmds').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Server    : ' + String(guild.name).slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '╰──────────────────────────╯\n' +
    '```';

  return createStyledEmbed({
    title: `⚡ Command Usage Analytics [${label}]`,
    subtitle: `Automation Metrics — ${guild.name}`,
    description: boxText,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Timeframe: ${label} • Live Sync • Naruto Executive`,
    requestedBy: author,
    clientUser
  });
}

function renderTicketStatsPanel(guild, timeframeKey = '1d', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);
  const rate = stats.ticketsCreated > 0 ? Math.round((stats.ticketsClosed / stats.ticketsCreated) * 100) : 100;

  const titlePadded = 'TICKET RESOLUTION STATS'.padStart(Math.floor((24 + 23) / 2), ' ').padEnd(24, ' ');
  const boxText =
    '```\n' +
    '╭──────────────────────────╮\n' +
    '│ ' + titlePadded + ' │\n' +
    '├──────────────────────────┤\n' +
    '│ Opened    : ' + String(stats.ticketsCreated.toLocaleString() + ' tickets').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Closed    : ' + String(stats.ticketsClosed.toLocaleString() + ' tickets').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '│ Rate      : ' + String(rate + '% resolved').slice(0, 12).padEnd(12, ' ') + ' │\n' +
    '╰──────────────────────────╯\n' +
    '```';

  return createStyledEmbed({
    title: `🎟️ Ticket Resolution Metrics [${label}]`,
    subtitle: `Support Stats — ${guild.name}`,
    description: boxText,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Timeframe: ${label} • Live Sync • Naruto Executive`,
    requestedBy: author,
    clientUser
  });
}

module.exports = {
  name: 'analytics',
  description: 'Analytics, Leaderboards, User & Server Metrics Suite',
  aliases: [
    'lb', 'lbm', 'lbvc', 'lbi', 'leaderboard', 'top', 'st', 'ss', 'stats', 'tracker',
    'userstats', 'useranalytics', 'u', 'usr', 'user', 'profile',
    'topmessages', 'msgstats', 'messages', 'chat', 'topmsg', 'msgs', 'msg', 'topm',
    'topvoice', 'voicestats', 'vctiming', 'vctimimng', 'voice', 'vc', 'voicetime', 'vctime', 'topvc', 'vctimes', 'vct',
    'topinvites', 'invitestats', 'invites', 'topinv', 'invs', 'inv',
    'joinsleaves', 'memberflow', 'joinleavestats', 'flow', 'jl', 'joins', 'leaves',
    'topcommands', 'commandstats', 'commands', 'cmd', 'cmds',
    'ticketstats', 'ticketanalytics', 'tickets', 'tstats', 'tks'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const arg0 = args[0]?.toLowerCase();
    const arg1 = args[1]?.toLowerCase();

    let sub = 'server';

    if (invoked === 'lb' || invoked === 'leaderboard' || invoked === 'top') {
      if (['m', 'msg', 'msgs', 'chat', 'messages'].includes(arg0)) sub = 'messages';
      else if (['v', 'vc', 'voice', 'vct'].includes(arg0)) sub = 'voice';
      else if (['i', 'inv', 'invs', 'invites', 'dm', 'dms'].includes(arg0)) sub = 'invites';
      else if (['u', 'user', 'usr'].includes(arg0)) sub = 'user';
      else sub = 'messages';
    } else if (['lbm', 'topmessages', 'msgstats', 'messages', 'chat', 'topmsg', 'msgs', 'msg', 'topm'].includes(invoked)) {
      sub = 'messages';
    } else if (['lbvc', 'topvoice', 'topvoices', 'voicestats', 'vctiming', 'vctimimng', 'voice', 'vc', 'voicetime', 'vctime', 'topvc', 'vctimes', 'vct'].includes(invoked)) {
      sub = 'voice';
    } else if (['lbi', 'topinvites', 'invitestats', 'invites', 'topinv', 'invs', 'inv'].includes(invoked)) {
      sub = 'invites';
    } else if (['joinsleaves', 'memberflow', 'joinleavestats', 'flow', 'jl', 'joins', 'leaves'].includes(invoked)) {
      sub = 'joins';
    } else if (['topcommands', 'commandstats', 'commands', 'cmd', 'cmds'].includes(invoked)) {
      sub = 'commands';
    } else if (['ticketstats', 'ticketanalytics', 'tickets', 'tstats', 'tks'].includes(invoked)) {
      sub = 'tickets';
    } else if (['userstats', 'useranalytics', 'user', 'u', 'usr', 'profile'].includes(invoked)) {
      sub = 'user';
    } else if (['serverstats', 'serveranalytics', 'server', 'analytics', 'tracker', 'ss', 'st', 'stats'].includes(invoked)) {
      sub = 'server';
    }

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    if (sub === 'server') {
      let activeTf = 'lifetime';
      let activeCat = 'overview';
      let embed = renderServerStatsOverviewPanel(guild, activeTf, activeCat, author, clientUser);
      let tfRow = buildTimeframeRow(activeTf, 'stf_');
      let catRow = buildServerStatsCategoryRow(activeCat);
      const msg = await message.channel.send({ embeds: [embed], components: [tfRow, catRow] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId.startsWith('stf_')) activeTf = i.customId.replace('stf_', '');
        else if (i.customId.startsWith('scat_')) activeCat = i.customId.replace('scat_', '');
        await i.message.edit({
          embeds: [renderServerStatsOverviewPanel(guild, activeTf, activeCat, author, clientUser)],
          components: [buildTimeframeRow(activeTf, 'stf_'), buildServerStatsCategoryRow(activeCat)]
        }).catch(() => {});
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'messages') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || 'lifetime') : (arg0 || 'lifetime');
      if (!WINDOWS[activeKey]) activeKey = 'lifetime';
      let page = 1;
      let { embed, currentPage, totalPages } = renderMessagesLeaderboard(guild, activeKey, page, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildTimeframeRow(activeKey, 'msgtf_'), buildPaginationRow(currentPage, totalPages)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId === 'page_stop') { collector.stop(); return i.message.edit({ components: [] }).catch(() => {}); }
        else if (i.customId.startsWith('msgtf_') || i.customId.startsWith('tf_')) { activeKey = i.customId.replace(/^(msgtf_|tf_)/, ''); page = 1; }
        else if (i.customId === 'page_first') page = 1;
        else if (i.customId === 'page_prev') page = Math.max(1, page - 1);
        else if (i.customId === 'page_next') page++;
        else if (i.customId === 'page_last') page = 999;
        const res = renderMessagesLeaderboard(guild, activeKey, page, author, clientUser);
        await i.message.edit({ embeds: [res.embed], components: [buildTimeframeRow(activeKey, 'msgtf_'), buildPaginationRow(res.currentPage, res.totalPages)] }).catch(() => {});
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'voice') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || 'lifetime') : (arg0 || 'lifetime');
      if (!WINDOWS[activeKey]) activeKey = 'lifetime';
      let page = 1;
      let { embed, currentPage, totalPages } = renderVoiceLeaderboard(guild, activeKey, page, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildTimeframeRow(activeKey, 'vctf_'), buildPaginationRow(currentPage, totalPages)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId === 'page_stop') { collector.stop(); return i.message.edit({ components: [] }).catch(() => {}); }
        else if (i.customId.startsWith('vctf_') || i.customId.startsWith('tf_')) { activeKey = i.customId.replace(/^(vctf_|tf_)/, ''); page = 1; }
        else if (i.customId === 'page_first') page = 1;
        else if (i.customId === 'page_prev') page = Math.max(1, page - 1);
        else if (i.customId === 'page_next') page++;
        else if (i.customId === 'page_last') page = 999;
        const res = renderVoiceLeaderboard(guild, activeKey, page, author, clientUser);
        await i.message.edit({ embeds: [res.embed], components: [buildTimeframeRow(activeKey, 'vctf_'), buildPaginationRow(res.currentPage, res.totalPages)] }).catch(() => {});
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'invites') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || 'lifetime') : (arg0 || 'lifetime');
      if (!WINDOWS[activeKey]) activeKey = 'lifetime';
      let page = 1;
      let { embed, currentPage, totalPages } = renderInvitesLeaderboard(guild, activeKey, page, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildTimeframeRow(activeKey, 'invtf_'), buildPaginationRow(currentPage, totalPages)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId === 'page_stop') { collector.stop(); return i.message.edit({ components: [] }).catch(() => {}); }
        else if (i.customId.startsWith('invtf_') || i.customId.startsWith('tf_')) { activeKey = i.customId.replace(/^(invtf_|tf_)/, ''); page = 1; }
        else if (i.customId === 'page_first') page = 1;
        else if (i.customId === 'page_prev') page = Math.max(1, page - 1);
        else if (i.customId === 'page_next') page++;
        else if (i.customId === 'page_last') page = 999;
        const res = renderInvitesLeaderboard(guild, activeKey, page, author, clientUser);
        await i.message.edit({ embeds: [res.embed], components: [buildTimeframeRow(activeKey, 'invtf_'), buildPaginationRow(res.currentPage, res.totalPages)] }).catch(() => {});
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'joins' || sub === 'leaves') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || '1d') : (arg0 || '1d');
      if (!WINDOWS[activeKey]) activeKey = '1d';
      const msg = await message.channel.send({ embeds: [renderJoinsLeavesPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey, 'jltf_')] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId.startsWith('jltf_') || i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace(/^(jltf_|tf_)/, '');
          await i.message.edit({ embeds: [renderJoinsLeavesPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey, 'jltf_')] }).catch(() => {});
        }
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'commands') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || '1d') : (arg0 || '1d');
      if (!WINDOWS[activeKey]) activeKey = '1d';
      const msg = await message.channel.send({ embeds: [renderTopCommandsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey, 'cmdtf_')] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId.startsWith('cmdtf_') || i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace(/^(cmdtf_|tf_)/, '');
          await i.message.edit({ embeds: [renderTopCommandsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey, 'cmdtf_')] }).catch(() => {});
        }
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'tickets') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || '1d') : (arg0 || '1d');
      if (!WINDOWS[activeKey]) activeKey = '1d';
      const msg = await message.channel.send({ embeds: [renderTicketStatsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey, 'tktf_')] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        await i.deferUpdate().catch(() => {});
        if (i.customId.startsWith('tktf_') || i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace(/^(tktf_|tf_)/, '');
          await i.message.edit({ embeds: [renderTicketStatsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey, 'tktf_')] }).catch(() => {});
        }
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }
  },
  renderServerStatsOverviewPanel,
  renderUserStatsPanel,
  buildTimeframeRow,
  buildServerStatsCategoryRow,
  buildUserMetricRow
};
