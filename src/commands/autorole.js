const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'autorole',
  description: 'Automate role assignment for joining humans/bots and mass role management.',
  aliases: ['massrole', 'automation', 'autoroles'],

  async execute(message, args) {
    const invokedName = message.content.slice(1).split(/ +/)[0].toLowerCase();
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

      const embed = createStyledEmbed({
        title: `${emojis.GEAR || '⚙️'} Server Automation Control Center`,
        subtitle: `Overview for ${message.guild.name}`,
        description:
          `⚡ **Active Automation Systems:**\n\n` +
          `• **AutoRole (Humans):** \`${humanCount} role(s) configured\`\n` +
          `• **AutoRole (Bots):** \`${botCount} role(s) configured\`\n` +
          `• **Autoresponder:** \`${arTriggers} trigger(s) registered\`\n` +
          `• **AutoMod & Filters:** \`Active & Monitoring\`\n\n` +
          `──────────────────────────────────────────\n` +
          `*Use \`.autorole config\`, \`.massrole add/remove\`, or \`.autoresponder\` to configure.*`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ━━━━━ 2. .massrole add / remove ━━━━━
    if (invokedName === 'massrole' || sub === 'massrole') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.DISABLED} You need **Manage Roles** permission to run massrole.`);
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.WARNING} I need **Manage Roles** permission to execute massrole!`);
      }

      let action = 'add';
      let roleArgIndex = 0;

      if (['add', 'give', 'grant'].includes(args[0]?.toLowerCase())) {
        action = 'add';
        roleArgIndex = 1;
      } else if (['remove', 'take', 'revoke'].includes(args[0]?.toLowerCase())) {
        action = 'remove';
        roleArgIndex = 1;
      }

      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[roleArgIndex]) || message.guild.roles.cache.get(args[0]);
      if (!role) {
        return message.reply(`${emojis.WARNING} Usage: \`.massrole <add/remove> @role\`\nExample: \`.massrole add @Member\``);
      }

      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply(`${emojis.WARNING} I cannot manage **${role.name}** because it is positioned higher than or equal to my highest role!`);
      }

      const modeStr = action === 'add' ? 'Assigning' : 'Removing';
      const statusMsg = await message.reply(`${emojis.LOADING} ${modeStr} role **${role.name}** for all human members...`);

      let count = 0;
      const members = await message.guild.members.fetch();

      for (const [_, member] of members) {
        if (!member.user.bot) {
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

      const embed = createStyledEmbed({
        title: `${emojis.ROLES || '🎭'} Massrole Execution Complete`,
        subtitle: `Action: ${action.toUpperCase()}`,
        description: `Successfully ${action === 'add' ? 'granted' : 'removed'} **${role.name}** ${action === 'add' ? 'to' : 'from'} **${count}** human members.`,
        requestedBy: message.author,
        clientUser
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    // ━━━━━ 3. .autorole HELP ━━━━━
    if (!sub || sub === 'help') {
      const commandsList = [
        '.autorole config',
        '.autorole humans add @role',
        '.autorole humans remove @role',
        '.autorole bots add @role',
        '.autorole bots remove @role',
        '.autorole reset all',
        '.massrole add @role',
        '.massrole remove @role',
        '.automation'
      ];

      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.GEAR} Automations & AutoRole Commands`,
        description: formatCodePills(commandsList),
        requestedBy: message.author,
        clientUser,
        footerText: 'AutoRole & Automation suite'
      });

      return message.channel.send({ embeds: [embed] });
    }

    const currentConfig = db.getAutoroles(message.guild.id);

    // ━━━━━ 4. .autorole config ━━━━━
    if (sub === 'config') {
      const humanRoles = currentConfig.humans?.map(r => `<@&${r}>`).join(', ') || '*None configured*';
      const botRoles = currentConfig.bots?.map(r => `<@&${r}>`).join(', ') || '*None configured*';

      const embed = createStyledEmbed({
        title: `${emojis.GEAR || '⚙️'} AutoRole Configuration`,
        subtitle: `${message.guild.name} Auto-Assign Settings`,
        fields: [
          { name: `👤 Human AutoRoles`, value: humanRoles, inline: false },
          { name: `🤖 Bot AutoRoles`, value: botRoles, inline: false }
        ],
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
        return message.reply(`${emojis.SUCCESS} Added **${role.name}** to **${sub}** autorole list.`);
      } else if (action === 'remove') {
        if (!role) return message.reply(`${emojis.WARNING} Please specify a role to remove! Example: \`.autorole ${sub} remove @Role\``);
        db.setAutorole(message.guild.id, sub, role.id, 'remove');
        return message.reply(`${emojis.SUCCESS} Removed **${role.name}** from **${sub}** autorole list.`);
      } else {
        const rolesList = currentConfig[sub]?.map(r => `<@&${r}>`).join(', ') || '*None configured*';
        const embed = createStyledEmbed({
          title: `⚙️ AutoRole: ${sub.toUpperCase()}`,
          subtitle: `Roles automatically granted to new ${sub}:`,
          description: rolesList,
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
      return message.reply(`${emojis.SUCCESS} Successfully reset **${target}** autorole settings.`);
    }
  }
};
