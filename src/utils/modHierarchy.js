const { createStyledEmbed } = require('./embedBuilder');
const { createDynamicBox } = require('./boxBuilder');
const emojis = require('./emojis');
const { verifyPermit, isPermitBypass, validateRoleSafety } = require('./modPermits');

// ==========================================
// QUICK ROLE COMMANDS DEFINITION (a<role> / r<role>)
// ==========================================
const QUICK_ROLES = {
  // --- STAFF ROLES (Permit: Quick Staff Roles) ---
  trialchat: { key: 'trialchat', name: 'Trial Chat Mod .', permit: 'role_quick_staff', aliases: ['tchat', 'trialchatmod', 'tchatmod'] },
  jrchat: { key: 'jrchat', name: 'Junior Chat Mod .', permit: 'role_quick_staff', aliases: ['jchat', 'juniortchat', 'jrchatmod', 'jchatmod'] },
  trialhangout: { key: 'trialhangout', name: 'Trial Hangout Mod .', permit: 'role_quick_staff', aliases: ['thangout', 'thangoutmod'] },
  jrhangout: { key: 'jrhangout', name: 'Junior Hangout Mod .', permit: 'role_quick_staff', aliases: ['jhangout', 'jrhangoutmod', 'jhangoutmod'] },
  trialgaming: { key: 'trialgaming', name: 'Trial Gaming Mod .', permit: 'role_quick_staff', aliases: ['tgaming', 'tgamingmod'] },
  jrgaming: { key: 'jrgaming', name: 'Junior Gaming Mod .', permit: 'role_quick_staff', aliases: ['jgaming', 'jrgamingmod', 'jgamingmod'] },
  jrsinging: { key: 'jrsinging', name: 'Junior Singing Mod .', permit: 'role_quick_staff', aliases: ['jsinging', 'jrsingingmod', 'jsingingmod'] },
  chatmod: { key: 'chatmod', name: 'Chat Mod .', permit: 'role_quick_staff', aliases: ['nchatmod'] },
  hangoutmod: { key: 'hangoutmod', name: 'Hangout Modz .', permit: 'role_quick_staff', aliases: ['nhangoutmod'] },
  gamingmod: { key: 'gamingmod', name: 'Gaming mod .', permit: 'role_quick_staff', aliases: ['ngamingmod'] },
  singingmod: { key: 'singingmod', name: 'Singing Mod .', permit: 'role_quick_staff', aliases: ['singing'] },

  // --- SENIOR / HEAD STAFF ROLES (Permit: Quick Head Staff Roles) ---
  headchat: { key: 'headchat', name: 'Head Chat Mod .', permit: 'role_quick_head', aliases: ['hchat', 'headchatmod', 'dhchatmod'] },
  headhangout: { key: 'headhangout', name: 'Head Hangout Mod .', permit: 'role_quick_head', aliases: ['hhangout', 'headhangoutmod', 'dhhangoutmod'] },
  headgaming: { key: 'headgaming', name: 'Head Gaming Mod .', permit: 'role_quick_head', aliases: ['hgaming', 'headgamingmod', 'dhgamingmod'] },
  headsinging: { key: 'headsinging', name: 'Head Singing Mod .', permit: 'role_quick_head', aliases: ['hsinging', 'headsingingmod', 'dhsingingmod'] },
  ticket: { key: 'ticket', name: 'Ticket Admin', permit: 'role_quick_head', aliases: ['ticketadmin', 'dticket'] },
  verifier: { key: 'verifier', name: 'Veriifiers', permit: 'role_quick_head', aliases: ['verifiers', 'dverifier'] },
  leave: { key: 'leave', name: 'Staff on Leave', permit: 'role_quick_head', aliases: ['dleave', 'staffleave', 'onleave'] },

  // --- SPECIAL & PERK ROLES (Permit: Quick Staff Roles) ---
  girl: { key: 'girl', name: 'Girl', permit: 'role_quick_staff', aliases: ['dgirl', 'girls'] },
  artist: { key: 'artist', name: 'Artist', permit: 'role_quick_staff', aliases: ['dartist'] },
  vip: { key: 'vip', name: 'VIPs .', permit: 'role_quick_staff', aliases: ['dvip', 'vips', 'vip'] },
  guest: { key: 'guest', name: 'Distinguished Guest .', permit: 'role_quick_staff', aliases: ['dguest', 'guest'] },
  vouch: { key: 'vouch', name: 'Vouched <3', permit: 'role_quick_staff', aliases: ['dvouch', 'vouch'] }
};

/**
 * Handle quick role addition (`a<role> @user`) and removal (`r<role> @user`)
 */
async function handleQuickRole(message, isAdd, roleKey, args) {
  const authorMember = message.member;
  const guild = message.guild;

  // Find role definition
  let roleDef = QUICK_ROLES[roleKey];
  if (!roleDef) {
    for (const def of Object.values(QUICK_ROLES)) {
      if (def.aliases && def.aliases.includes(roleKey)) {
        roleDef = def;
        break;
      }
    }
  }

  if (!roleDef) return false;

  // 1. Modular Permit Check (User or Role Permit)
  const cmdName = `${isAdd ? 'a' : 'r'}${roleKey}`;
  const permCheck = await verifyPermit(message, roleDef.permit, cmdName);
  if (!permCheck.allowed) {
    return true;
  }

  // 2. Target Member Validation
  const targetUser = message.mentions.members.first() ||
                     guild.members.cache.get(args[0]) ||
                     (args[0] ? await guild.members.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) : null);
  if (!targetUser) {
    const prefix = isAdd ? 'a' : 'r';
    await message.reply(`${emojis.WARNING || '⚠️'} **Usage:** \`.${prefix}${roleKey} @user\` (Please mention a valid member or provide user ID).`);
    return true;
  }

  // 3. Self-Assignment Guard (Non-admins/owners cannot grant/remove quick roles on themselves)
  if (targetUser.id === authorMember.id && !isPermitBypass(authorMember)) {
    await message.reply(`${emojis.WARNING || '⚠️'} **Security Violation:** You cannot assign or remove roles from **yourself**!`);
    return true;
  }

  // 4. Resolve Target Role in Server
  const targetRole = guild.roles.cache.find(
    r => r.name.toLowerCase() === roleDef.name.toLowerCase() ||
         r.name.toLowerCase().includes(roleDef.name.toLowerCase()) ||
         r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === roleDef.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  if (!targetRole) {
    await message.reply(`${emojis.WARNING || '⚠️'} Role **@${roleDef.name}** was not found in this server. Please create it first.`);
    return true;
  }

  // 5. Role Hierarchy, Bot Position & Dangerous Permissions Safety Check
  const isSafe = await validateRoleSafety(message, targetRole, isAdd ? 'assign' : 'remove');
  if (!isSafe) return true;

  // 6. Execute Role Modification
  try {
    if (isAdd) {
      if (targetUser.roles.cache.has(targetRole.id)) {
        await message.reply(`${emojis.INFO || 'ℹ️'} <@${targetUser.id}> already has the **@${targetRole.name}** role.`);
        return true;
      }
      await targetUser.roles.add(targetRole, `Quick Role added by ${authorMember.user.tag}`);
      const embed = createStyledEmbed({
        title: `✅ Role Added Successfully`,
        description:
          `• **Member:** <@${targetUser.id}> (\`${targetUser.user.tag}\`)\n` +
          `• **Role Added:** <@&${targetRole.id}>\n` +
          `• **Action By:** <@${authorMember.id}> (\`${authorMember.user.tag}\`)`,
        requestedBy: authorMember.user
      });
      await message.channel.send({ embeds: [embed] });
    } else {
      if (!targetUser.roles.cache.has(targetRole.id)) {
        await message.reply(`${emojis.INFO || 'ℹ️'} <@${targetUser.id}> does not have the **@${targetRole.name}** role.`);
        return true;
      }
      await targetUser.roles.remove(targetRole, `Quick Role removed by ${authorMember.user.tag}`);
      const embed = createStyledEmbed({
        title: `🧹 Role Removed Successfully`,
        description:
          `• **Member:** <@${targetUser.id}> (\`${targetUser.user.tag}\`)\n` +
          `• **Role Removed:** <@&${targetRole.id}>\n` +
          `• **Action By:** <@${authorMember.id}> (\`${authorMember.user.tag}\`)`,
        requestedBy: authorMember.user
      });
      await message.channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[Quick Role Error]', err);
    await message.reply(`${emojis.WARNING || '⚠️'} Failed to modify role: ${err.message}`);
  }

  return true;
}

/**
 * Render the Custom Roles panel showing all a<role> and r<role> commands
 */
function renderCustomRolesPanel(message, clientUser) {
  const mgmtBox = createDynamicBox('STAFF QUICK ROLES (PERMIT: QUICK STAFF)', [
    '.atrialchat / .rtrialchat    -> @Trial Chat Mod',
    '.ajrchat / .rjrchat          -> @Junior Chat Mod',
    '.achatmod / .rchatmod        -> @Chat Mod',
    '.atrialhangout / .rtrialh... -> @Trial Hangout Mod',
    '.ajrhangout / .rjrhangout    -> @Junior Hangout Mod',
    '.ahangoutmod / .rhangoutmod  -> @Hangout Modz',
    '.atrialgaming / .rtrialg...  -> @Trial Gaming Mod',
    '.ajrgaming / .rjrgaming      -> @Junior Gaming Mod',
    '.agamingmod / .rgamingmod    -> @Gaming mod',
    '.ajrsinging / .rjrsinging    -> @Junior Singing Mod',
    '.asingingmod / .rsingingmod  -> @Singing Mod'
  ]);

  const directorBox = createDynamicBox('HEAD STAFF ROLES (PERMIT: QUICK HEAD)', [
    '.aheadchat / .rheadchat      -> @Head Chat Mod',
    '.aheadhangout / .rheadh...   -> @Head Hangout Mod',
    '.aheadgaming / .rheadgaming  -> @Head Gaming Mod',
    '.aheadsinging / .rheads...   -> @Head Singing Mod',
    '.aticket / .rticket          -> @Ticket Admin',
    '.averifier / .rverifier      -> @Veriifiers',
    '.aleave / .rleave            -> @Staff on Leave'
  ]);

  const perksBox = createDynamicBox('SPECIAL & PERK ROLES (PERMIT: QUICK STAFF)', [
    '.agirl / .rgirl              -> @Girl',
    '.aartist / .rartist          -> @Artist',
    '.avip / .rvip                -> @VIPs',
    '.aguest / .rguest            -> @Distinguished Guest',
    '.avouch / .rvouch            -> @Vouched <3'
  ]);

  return createStyledEmbed({
    title: `🎭 Custom Role Management Panel`,
    subtitle: 'Modular Permit & Hierarchy-Safe Role Engine',
    description:
      `Welcome **${message.author.username}**! Below is the instant role assignment suite.\n\n` +
      `• **\`a<role> @user\`** ➔ Assign role to member\n` +
      `• **\`r<role> @user\`** ➔ Remove role from member\n\n` +
      '```\n' + mgmtBox + '\n```\n' +
      '```\n' + directorBox + '\n```\n' +
      '```\n' + perksBox + '\n```\n\n' +
      `🔒 **Security Protocols:**\n` +
      `• **Permit Enforcement:** Grant access via \`.permit mod add @user\` or \`.permit mod add @role\`.\n` +
      `• **Hierarchy Enforcement:** Staff can ONLY assign roles strictly lower than their own rank.\n` +
      `• **Anti-Self-Grant:** Non-admin staff cannot assign or remove roles from themselves.\n` +
      `• **Power Role Immunity:** Roles with Administrator or dangerous permissions cannot be granted.`,
    requestedBy: message.author,
    clientUser
  });
}

module.exports = {
  QUICK_ROLES,
  handleQuickRole,
  renderCustomRolesPanel
};
