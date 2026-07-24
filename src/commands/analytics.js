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

function buildTimeframeRow(activeKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tf_1d')
      .setLabel('24H')
      .setStyle(activeKey === '1d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_7d')
      .setLabel('7D')
      .setStyle(activeKey === '7d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_14d')
      .setLabel('14D')
      .setStyle(activeKey === '14d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_30d')
      .setLabel('30D')
      .setStyle(activeKey === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tf_lifetime')
      .setLabel('All Time')
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
      .setLabel('Chat Rank')
      .setEmoji(emojis.OBJ_MESSAGES || '💬')
      .setStyle(activeCategory === 'chat' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('scat_voice')
      .setLabel('Voice Rank')
      .setEmoji(emojis.OBJ_VOICE || '🔊')
      .setStyle(activeCategory === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('scat_invites')
      .setLabel('Invites Rank')
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
      .setLabel('Messages')
      .setEmoji(emojis.OBJ_MESSAGES || '💬')
      .setStyle(activeCat === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_voice')
      .setLabel('Voice Time')
      .setEmoji(emojis.OBJ_VOICE || '🔊')
      .setStyle(activeCat === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_invites')
      .setLabel('Invites')
      .setEmoji(emojis.OBJ_INVITES || '📨')
      .setStyle(activeCat === 'invites' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ucat_shinobi')
      .setLabel('Shinobi')
      .setEmoji(emojis.OBJ_NINJUTSU || '🍥')
      .setStyle(activeCat === 'shinobi' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function renderServerStatsOverviewPanel(guild, timeframeKey = 'lifetime', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];

  const stats1d = db.getAnalyticsStats(guild.id, WINDOWS['1d']);
  const stats7d = db.getAnalyticsStats(guild.id, WINDOWS['7d']);
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  const topMembers = db.getTopLeaderboard(guild.id, 'message', windowMs, 3);
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = guild.memberCount - bots;

  let membersText = '';
  if (topMembers.length === 0) {
    membersText = '`No recorded activity yet.`';
  } else {
    membersText = topMembers.map((item, idx) => {
      let icon = idx === 0 ? `${emojis.OWNER_CROWN || '👑'} **#1**` : idx === 1 ? `${emojis.STAR || '⭐'} **#2**` : `${emojis.SHINOBI || '🍥'} **#3**`;
      return `${icon} <@${item.userId}> • \`${item.total.toLocaleString()}\` msgs`;
    }).join('\n');
  }

  const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
  const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased()).size;

  return createStyledEmbed({
    title: `${emojis.STATS || '📊'} ${guild.name} Analytics`,
    subtitle: `Server Performance Dashboard [${label}]`,
    fields: [
      {
        name: `${emojis.ROLES || '👥'} Member Metrics`,
        value: `\`Total: ${guild.memberCount.toLocaleString()}\` • \`Humans: ${humans.toLocaleString()}\` • \`Bots: ${bots.toLocaleString()}\``,
        inline: false
      },
      {
        name: `${emojis.MESSAGES || '💬'} Activity Overview (${label})`,
        value: `• **Messages:** \`${stats.messages.toLocaleString()}\` msgs\n` +
               `• **Voice Time:** \`${formatDuration(stats.voiceSeconds)}\` duration\n` +
               `• **Joins Tracked:** \`${stats.invites.toLocaleString()}\` members`,
        inline: false
      },
      {
        name: `📌 Guild Channels & Roles`,
        value: `\`${textChannels} Text\` • \`${voiceChannels} Voice\` • \`${guild.roles.cache.size} Roles\``,
        inline: false
      },
      {
        name: `🏆 Top Active Chatters (${label})`,
        value: membersText,
        inline: false
      }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    footerText: `Timeframe: ${label} • Live Sync • Naruto One`,
    requestedBy: author,
    clientUser
  });
}

function renderUserStatsPanel(guild, targetUser, activeCat = 'all', timeframeKey = '1d', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];

  const dbUser = db.getUser(targetUser.id);
  const s1d = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['1d']);
  const s7d = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['7d']);
  const s30d = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['30d']);
  const sLife = db.getUserAnalyticsStats(guild.id, targetUser.id, WINDOWS['lifetime']);

  let title = `${emojis.PROFILE || '👤'} ${targetUser.username} — Activity`;
  let description = '';
  let fields = [];

  if (activeCat === 'messages') {
    title = `${emojis.MESSAGES || '💬'} ${targetUser.username} — Chat Messages`;
    description =
      `• **Today (24h):** \`${s1d.messages.toLocaleString()}\` msgs\n` +
      `• **7 Days:** \`${s7d.messages.toLocaleString()}\` msgs\n` +
      `• **30 Days:** \`${s30d.messages.toLocaleString()}\` msgs\n` +
      `• **All Time:** \`${(dbUser.messages || sLife.messages).toLocaleString()}\` msgs`;
  } else if (activeCat === 'voice') {
    title = `${emojis.VOICE || '🔊'} ${targetUser.username} — Voice Time`;
    description =
      `• **Today (24h):** \`${formatDuration(s1d.voiceSeconds)}\`\n` +
      `• **7 Days:** \`${formatDuration(s7d.voiceSeconds)}\`\n` +
      `• **30 Days:** \`${formatDuration(s30d.voiceSeconds)}\`\n` +
      `• **All Time:** \`${formatDuration(dbUser.voiceSeconds || sLife.voiceSeconds)}\``;
  } else if (activeCat === 'invites') {
    title = `${emojis.INVITES || '📨'} ${targetUser.username} — Invites`;
    description =
      `• **Today (24h):** \`${s1d.invites.toLocaleString()}\` joins\n` +
      `• **7 Days:** \`${s7d.invites.toLocaleString()}\` joins\n` +
      `• **30 Days:** \`${s30d.invites.toLocaleString()}\` joins\n` +
      `• **All Time:** \`${(dbUser.invites || sLife.invites).toLocaleString()}\` joins`;
  } else if (activeCat === 'shinobi') {
    title = `${emojis.SHINOBI || '🍥'} ${targetUser.username} — Shinobi Rank`;
    fields = [
      { name: '📜 Ninja Rank', value: `\`${dbUser.rank || 'Academy Student'}\``, inline: true },
      { name: '⚡ Level / XP', value: `\`Lvl ${dbUser.level || 1}\` (${dbUser.xp || 0} XP)`, inline: true },
      { name: '🔮 Chakra & Ryo', value: `\`${dbUser.chakra || 100} Chakra\` | \`${dbUser.ryo || 500} Ryo\``, inline: false },
      { name: '🌀 Jutsu List', value: `\`${(dbUser.jutsuList || ['Rasengan']).join(', ')}\``, inline: false }
    ];
  } else {
    fields = [
      { name: '💬 Messages (24h / Total)', value: `\`${s1d.messages.toLocaleString()}\` / \`${(dbUser.messages || sLife.messages).toLocaleString()}\``, inline: true },
      { name: '🔊 Voice Time (24h / Total)', value: `\`${formatDuration(s1d.voiceSeconds)}\` / \`${formatDuration(dbUser.voiceSeconds || sLife.voiceSeconds)}\``, inline: true },
      { name: '📨 Invites (24h / Total)', value: `\`${s1d.invites.toLocaleString()}\` / \`${(dbUser.invites || sLife.invites).toLocaleString()}\``, inline: true },
      { name: '📜 Shinobi Rank', value: `\`${dbUser.rank || 'Academy Student'}\` (Lvl \`${dbUser.level || 1}\`)`, inline: true },
      { name: '🔮 Chakra & Ryo', value: `\`${dbUser.chakra || 100} Chakra\` | \`${dbUser.ryo || 500} Ryo\``, inline: true }
    ];
  }

  return createStyledEmbed({
    title,
    subtitle: `Member Activity Audit — ${guild.name}`,
    description: description || undefined,
    fields: fields.length > 0 ? fields : undefined,
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

  let listText = '';
  if (pageEntries.length === 0) {
    listText = '*No recorded chat activity for this timeframe.*';
  } else {
    listText = pageEntries.map((item, idx) => {
      const rankNum = startIdx + idx + 1;
      let medal = `#${rankNum}`;
      if (rankNum === 1) medal = `${emojis.OWNER_CROWN || '👑'} #1`;
      else if (rankNum === 2) medal = `${emojis.STAR || '⭐'} #2`;
      else if (rankNum === 3) medal = `${emojis.SHINOBI || '🍥'} #3`;
      return `**${medal}** <@${item.userId}> — **${item.total.toLocaleString()}** msgs`;
    }).join('\n');
  }

  const embed = createStyledEmbed({
    title: `${emojis.MESSAGES || '💬'} Chat Leaderboard [${label}]`,
    subtitle: `Top Chatters in ${guild.name}`,
    description: listText,
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

  let listText = '';
  if (pageEntries.length === 0) {
    listText = '*No recorded voice activity for this timeframe.*';
  } else {
    listText = pageEntries.map((item, idx) => {
      const rankNum = startIdx + idx + 1;
      let medal = `#${rankNum}`;
      if (rankNum === 1) medal = `${emojis.OWNER_CROWN || '👑'} #1`;
      else if (rankNum === 2) medal = `${emojis.STAR || '⭐'} #2`;
      else if (rankNum === 3) medal = `${emojis.SHINOBI || '🍥'} #3`;
      return `**${medal}** <@${item.userId}> — **${formatDuration(item.total)}** voice`;
    }).join('\n');
  }

  const embed = createStyledEmbed({
    title: `${emojis.VOICE || '🔊'} Voice Leaderboard [${label}]`,
    subtitle: `Top Voice Members in ${guild.name}`,
    description: listText,
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

  let listText = '';
  if (pageEntries.length === 0) {
    listText = '*No recorded invite activity for this timeframe.*';
  } else {
    listText = pageEntries.map((item, idx) => {
      const rankNum = startIdx + idx + 1;
      let medal = `#${rankNum}`;
      if (rankNum === 1) medal = `${emojis.OWNER_CROWN || '👑'} #1`;
      else if (rankNum === 2) medal = `${emojis.STAR || '⭐'} #2`;
      else if (rankNum === 3) medal = `${emojis.SHINOBI || '🍥'} #3`;
      return `**${medal}** <@${item.userId}> — **${item.total.toLocaleString()}** invites`;
    }).join('\n');
  }

  const embed = createStyledEmbed({
    title: `${emojis.INVITES || '📨'} Invites Leaderboard [${label}]`,
    subtitle: `Top Recruiters in ${guild.name}`,
    description: listText,
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

  return createStyledEmbed({
    title: `📥 Member Flow & Traffic [${label}]`,
    subtitle: `Joins vs Leaves — ${guild.name}`,
    fields: [
      { name: '📥 Member Joins', value: `\`+${stats.joins.toLocaleString()}\``, inline: true },
      { name: '📤 Member Leaves', value: `\`-${stats.leaves.toLocaleString()}\``, inline: true },
      { name: '📈 Net Growth', value: `\`${net >= 0 ? '+' : ''}${net.toLocaleString()}\``, inline: true }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

function renderTopCommandsPanel(guild, timeframeKey = '1d', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  return createStyledEmbed({
    title: `⚡ Command Usage Analytics [${label}]`,
    subtitle: `Automation Metrics — ${guild.name}`,
    fields: [
      { name: '⚡ Commands Executed', value: `\`${stats.commands.toLocaleString()}\` commands`, inline: true },
      { name: '🏰 Guild Name', value: `\`${guild.name}\``, inline: true }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

function renderTicketStatsPanel(guild, timeframeKey = '1d', author, clientUser) {
  const windowMs = WINDOWS[timeframeKey];
  const label = TIMEFRAME_NAMES[timeframeKey];
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  return createStyledEmbed({
    title: `🎟️ Ticket Resolution Metrics [${label}]`,
    subtitle: `Support Stats — ${guild.name}`,
    fields: [
      { name: '🟢 Opened', value: `\`${stats.ticketsCreated.toLocaleString()}\``, inline: true },
      { name: '🔴 Closed', value: `\`${stats.ticketsClosed.toLocaleString()}\``, inline: true },
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
    'lb', 'lbm', 'lbvc', 'lbi', 'leaderboard', 'top', 'st', 'ss', 'stats', 'tracker',
    'userstats', 'serverstats', 'serveranalytics', 'useranalytics', 'u', 'usr', 'user', 'profile',
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
      else if (['i', 'inv', 'invs', 'invites'].includes(arg0)) sub = 'invites';
      else if (['u', 'user', 'usr'].includes(arg0)) sub = 'user';
      else sub = 'server';
    } else if (['lbm', 'topmessages', 'msgstats', 'messages', 'chat', 'topmsg', 'msgs', 'msg', 'topm'].includes(invoked)) {
      sub = 'messages';
    } else if (['lbvc', 'topvoice', 'voicestats', 'vctiming', 'vctimimng', 'voice', 'vc', 'voicetime', 'vctime', 'topvc', 'vctimes', 'vct'].includes(invoked)) {
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
      let embed = renderServerStatsOverviewPanel(guild, activeTf, author, clientUser);
      let tfRow = buildTimeframeRow(activeTf);
      let catRow = buildServerStatsCategoryRow(activeCat);
      const msg = await message.channel.send({ embeds: [embed], components: [tfRow, catRow] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('stf_')) activeTf = i.customId.replace('stf_', '');
        else if (i.customId.startsWith('scat_')) {
          activeCat = i.customId.replace('scat_', '');
          if (activeCat === 'chat') {
            const res = renderMessagesLeaderboard(guild, activeTf, 1, author, clientUser);
            return i.update({ embeds: [res.embed], components: [buildTimeframeRow(activeTf), buildPaginationRow(res.currentPage, res.totalPages)] });
          }
        }
        return i.update({ embeds: [renderServerStatsOverviewPanel(guild, activeTf, author, clientUser)], components: [buildTimeframeRow(activeTf), buildServerStatsCategoryRow(activeCat)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'user') {
      const mentionOrId = (invoked === 'lb' || invoked === 'leaderboard') ? args[1] : args[0];
      const targetUser = message.mentions.users.first() || (mentionOrId ? await message.client.users.fetch(mentionOrId).catch(() => null) : null) || author;
      let activeCat = 'all';
      let activeTf = '1d';
      let embed = renderUserStatsPanel(guild, targetUser, activeCat, activeTf, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildUserMetricRow(activeCat), buildTimeframeRow(activeTf)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('ucat_')) activeCat = i.customId.replace('ucat_', '');
        else if (i.customId.startsWith('tf_')) activeTf = i.customId.replace('tf_', '');
        return i.update({ embeds: [renderUserStatsPanel(guild, targetUser, activeCat, activeTf, author, clientUser)], components: [buildUserMetricRow(activeCat), buildTimeframeRow(activeTf)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'messages') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || 'lifetime') : (arg0 || 'lifetime');
      if (!WINDOWS[activeKey]) activeKey = 'lifetime';
      let page = 1;
      let { embed, currentPage, totalPages } = renderMessagesLeaderboard(guild, activeKey, page, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildTimeframeRow(activeKey), buildPaginationRow(currentPage, totalPages)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId === 'page_stop') { collector.stop(); return i.update({ components: [] }); }
        else if (i.customId.startsWith('tf_')) { activeKey = i.customId.replace('tf_', ''); page = 1; }
        else if (i.customId === 'page_prev') page = Math.max(1, page - 1);
        else if (i.customId === 'page_next') page++;
        const res = renderMessagesLeaderboard(guild, activeKey, page, author, clientUser);
        return i.update({ embeds: [res.embed], components: [buildTimeframeRow(activeKey), buildPaginationRow(res.currentPage, res.totalPages)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'voice') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || 'lifetime') : (arg0 || 'lifetime');
      if (!WINDOWS[activeKey]) activeKey = 'lifetime';
      let page = 1;
      let { embed, currentPage, totalPages } = renderVoiceLeaderboard(guild, activeKey, page, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildTimeframeRow(activeKey), buildPaginationRow(currentPage, totalPages)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId === 'page_stop') { collector.stop(); return i.update({ components: [] }); }
        else if (i.customId.startsWith('tf_')) { activeKey = i.customId.replace('tf_', ''); page = 1; }
        else if (i.customId === 'page_prev') page = Math.max(1, page - 1);
        else if (i.customId === 'page_next') page++;
        const res = renderVoiceLeaderboard(guild, activeKey, page, author, clientUser);
        return i.update({ embeds: [res.embed], components: [buildTimeframeRow(activeKey), buildPaginationRow(res.currentPage, res.totalPages)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'invites') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || 'lifetime') : (arg0 || 'lifetime');
      if (!WINDOWS[activeKey]) activeKey = 'lifetime';
      let page = 1;
      let { embed, currentPage, totalPages } = renderInvitesLeaderboard(guild, activeKey, page, author, clientUser);
      const msg = await message.channel.send({ embeds: [embed], components: [buildTimeframeRow(activeKey), buildPaginationRow(currentPage, totalPages)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId === 'page_stop') { collector.stop(); return i.update({ components: [] }); }
        else if (i.customId.startsWith('tf_')) { activeKey = i.customId.replace('tf_', ''); page = 1; }
        else if (i.customId === 'page_prev') page = Math.max(1, page - 1);
        else if (i.customId === 'page_next') page++;
        const res = renderInvitesLeaderboard(guild, activeKey, page, author, clientUser);
        return i.update({ embeds: [res.embed], components: [buildTimeframeRow(activeKey), buildPaginationRow(res.currentPage, res.totalPages)] });
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'joins' || sub === 'leaves') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || '1d') : (arg0 || '1d');
      if (!WINDOWS[activeKey]) activeKey = '1d';
      const msg = await message.channel.send({ embeds: [renderJoinsLeavesPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace('tf_', '');
          return i.update({ embeds: [renderJoinsLeavesPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey)] });
        }
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'commands') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || '1d') : (arg0 || '1d');
      if (!WINDOWS[activeKey]) activeKey = '1d';
      const msg = await message.channel.send({ embeds: [renderTopCommandsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace('tf_', '');
          return i.update({ embeds: [renderTopCommandsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey)] });
        }
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    if (sub === 'tickets') {
      let activeKey = (invoked === 'lb' || invoked === 'leaderboard') ? (arg1 || '1d') : (arg0 || '1d');
      if (!WINDOWS[activeKey]) activeKey = '1d';
      const msg = await message.channel.send({ embeds: [renderTicketStatsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey)] });
      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId.startsWith('tf_')) {
          activeKey = i.customId.replace('tf_', '');
          return i.update({ embeds: [renderTicketStatsPanel(guild, activeKey, author, clientUser)], components: [buildTimeframeRow(activeKey)] });
        }
      });
      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }
  }
};
