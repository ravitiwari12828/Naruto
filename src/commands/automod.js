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

const { createDynamicBox } = require('../utils/boxBuilder');

function renderAutomodFiltersEmbed(config, guild, author, clientUser) {
  const f = config;

  const statusBox = createDynamicBox('AUTOMOD CONTROL HUB', [
    { key: 'AntiSpam', value: f.antiSpam ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'InviteLink', value: f.inviteLinks ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'Malicious', value: f.maliciousLinks ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'NSFW Links', value: f.nsfwLinks ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'Word List', value: String((f.wordBlacklist || []).length).padStart(2, '0') + ' words' },
    { key: 'Link List', value: String((f.linkBlacklist || []).length).padStart(2, '0') + ' links' }
  ]);

  const cmdBox = createDynamicBox('AUTOMOD COMMANDS', [
    '.automod',
    '.automod config',
    '.addword <word>',
    '.delword <word>',
    '.addlink <domain>',
    '.dellink <domain>',
    '.antibot wl @bot',
    '.antibot unwl @bot',
    '.blacklist'
  ]);

  return createStyledEmbed({
    title: `${emojis.SHIELD} AutoMod Security Control Hub — ${guild.name}`,
    subtitle: `Interactive Content Guard & Link Protection Suite`,
    description:
      `Welcome **${author.username}**! Configure live content guards & security filters.\n\n` +
      '```\n' + statusBox + '\n```\n' +
      '```\n' + cmdBox + '\n```\n\n' +
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

  const statusBox = createDynamicBox('MISC & MODERATION', [
    { key: 'Prefix', value: m.prefix || '.' },
    { key: 'ConfirmMsg', value: m.moderatorConfirmation !== false ? 'YES [OK]' : 'NO [OFF]' },
    { key: 'Always DM', value: m.alwaysDmPunished !== false ? 'YES [OK]' : 'NO [OFF]' },
    { key: 'Anon Staff', value: m.hideStaffIdentity ? 'ON [OK]' : 'OFF [OFF]' },
    { key: 'Timeout', value: String(m.defaultTimeoutMinutes || 2880) + 'm' },
    { key: 'Ban Purge', value: String(m.daysPurgedOnBan || 7) + 'd' }
  ]);

  const cmdBox = createDynamicBox('MISC COMMANDS', [
    '.misc',
    '.automod misc',
    '.modlogs #channel',
    '.quarantine @user',
    '.unquarantine @user'
  ]);

  return createStyledEmbed({
    title: `${emojis.GEAR} Miscellaneous & Moderation Config — ${guild.name}`,
    subtitle: `Global Bot Settings, Log Channels & Punishment Policies`,
    description:
      `Welcome **${author.username}**! Configure global server moderation settings.\n\n` +
      '```\n' + statusBox + '\n```\n' +
      '```\n' + cmdBox + '\n```\n\n' +
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

  const configBox = createDynamicBox('AUTOMOD FULL CONFIG', [
    { key: 'AntiSpam', value: f.antiSpam ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'InviteLink', value: f.inviteLinks ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'Malicious', value: f.maliciousLinks ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'NSFW Links', value: f.nsfwLinks ? 'ENABLED [OK]' : 'DISABLED[X]' },
    { key: 'Word List', value: String((f.wordBlacklist || []).length).padStart(2, '0') + ' words' },
    { key: 'Link List', value: String((f.linkBlacklist || []).length).padStart(2, '0') + ' links' },
    { key: 'ConfirmMsg', value: m.moderatorConfirmation !== false ? 'YES [OK]' : 'NO [OFF]' },
    { key: 'Always DM', value: m.alwaysDmPunished !== false ? 'YES [OK]' : 'NO [OFF]' },
    { key: 'Anon Staff', value: m.hideStaffIdentity ? 'ON [OK]' : 'OFF [OFF]' },
    { key: 'Timeout', value: String(m.defaultTimeoutMinutes || 2880) + 'm' },
    { key: 'Ban Purge', value: String(m.daysPurgedOnBan || 7) + 'd' },
    { key: 'Bots WL', value: String((f.whitelistedBots || []).length) + ' bot(s)' }
  ]);

  const cmdBox = createDynamicBox('AUTOMOD COMMANDS', [
    '.automod',
    '.moderation',
    '.blacklist',
    '.antibot list'
  ]);

  return createStyledEmbed({
    title: `${emojis.GEAR || '<a:settings_animated:1537177506170404905>'} Full AutoMod Configuration — ${guild.name}`,
    subtitle: `Complete Server Security & Content Protection Summary`,
    description:
      `Welcome **${author.username}**! Below is your server **Full AutoMod Configuration Grid**.\n\n` +
      '```\n' + configBox + '\n```\n' +
      '```\n' + cmdBox + '\n```',
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
    const cmdBox = createDynamicBox('BLACKLIST COMMANDS', [
      '.addword <word>',
      '.delword <word>',
      '.addlink <domain>',
      '.dellink <domain>',
      '.addcategory <name>',
      '.delcategory <name>',
      '.blacklist'
    ]);
    return createStyledEmbed({
      title: `🔤 Word & Link Blacklists — ${guild.name}`,
      description:
        `**Active Blacklisted Words:**\n\`\`\`${words}\`\`\`\n` +
        `**Active Blacklisted Link Domains:**\n\`\`\`${links}\`\`\`\n\n` +
        '```\n' + cmdBox + '\n```',
      requestedBy: author,
      clientUser
    });
  }
  if (activeTab === 'antibot') {
    const wl = (config.whitelistedBots || []).map(id => `<@${id}>`).join(', ') || '*None*';
    const cmdBox = createDynamicBox('ANTIBOT COMMANDS', [
      '.antibot wl @bot',
      '.antibot unwl @bot',
      '.antibot list'
    ]);
    return createStyledEmbed({
      title: `<a:robot_animated:1537177494183088199> AntiBot Security Status — ${guild.name}`,
      description:
        `**Whitelisted Authorized Bots:**\n${wl}\n\n` +
        '```\n' + cmdBox + '\n```',
      requestedBy: author,
      clientUser
    });
  }

  return renderAutomodFiltersEmbed(config, guild, author, clientUser);
}

function buildAutomodInteractiveComponents(config, activeTab = 'filters') {
  const f = config;
  const m = config.misc || {};

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('automod_select_tab')
    .setPlaceholder('<a:security_animated:1537177499862171741> Select an AutoMod category...')
    .addOptions([
      {
        label: 'AutoMod Main Panel',
        value: 'tab_overview',
        description: 'Global overview & active status',
        emoji: emojis.OBJ_AN_SHIELD || '<a:security_animated:1537177499862171741>',
        default: activeTab === 'overview'
      },
      {
        label: 'AutoMod Filters',
        value: 'tab_filters',
        description: 'AntiSpam, Invites, Links, NSFW & Words',
        emoji: emojis.OBJ_AN_SPAM || '💬',
        default: activeTab === 'filters'
      },
      {
        label: 'Miscellaneous Options',
        value: 'tab_misc',
        description: 'AutoPurge, DM Notify & Staff Privacy',
        emoji: emojis.OBJ_AN_WEBHOOK || '<a:settings_animated:1537177506170404905>',
        default: activeTab === 'misc'
      },
      {
        label: 'Word & Category Manager',
        value: 'tab_words',
        description: 'Custom word & link blacklist list',
        emoji: emojis.OBJ_AN_ROLE || '🔤',
        default: activeTab === 'words'
      },
      {
        label: 'AntiBot Security',
        value: 'tab_antibot',
        description: 'Whitelisted bots & join protection',
        emoji: emojis.OBJ_AN_BOT || '<a:robot_animated:1537177494183088199>',
        default: activeTab === 'antibot'
      }
    ]);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  const buttonRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_btn_spam').setEmoji(emojis.OBJ_AN_SPAM || '💬').setStyle(f.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_invites').setEmoji(emojis.OBJ_AN_WEBHOOK || '📢').setStyle(f.inviteLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_malicious').setEmoji(emojis.OBJ_AN_SHIELD || '<a:security_animated:1537177499862171741>').setStyle(f.maliciousLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_nsfw').setEmoji(emojis.OBJ_AN_PANIC || '🔞').setStyle(f.nsfwLinks ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_words').setEmoji(emojis.OBJ_AN_ROLE || '🔤').setStyle(f.profanity ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const buttonRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_btn_confirm').setEmoji(emojis.OBJ_AN_WHITELIST || '<a:pencil_animated:1537177465829724181>').setStyle(m.moderatorConfirmation !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_dm').setEmoji(emojis.OBJ_AN_BOT || '<a:openeddooraperture_animated:1537177450411462766>').setStyle(m.alwaysDmPunished !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_anon').setEmoji(emojis.OBJ_AN_ROLE || '🎭').setStyle(m.hideStaffIdentity ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_purge').setEmoji(emojis.OBJ_AN_BAN || '🗑️').setStyle(m.autoPurgeMessages ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_refresh').setEmoji(emojis.OBJ_REFRESH || '🔄').setStyle(ButtonStyle.Secondary)
  );

  return [selectRow, buttonRow1, buttonRow2];
}

module.exports = {
  name: 'automod',
  description: 'Interactive AutoMod Filters & Miscellaneous Suite with addword, delword, addlink, dellink, addcategory & delcategory',
  aliases: [
    'am', 'antispam', 'antilink', 'antiinvite',
    'antibot', 'moderation', 'filter', 'misc', 'miscellaneous',
    'addword', 'removeword', 'addlink', 'removelink',
    'addcategory', 'removecategory', 'blacklist', 'badwords'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    const author = message.author;
    const guild = message.guild;
    const config = db.getAutomod(guild.id);

    if (invoked === 'antispam') {
      config.antiSpam = !config.antiSpam;
      db.saveAutomod(guild.id, config);
      return message.reply(`${emojis.SUCCESS || '✅'} **AntiSpam Filter**: ${config.antiSpam ? '`ENABLED`' : '`DISABLED`'}`);
    }
    if (invoked === 'antilink' || invoked === 'antiinvite') {
      config.inviteLinks = !config.inviteLinks;
      db.saveAutomod(guild.id, config);
      return message.reply(`${emojis.SUCCESS || '✅'} **AntiLink / Invite Filter**: ${config.inviteLinks ? '`ENABLED`' : '`DISABLED`'}`);
    }
    if (invoked === 'am') sub = 'filters';

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

        const box = createDynamicBox('ANTIBOT WHITELIST', [
          { key: 'Action', value: 'WHITELIST' },
          { key: 'Bot   ', value: ('@' + targetUser.username).slice(0, 13) },
          { key: 'Status', value: 'Authorized' }
        ]);

        const embed = createStyledEmbed({
          title: `${emojis.AN_BOT || emojis.BOT || '<a:robot_animated:1537177494183088199>'} AntiBot Whitelist Updated`,
          description:
            `Successfully whitelisted **${targetUser.tag}**! It is now authorized to join and exist in **${guild.name}**.\n\n` +
            '```\n' + box + '\n```',
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

        const box = createDynamicBox('ANTIBOT WHITELIST', [
          { key: 'Action', value: 'UNWHITELIST' },
          { key: 'Bot   ', value: ('@' + targetUser.username).slice(0, 13) },
          { key: 'Status', value: 'Revoked' }
        ]);

        const embed = createStyledEmbed({
          title: `${emojis.AN_BOT || emojis.BOT || '<a:robot_animated:1537177494183088199>'} AntiBot Whitelist Removed`,
          description:
            `Removed **${targetUser.tag}** from the authorized bot whitelist.\n\n` +
            '```\n' + box + '\n```',
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [embed] });
      }

      // .antibot list / .antibot status / .antibot
      const botList = (config.whitelistedBots || []).map(id => `<@${id}>`).join(', ') || '*No bots whitelisted.*';
      const box = createDynamicBox('ANTIBOT SECURITY HUB', [
        { key: 'AntiBotAdd ', value: 'ENABLED [OK]' },
        { key: 'Whitelisted', value: String((config.whitelistedBots || []).length) + ' Bot(s)' },
        { key: 'Bot Gate   ', value: 'Active [OK]' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.AN_BOT || emojis.BOT || '<a:robot_animated:1537177494183088199>'} AntiBot Security Status — ${guild.name}`,
        description:
          `Welcome **${author.username}**! Below is your server **AntiBot Security Grid**.\n\n` +
          '```\n' + box + '\n```\n\n' +
          `**${emojis.AN_BOT || '<a:robot_animated:1537177494183088199>'} Whitelisted Authorized Bots:**\n${botList}\n\n` +
          `**${emojis.ANALYTICS_ZAP || '⚡'} Management Commands:**\n` +
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

      const cmdBox = createDynamicBox('BLACKLIST COMMANDS', [
        '.addword <word>',
        '.delword <word>',
        '.addlink <domain>',
        '.dellink <domain>',
        '.addcategory <name>',
        '.delcategory <name>',
        '.blacklist'
      ]);

      const embed = createStyledEmbed({
        title: `🔤 Server AutoMod Blacklists — ${guild.name}`,
        description:
          `**Active Blacklisted Words (${(config.wordBlacklist || []).length}):**\n\`\`\`${words}\`\`\`\n` +
          `**Active Link Domains (${(config.linkBlacklist || []).length}):**\n\`\`\`${links}\`\`\`\n\n` +
          `**Custom Word Categories:**\n${cats}\n\n` +
          '```\n' + cmdBox + '\n```',
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
      // PANEL OWNERSHIP CHECK: Only the user who invoked this panel message can interact with it
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: `${emojis.WARNING} **Access Denied**: Only **${author.username}** (who requested this panel) can interact with these controls.`, flags: 64 });
      }

      // Permission Check for interaction
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: `${emojis.WARNING} Only Server Managers can edit AutoMod configuration.`, flags: 64 });
      }

      // Handle Dropdown Select Menu
      if (interaction.isStringSelectMenu() && (interaction.customId === 'automod_select_tab' || interaction.customId === 'automod_category_select')) {
        const val = interaction.values[0];

        if (val === 'tab_misc') currentTab = 'misc';
        else if (val === 'tab_words' || val === 'tab_blacklists') currentTab = 'words';
        else if (val === 'tab_antibot') currentTab = 'antibot';
        else if (val === 'tab_overview') currentTab = 'overview';
        else currentTab = 'filters';

        const updatedEmbed = renderEmbedForTab(currentTab, config, guild, author, clientUser);
        const updatedRows = buildAutomodInteractiveComponents(config, currentTab);
        return interaction.update({ embeds: [updatedEmbed], components: updatedRows });
      }

      // Handle Compact Emoji Buttons with Custom Animated Emoji Ephemeral Feedback
      if (interaction.isButton()) {
        const id = interaction.customId;
        let responseMsg = '';

        if (id === 'am_btn_spam') {
          config.antiSpam = !config.antiSpam;
          db.updateAutomod(guild.id, 'antiSpam', config.antiSpam);
          responseMsg = `${emojis.AN_SPAM || '💬'} **AntiSpam Filter** is now **${config.antiSpam ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_invites') {
          config.inviteLinks = !config.inviteLinks;
          db.updateAutomod(guild.id, 'inviteLinks', config.inviteLinks);
          responseMsg = `${emojis.AN_WEBHOOK || '📢'} **Invite Links Filter** is now **${config.inviteLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_malicious') {
          config.maliciousLinks = !config.maliciousLinks;
          db.updateAutomod(guild.id, 'maliciousLinks', config.maliciousLinks);
          responseMsg = `${emojis.AN_SHIELD || '<a:security_animated:1537177499862171741>'} **Malicious Links Filter** is now **${config.maliciousLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_nsfw') {
          config.nsfwLinks = !config.nsfwLinks;
          db.updateAutomod(guild.id, 'nsfwLinks', config.nsfwLinks);
          responseMsg = `${emojis.AN_PANIC || '🔞'} **NSFW Links Filter** is now **${config.nsfwLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_words') {
          config.profanity = !config.profanity;
          db.updateAutomod(guild.id, 'profanity', config.profanity);
          responseMsg = `${emojis.AN_ROLE || '🔤'} **Word Blacklist Filter** is now **${config.profanity ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_confirm') {
          config.misc.moderatorConfirmation = !config.misc.moderatorConfirmation;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `${emojis.AN_WHITELIST || '<a:pencil_animated:1537177465829724181>'} **Moderator Confirmation Messages** are now **${config.misc.moderatorConfirmation ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_dm') {
          config.misc.alwaysDmPunished = !config.misc.alwaysDmPunished;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `${emojis.AN_BOT || '<a:openeddooraperture_animated:1537177450411462766>'} **Always DM Punished Members** is now **${config.misc.alwaysDmPunished ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_anon') {
          config.misc.hideStaffIdentity = !config.misc.hideStaffIdentity;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `${emojis.AN_ROLE || '🎭'} **Anonymous Staff Mode** is now **${config.misc.hideStaffIdentity ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_purge') {
          config.misc.autoPurgeMessages = !config.misc.autoPurgeMessages;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `${emojis.AN_BAN || '🗑️'} **Auto Purge Messages of Punished Member** is now **${config.misc.autoPurgeMessages ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_refresh') {
          responseMsg = `${emojis.REFRESH || '🔄'} AutoMod Settings Refreshed!`;
        }

        const newEmbed = renderEmbedForTab(currentTab, config, guild, author, clientUser);
        const newRows = buildAutomodInteractiveComponents(config, currentTab);
        await msg.edit({ embeds: [newEmbed], components: newRows }).catch(() => {});

        return interaction.reply({ content: responseMsg, flags: 64 });
      }
    });
  }
};



