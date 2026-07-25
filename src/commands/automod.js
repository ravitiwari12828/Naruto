const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

function renderAutomodFiltersEmbed(config, guild, author, clientUser) {
  const f = config;

  return createStyledEmbed({
    title: `🛡️ AutoMod Filters Hub — ${guild.name}`,
    subtitle: `Wick-Grade Automated Content & Link Protection`,
    fields: [
      {
        name: `💬 ANTI SPAM`,
        value: `Target message, mention, attachment spam and a lot more.\nStatus: ${f.antiSpam ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: false
      },
      {
        name: `📢 INVITE LINKS`,
        value: `Target Discord Server invites sent by advertisers.\nStatus: ${f.inviteLinks ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: false
      },
      {
        name: `🛡️ MALICIOUS LINKS`,
        value: `Target phishing/malicious/scam websites sent in your server.\nStatus: ${f.maliciousLinks ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: false
      },
      {
        name: `🔞 NSFW LINKS`,
        value: `Target NSFW websites posted in SFW channels.\nStatus: ${f.nsfwLinks ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: false
      },
      {
        name: `🔤 WORD BLACKLIST`,
        value: `Target premade profanity words or add your own.\nStatus: ${f.profanity ? '`ENABLED` ✅' : '`DISABLED` ❌'} | Words: \`${(f.wordBlacklist || []).length} active\``,
        inline: false
      },
      {
        name: `🔗 LINK BLACKLIST`,
        value: `Target websites found in messages that you manage.\nStatus: ${f.linkBlacklist && f.linkBlacklist.length > 0 ? '`ACTIVE` ✅' : '`EMPTY` ❌'} | Domains: \`${(f.linkBlacklist || []).length} blacklisted\``,
        inline: false
      }
    ],
    requestedBy: author,
    clientUser
  });
}

function renderAutomodFilterButtons(config) {
  const f = config;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_toggle_spam').setLabel(f.antiSpam ? 'AntiSpam: ON' : 'AntiSpam: OFF').setStyle(f.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_toggle_invites').setLabel(f.inviteLinks ? 'Invites: ON' : 'Invites: OFF').setStyle(f.inviteLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_toggle_malicious').setLabel(f.maliciousLinks ? 'Malicious: ON' : 'Malicious: OFF').setStyle(f.maliciousLinks ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_toggle_nsfw').setLabel(f.nsfwLinks ? 'NSFW Links: ON' : 'NSFW Links: OFF').setStyle(f.nsfwLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_toggle_profanity').setLabel(f.profanity ? 'Words: ON' : 'Words: OFF').setStyle(f.profanity ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_view_misc').setLabel('Miscellaneous').setEmoji('⚙️').setStyle(ButtonStyle.Primary)
  );

  return [row1, row2];
}

function renderMiscSettingsEmbed(config, guild, author, clientUser) {
  const m = config.misc || {};

  const logsChan = m.logsChannelId ? `<#${m.logsChannelId}>` : '`Not Set (Default)`';
  const modlogsChan = m.modlogsChannelId ? `<#${m.modlogsChannelId}>` : '`Not Set (Default)`';
  const quarRole = m.quarantineRoleId ? `<@&${m.quarantineRoleId}>` : '`Quarantine`';
  const mainRole = m.mainRoleId ? `<@&${m.mainRoleId}>` : '`Select Main Role`';

  return createStyledEmbed({
    title: `⚙️ Miscellaneous & Moderation Settings — ${guild.name}`,
    subtitle: `Global Bot Configuration, Log Channels & Punishment Policies`,
    fields: [
      {
        name: `⚙️ COMMAND PREFIX`,
        value: `Active Prefix: \`${m.prefix || '.'}\` (Change via \`.prefix <newPrefix>\`)`,
        inline: false
      },
      {
        name: `📜 SYSTEM LOG CHANNELS & ROLES`,
        value:
          `• **Logs Channel**: ${logsChan}\n` +
          `• **ModLogs Channel**: ${modlogsChan}\n` +
          `• **Quarantine Role**: ${quarRole}\n` +
          `• **Main Member Role**: ${mainRole}`,
        inline: false
      },
      {
        name: `🛡️ MODERATION COMMAND POLICIES`,
        value:
          `• **Display Confirmation Message**: ${m.moderatorConfirmation !== false ? '`YES` ✅' : '`NO` ❌'}\n` +
          `• **Always DM Punished Members**: ${m.alwaysDmPunished !== false ? '`YES` ✅' : '`NO` ❌'}\n` +
          `• **Hide Staff Identity (Anonymous Staff)**: ${m.hideStaffIdentity ? '`ENABLED` 🎭' : '`DISABLED` ❌'}\n` +
          `• **Default Timeout Duration**: \`${m.defaultTimeoutMinutes || 2880} minutes\` (${Math.round((m.defaultTimeoutMinutes || 2880) / 1440)} days)\n` +
          `• **Days Purged on Ban**: \`${m.daysPurgedOnBan || 7} days\``,
        inline: false
      },
      {
        name: `🤖 AUTO MODERATION POLICIES`,
        value:
          `• **Display Reason in Auto Message**: ${m.displayPunishReason !== false ? '`YES` ✅' : '`NO` ❌'}\n` +
          `• **Auto Purge Messages of Punished Member**: ${m.autoPurgeMessages ? '`YES (Recent 100)` ✅' : '`NO` ❌'}\n` +
          `• **Current Punishment Action**: \`${(config.punishment || 'warn').toUpperCase()}\``,
        inline: false
      }
    ],
    requestedBy: author,
    clientUser
  });
}

function renderMiscButtons(config) {
  const m = config.misc || {};

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_misc_confirm').setLabel(m.moderatorConfirmation !== false ? 'Confirm Msg: ON' : 'Confirm Msg: OFF').setStyle(m.moderatorConfirmation !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_misc_dm').setLabel(m.alwaysDmPunished !== false ? 'Always DM: ON' : 'Always DM: OFF').setStyle(m.alwaysDmPunished !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_misc_anon').setLabel(m.hideStaffIdentity ? 'Anon Staff: ON' : 'Anon Staff: OFF').setStyle(m.hideStaffIdentity ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_misc_purge').setLabel(m.autoPurgeMessages ? 'Auto Purge: ON' : 'Auto Purge: OFF').setStyle(m.autoPurgeMessages ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_view_filters').setLabel('Back to Filters').setEmoji('🛡️').setStyle(ButtonStyle.Primary)
  );

  return [row1, row2];
}

module.exports = {
  name: 'automod',
  description: 'Wick-Grade AutoMod Filters (AntiSpam, Invites, Malicious, NSFW, Word/Link Blacklist) & Miscellaneous Settings',
  aliases: ['antibot', 'moderation', 'filter', 'filters', 'misc', 'miscellaneous'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (['misc', 'miscellaneous'].includes(invoked)) sub = 'misc';
    if (invoked === 'antibot') sub = 'antibot';
    if (invoked === 'filter' || invoked === 'filters') sub = 'filters';

    const author = message.author;
    const guild = message.guild;
    const config = db.getAutomod(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Permission Check
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply(`${emojis.WARNING || '⚠️'} You need **Manage Server** permission to configure AutoMod & Miscellaneous settings.`);
    }

    // ─────────────────────────────────────────
    // 1. MISCELLANEOUS SETTINGS HUB (.misc / .automod misc)
    // ─────────────────────────────────────────
    if (sub === 'misc' || sub === 'miscellaneous') {
      const action = args[1]?.toLowerCase();

      if (action === 'logs' && message.mentions.channels.first()) {
        const chan = message.mentions.channels.first();
        config.misc.logsChannelId = chan.id;
        db.updateAutomod(guild.id, 'misc', config.misc);
        return message.reply(`✅ **Logs Channel** set to <#${chan.id}>.`);
      }
      if (action === 'modlogs' && message.mentions.channels.first()) {
        const chan = message.mentions.channels.first();
        config.misc.modlogsChannelId = chan.id;
        db.updateAutomod(guild.id, 'misc', config.misc);
        return message.reply(`✅ **ModLogs Channel** set to <#${chan.id}>.`);
      }
      if (action === 'quarantine' && message.mentions.roles.first()) {
        const role = message.mentions.roles.first();
        config.misc.quarantineRoleId = role.id;
        db.updateAutomod(guild.id, 'misc', config.misc);
        return message.reply(`✅ **Quarantine Role** set to <@&${role.id}>.`);
      }
      if (action === 'mainrole' && message.mentions.roles.first()) {
        const role = message.mentions.roles.first();
        config.misc.mainRoleId = role.id;
        db.updateAutomod(guild.id, 'misc', config.misc);
        return message.reply(`✅ **Main Member Role** set to <@&${role.id}>.`);
      }
      if (action === 'timeout' && args[2] && !isNaN(parseInt(args[2]))) {
        config.misc.defaultTimeoutMinutes = parseInt(args[2]);
        db.updateAutomod(guild.id, 'misc', config.misc);
        return message.reply(`✅ **Default Timeout Duration** set to **${config.misc.defaultTimeoutMinutes} minutes**.`);
      }
      if (action === 'purge' && args[2] && !isNaN(parseInt(args[2]))) {
        config.misc.daysPurgedOnBan = parseInt(args[2]);
        db.updateAutomod(guild.id, 'misc', config.misc);
        return message.reply(`✅ **Days Purged on Ban** set to **${config.misc.daysPurgedOnBan} days**.`);
      }

      const miscEmbed = renderMiscSettingsEmbed(config, guild, author, clientUser);
      const miscRows = renderMiscButtons(config);
      const msg = await message.channel.send({ embeds: [miscEmbed], components: miscRows });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== author.id) {
          return interaction.reply({ content: `⚠️ Only ${author.username} can toggle these settings.`, flags: 64 });
        }
        const id = interaction.customId;
        const m = config.misc;

        if (id === 'am_view_filters') {
          const fEmbed = renderAutomodFiltersEmbed(config, guild, author, clientUser);
          const fRows = renderAutomodFilterButtons(config);
          return interaction.update({ embeds: [fEmbed], components: fRows });
        }
        if (id === 'am_misc_confirm') m.moderatorConfirmation = !m.moderatorConfirmation;
        if (id === 'am_misc_dm') m.alwaysDmPunished = !m.alwaysDmPunished;
        if (id === 'am_misc_anon') m.hideStaffIdentity = !m.hideStaffIdentity;
        if (id === 'am_misc_purge') m.autoPurgeMessages = !m.autoPurgeMessages;

        db.updateAutomod(guild.id, 'misc', m);
        const newEmbed = renderMiscSettingsEmbed(config, guild, author, clientUser);
        const newRows = renderMiscButtons(config);
        return interaction.update({ embeds: [newEmbed], components: newRows });
      });
      return;
    }

    // ─────────────────────────────────────────
    // 2. WORD & LINK BLACKLIST MANAGEMENT
    // ─────────────────────────────────────────
    if (sub === 'blacklist' || sub === 'words' || sub === 'links') {
      const action = args[1]?.toLowerCase();
      const value = args.slice(2).join(' ').toLowerCase();

      if (action === 'add' && value) {
        if (!config.wordBlacklist.includes(value)) {
          config.wordBlacklist.push(value);
          db.updateAutomod(guild.id, 'wordBlacklist', config.wordBlacklist);
        }
        return message.reply(`✅ Added \`${value}\` to AutoMod Word Blacklist.`);
      }
      if (action === 'remove' && value) {
        config.wordBlacklist = config.wordBlacklist.filter(w => w !== value);
        db.updateAutomod(guild.id, 'wordBlacklist', config.wordBlacklist);
        return message.reply(`✅ Removed \`${value}\` from AutoMod Word Blacklist.`);
      }
    }

    // ─────────────────────────────────────────
    // 3. DEFAULT AUTOMOD FILTERS DASHBOARD
    // ─────────────────────────────────────────
    const filtersEmbed = renderAutomodFiltersEmbed(config, guild, author, clientUser);
    const filterRows = renderAutomodFilterButtons(config);

    const msg = await message.channel.send({ embeds: [filtersEmbed], components: filterRows });
    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: `⚠️ Only ${author.username} can toggle AutoMod filters.`, flags: 64 });
      }

      const id = interaction.customId;
      if (id === 'am_view_misc') {
        const mEmbed = renderMiscSettingsEmbed(config, guild, author, clientUser);
        const mRows = renderMiscButtons(config);
        return interaction.update({ embeds: [mEmbed], components: mRows });
      }

      if (id === 'am_toggle_spam') config.antiSpam = !config.antiSpam;
      if (id === 'am_toggle_invites') config.inviteLinks = !config.inviteLinks;
      if (id === 'am_toggle_malicious') config.maliciousLinks = !config.maliciousLinks;
      if (id === 'am_toggle_nsfw') config.nsfwLinks = !config.nsfwLinks;
      if (id === 'am_toggle_profanity') config.profanity = !config.profanity;

      db.updateAutomod(guild.id, 'antiSpam', config.antiSpam);
      db.updateAutomod(guild.id, 'inviteLinks', config.inviteLinks);
      db.updateAutomod(guild.id, 'maliciousLinks', config.maliciousLinks);
      db.updateAutomod(guild.id, 'nsfwLinks', config.nsfwLinks);
      db.updateAutomod(guild.id, 'profanity', config.profanity);

      const newEmbed = renderAutomodFiltersEmbed(config, guild, author, clientUser);
      const newRows = renderAutomodFilterButtons(config);
      return interaction.update({ embeds: [newEmbed], components: newRows });
    });
  }
};

