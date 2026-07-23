const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'autorole',
  description: 'Automate role assignment for joining humans and bots',
  aliases: ['massrole', 'automation'],

  async execute(message, args) {
    const sub = args[0] ? args[0].toLowerCase() : null;
    const isMassrole = message.content.toLowerCase().startsWith('.massrole');

    if (isMassrole) {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply(`${emojis.DISABLED} You need **Manage Roles** permission to run massrole.`);
      }
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
      if (!role) {
        return message.reply(`${emojis.WARNING} Please mention or provide a valid Role ID! Usage: \`.massrole @role\``);
      }

      const statusMsg = await message.reply(`${emojis.LOADING} Assigning role **${role.name}** to all human members...`);
      let count = 0;
      const members = await message.guild.members.fetch();
      for (const [_, member] of members) {
        if (!member.user.bot && !member.roles.cache.has(role.id)) {
          try {
            await member.roles.add(role);
            count++;
          } catch (e) {}
        }
      }

      const embed = createStyledEmbed({
        title: 'Automations: Massrole',
        subtitle: `${emojis.SUCCESS} Massrole Execution Complete`,
        description: `Successfully granted **${role.name}** to **${count}** human members.`,
        requestedBy: message.author
      });

      return statusMsg.edit({ content: ' ', embeds: [embed] });
    }

    if (!sub || sub === 'help') {
      const commandsList = [
        '.autorole', '.autorole bots add', '.autorole bots remove',
        '.autorole bots', '.autorole config', '.autorole humans add',
        '.autorole humans remove', '.autorole humans',
        '.autorole reset all', '.autorole reset bots',
        '.autorole reset humans', '.massrole @role'
      ];

      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.GEAR} Automations: Autorole`,
        description: `**Automations**\n` + formatCodePills(commandsList),
        requestedBy: message.author,
        footerText: 'Automations overview'
      });

      return message.channel.send({ embeds: [embed] });
    }

    const currentConfig = db.getAutoroles(message.guild.id);

    if (sub === 'config') {
      const humanRoles = currentConfig.humans.map(r => `<@&${r}>`).join(', ') || '*None configured*';
      const botRoles = currentConfig.bots.map(r => `<@&${r}>`).join(', ') || '*None configured*';

      const embed = createStyledEmbed({
        title: 'Autorole Configuration',
        subtitle: `${emojis.GEAR} ${message.guild.name} Settings`,
        fields: [
          { name: `${emojis.HUMAN} Human Autoroles`, value: humanRoles, inline: false },
          { name: `${emojis.BOT} Bot Autoroles`, value: botRoles, inline: false }
        ],
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

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
        return message.reply(`${emojis.REMOVE} Removed **${role.name}** from **${sub}** autorole list.`);
      } else {
        const rolesList = currentConfig[sub].map(r => `<@&${r}>`).join(', ') || '*None configured*';
        const embed = createStyledEmbed({
          title: `Autorole: ${sub.toUpperCase()}`,
          subtitle: `Roles automatically granted to new ${sub}:`,
          description: rolesList,
          requestedBy: message.author
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    if (sub === 'reset') {
      const target = args[1] ? args[1].toLowerCase() : 'all';
      if (target === 'all' || target === 'humans') db.setAutorole(message.guild.id, 'humans', null, 'reset');
      if (target === 'all' || target === 'bots') db.setAutorole(message.guild.id, 'bots', null, 'reset');
      return message.reply(`${emojis.RESET} Successfully reset **${target}** autorole settings.`);
    }
  }
};
