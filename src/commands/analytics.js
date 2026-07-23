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

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function buildTimeframeEmbed(guild, timeframeLabel, windowMs, author, clientUser) {
  const stats = db.getAnalyticsStats(guild.id, windowMs);

  return createStyledEmbed({
    title: `📊 ${timeframeLabel} Server Analytics — ${guild.name}`,
    subtitle: `Activity Audit Report for timeframe [${timeframeLabel}]`,
    fields: [
      { name: '💬 Chat Messages', value: `\`${stats.messages}\` messages`, inline: true },
      { name: '🔊 Voice Time Logged', value: `\`${formatDuration(stats.voiceSeconds)}\``, inline: true },
      { name: '📨 Invites Created', value: `\`${stats.invites}\` joins`, inline: true },
      { name: '📥 Member Joins', value: `\`+${stats.joins}\` members`, inline: true },
      { name: '📤 Member Leaves', value: `\`-${stats.leaves}\` members`, inline: true },
      { name: '⚡ Commands Executed', value: `\`${stats.commands}\` commands`, inline: true },
      { name: '🎟️ Tickets Opened', value: `\`${stats.ticketsCreated}\` tickets`, inline: true },
      { name: '🔒 Tickets Closed', value: `\`${stats.ticketsClosed}\` tickets`, inline: true }
    ],
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

module.exports = {
  name: 'analytics',
  description: 'Dedicated category & timeframe analytics viewing suite: messages, voice, invites, joins/leaves, commands & tickets',
  aliases: [
    'tracker', 'userstats', 'serverstats', 'serveranalytics', 'useranalytics',
    '1d', '7d', '14d', '30d', 'overall', 'lifetime',
    'analytics1d', 'analytics7d', 'analytics14d', 'analytics30d', 'overallanalytics',
    'topmessages', 'msgstats', 'topvoice', 'voicestats', 'vctiming',
    'topinvites', 'invitestats', 'joinsleaves', 'memberflow', 'joinleavestats',
    'topcommands', 'commandstats', 'ticketstats', 'ticketanalytics'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    // Direct Command Alias Mappings
    if (invoked === '1d' || invoked === 'analytics1d') sub = '1d';
    if (invoked === '7d' || invoked === 'analytics7d') sub = '7d';
    if (invoked === '14d' || invoked === 'analytics14d') sub = '14d';
    if (invoked === '30d' || invoked === 'analytics30d') sub = '30d';
    if (invoked === 'overall' || invoked === 'lifetime' || invoked === 'overallanalytics') sub = 'lifetime';

    if (['topmessages', 'msgstats', 'messages', 'chat'].includes(invoked)) sub = 'messages';
    if (['topvoice', 'voicestats', 'vctiming', 'voice'].includes(invoked)) sub = 'voice';
    if (['topinvites', 'invitestats', 'invites'].includes(invoked)) sub = 'invites';
    if (['joinsleaves', 'memberflow', 'joinleavestats', 'joins', 'leaves'].includes(invoked)) sub = 'joins';
    if (['topcommands', 'commandstats', 'commands'].includes(invoked)) sub = 'commands';
    if (['ticketstats', 'ticketanalytics', 'tickets'].includes(invoked)) sub = 'tickets';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const g1d = db.getAnalyticsStats(guild.id, WINDOWS['1d']);
    const g7d = db.getAnalyticsStats(guild.id, WINDOWS['7d']);
    const g14d = db.getAnalyticsStats(guild.id, WINDOWS['14d']);
    const g30d = db.getAnalyticsStats(guild.id, WINDOWS['30d']);
    const gLife = db.getAnalyticsStats(guild.id, WINDOWS['lifetime']);

    // 1. CATEGORY: MESSAGES ANALYTICS (.topmessages / .analytics messages)
    if (sub === 'messages' || sub === 'msg' || sub === 'chat') {
      const embed = createStyledEmbed({
        title: `💬 Chat Messages Analytics — ${guild.name}`,
        subtitle: `Timeframe Message Volume Breakdown`,
        fields: [
          { name: '⚡ 1 Day (24h)', value: `\`${g1d.messages}\` msgs`, inline: true },
          { name: '📅 7 Days (1w)', value: `\`${g7d.messages}\` msgs`, inline: true },
          { name: '🗓️ 14 Days (2w)', value: `\`${g14d.messages}\` msgs`, inline: true },
          { name: '📊 30 Days (1m)', value: `\`${g30d.messages}\` msgs`, inline: true },
          { name: '🌐 Lifetime', value: `\`${gLife.messages}\` msgs`, inline: true }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. CATEGORY: VOICE TIMING ANALYTICS (.topvoice / .analytics voice)
    if (sub === 'voice' || sub === 'vctiming' || sub === 'voicestats') {
      const embed = createStyledEmbed({
        title: `🔊 Voice Channel Timing Analytics — ${guild.name}`,
        subtitle: `Timeframe Active Voice Duration Logged`,
        fields: [
          { name: '⚡ 1 Day (24h)', value: `\`${formatDuration(g1d.voiceSeconds)}\``, inline: true },
          { name: '📅 7 Days (1w)', value: `\`${formatDuration(g7d.voiceSeconds)}\``, inline: true },
          { name: '🗓️ 14 Days (2w)', value: `\`${formatDuration(g14d.voiceSeconds)}\``, inline: true },
          { name: '📊 30 Days (1m)', value: `\`${formatDuration(g30d.voiceSeconds)}\``, inline: true },
          { name: '🌐 Lifetime', value: `\`${formatDuration(gLife.voiceSeconds)}\``, inline: true }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 3. CATEGORY: INVITES ANALYTICS (.topinvites / .analytics invites)
    if (sub === 'invites' || sub === 'invitestats' || sub === 'topinvites') {
      const embed = createStyledEmbed({
        title: `📨 Server Invites Analytics — ${guild.name}`,
        subtitle: `Timeframe Member Invite Growth`,
        fields: [
          { name: '⚡ 1 Day (24h)', value: `\`${g1d.invites}\` joins via invite`, inline: true },
          { name: '📅 7 Days (1w)', value: `\`${g7d.invites}\` joins via invite`, inline: true },
          { name: '🗓️ 14 Days (2w)', value: `\`${g14d.invites}\` joins via invite`, inline: true },
          { name: '📊 30 Days (1m)', value: `\`${g30d.invites}\` joins via invite`, inline: true },
          { name: '🌐 Lifetime', value: `\`${gLife.invites}\` joins via invite`, inline: true }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 4. CATEGORY: JOINS & LEAVES ANALYTICS (.joinsleaves / .analytics joins)
    if (sub === 'joins' || sub === 'leaves' || sub === 'memberflow' || sub === 'joinleavestats') {
      const embed = createStyledEmbed({
        title: `📥 Joins & 📤 Leaves Analytics — ${guild.name}`,
        subtitle: `Timeframe Member Growth & Retention Flow`,
        fields: [
          { name: '⚡ 1 Day (24h)', value: `📥 \`+${g1d.joins}\` | 📤 \`-${g1d.leaves}\` (Net: \`${g1d.joins - g1d.leaves}\`)`, inline: false },
          { name: '📅 7 Days (1w)', value: `📥 \`+${g7d.joins}\` | 📤 \`-${g7d.leaves}\` (Net: \`${g7d.joins - g7d.leaves}\`)`, inline: false },
          { name: '🗓️ 14 Days (2w)', value: `📥 \`+${g14d.joins}\` | 📤 \`-${g14d.leaves}\` (Net: \`${g14d.joins - g14d.leaves}\`)`, inline: false },
          { name: '📊 30 Days (1m)', value: `📥 \`+${g30d.joins}\` | 📤 \`-${g30d.leaves}\` (Net: \`${g30d.joins - g30d.leaves}\`)`, inline: false },
          { name: '🌐 Lifetime', value: `📥 \`+${gLife.joins}\` | 📤 \`-${gLife.leaves}\` (Net: \`${gLife.joins - gLife.leaves}\`)`, inline: false }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 5. CATEGORY: COMMANDS EXECUTED ANALYTICS (.topcommands / .analytics commands)
    if (sub === 'commands' || sub === 'topcommands' || sub === 'commandstats') {
      const embed = createStyledEmbed({
        title: `⚡ Bot Command Execution Analytics — ${guild.name}`,
        subtitle: `Timeframe Bot Usage & Automation Activity`,
        fields: [
          { name: '⚡ 1 Day (24h)', value: `\`${g1d.commands}\` commands`, inline: true },
          { name: '📅 7 Days (1w)', value: `\`${g7d.commands}\` commands`, inline: true },
          { name: '🗓️ 14 Days (2w)', value: `\`${g14d.commands}\` commands`, inline: true },
          { name: '📊 30 Days (1m)', value: `\`${g30d.commands}\` commands`, inline: true },
          { name: '🌐 Lifetime', value: `\`${gLife.commands}\` commands`, inline: true }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 6. CATEGORY: TICKETS ANALYTICS (.ticketstats / .analytics tickets)
    if (sub === 'tickets' || sub === 'ticketstats' || sub === 'ticketanalytics') {
      const embed = createStyledEmbed({
        title: `🎟️ Ticket System Analytics — ${guild.name}`,
        subtitle: `Timeframe Ticket Volume & Resolution Audit`,
        fields: [
          { name: '⚡ 1 Day (24h)', value: `🟢 Opened: \`${g1d.ticketsCreated}\` | 🔴 Closed: \`${g1d.ticketsClosed}\``, inline: false },
          { name: '📅 7 Days (1w)', value: `🟢 Opened: \`${g7d.ticketsCreated}\` | 🔴 Closed: \`${g7d.ticketsClosed}\``, inline: false },
          { name: '🗓️ 14 Days (2w)', value: `🟢 Opened: \`${g14d.ticketsCreated}\` | 🔴 Closed: \`${g14d.ticketsClosed}\``, inline: false },
          { name: '📊 30 Days (1m)', value: `🟢 Opened: \`${g30d.ticketsCreated}\` | 🔴 Closed: \`${g30d.ticketsClosed}\``, inline: false },
          { name: '🌐 Lifetime', value: `🟢 Opened: \`${gLife.ticketsCreated}\` | 🔴 Closed: \`${gLife.ticketsClosed}\``, inline: false }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 7. TIMEFRAME SPECIFIC COMMANDS (.1d, .7d, .14d, .30d, .overall)
    if (sub === '1d' || sub === '1day' || sub === '24h') {
      const embed = buildTimeframeEmbed(guild, '1-Day (24 Hours)', WINDOWS['1d'], author, clientUser);
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === '7d' || sub === '7days' || sub === '1week') {
      const embed = buildTimeframeEmbed(guild, '7-Day (1 Week)', WINDOWS['7d'], author, clientUser);
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === '14d' || sub === '14days' || sub === '2weeks') {
      const embed = buildTimeframeEmbed(guild, '14-Day (2 Weeks)', WINDOWS['14d'], author, clientUser);
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === '30d' || sub === '30days' || sub === '1month') {
      const embed = buildTimeframeEmbed(guild, '30-Day (1 Month)', WINDOWS['30d'], author, clientUser);
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'overall' || sub === 'lifetime' || sub === 'all') {
      const embed = buildTimeframeEmbed(guild, 'Overall (Lifetime)', WINDOWS['lifetime'], author, clientUser);
      return message.channel.send({ embeds: [embed] });
    }

    // 8. TARGETED USER ANALYTICS (.analytics user @user / .userstats @user)
    const targetUser = message.mentions.users.first() || (args[1] ? message.client.users.cache.get(args[1]) : null) || (sub === 'user' ? author : null);

    if (sub === 'user' || targetUser) {
      const user = targetUser || author;

      const s1d = db.getUserAnalyticsStats(guild.id, user.id, WINDOWS['1d']);
      const s7d = db.getUserAnalyticsStats(guild.id, user.id, WINDOWS['7d']);
      const s14d = db.getUserAnalyticsStats(guild.id, user.id, WINDOWS['14d']);
      const s30d = db.getUserAnalyticsStats(guild.id, user.id, WINDOWS['30d']);
      const sLife = db.getUserAnalyticsStats(guild.id, user.id, WINDOWS['lifetime']);

      const dbUser = db.getUser(user.id);

      const embed = createStyledEmbed({
        title: `📊 Activity Analytics — ${user.username}`,
        subtitle: `Tracked Chat, Voice & Interaction History`,
        fields: [
          {
            name: `💬 Chat Messages Sent`,
            value:
              `• **1d**: \`${s1d.messages}\` msgs\n` +
              `• **7d**: \`${s7d.messages}\` msgs\n` +
              `• **14d**: \`${s14d.messages}\` msgs\n` +
              `• **30d**: \`${s30d.messages}\` msgs\n` +
              `• **Lifetime**: \`${dbUser.messages || sLife.messages}\` msgs`,
            inline: true
          },
          {
            name: `🔊 Voice Time Logged`,
            value:
              `• **1d**: \`${formatDuration(s1d.voiceSeconds)}\`\n` +
              `• **7d**: \`${formatDuration(s7d.voiceSeconds)}\`\n` +
              `• **14d**: \`${formatDuration(s14d.voiceSeconds)}\`\n` +
              `• **30d**: \`${formatDuration(s30d.voiceSeconds)}\`\n` +
              `• **Lifetime**: \`${formatDuration(dbUser.voiceSeconds || sLife.voiceSeconds)}\``,
            inline: true
          },
          {
            name: `📨 Invites Created`,
            value:
              `• **1d**: \`${s1d.invites}\` joins\n` +
              `• **7d**: \`${s7d.invites}\` joins\n` +
              `• **14d**: \`${s14d.invites}\` joins\n` +
              `• **30d**: \`${s30d.invites}\` joins\n` +
              `• **Lifetime**: \`${dbUser.invites || sLife.invites}\` joins`,
            inline: true
          },
          {
            name: `⚡ Commands & Tickets`,
            value:
              `• **Commands Used**: \`${s30d.commands}\` (30d) | \`${sLife.commands}\` (All-time)\n` +
              `• **Tickets Opened**: \`${s30d.ticketsCreated}\` (30d) | \`${sLife.ticketsCreated}\` (All-time)`,
            inline: false
          }
        ],
        thumbnailUrl: user.displayAvatarURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 9. FULL COMPARISON DASHBOARD (.analytics)
    const embed = createStyledEmbed({
      title: `📊 Server Activity Analytics — ${guild.name}`,
      subtitle: `Realtime Audit & Performance Comparison (1d / 7d / 14d / 30d / Lifetime)`,
      fields: [
        {
          name: `💬 Chat Activity (Messages)`,
          value:
            `• **1 Day**: \`${g1d.messages}\` msgs\n` +
            `• **7 Days**: \`${g7d.messages}\` msgs\n` +
            `• **14 Days**: \`${g14d.messages}\` msgs\n` +
            `• **30 Days**: \`${g30d.messages}\` msgs\n` +
            `• **Lifetime**: \`${gLife.messages}\` msgs`,
          inline: true
        },
        {
          name: `🔊 Voice Activity (Timing)`,
          value:
            `• **1 Day**: \`${formatDuration(g1d.voiceSeconds)}\`\n` +
            `• **7 Days**: \`${formatDuration(g7d.voiceSeconds)}\`\n` +
            `• **14 Days**: \`${formatDuration(g14d.voiceSeconds)}\`\n` +
            `• **30 Days**: \`${formatDuration(g30d.voiceSeconds)}\`\n` +
            `• **Lifetime**: \`${formatDuration(gLife.voiceSeconds)}\``,
          inline: true
        },
        {
          name: `📥 Joins & 📤 Leaves`,
          value:
            `• **1 Day**: \`+${g1d.joins}\` | \`-${g1d.leaves}\`\n` +
            `• **7 Days**: \`+${g7d.joins}\` | \`-${g7d.leaves}\`\n` +
            `• **14 Days**: \`+${g14d.joins}\` | \`-${g14d.leaves}\`\n` +
            `• **30 Days**: \`+${g30d.joins}\` | \`-${g30d.leaves}\`\n` +
            `• **Lifetime**: \`+${gLife.joins}\` | \`-${gLife.leaves}\``,
          inline: true
        },
        {
          name: `🎟️ Tickets Opened / Closed`,
          value:
            `• **1 Day**: \`${g1d.ticketsCreated}\` open | \`${g1d.ticketsClosed}\` closed\n` +
            `• **7 Days**: \`${g7d.ticketsCreated}\` open | \`${g7d.ticketsClosed}\` closed\n` +
            `• **14 Days**: \`${g14d.ticketsCreated}\` open | \`${g14d.ticketsClosed}\` closed\n` +
            `• **30 Days**: \`${g30d.ticketsCreated}\` open | \`${g30d.ticketsClosed}\` closed\n` +
            `• **Lifetime**: \`${gLife.ticketsCreated}\` open | \`${gLife.ticketsClosed}\` closed`,
          inline: true
        },
        {
          name: `⚡ Commands & Invites`,
          value:
            `• **Commands (30d)**: \`${g30d.commands}\` | **Lifetime**: \`${gLife.commands}\`\n` +
            `• **Invites (30d)**: \`${g30d.invites}\` | **Lifetime**: \`${gLife.invites}\``,
          inline: true
        }
      ],
      thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
