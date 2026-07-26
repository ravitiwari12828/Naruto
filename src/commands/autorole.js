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
    let sub = args[0] ? args[0].toLowerCase() : null;

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
        title: `${emojis.GEAR || emojis.GEAR} Server Automation Control Center`,
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
    if (invokedName === 'massrole' || sub === 'massrole') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.DISABLED} You need **Manage Roles** permission to run massrole.`);
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.WARNING} I need **Manage Roles** permission to execute massrole!`);
      }

      // Check all args for target & action
      let targetMode = 'humans'; // 'humans', 'bots', 'all'
      let action = 'add'; // 'add', 'remove'

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

      const boxLines = [
        '╭──────────────────────────╮',
        '│    MASSROLE EXECUTION    │',
        '├──────────────────────────┤',
        formatBoxLine('Action', action.toUpperCase()),
        formatBoxLine('Target', targetLabel),
        formatBoxLine('Role', '@' + role.name),
        formatBoxLine('Members', count),
        formatBoxLine('Status', 'Completed'),
        '╰──────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} Massrole Execution Complete`,
        subtitle: `Action: ${action.toUpperCase()}`,
        description:
          `Successfully ${action === 'add' ? 'granted' : 'removed'} **${role.name}** for **${count}** ${targetLabel.toLowerCase()}.\n\n` +
          '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    // ━━━━━ 3. .autorole HELP ━━━━━
    if (!sub || sub === 'help') {
      const boxLines = [
        '╭──────────────────────────╮',
        '│   AUTOMATION COMMANDS    │',
        '├──────────────────────────┤',
        '│ .automation              │',
        '│ .autorole config         │',
        '│ .massrole add            │',
        '│ .massrole remove         │',
        '╰──────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `${emojis.GEAR || emojis.GEAR} Automations Commands`,
        subtitle: `${message.guild.name} Automation Control`,
        description:
          `Welcome **${message.author.username}**! Below is the executive suite for **Automations**.\n` +
          `Type any command below in your server to execute.\n\n` +
          '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: message.author,
        clientUser,
        footerText: 'AutoRole & Automation suite'
      });

      return message.channel.send({ embeds: [embed] });
    }

    const currentConfig = db.getAutoroles(message.guild.id);

    // ━━━━━ 4. .autorole config ━━━━━
    if (sub === 'config') {
      const humanRolesList = currentConfig.humans?.map(r => message.guild.roles.cache.get(r)?.name || r) || [];
      const botRolesList = currentConfig.bots?.map(r => message.guild.roles.cache.get(r)?.name || r) || [];

      const boxLines = [
        '╭──────────────────────────╮',
        '│  AUTOROLE CONFIGURATION  │',
        '├──────────────────────────┤',
        '│ Human AutoRoles:         │'
      ];

      if (humanRolesList.length === 0) {
        boxLines.push('│   • None configured      │');
      } else {
        humanRolesList.forEach(name => {
          boxLines.push('│   • ' + ('@' + name).slice(0, 20).padEnd(20, ' ') + ' │');
        });
      }

      boxLines.push('│                          │');
      boxLines.push('│ Bot AutoRoles:           │');

      if (botRolesList.length === 0) {
        boxLines.push('│   • None configured      │');
      } else {
        botRolesList.forEach(name => {
          boxLines.push('│   • ' + ('@' + name).slice(0, 20).padEnd(20, ' ') + ' │');
        });
      }

      boxLines.push('╰──────────────────────────╯');

      const embed = createStyledEmbed({
        title: `${emojis.GEAR || emojis.GEAR} AutoRole Configuration`,
        subtitle: `${message.guild.name} Auto-Assign Settings`,
        description:
          `Current AutoRole settings for **${message.guild.name}**:\n\n` +
          '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 5. .autorole humans / bots [add/remove/list] ━━━━━
    if (sub === 'humans' || sub === 'bots') {
      const action = args[1] ? args[1].toLowerCase() : 'list';
      const role = message.mentions.roles.first() || (args[2] ? message.guild.roles.cache.get(args[2]) : null);

      if (action === 'add') {
        if (!role) return message.reply(`${emojis.WARNING} Please specify a role to add! Example: \`.autorole ${sub} add @Role\``);
        db.setAutorole(message.guild.id, sub, role.id, 'add');

        const boxLines = [
          '╭──────────────────────────╮',
          '│    AUTOROLE UPDATED      │',
          '├──────────────────────────┤',
          formatBoxLine('Target', sub.toUpperCase()),
          formatBoxLine('Action', 'ADD'),
          formatBoxLine('Role', '@' + role.name),
          formatBoxLine('Status', 'Saved'),
          '╰──────────────────────────╯'
        ];

        const embed = createStyledEmbed({
          title: `${emojis.GEAR} AutoRole Updated`,
          description: '```\n' + boxLines.join('\n') + '\n```',
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });

      } else if (action === 'remove') {
        if (!role) return message.reply(`${emojis.WARNING} Please specify a role to remove! Example: \`.autorole ${sub} remove @Role\``);
        db.setAutorole(message.guild.id, sub, role.id, 'remove');

        const boxLines = [
          '╭──────────────────────────╮',
          '│    AUTOROLE UPDATED      │',
          '├──────────────────────────┤',
          formatBoxLine('Target', sub.toUpperCase()),
          formatBoxLine('Action', 'REMOVE'),
          formatBoxLine('Role', '@' + role.name),
          formatBoxLine('Status', 'Saved'),
          '╰──────────────────────────╯'
        ];

        const embed = createStyledEmbed({
          title: `${emojis.GEAR} AutoRole Updated`,
          description: '```\n' + boxLines.join('\n') + '\n```',
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });

      } else {
        const rolesList = currentConfig[sub]?.map(r => message.guild.roles.cache.get(r)?.name || r) || [];

        const boxLines = [
          '╭──────────────────────────╮',
          '│  AUTOROLE LIST: ' + sub.toUpperCase().padEnd(8, ' ') + ' │',
          '├──────────────────────────┤'
        ];

        if (rolesList.length === 0) {
          boxLines.push('│   • None configured      │');
        } else {
          rolesList.forEach(name => {
            boxLines.push('│   • ' + ('@' + name).slice(0, 20).padEnd(20, ' ') + ' │');
          });
        }
        boxLines.push('╰──────────────────────────╯');

        const embed = createStyledEmbed({
          title: `${emojis.GEAR} AutoRole: ${sub.toUpperCase()}`,
          description: '```\n' + boxLines.join('\n') + '\n```',
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    // ━━━━━ 6. .autorole reset [all/humans/bots] ━━━━━
    if (sub === 'reset') {
      const target = args[1] ? args[1].toLowerCase() : 'all';
      if (target === 'all' || target === 'humans') db.setAutorole(message.guild.id, 'humans', null, 'reset');
      if (target === 'all' || target === 'bots') db.setAutorole(message.guild.id, 'bots', null, 'reset');

      const boxLines = [
        '╭──────────────────────────╮',
        '│     AUTOROLE RESET       │',
        '├──────────────────────────┤',
        formatBoxLine('Target', target.toUpperCase()),
        formatBoxLine('Action', 'RESET'),
        formatBoxLine('Status', 'Complete'),
        '╰──────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `${emojis.GEAR} AutoRole Settings Reset`,
        description: '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }
  }
};
