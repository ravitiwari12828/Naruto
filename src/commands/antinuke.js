const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global AntiNuke Guild Settings Store
const antinukeConfigs = new Map();

function getOrCreateAntinuke(guildId) {
  if (!antinukeConfigs.has(guildId)) {
    antinukeConfigs.set(guildId, {
      enabled: true,
      panicmode: false,
      panicLevel: 1, // 1: Low, 2: Medium, 3: High Lockdown
      whitelistedUsers: new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']),
      extraOwners: new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']),
      bypassRoles: new Set(),
      filters: {
        antiBan: true,
        antiKick: true,
        antiBotAdd: true,
        antiChannelCreate: true,
        antiChannelDelete: true,
        antiChannelUpdate: true,
        antiRoleCreate: true,
        antiRoleDelete: true,
        antiRoleUpdate: true,
        antiWebhookCreate: true,
        antiWebhookDelete: true,
        antiWebhookUpdate: true,
        antiEmojiCreate: true,
        antiEmojiDelete: true,
        antiEmojiUpdate: true,
        antiGuildUpdate: true,
        antiUnban: true,
        antiSpam: true,
        antiRaid: true,
        antiEveryone: true
      }
    });
  }
  const cfg = antinukeConfigs.get(guildId);
  if (!cfg.filters) {
    cfg.filters = {
      antiBan: true,
      antiKick: true,
      antiBotAdd: true,
      antiChannelCreate: true,
      antiChannelDelete: true,
      antiChannelUpdate: true,
      antiRoleCreate: true,
      antiRoleDelete: true,
      antiRoleUpdate: true,
      antiWebhookCreate: true,
      antiWebhookDelete: true,
      antiWebhookUpdate: true,
      antiEmojiCreate: true,
      antiEmojiDelete: true,
      antiEmojiUpdate: true,
      antiGuildUpdate: true,
      antiUnban: true,
      antiSpam: true,
      antiRaid: true,
      antiEveryone: true
    };
  }
  if (cfg.panicLevel === undefined) cfg.panicLevel = 1;
  return cfg;
}

const FILTER_MAP = {
  'ban': ['antiBan'],
  'antiban': ['antiBan'],
  'kick': ['antiKick'],
  'antikick': ['antiKick'],
  'bot': ['antiBotAdd'],
  'antibot': ['antiBotAdd'],
  'channel': ['antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate'],
  'antichannel': ['antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate'],
  'role': ['antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate'],
  'antirole': ['antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate'],
  'webhook': ['antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate'],
  'antiwebhook': ['antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate'],
  'emoji': ['antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate'],
  'antiemoji': ['antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate'],
  'server': ['antiGuildUpdate'],
  'antiguild': ['antiGuildUpdate'],
  'unban': ['antiUnban'],
  'antiunban': ['antiUnban'],
  'spam': ['antiSpam'],
  'antispam': ['antiSpam'],
  'raid': ['antiRaid'],
  'antiraid': ['antiRaid'],
  'everyone': ['antiEveryone'],
  'here': ['antiEveryone'],
  'antieveryone': ['antiEveryone']
};

module.exports = {
  name: 'antinuke',
  description: 'Granular AntiNuke Security Suite with Owner-Only Permissions, Whitelist, ExtraOwner, BypassRole & PanicMode',
  aliases: [
    'panicmode', 'whitelist', 'extraowner',
    'bypassrole', 'security'
  ],
  antinukeConfigs,
  getOrCreateAntinuke,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'panicmode') sub = 'panicmode';
    if (invoked === 'whitelist') sub = 'whitelist';
    if (invoked === 'extraowner') sub = 'extraowner';
    if (invoked === 'bypassrole') sub = 'bypassrole';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateAntinuke(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // STRICT PERMISSION CHECK: Only Server Owner & Bot Extra Owners can manage security settings
    const isServerOwner = guild.ownerId === author.id;
    const isExtraOwner = config.extraOwners.has(author.id) || ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(author.id);

    if (!isServerOwner && !isExtraOwner) {
      return message.reply(`${emojis.WARNING} **Access Denied**: Only the **Server Owner** and **Extra Owners** can configure AntiNuke security, Whitelists, Extra Owners, Bypass Roles, or Panic Mode!`);
    }

    // 1. .antinuke enable [feature/all]
    if (sub === 'enable' || sub === 'on') {
      const target = args[1]?.toLowerCase();

      if (!target || target === 'all') {
        config.enabled = true;
        Object.keys(config.filters).forEach(k => config.filters[k] = true);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SHIELD} AntiNuke Security System & ALL 21 protection filters are now **ENABLED**!`);
      }

      if (FILTER_MAP[target]) {
        config.enabled = true;
        FILTER_MAP[target].forEach(k => config.filters[k] = true);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`✅ AntiNuke feature **${target.toUpperCase()}** enabled successfully!`);
      }

      return message.reply(`ℹ️ Feature \`${target}\` not recognized.\nAvailable features: \`antiban\`, \`antikick\`, \`antibot\`, \`antichannel\`, \`antirole\`, \`antiwebhook\`, \`antiguild\`, \`antispam\`, \`antiraid\`, \`antieveryone\`, \`all\`.`);
    }

    // 2. .antinuke disable [feature/all]
    if (sub === 'disable' || sub === 'off') {
      const target = args[1]?.toLowerCase();

      if (!target || target === 'all') {
        config.enabled = false;
        Object.keys(config.filters).forEach(k => config.filters[k] = false);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`⚠️ AntiNuke Security System is now **DISABLED**.`);
      }

      if (FILTER_MAP[target]) {
        FILTER_MAP[target].forEach(k => config.filters[k] = false);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`⚠️ AntiNuke feature **${target.toUpperCase()}** disabled.`);
      }

      return message.reply(`ℹ️ Feature \`${target}\` not recognized.\nAvailable features: \`antiban\`, \`antikick\`, \`antibot\`, \`antichannel\`, \`antirole\`, \`antiwebhook\`, \`antiguild\`, \`antispam\`, \`antiraid\`, \`antieveryone\`, \`all\`.`);
    }

    // 3. .panicmode enable / disable / reset / set <level>
    if (sub === 'panicmode' || invoked === 'panicmode') {
      const mode = args[1]?.toLowerCase() || args[0]?.toLowerCase();

      if (mode === 'enable' || mode === 'on') {
        config.panicmode = true;
        config.enabled = true;
        antinukeConfigs.set(guild.id, config);

        const embed = createStyledEmbed({
          title: `🚨 PANIC MODE ACTIVATED (Level ${config.panicLevel})`,
          description: `All administrative channel/role updates & kicks are completely locked down!\nOnly server owner & whitelisted extra-owners can modify server settings.`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (mode === 'disable' || mode === 'off') {
        config.panicmode = false;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`✅ Panic Mode deactivated. Server returned to normal AntiNuke status.`);
      }

      if (mode === 'reset') {
        config.panicmode = false;
        config.panicLevel = 1;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`✅ Panic Mode status and lock levels have been fully reset.`);
      }

      if (mode === 'set' && args[2]) {
        const lvl = parseInt(args[2]);
        if (isNaN(lvl) || lvl < 1 || lvl > 3) {
          return message.reply(`ℹ️ Panic level must be between 1 and 3 e.g. \`.panicmode set 2\`.`);
        }
        config.panicLevel = lvl;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`🚨 Panic Mode lockdown severity level set to **Level ${lvl}**.`);
      }
    }

    // 4. .whitelist add @user / remove @user / list
    if (sub === 'whitelist' || invoked === 'whitelist') {
      const action = args[1]?.toLowerCase();
      const user = message.mentions.users.first() || message.client.users.cache.get(args[2]);

      if (action === 'add' && user) {
        config.whitelistedUsers.add(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`✅ Added **${user.tag}** to AntiNuke Whitelist.`);
      }

      if (action === 'remove' && user) {
        config.whitelistedUsers.delete(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`✅ Removed **${user.tag}** from AntiNuke Whitelist.`);
      }

      const list = Array.from(config.whitelistedUsers).map(id => `<@${id}> (\`${id}\`)`).join('\n') || 'None';
      const embed = createStyledEmbed({
        title: `🛡️ AntiNuke Whitelisted Users`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 5. .extraowner add @user / remove @user / list
    if (sub === 'extraowner' || invoked === 'extraowner') {
      const action = args[1]?.toLowerCase();
      const user = message.mentions.users.first() || message.client.users.cache.get(args[2]);

      if (action === 'add' && user) {
        config.extraOwners.add(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`👑 Added **${user.tag}** as Extra Owner with full security bypass permissions!`);
      }

      if (action === 'remove' && user) {
        config.extraOwners.delete(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`👑 Removed **${user.tag}** from Extra Owners.`);
      }

      const list = Array.from(config.extraOwners).map(id => `<@${id}> (\`${id}\`)`).join('\n') || 'None';
      const embed = createStyledEmbed({
        title: `👑 Extra Owners (Full Security Access)`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 6. .bypassrole add @role / remove @role / list
    if (sub === 'bypassrole' || invoked === 'bypassrole') {
      const action = args[1]?.toLowerCase();
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);

      if (action === 'add' && role) {
        config.bypassRoles.add(role.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`🛡️ Added <@&${role.id}> to AntiNuke Bypass Roles.`);
      }

      if (action === 'remove' && role) {
        config.bypassRoles.delete(role.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`🛡️ Removed <@&${role.id}> from AntiNuke Bypass Roles.`);
      }

      const list = Array.from(config.bypassRoles).map(id => `<@&${id}> (\`${id}\`)`).join('\n') || 'None';
      const embed = createStyledEmbed({
        title: `🛡️ AntiNuke Bypass Roles`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Status & Filter Config Dashboard
    const f = config.filters;
    const filterStatusText =
      `• **Anti Ban**: ${f.antiBan ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Kick**: ${f.antiKick ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Bot Add**: ${f.antiBotAdd ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Channel**: ${f.antiChannelCreate ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Role**: ${f.antiRoleCreate ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Webhook**: ${f.antiWebhookCreate ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Server Update**: ${f.antiGuildUpdate ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Spam**: ${f.antiSpam ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Raid**: ${f.antiRaid ? '`ON ✅`' : '`OFF ❌`'}\n` +
      `• **Anti Mass Ping**: ${f.antiEveryone ? '`ON ✅`' : '`OFF ❌`'}`;

    const embed = createStyledEmbed({
      title: `🛡️ AntiNuke Security Dashboard`,
      fields: [
        { name: '⚙️ Main Shield', value: config.enabled ? '`ENABLED ✅`' : '`DISABLED ❌`', inline: true },
        { name: '🚨 Panic Mode', value: config.panicmode ? `\`ACTIVE (Level ${config.panicLevel}) 🚨\`` : '`NORMAL 🟢`', inline: true },
        { name: '📜 Protection Filters', value: filterStatusText, inline: false },
        { name: '👑 Permissions Policy', value: '🔒 **Server Owner & Extra Owners Only**', inline: false }
      ],
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
