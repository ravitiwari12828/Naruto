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

module.exports = {
  name: 'analytics',
  description: 'Track Chat timing, Voice timing, Invites, Server Joins/Leaves, Commands & Tickets across 1d, 7d, 14d, 30d & Lifetime',
  aliases: ['tracker', 'userstats', 'serverstats', 'serveranalytics', 'useranalytics'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const sub = args[0]?.toLowerCase();
    const targetUser = message.mentions.users.first() || (args[1] ? message.client.users.cache.get(args[1]) : null) || (sub === 'user' ? author : null);

    // 1. TARGETED USER ANALYTICS (.analytics user @user / .userstats @user)
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

    // 2. SERVER WIDE ANALYTICS OVERVIEW (.analytics / .serveranalytics)
    const g1d = db.getAnalyticsStats(guild.id, WINDOWS['1d']);
    const g7d = db.getAnalyticsStats(guild.id, WINDOWS['7d']);
    const g14d = db.getAnalyticsStats(guild.id, WINDOWS['14d']);
    const g30d = db.getAnalyticsStats(guild.id, WINDOWS['30d']);
    const gLife = db.getAnalyticsStats(guild.id, WINDOWS['lifetime']);

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
