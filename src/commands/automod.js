const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

function formatBoxLine(key, value) {
  const k = (key).padEnd(12, ' ') + ' : ';
  const v = String(value).slice(0, 19).padEnd(19, ' ');
  return '│ ' + k + v + ' │';
}

function renderAutomodFiltersEmbed(config, guild, author, clientUser) {
  const f = config;

  const boxLines = [
    '╭────────────────────────────────────╮',
    '│        AUTOMOD CONTROL HUB         │',
    '├────────────────────────────────────┤',
    formatBoxLine('AntiSpam', f.antiSpam ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('InviteLink', f.inviteLinks ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('Malicious', f.maliciousLinks ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('NSFW Links', f.nsfwLinks ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('Word List', String((f.wordBlacklist || []).length).padStart(2, '0') + ' words'),
    formatBoxLine('Link List', String((f.linkBlacklist || []).length).padStart(2, '0') + ' links'),
    '├────────────────────────────────────┤',
    '│          AUTOMOD COMMANDS          │',
    '├────────────────────────────────────┤',
    '│ .automod                           │',
    '│ .automod config                    │',
    '│ .addword <word>                    │',
    '│ .delword <word>                    │',
    '│ .addlink <domain>                  │',
    '│ .dellink <domain>                  │',
    '│ .antibot wl @bot                   │',
    '│ .antibot unwl @bot                 │',
    '│ .blacklist                         │',
    '╰────────────────────────────────────╯'
  ];

  return createStyledEmbed({
    title: `${emojis.SHIELD} AutoMod Security Control Hub — ${guild.name}`,
    subtitle: `Interactive Content Guard & Link Protection Suite`,
    description:
      `Welcome **${author.username}**! Configure live content guards & security filters.\n\n` +
      '```\n' + boxLines.join('\n') + '\n```\n\n' +
      `*Select a category from the dropdown menu below or click the compact emoji buttons to toggle filters!*`,
    requestedBy: author,
    clientUser
  });
}

function renderMiscSettingsEmbed(config, guild, author, clientUser) {
  const m = config.misc || {};

  const logsChan = m.logsChannelId ? `<#${m.logsChannelId}>` : '`Not Set`';
  const modlogsChan = m.modlogsChannelId ? `<#${m.modlogsChannelId}>` : '`Not Set`';
  const quarRole = m.quarantineRoleId ? `<@&${m.quarantineRoleId}>` : '`Quarantine`';

  const boxLines = [
    '╭────────────────────────────────────╮',
    '│       MISCELLANEOUS & MOD          │',
    '├────────────────────────────────────┤',
    formatBoxLine('Prefix', m.prefix || '.'),
    formatBoxLine('ConfirmMsg', m.moderatorConfirmation !== false ? 'YES   [OK]' : 'NO    [OFF]'),
    formatBoxLine('Always DM', m.alwaysDmPunished !== false ? 'YES   [OK]' : 'NO    [OFF]'),
    formatBoxLine('Anon Staff', m.hideStaffIdentity ? 'ON    [OK]' : 'OFF   [OFF]'),
    formatBoxLine('Timeout', String(m.defaultTimeoutMinutes || 2880) + 'm'),
    formatBoxLine('Ban Purge', String(m.daysPurgedOnBan || 7) + 'd'),
    '├────────────────────────────────────┤',
    '│           MISC COMMANDS            │',
    '├────────────────────────────────────┤',
    '│ .misc                              │',
    '│ .automod misc                      │',
    '│ .modlogs #channel                  │',
    '│ .quarantine @user                  │',
    '│ .unquarantine @user                │',
    '╰────────────────────────────────────╯'
  ];

  return createStyledEmbed({
    title: `${emojis.GEAR} Miscellaneous & Moderation Config — ${guild.name}`,
    subtitle: `Global Bot Settings, Log Channels & Punishment Policies`,
    description:
      `Welcome **${author.username}**! Configure global server moderation settings.\n\n` +
      '```\n' + boxLines.join('\n') + '\n```\n\n' +
      `**📜 Channel Mappings:**\n` +
      `• Logs Channel: ${logsChan}\n` +
      `• ModLogs Channel: ${modlogsChan}\n` +
      `• Quarantine Role: ${quarRole}`,
    requestedBy: author,
    clientUser
  });
}

function renderAutomodConfigEmbed(config, guild, author, clientUser) {
  const f = config;
  const m = config.misc || {};

  const boxLines = [
    '╭────────────────────────────────────╮',
    '│    FULL AUTOMOD CONFIGURATION      │',
    '├────────────────────────────────────┤',
    formatBoxLine('AntiSpam', f.antiSpam ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('InviteLink', f.inviteLinks ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('Malicious', f.maliciousLinks ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('NSFW Links', f.nsfwLinks ? 'ENABLED [OK]' : 'DISABLED[X]'),
    formatBoxLine('Word List', String((f.wordBlacklist || []).length).padStart(2, '0') + ' words'),
    formatBoxLine('Link List', String((f.linkBlacklist || []).length).padStart(2, '0') + ' links'),
    formatBoxLine('ConfirmMsg', m.moderatorConfirmation !== false ? 'YES   [OK]' : 'NO    [OFF]'),
    formatBoxLine('Always DM', m.alwaysDmPunished !== false ? 'YES   [OK]' : 'NO    [OFF]'),
    formatBoxLine('Anon Staff', m.hideStaffIdentity ? 'ON    [OK]' : 'OFF   [OFF]'),
    formatBoxLine('Timeout', String(m.defaultTimeoutMinutes || 2880) + 'm'),
    formatBoxLine('Ban Purge', String(m.daysPurgedOnBan || 7) + 'd'),
    formatBoxLine('Bots WL', String((f.whitelistedBots || []).length) + ' bot(s)'),
    '├────────────────────────────────────┤',
    '│     AUTOMOD CONTROL COMMANDS       │',
    '├────────────────────────────────────┤',
    '│ .automod                           │',
    '│ .moderation                        │',
    '│ .blacklist                         │',
    '│ .antibot list                      │',
    '╰────────────────────────────────────╯'
  ];

  return createStyledEmbed({
    title: `${emojis.GEAR || '⚙️'} Full AutoMod Configuration — ${guild.name}`,
    subtitle: `Complete Server Security & Content Protection Summary`,
    description:
      `Welcome **${author.username}**! Below is your server **Full AutoMod Configuration Grid**.\n\n` +
      '```\n' + boxLines.join('\n') + '\n```',
    requestedBy: author,
    clientUser
  });
}

function renderEmbedForTab(activeTab, config, guild, author, clientUser) {
  if (activeTab === 'misc') {
    return renderMiscSettingsEmbed(config, guild, author, clientUser);
  }
  if (activeTab === 'config') {
    return renderAutomodConfigEmbed(config, guild, author, clientUser);
  }
  if (activeTab === 'blacklists') {
    const words = (config.wordBlacklist || []).join(', ') || 'None';
    const links = (config.linkBlacklist || []).join(', ') || 'None';
    const boxLines = [
      '╭────────────────────────────────────╮',
      '│         BLACKLIST COMMANDS         │',
      '├────────────────────────────────────┤',
      '│ .addword <word>                    │',
      '│ .delword <word>                    │',
      '│ .addlink <domain>                  │',
      '│ .dellink <domain>                  │',
      '│ .addcategory <name>                │',
      '│ .delcategory <name>                │',
      '│ .blacklist                         │',
      '╰────────────────────────────────────╯'
    ];
    return createStyledEmbed({
      title: `🔤 Word & Link Blacklists — ${guild.name}`,
      description:
        `**Active Blacklisted Words:**\n\`\`\`${words}\`\`\`\n` +
        `**Active Blacklisted Link Domains:**\n\`\`\`${links}\`\`\`\n\n` +
        '```\n' + boxLines.join('\n') + '\n```',
      requestedBy: author,
      clientUser
    });
  }
  if (activeTab === 'antibot') {
    const wl = (config.whitelistedBots || []).map(id => `<@${id}>`).join(', ') || '*None*';
    const boxLines = [
      '╭────────────────────────────────────╮',
      '│          ANTIBOT COMMANDS          │',
      '├────────────────────────────────────┤',
      '│ .antibot wl @bot                   │',
      '│ .antibot unwl @bot                 │',
      '│ .antibot list                      │',
      '╰────────────────────────────────────╯'
    ];
    return createStyledEmbed({
      title: `🤖 AntiBot Security Status — ${guild.name}`,
      description:
        `**Whitelisted Authorized Bots:**\n${wl}\n\n` +
        '```\n' + boxLines.join('\n') + '\n```',
      requestedBy: author,
      clientUser
    });
  }

  return renderAutomodFiltersEmbed(config, guild, author, clientUser);
}

function buildAutomodInteractiveComponents(config, activeTab = 'filters') {
  const f = config;
  const m = config.misc || {};

  // 1. Help-Menu Style Interactive Select Menu Dropdown
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('automod_category_select')
    .setPlaceholder('🏷️ Select AutoMod / Miscellaneous Category...')
    .addOptions([
      {
        label: 'AutoMod Filters Suite',
        value: 'tab_filters',
        description: 'AntiSpam, Invite Links, Malicious Links & NSFW Links',
        emoji: emojis.OBJ_SHIELD || emojis.SHIELD || '🛡️',
        default: activeTab === 'filters'
      },
      {
        label: 'Word & Link Blacklists',
        value: 'tab_blacklists',
        description: 'Profanity filter, custom word & URL domain blacklists',
        emoji: '🔤',
        default: activeTab === 'blacklists'
      },
      {
        label: 'Miscellaneous Settings',
        value: 'tab_misc',
        description: 'Log channels, prefix, timeout duration, DM settings',
        emoji: emojis.OBJ_GEAR || emojis.GEAR || '🛡️',
        default: activeTab === 'misc'
      },
      {
        label: 'AntiBot Security',
        value: 'tab_antibot',
        description: 'Whitelisted bots & join protection',
        emoji: '🤖',
        default: activeTab === 'antibot'
      }
    ]);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  // 2. Compact Pure-Emoji Secondary Buttons (Mobile Friendly)
  const buttonRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_btn_spam').setEmoji('💬').setStyle(f.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_invites').setEmoji('📢').setStyle(f.inviteLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_malicious').setEmoji(emojis.OBJ_SHIELD || emojis.SHIELD || '🛡️').setStyle(f.maliciousLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_nsfw').setEmoji('🔞').setStyle(f.nsfwLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_words').setEmoji('🔤').setStyle(f.profanity ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const buttonRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_btn_confirm').setEmoji('📝').setStyle(m.moderatorConfirmation !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_dm').setEmoji('📬').setStyle(m.alwaysDmPunished !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_anon').setEmoji('🎭').setStyle(m.hideStaffIdentity ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_purge').setEmoji('🗑️').setStyle(m.autoPurgeMessages ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  return [selectRow, buttonRow1, buttonRow2];
}

module.exports = {
  name: 'automod',
  description: 'Interactive AutoMod Filters & Miscellaneous Suite with addword, delword, addlink, dellink, addcategory & delcategory',
  aliases: [
    'antibot', 'moderation', 'filter', 'filters', 'misc', 'miscellaneous',
    'addword', 'delword', 'removeword', 'addlink', 'dellink', 'removelink',
    'addcategory', 'delcategory', 'removecategory', 'blacklist', 'badwords'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (['misc', 'miscellaneous', 'moderation', 'mod'].includes(invoked) || ['misc', 'miscellaneous', 'moderation', 'mod'].includes(sub)) {
      sub = 'misc';
    }
    if (invoked === 'config' || sub === 'config') {
      sub = 'config';
    }
    if (invoked === 'filter' || invoked === 'filters' || sub === 'filter' || sub === 'filters') {
      sub = 'filters';
    }
    if (['addword', 'delword', 'removeword', 'addlink', 'dellink', 'removelink', 'addcategory', 'delcategory', 'removecategory', 'blacklist', 'badwords'].includes(invoked)) {
      sub = invoked;
    }

    const author = message.author;
    const guild = message.guild;
    const config = db.getAutomod(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Permission Check
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply(`${emojis.WARNING || emojis.WARNING} You need **Manage Server** permission to configure AutoMod & Miscellaneous settings.`);
    }

    // ─────────────────────────────────────────
    // ANTIBOT WHITELIST COMMANDS (.antibot wl / unwl / list)
    // ─────────────────────────────────────────
    if (invoked === 'antibot' || sub === 'antibot') {
      const action = (invoked === 'antibot' ? args[0] : args[1])?.toLowerCase();
      const targetUser = message.mentions.users.first() || message.client.users.cache.get(args[1]) || message.client.users.cache.get(args[2]);

      // .antibot wl @bot / .antibot whitelist @bot
      if (['wl', 'whitelist', 'add'].includes(action)) {
        if (!targetUser) {
          return message.reply(`${emojis.WARNING} Usage: \`.antibot wl @bot\`\nExample: \`.antibot wl @Shadowking\``);
        }

        if (!config.whitelistedBots) config.whitelistedBots = [];
        if (!config.whitelistedBots.includes(targetUser.id)) {
          config.whitelistedBots.push(targetUser.id);
          db.updateAutomod(guild.id, 'whitelistedBots', config.whitelistedBots);
        }

        const boxLines = [
          '╭────────────────────────────────────╮',
          '│         ANTIBOT WHITELIST          │',
          '├────────────────────────────────────┤',
          formatBoxLine('Action', 'WHITELIST'),
          formatBoxLine('Bot', ('@' + targetUser.username).slice(0, 13)),
          formatBoxLine('Status', 'Authorized'),
          '╰────────────────────────────────────╯'
        ];

        const embed = createStyledEmbed({
          title: `${emojis.BOT || '🤖'} AntiBot Whitelist Updated`,
          description:
            `Successfully whitelisted **${targetUser.tag}**! It is now authorized to join and exist in **${guild.name}**.\n\n` +
            '```\n' + boxLines.join('\n') + '\n```',
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [embed] });
      }

      // .antibot unwl @bot / .antibot unwhitelist @bot / .antibot remove @bot
      if (['unwl', 'unwhitelist', 'remove', 'del', 'delete'].includes(action)) {
        if (!targetUser) {
          return message.reply(`${emojis.WARNING} Usage: \`.antibot unwl @bot\`\nExample: \`.antibot unwl @Shadowking\``);
        }

        if (config.whitelistedBots) {
          config.whitelistedBots = config.whitelistedBots.filter(id => id !== targetUser.id);
          db.updateAutomod(guild.id, 'whitelistedBots', config.whitelistedBots);
        }

        const boxLines = [
          '╭────────────────────────────────────╮',
          '│         ANTIBOT WHITELIST          │',
          '├────────────────────────────────────┤',
          formatBoxLine('Action', 'UNWHITELIST'),
          formatBoxLine('Bot', ('@' + targetUser.username).slice(0, 13)),
          formatBoxLine('Status', 'Revoked'),
          '╰────────────────────────────────────╯'
        ];

        const embed = createStyledEmbed({
          title: `${emojis.BOT || '🤖'} AntiBot Whitelist Removed`,
          description:
            `Removed **${targetUser.tag}** from the authorized bot whitelist.\n\n` +
            '```\n' + boxLines.join('\n') + '\n```',
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [embed] });
      }

      // .antibot list / .antibot status / .antibot
      const botList = (config.whitelistedBots || []).map(id => `<@${id}>`).join(', ') || '*No bots whitelisted.*';
      const boxLines = [
        '╭────────────────────────────────────╮',
        '│        ANTIBOT SECURITY HUB        │',
        '├────────────────────────────────────┤',
        formatBoxLine('AntiBotAdd', 'ENABLED [OK]'),
        formatBoxLine('Whitelisted', (config.whitelistedBots || []).length + ' Bot(s)'),
        formatBoxLine('Bot Gate', 'Active [OK]'),
        '╰────────────────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `${emojis.BOT || '🤖'} AntiBot Security Status — ${guild.name}`,
        description:
          `Welcome **${author.username}**! Below is your server **AntiBot Security Grid**.\n\n` +
          '```\n' + boxLines.join('\n') + '\n```\n\n' +
          `**🤖 Whitelisted Authorized Bots:**\n${botList}\n\n` +
          `**⚡ Management Commands:**\n` +
          `\`\`\`\n.antibot wl @bot   - Whitelist bot\n.antibot unwl @bot - Remove bot whitelist\n\`\`\``,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // CUSTOM COMMANDS: ADDWORD / DELWORD / ADDLINK / DELLINK / ADDCATEGORY / DELCATEGORY
    // ─────────────────────────────────────────

    // .addword <word> / .automod addword <word>
    if (sub === 'addword' || (sub === 'word' && args[1]?.toLowerCase() === 'add')) {
      const val = (sub === 'addword' ? args.join(' ') : args.slice(2).join(' ')).toLowerCase().trim();
      if (!val) return message.reply(`${emojis.WARNING} Usage: \`.addword <word to block>\``);

      if (!config.wordBlacklist.includes(val)) {
        config.wordBlacklist.push(val);
        db.updateAutomod(guild.id, 'wordBlacklist', config.wordBlacklist);
      }
      return message.reply(`${emojis.SUCCESS} Added \`${val}\` to AutoMod Word Blacklist.`);
    }

    // .delword <word> / .automod delword <word>
    if (sub === 'delword' || sub === 'removeword' || (sub === 'word' && (args[1]?.toLowerCase() === 'del' || args[1]?.toLowerCase() === 'remove'))) {
      const val = (['delword', 'removeword'].includes(sub) ? args.join(' ') : args.slice(2).join(' ')).toLowerCase().trim();
      if (!val) return message.reply(`${emojis.WARNING} Usage: \`.delword <word to remove>\``);

      config.wordBlacklist = config.wordBlacklist.filter(w => w !== val);
      db.updateAutomod(guild.id, 'wordBlacklist', config.wordBlacklist);
      return message.reply(`${emojis.SUCCESS} Removed \`${val}\` from AutoMod Word Blacklist.`);
    }

    // .addlink <domain> / .automod addlink <domain>
    if (sub === 'addlink' || (sub === 'link' && args[1]?.toLowerCase() === 'add')) {
      const val = (sub === 'addlink' ? args.join(' ') : args.slice(2).join(' ')).toLowerCase().trim();
      if (!val) return message.reply(`${emojis.WARNING} Usage: \`.addlink <domain or website to block>\``);

      if (!config.linkBlacklist.includes(val)) {
        config.linkBlacklist.push(val);
        db.updateAutomod(guild.id, 'linkBlacklist', config.linkBlacklist);
      }
      return message.reply(`${emojis.SUCCESS} Added \`${val}\` to AutoMod Link Blacklist.`);
    }

    // .dellink <domain> / .automod dellink <domain>
    if (sub === 'dellink' || sub === 'removelink' || (sub === 'link' && (args[1]?.toLowerCase() === 'del' || args[1]?.toLowerCase() === 'remove'))) {
      const val = (['dellink', 'removelink'].includes(sub) ? args.join(' ') : args.slice(2).join(' ')).toLowerCase().trim();
      if (!val) return message.reply(`${emojis.WARNING} Usage: \`.dellink <domain to remove>\``);

      config.linkBlacklist = config.linkBlacklist.filter(l => l !== val);
      db.updateAutomod(guild.id, 'linkBlacklist', config.linkBlacklist);
      return message.reply(`${emojis.SUCCESS} Removed \`${val}\` from AutoMod Link Blacklist.`);
    }

    // .addcategory <name> [words] / .automod addcategory <name> [words]
    if (sub === 'addcategory' || (sub === 'category' && args[1]?.toLowerCase() === 'add')) {
      const name = (sub === 'addcategory' ? args[0] : args[2])?.toLowerCase().trim();
      const words = (sub === 'addcategory' ? args.slice(1) : args.slice(3)).map(w => w.toLowerCase());
      if (!name) return message.reply(`${emojis.WARNING} Usage: \`.addcategory <CategoryName> [word1 word2 ...]\``);

      if (!config.customCategories) config.customCategories = {};
      config.customCategories[name] = words;
      db.updateAutomod(guild.id, 'customCategories', config.customCategories);

      return message.reply(`${emojis.SUCCESS} Created custom AutoMod category **${name.toUpperCase()}** with **${words.length}** initial words!`);
    }

    // .delcategory <name> / .automod delcategory <name>
    if (sub === 'delcategory' || sub === 'removecategory' || (sub === 'category' && (args[1]?.toLowerCase() === 'del' || args[1]?.toLowerCase() === 'remove'))) {
      const name = (['delcategory', 'removecategory'].includes(sub) ? args[0] : args[2])?.toLowerCase().trim();
      if (!name) return message.reply(`${emojis.WARNING} Usage: \`.delcategory <CategoryName>\``);

      if (config.customCategories && config.customCategories[name]) {
        delete config.customCategories[name];
        db.updateAutomod(guild.id, 'customCategories', config.customCategories);
        return message.reply(`${emojis.SUCCESS} Removed custom AutoMod category **${name.toUpperCase()}**.`);
      }
      return message.reply(`${emojis.WARNING} Category \`${name}\` not found.`);
    }

    // .blacklist / .automod blacklist / .badwords
    if (sub === 'blacklist' || sub === 'badwords') {
      const words = (config.wordBlacklist || []).join(', ') || 'None';
      const links = (config.linkBlacklist || []).join(', ') || 'None';
      const cats = Object.entries(config.customCategories || {}).map(([name, wList]) => `• **${name.toUpperCase()}**: ${wList.join(', ') || 'Empty'}`).join('\n') || '*No custom categories.*';

      const boxLines = [
        '╭────────────────────────────────────╮',
        '│         BLACKLIST COMMANDS         │',
        '├────────────────────────────────────┤',
        '│ .addword <word>                    │',
        '│ .delword <word>                    │',
        '│ .addlink <domain>                  │',
        '│ .dellink <domain>                  │',
        '│ .addcategory <name>                │',
        '│ .delcategory <name>                │',
        '│ .blacklist                         │',
        '╰────────────────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `🔤 Server AutoMod Blacklists — ${guild.name}`,
        description:
          `**Active Blacklisted Words (${(config.wordBlacklist || []).length}):**\n\`\`\`${words}\`\`\`\n` +
          `**Active Link Domains (${(config.linkBlacklist || []).length}):**\n\`\`\`${links}\`\`\`\n\n` +
          `**Custom Word Categories:**\n${cats}\n\n` +
          '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Interactive Panel
    let currentTab = sub === 'misc' ? 'misc' : (sub === 'config' ? 'config' : 'filters');
    const embed = renderEmbedForTab(currentTab, config, guild, author, clientUser);
    const components = buildAutomodInteractiveComponents(config, currentTab);

    const msg = await message.channel.send({ embeds: [embed], components });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (interaction) => {
      // Permission Check for interaction
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: `${emojis.WARNING} Only Server Managers can edit AutoMod configuration.`, flags: 64 });
      }

      // Handle Dropdown Select Menu
      if (interaction.isStringSelectMenu() && interaction.customId === 'automod_category_select') {
        const val = interaction.values[0];

        if (val === 'tab_misc') currentTab = 'misc';
        else if (val === 'tab_blacklists') currentTab = 'blacklists';
        else if (val === 'tab_antibot') currentTab = 'antibot';
        else currentTab = 'filters';

        const updatedEmbed = renderEmbedForTab(currentTab, config, guild, author, clientUser);
        const updatedRows = buildAutomodInteractiveComponents(config, currentTab);
        return interaction.update({ embeds: [updatedEmbed], components: updatedRows });
      }

      // Handle Compact Emoji Buttons with Ephemeral Feedback
      if (interaction.isButton()) {
        const id = interaction.customId;
        let responseMsg = '';

        if (id === 'am_btn_spam') {
          config.antiSpam = !config.antiSpam;
          db.updateAutomod(guild.id, 'antiSpam', config.antiSpam);
          responseMsg = `💬 **AntiSpam Filter** is now **${config.antiSpam ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_invites') {
          config.inviteLinks = !config.inviteLinks;
          db.updateAutomod(guild.id, 'inviteLinks', config.inviteLinks);
          responseMsg = `📢 **Invite Links Filter** is now **${config.inviteLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_malicious') {
          config.maliciousLinks = !config.maliciousLinks;
          db.updateAutomod(guild.id, 'maliciousLinks', config.maliciousLinks);
          responseMsg = `${emojis.SHIELD} **Malicious Links Filter** is now **${config.maliciousLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_nsfw') {
          config.nsfwLinks = !config.nsfwLinks;
          db.updateAutomod(guild.id, 'nsfwLinks', config.nsfwLinks);
          responseMsg = `🔞 **NSFW Links Filter** is now **${config.nsfwLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_words') {
          config.profanity = !config.profanity;
          db.updateAutomod(guild.id, 'profanity', config.profanity);
          responseMsg = `🔤 **Word Blacklist Filter** is now **${config.profanity ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_confirm') {
          config.misc.moderatorConfirmation = !config.misc.moderatorConfirmation;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `📝 **Moderator Confirmation Messages** are now **${config.misc.moderatorConfirmation ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_dm') {
          config.misc.alwaysDmPunished = !config.misc.alwaysDmPunished;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `📬 **Always DM Punished Members** is now **${config.misc.alwaysDmPunished ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_anon') {
          config.misc.hideStaffIdentity = !config.misc.hideStaffIdentity;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `🎭 **Anonymous Staff Mode** is now **${config.misc.hideStaffIdentity ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_purge') {
          config.misc.autoPurgeMessages = !config.misc.autoPurgeMessages;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `🗑️ **Auto Purge Messages of Punished Member** is now **${config.misc.autoPurgeMessages ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_refresh') {
          responseMsg = `🔄 AutoMod Settings Refreshed!`;
        }

        const newEmbed = renderEmbedForTab(currentTab, config, guild, author, clientUser);
        const newRows = buildAutomodInteractiveComponents(config, currentTab);
        await msg.edit({ embeds: [newEmbed], components: newRows }).catch(() => {});

        return interaction.reply({ content: responseMsg, flags: 64 });
      }
    });
  }
};



