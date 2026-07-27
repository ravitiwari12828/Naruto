const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');
const { createDynamicBox } = require('../utils/boxBuilder');

module.exports = {
  name: 'autorole',
  description: 'Automate role assignment for joining humans/bots and mass role management.',
  aliases: ['massrole', 'automation', 'autoroles'],

  async execute(message, args) {
    const invokedName = message.content.startsWith('.')
      ? message.content.slice(1).split(/ +/)[0].toLowerCase()
      : message.content.trim().split(/ +/)[0].toLowerCase();

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ━━━━━ 1. .automation OVERVIEW ━━━━━
    if (invokedName === 'automation') {
      const arConfig = db.getAutoroles(message.guild.id);
      const humanCount = arConfig.humans?.length || 0;
      const botCount = arConfig.bots?.length || 0;

      const autoresponderCmd = message.client.commands.get('autoresponder');
      const arTriggers = autoresponderCmd?.autorespondersStore?.get(message.guild.id)?.size || 0;

      const box = createDynamicBox('AUTOMATION OVERVIEW', [
        { key: 'AutoRole H', value: humanCount + ' role(s)' },
        { key: 'AutoRole B', value: botCount + ' role(s)' },
        { key: 'AutoReply', value: arTriggers + ' trgs' },
        { key: 'AutoMod', value: 'Active' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} Server Automation Control Center`,
        subtitle: `Overview for ${message.guild.name}`,
        description:
          `Welcome **${message.author.username}**! Active automation status:\n\n` +
          '```\n' + box + '\n```',
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 2. .massrole [target: humans|bots|all] <action: add|remove> <role> ━━━━━
    if (invokedName === 'massrole' || (args[0] && args[0].toLowerCase() === 'massrole')) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.DISABLED} You need **Manage Roles** permission to run massrole.`);
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.WARNING} I need **Manage Roles** permission to execute massrole!`);
      }

      let targetMode = 'humans';
      let action = 'add';

      const lowerArgs = args.map(a => a.toLowerCase());
      if (lowerArgs.includes('bots') || lowerArgs.includes('bot')) targetMode = 'bots';
      else if (lowerArgs.includes('all') || lowerArgs.includes('everyone')) targetMode = 'all';

      if (lowerArgs.some(a => ['remove', 'take', 'revoke', 'delete', 'rem'].includes(a))) {
        action = 'remove';
      } else if (lowerArgs.some(a => ['add', 'give', 'grant'].includes(a))) {
        action = 'add';
      }

      const role = message.mentions.roles.first() || 
                   message.guild.roles.cache.find(r => lowerArgs.includes(r.id) || lowerArgs.includes(r.name.toLowerCase()));

      if (!role) {
        return message.reply(`${emojis.WARNING} Usage: \`.massrole [humans/bots/all] <add/remove> @role\`\nExample: \`.massrole humans remove @Student\``);
      }

      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply(`${emojis.WARNING} I cannot manage **${role.name}** because it is positioned higher than or equal to my highest role!`);
      }

      const targetLabel = targetMode === 'bots' ? 'All Bots' : (targetMode === 'all' ? 'All Members' : 'All Humans');
      const modeStr = action === 'add' ? 'Assigning' : 'Removing';
      const statusMsg = await message.reply(`${emojis.LOADING} ${modeStr} role **${role.name}** for ${targetLabel.toLowerCase()}...`);

      let count = 0;
      const members = await message.guild.members.fetch();

      for (const [_, member] of members) {
        const matchesTarget = (targetMode === 'humans' && !member.user.bot) ||
                              (targetMode === 'bots' && member.user.bot) ||
                              (targetMode === 'all');

        if (matchesTarget) {
          try {
            if (action === 'add' && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              count++;
            } else if (action === 'remove' && member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              count++;
            }
          } catch (e) {}
        }
      }

      const box = createDynamicBox('MASSROLE EXECUTION', [
        { key: 'Action ', value: action.toUpperCase() },
        { key: 'Target ', value: targetLabel },
        { key: 'Role   ', value: '@' + (role.name.length > 15 ? role.name.slice(0, 13) + '…' : role.name) },
        { key: 'Count  ', value: count + ' member(s)' },
        { key: 'Status ', value: 'Completed' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} Massrole Execution Complete`,
        subtitle: `Action: ${action.toUpperCase()}`,
        description:
          `Successfully ${action === 'add' ? 'granted' : 'removed'} **${role.name}** for **${count}** ${targetLabel.toLowerCase()}.\n\n` +
          '```\n' + box + '\n```',
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    // ━━━━━ FLEXIBLE ARGUMENT PARSER FOR .autorole ━━━━━
    const lowerArgs = args.map(a => a.toLowerCase());

    let target = null; // 'humans' or 'bots'
    let action = null; // 'add', 'remove', 'reset', 'config'

    // Identify target: human/humans vs bot/bots
    if (lowerArgs.some(a => ['human', 'humans', 'user', 'users', 'member', 'members'].includes(a))) {
      target = 'humans';
    } else if (lowerArgs.some(a => ['bot', 'bots'].includes(a))) {
      target = 'bots';
    }

    // Identify action: add vs remove vs reset vs config
    if (lowerArgs.some(a => ['add', 'give', 'grant', 'set'].includes(a))) {
      action = 'add';
    } else if (lowerArgs.some(a => ['remove', 'take', 'delete', 'rem'].includes(a))) {
      action = 'remove';
    } else if (lowerArgs.some(a => ['reset', 'clear'].includes(a))) {
      action = 'reset';
    } else if (lowerArgs.some(a => ['config', 'list', 'show', 'view'].includes(a))) {
      action = 'config';
    }

    const currentConfig = db.getAutoroles(message.guild.id);

    // ━━━━━ 3. .autorole HELP (if no args or help) ━━━━━
    if (args.length === 0 || lowerArgs.includes('help')) {
      const box = createDynamicBox('AUTOMATION COMMANDS', [
        '.autorole human add @role',
        '.autorole human remove @role',
        '.autorole bot add @role',
        '.autorole bot remove @role',
        '.autorole config',
        '.autorole reset',
        '.massrole humans add @role',
        '.automation'
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} AutoRole & Automation Suite`,
        subtitle: `${message.guild.name} Automation Control`,
        description:
          `Welcome **${message.author.username}**! Below is the executive suite for **AutoRoles**.\n` +
          `You can use flexible syntax like \`.autorole human add @role\` or \`.autorole add human @role\`.\n\n` +
          '```\n' + box + '\n```',
        requestedBy: message.author,
        clientUser,
        footerText: 'AutoRole & Automation suite'
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 4. .autorole config / list / show ━━━━━
    if (action === 'config' || lowerArgs.includes('config') || lowerArgs.includes('list')) {
      const humanRolesList = currentConfig.humans?.map(r => message.guild.roles.cache.get(r)?.name || r) || [];
      const botRolesList = currentConfig.bots?.map(r => message.guild.roles.cache.get(r)?.name || r) || [];

      const items = [];
      items.push('--- HUMAN AUTOROLES ---');
      if (humanRolesList.length === 0) {
        items.push('• None configured');
      } else {
        humanRolesList.forEach(name => items.push('• @' + name));
      }

      items.push('--- BOT AUTOROLES ---');
      if (botRolesList.length === 0) {
        items.push('• None configured');
      } else {
        botRolesList.forEach(name => items.push('• @' + name));
      }

      const box = createDynamicBox('AUTOROLE CONFIGURATION', items);

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} AutoRole Configuration`,
        subtitle: `${message.guild.name} Auto-Assign Settings`,
        description:
          `Current AutoRole settings for **${message.guild.name}**:\n\n` +
          '```\n' + box + '\n```',
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 5. .autorole reset [all/humans/bots] ━━━━━
    if (action === 'reset' || lowerArgs.includes('reset')) {
      const resetTarget = target || 'all';
      if (resetTarget === 'all' || resetTarget === 'humans') db.setAutorole(message.guild.id, 'humans', null, 'reset');
      if (resetTarget === 'all' || resetTarget === 'bots') db.setAutorole(message.guild.id, 'bots', null, 'reset');

      const box = createDynamicBox('AUTOROLE RESET', [
        { key: 'Target ', value: resetTarget.toUpperCase() },
        { key: 'Action ', value: 'RESET' },
        { key: 'Status ', value: 'Complete' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} AutoRole Settings Reset`,
        description: '```\n' + box + '\n```',
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 6. .autorole [human/bot] [add/remove] @role ━━━━━
    if (target && (action === 'add' || action === 'remove')) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.DISABLED} You need **Manage Roles** permission to configure AutoRoles.`);
      }

      const role = message.mentions.roles.first() ||
                   message.guild.roles.cache.find(r => lowerArgs.includes(r.id) || lowerArgs.includes(r.name.toLowerCase()));

      if (!role) {
        return message.reply(
          `${emojis.WARNING} Please mention or specify a valid role!\n` +
          `**Example:** \`.autorole ${target === 'bots' ? 'bot' : 'human'} ${action} @Role\``
        );
      }

      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply(`${emojis.WARNING} I cannot set **${role.name}** as AutoRole because it is positioned higher than or equal to my highest role!`);
      }

      db.setAutorole(message.guild.id, target, role.id, action);

      const box = createDynamicBox('AUTOROLE UPDATED', [
        { key: 'Target ', value: target.toUpperCase() },
        { key: 'Action ', value: action.toUpperCase() },
        { key: 'Role   ', value: '@' + (role.name.length > 15 ? role.name.slice(0, 13) + '…' : role.name) },
        { key: 'Status ', value: 'Saved' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} AutoRole Settings Updated`,
        description:
          `Successfully ${action === 'add' ? 'added' : 'removed'} **${role.name}** for AutoRole (**${target.toUpperCase()}**).\n\n` +
          '```\n' + box + '\n```',
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Fallback if target or action missing
    const box = createDynamicBox('AUTOMATION COMMANDS', [
      '.autorole human add @role',
      '.autorole human remove @role',
      '.autorole bot add @role',
      '.autorole bot remove @role',
      '.autorole config',
      '.autorole reset',
      '.massrole humans add @role',
      '.automation'
    ]);

    const embed = createStyledEmbed({
      title: `${emojis.ROLES || '🎭'} AutoRole & Automation Suite`,
      subtitle: `${message.guild.name} Automation Control`,
      description:
        `Welcome **${message.author.username}**! Below is the executive suite for **AutoRoles**.\n\n` +
        '```\n' + box + '\n```',
      requestedBy: message.author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
