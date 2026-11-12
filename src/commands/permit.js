const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField
} = require('discord.js');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const {
  PERMIT_CATEGORIES,
  PERMITS,
  ALL_BUNDLE_KEYS,
  expandPermits,
  isPermitBypass,
  getMemberPermitState,
  formatPermitLabels
} = require('../utils/modPermits');

/**
 * Resolve target from mention, ID, or role name (supports BOTH User and Role).
 */
async function resolvePermitTarget(message, rawArg) {
  const guild = message.guild;

  // 1. Direct Role mention in message matching rawArg (or first mentioned role when present)
  if (rawArg && /^<@&(\d+)>$/.test(rawArg)) {
    const roleId = rawArg.match(/^<@&(\d+)>$/)[1];
    const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (role) {
      return { type: 'role', id: role.id, role, label: `<@&${role.id}> (\`${role.name}\`)` };
    }
  }

  // 2. Direct User mention matching rawArg
  if (rawArg && /^<@!?(\d+)>$/.test(rawArg)) {
    const userId = rawArg.match(/^<@!?(\d+)>$/)[1];
    const member = await guild.members.fetch(userId).catch(() => null);
    const user = member?.user || await message.client.users.fetch(userId).catch(() => null);
    if (user) {
      return { type: 'user', id: user.id, member, user, label: `<@${user.id}> (${user.username})` };
    }
  }

  // 3. Fallback mentions (if any)
  const mentionedRole = message.mentions.roles.first();
  if (mentionedRole && (!rawArg || rawArg.includes(mentionedRole.id))) {
    return { type: 'role', id: mentionedRole.id, role: mentionedRole, label: `<@&${mentionedRole.id}> (\`${mentionedRole.name}\`)` };
  }
  const mentionedUser = message.mentions.users.first();
  if (mentionedUser && (!rawArg || rawArg.includes(mentionedUser.id))) {
    const member = message.mentions.members?.get(mentionedUser.id) || await guild.members.fetch(mentionedUser.id).catch(() => null);
    return { type: 'user', id: mentionedUser.id, member, user: mentionedUser, label: `<@${mentionedUser.id}> (${mentionedUser.username})` };
  }

  if (!rawArg) return null;

  // 4. Raw snowflake ID -> check role first, then member/user
  const cleanId = rawArg.replace(/[<@!&>]/g, '');
  if (/^\d{17,21}$/.test(cleanId)) {
    const role = guild.roles.cache.get(cleanId) || await guild.roles.fetch(cleanId).catch(() => null);
    if (role) {
      return { type: 'role', id: role.id, role, label: `<@&${role.id}> (\`${role.name}\`)` };
    }
    const member = await guild.members.fetch(cleanId).catch(() => null);
    const user = member?.user || await message.client.users.fetch(cleanId).catch(() => null);
    if (user) {
      return { type: 'user', id: user.id, member, user, label: `<@${user.id}> (${user.username})` };
    }
  }

  // 5. Fallback exact role name match (case-insensitive)
  const lower = rawArg.toLowerCase();
  const byName = guild.roles.cache.find(r => r.name.toLowerCase() === lower && r.id !== guild.id);
  if (byName) {
    return { type: 'role', id: byName.id, role: byName, label: `<@&${byName.id}> (\`${byName.name}\`)` };
  }

  return null;
}

/**
 * Build the 5-row interactive permit modification component payload.
 */
function buildPermitMenuRows(mode, sessionId) {
  const rows = [];

  for (const cat of PERMIT_CATEGORIES) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`permit_sel_${cat.id}_${sessionId}`)
      .setPlaceholder(cat.placeholder)
      .setMinValues(1)
      .setMaxValues(cat.options.length)
      .addOptions(
        cat.options.map(opt => ({
          label: opt.label.slice(0, 100),
          description: opt.description.slice(0, 100),
          value: opt.value
        }))
      );

    rows.push(new ActionRowBuilder().addComponents(select));
  }

  const allBtn = new ButtonBuilder()
    .setCustomId(`permit_all_${sessionId}`)
    .setLabel(mode === 'add' ? 'Grant ALL Mod Permits' : 'Strip ALL Mod Permits')
    .setEmoji(mode === 'add' ? '⚡' : '🧹')
    .setStyle(mode === 'add' ? ButtonStyle.Success : ButtonStyle.Danger);

  const viewBtn = new ButtonBuilder()
    .setCustomId(`permit_view_${sessionId}`)
    .setLabel('View Target Permits')
    .setEmoji('👁️')
    .setStyle(ButtonStyle.Secondary);

  rows.push(new ActionRowBuilder().addComponents(allBtn, viewBtn));
  return rows;
}

/**
 * Build an inspect embed for a specific user or role target.
 */
function buildTargetInspectEmbed(guild, target) {
  const isRole = target.type === 'role';
  const embed = new EmbedBuilder()
    .setColor(isRole ? '#9B59B6' : '#5865F2')
    .setTitle(`🎫 Moderation Permits — ${isRole ? 'Role' : 'User'}`)
    .setTimestamp();

  if (isRole) {
    const directKeys = db.getPermitsForTarget(guild.id, 'role', target.id);
    const expanded = Array.from(expandPermits(directKeys));
    embed.setDescription(
      `**Target Role:** ${target.label}\n` +
      `**Directly Assigned (${directKeys.length}):**\n${formatPermitLabels(directKeys)}\n\n` +
      `**Effective Unlocked Permits (${expanded.length}):**\n${formatPermitLabels(expanded)}\n\n` +
      `> Any member carrying <@&${target.id}> automatically inherits these moderation permits (subject to role hierarchy safety).`
    );
    return embed;
  }

  const member = target.member;
  const directKeys = db.getPermitsForTarget(guild.id, 'user', target.id);
  const state = member ? getMemberPermitState(member) : {
    isBypass: false,
    directKeys,
    roleSources: [],
    effectiveKeys: expandPermits(directKeys)
  };

  let desc = `**Target User:** ${target.label}\n`;
  if (state.isBypass) {
    desc += `👑 **Full Bypass Active:** User is **Server Owner / Bot Owner / Extra Owner / Discord Administrator** and automatically holds all permits (except strict owner locks).\n\n`;
  }

  desc += `**Direct User Permits (${directKeys.length}):**\n${formatPermitLabels(directKeys)}\n\n`;

  if (state.roleSources.length > 0) {
    const roleLines = state.roleSources
      .map(s => `• <@&${s.roleId}> → ${formatPermitLabels(s.keys)}`)
      .join('\n');
    desc += `**Inherited From Roles:**\n${roleLines}\n\n`;
  } else {
    desc += `**Inherited From Roles:**\n\`None\`\n\n`;
  }

  const effArr = Array.from(state.effectiveKeys);
  desc += `**Effective Active Permits (${effArr.length}):**\n${state.isBypass ? '`All Moderation Permits (Admin / Owner Bypass)`' : formatPermitLabels(effArr)}`;

  embed.setDescription(desc.slice(0, 4090));
  return embed;
}

/**
 * Render the `.permit` command help / overview embed.
 */
function buildPermitHelpEmbed() {
  const catSummary = PERMIT_CATEGORIES.map(c => {
    const opts = c.options.map(o => `\`${o.label}\``).join(', ');
    return `**${c.title}**\n${opts}`;
  }).join('\n\n');

  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎫 Modular Moderation Permit System')
    .setDescription(
      `Divide moderation access into granular, multi-select tiers — assignable directly to **Users** or **Roles**.\n\n` +
      `**Commands (Admin / Owner Only for Changes):**\n` +
      `• \`.permit mod add <@user | @role | ID>\` — Open tier dropdowns to **grant** permits\n` +
      `• \`.permit mod remove <@user | @role | ID>\` — Open tier dropdowns to **revoke** permits\n` +
      `• \`.permit mod reset <@user | @role | ID>\` — Wipe all direct permits from target\n` +
      `• \`.permit mod list [@user | @role | ID]\` — View target or full server permit registry\n` +
      `> *Shortcut:* Both \`.permit mod add @target\` and \`.permit add @target\` work!\n\n` +
      `${catSummary}\n\n` +
      `**Security Guarantees:**\n` +
      `• \`.nuke\` & \`.permit add/remove/reset\` stay locked to **Administrators / Owners only**.\n` +
      `• Non-admin permitted staff must still obey **Discord role hierarchy** and cannot assign roles with dangerous permissions.`
    )
    .setFooter({ text: 'Narutobot Security • Hierarchy & Permit Enforcement Active' });
}

module.exports = {
  name: 'permit',
  aliases: ['permits', 'modpermit', 'modpermits', 'perms'],
  description: 'Manage modular tiered moderation permits for individual users and roles',

  async execute(message, args) {
    const guild = message.guild;
    if (!guild) return;

    // Strip optional `mod` namespace so both `.permit mod add @x` and `.permit add @x` work
    const parsedArgs = [...args];
    if (parsedArgs[0]?.toLowerCase() === 'mod') {
      parsedArgs.shift();
    }

    const sub = parsedArgs[0]?.toLowerCase();

    // Help view
    if (!sub || sub === 'help' || sub === 'h') {
      return message.reply({ embeds: [buildPermitHelpEmbed()] });
    }

    // List / View
    if (['list', 'view', 'show', 'info', 'check'].includes(sub)) {
      const targetArg = parsedArgs[1];
      if (targetArg) {
        const target = await resolvePermitTarget(message, parsedArgs.slice(1).join(' '));
        if (!target) {
          return message.reply(`${emojis.WARNING || '⚠️'} Could not find a valid user or role matching \`${parsedArgs.slice(1).join(' ')}\`.`);
        }
        // Non-admins can view their own permits; Admins/Owners can view anyone
        if (!isPermitBypass(message.member) && !(target.type === 'user' && target.id === message.author.id)) {
          return message.reply(`${emojis.WARNING || '⚠️'} Only **Administrators / Owners** can inspect other users' or roles' permits. Use \`.permit mod list\` to inspect your own.`);
        }
        return message.reply({ embeds: [buildTargetInspectEmbed(guild, target)] });
      }

      // No target given: Non-admin sees own permit card; Admin/Owner sees full server registry
      if (!isPermitBypass(message.member)) {
        const selfTarget = {
          type: 'user',
          id: message.author.id,
          member: message.member,
          user: message.author,
          label: `<@${message.author.id}> (${message.author.username})`
        };
        return message.reply({ embeds: [buildTargetInspectEmbed(guild, selfTarget)] });
      }

      const guildPerms = db.getGuildPermits(guild.id);
      const userEntries = Object.entries(guildPerms.users || {}).filter(([, k]) => Array.isArray(k) && k.length > 0);
      const roleEntries = Object.entries(guildPerms.roles || {}).filter(([, k]) => Array.isArray(k) && k.length > 0);

      const userLines = userEntries.length > 0
        ? userEntries.slice(0, 20).map(([uid, keys]) => `• <@${uid}> → ${formatPermitLabels(keys)}`).join('\n')
        : '`None assigned`';

      const roleLines = roleEntries.length > 0
        ? roleEntries.slice(0, 20).map(([rid, keys]) => `• <@&${rid}> → ${formatPermitLabels(keys)}`).join('\n')
        : '`None assigned`';

      const regEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`🎫 Server Moderation Permits Registry`)
        .setDescription(
          `**Role-Based Permits (${roleEntries.length}):**\n${roleLines.slice(0, 1750)}\n\n` +
          `**Direct User Permits (${userEntries.length}):**\n${userLines.slice(0, 1750)}\n\n` +
          `> Use \`.permit mod add @target\`, \`.permit mod remove @target\`, or \`.permit mod list @target\` for full details.`
        )
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setTimestamp();

      return message.reply({ embeds: [regEmbed] });
    }

    // Mutating subcommands strictly require Server Owner, Extra Owner, Bot Owner, or Discord Administrator
    if (!isPermitBypass(message.member)) {
      return message.reply(`${emojis.WARNING || '⚠️'} **Restricted Authority:** Only **Administrators, Extra Owners, or the Server Owner** can add, remove, or reset moderation permits.`);
    }

    // Reset all permits for target
    if (['reset', 'clear', 'wipe'].includes(sub)) {
      const targetQuery = parsedArgs.slice(1).join(' ');
      if (!targetQuery) {
        return message.reply(`${emojis.WARNING || '⚠️'} Please specify a user or role. Example: \`.permit mod reset @User\` or \`.permit mod reset @Role\``);
      }

      const target = await resolvePermitTarget(message, targetQuery);
      if (!target) {
        return message.reply(`${emojis.WARNING || '⚠️'} Could not resolve user or role \`${targetQuery}\`.`);
      }

      if (target.type === 'role' && target.id === guild.id) {
        return message.reply(`${emojis.WARNING || '⚠️'} Cannot target the \`@everyone\` role.`);
      }

      const hadAny = db.resetTargetPermits(guild.id, target.type, target.id);
      const resetEmbed = new EmbedBuilder()
        .setColor(hadAny ? '#ED4245' : '#95A5A6')
        .setTitle(hadAny ? '🧹 Permits Reset' : 'ℹ️ No Permits Found')
        .setDescription(
          hadAny
            ? `Successfully cleared all directly assigned moderation permits for ${target.label}.`
            : `${target.label} did not have any directly assigned moderation permits.`
        )
        .setTimestamp();

      return message.reply({ embeds: [resetEmbed] });
    }

    // Interactive Add or Remove Dropdown Flow
    let mode = null;
    if (['add', 'grant', 'give'].includes(sub)) mode = 'add';
    else if (['remove', 'rm', 'revoke', 'del', 'delete'].includes(sub)) mode = 'remove';

    if (!mode) {
      return message.reply({ embeds: [buildPermitHelpEmbed()] });
    }

    const rawTarget = parsedArgs[1];
    if (!rawTarget) {
      return message.reply(`${emojis.WARNING || '⚠️'} Please mention a user or role (or provide an ID). Example: \`.permit mod ${mode} @User\` or \`.permit mod ${mode} @Role\``);
    }

    const target = await resolvePermitTarget(message, parsedArgs.slice(1).join(' '));
    if (!target) {
      return message.reply(`${emojis.WARNING || '⚠️'} Could not find user or role matching \`${parsedArgs.slice(1).join(' ')}\`. Mention \`@user\` / \`@role\` or pass a valid Discord ID.`);
    }

    if (target.type === 'role' && target.id === guild.id) {
      return message.reply(`${emojis.WARNING || '⚠️'} **Security Block:** You cannot assign moderation permits to the \`@everyone\` role.`);
    }

    // Optional fast-path inline key if user passed exact permit key(s) after target, e.g. `.permit mod add @user chat_mute`
    const possibleInlineKeys = parsedArgs.slice(2).filter(k => Boolean(PERMITS[k]));
    if (possibleInlineKeys.length > 0 && parsedArgs.length > 2) {
      if (mode === 'add') {
        const { added } = db.addPermitsToTarget(guild.id, target.type, target.id, possibleInlineKeys);
        const embed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setTitle('✅ Permits Granted')
          .setDescription(
            added.length > 0
              ? `Successfully added the following permissions for ${target.label}:\n\n${formatPermitLabels(added)}`
              : `${target.label} already has all selected permissions:\n\n${formatPermitLabels(possibleInlineKeys)}`
          )
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      } else {
        const { removed } = db.removePermitsFromTarget(guild.id, target.type, target.id, possibleInlineKeys);
        const embed = new EmbedBuilder()
          .setColor(removed.length > 0 ? '#ED4245' : '#95A5A6')
          .setTitle(removed.length > 0 ? '🧹 Permits Removed' : 'ℹ️ No Changes')
          .setDescription(
            removed.length > 0
              ? `Successfully removed the following permissions for ${target.label}:\n\n${formatPermitLabels(removed)}`
              : `${target.label} did not hold those direct permissions.`
          )
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }
    }

    const sessionId = `${message.id}_${Date.now().toString(36)}`;
    const menuEmbed = new EmbedBuilder()
      .setColor(mode === 'add' ? '#5865F2' : '#E67E22')
      .setTitle('🎫 Modify Moderation Permits')
      .setDescription(
        `Select the permits to **${mode === 'add' ? 'ADD' : 'REMOVE'}** for ${target.label} (**${target.type === 'role' ? 'Role' : 'User'}**) using the dropdown menu(s) below:`
      )
      .setFooter({ text: 'Selection active for 60 seconds • You can pick from multiple tiers' });

    const rows = buildPermitMenuRows(mode, sessionId);
    const panelMsg = await message.reply({ embeds: [menuEmbed], components: rows });

    const collector = panelMsg.createMessageComponentCollector({
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: `${emojis.WARNING || '⚠️'} Only <@${message.author.id}> can use this permit configuration menu.`,
          ephemeral: true
        });
      }

      // Inspect button
      if (interaction.customId === `permit_view_${sessionId}`) {
        return interaction.reply({
          embeds: [buildTargetInspectEmbed(guild, target)],
          ephemeral: true
        });
      }

      // Bulk Grant/Strip All button
      if (interaction.customId === `permit_all_${sessionId}`) {
        if (mode === 'add') {
          const { added } = db.addPermitsToTarget(guild.id, target.type, target.id, ALL_BUNDLE_KEYS);
          const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ Permits Granted')
            .setDescription(
              added.length > 0
                ? `Successfully added the following permissions for ${target.label}:\n\n${formatPermitLabels(added)}`
                : `${target.label} already holds all top-level permit bundles:\n\n${formatPermitLabels(ALL_BUNDLE_KEYS)}`
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        } else {
          const prev = db.getPermitsForTarget(guild.id, target.type, target.id);
          db.resetTargetPermits(guild.id, target.type, target.id);
          const embed = new EmbedBuilder()
            .setColor(prev.length > 0 ? '#ED4245' : '#95A5A6')
            .setTitle(prev.length > 0 ? '🧹 Permits Removed' : 'ℹ️ No Direct Permits')
            .setDescription(
              prev.length > 0
                ? `Successfully stripped all moderation permissions for ${target.label}:\n\n${formatPermitLabels(prev)}`
                : `${target.label} had no directly assigned permits to remove.`
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
      }

      // Tier Category Dropdowns
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('permit_sel_') && interaction.customId.endsWith(`_${sessionId}`)) {
        const chosen = interaction.values.filter(v => Boolean(PERMITS[v]));
        if (chosen.length === 0) {
          return interaction.reply({ content: '⚠️ No valid permit keys detected.', ephemeral: true });
        }

        if (mode === 'add') {
          const { added } = db.addPermitsToTarget(guild.id, target.type, target.id, chosen);
          const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ Permits Granted')
            .setDescription(
              added.length > 0
                ? `Successfully added the following permissions for ${target.label}:\n\n${formatPermitLabels(added)}`
                : `${target.label} already had the selected permission(s):\n\n${formatPermitLabels(chosen)}`
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        } else {
          const { removed } = db.removePermitsFromTarget(guild.id, target.type, target.id, chosen);
          const currentDirect = db.getPermitsForTarget(guild.id, target.type, target.id);
          const extraNote = removed.length === 0 && currentDirect.some(k => chosen.some(c => expandPermits([k]).has(c)))
            ? `\n\n> 💡 *Note:* Target holds an implied bundle permit (e.g. \`All ... Perms\`) granting these sub-permits. Remove or deselect the bundle permit instead.`
            : '';

          const embed = new EmbedBuilder()
            .setColor(removed.length > 0 ? '#ED4245' : '#95A5A6')
            .setTitle(removed.length > 0 ? '🧹 Permits Removed' : 'ℹ️ No Direct Permits Removed')
            .setDescription(
              (removed.length > 0
                ? `Successfully removed the following permissions for ${target.label}:\n\n${formatPermitLabels(removed)}`
                : `${target.label} did not have ${formatPermitLabels(chosen)} directly assigned.`) + extraNote
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
      }
    });

    collector.on('end', () => {
      const disabledRows = rows.map(row => {
        const newRow = new ActionRowBuilder();
        for (const comp of row.components) {
          if (comp.data?.type === ComponentType.Button) {
            newRow.addComponents(ButtonBuilder.from(comp).setDisabled(true));
          } else {
            newRow.addComponents(StringSelectMenuBuilder.from(comp).setDisabled(true));
          }
        }
        return newRow;
      });
      panelMsg.edit({ components: disabledRows }).catch(() => {});
    });
  }
};
