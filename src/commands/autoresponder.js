const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'autoresponder',
  description: 'Manage automated message responses and emoji reactions',
  aliases: ['ar', 'react', 'autoreact'],

  async execute(message, args) {
    const isReact = message.content.toLowerCase().startsWith('.react');
    const sub = args[0] ? args[0].toLowerCase() : null;

    if (isReact) {
      if (!sub || sub === 'help') {
        const commandsList = ['.react', '.react add', '.react remove', '.react list', '.react reset'];
        const embed = createStyledEmbed({
          title: 'Naruto Help Menu',
          subtitle: `${emojis.AUTOREACT} Autoresponder: Autoreact`,
          description: `**Autoreact**\n` + formatCodePills(commandsList),
          requestedBy: message.author,
          footerText: 'Autoreact overview'
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (sub === 'add') {
        const trigger = args[1];
        const emoji = args[2];
        if (!trigger || !emoji) {
          return message.reply(`${emojis.WARNING} Usage: \`.react add <triggerWord> <emoji>\``);
        }
        db.addAutoreact(message.guild.id, trigger, emoji);
        return message.reply(`${emojis.SUCCESS} Added autoreact! Messages containing \`${trigger}\` will react with ${emoji}`);
      }

      if (sub === 'remove') {
        const triggerOrId = args[1];
        if (!triggerOrId) return message.reply(`${emojis.WARNING} Usage: \`.react remove <triggerWord>\``);
        const removed = db.removeAutoreact(message.guild.id, triggerOrId);
        return message.reply(removed ? `${emojis.REMOVE} Removed autoreact for \`${triggerOrId}\`.` : `${emojis.WARNING} Autoreact not found.`);
      }

      if (sub === 'list') {
        const list = db.getAutoreacts(message.guild.id);
        if (list.length === 0) return message.reply(`${emojis.INFO} No autoreacts configured yet.`);
        const desc = list.map((item, idx) => `**${idx + 1}.** \`${item.trigger}\` ➔ ${item.emoji}`).join('\n');
        const embed = createStyledEmbed({
          title: 'Autoreact List',
          subtitle: `${emojis.AUTOREACT} Guild Autoreacts (${list.length})`,
          description: desc,
          requestedBy: message.author
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (sub === 'reset') {
        db.resetAutoreact(message.guild.id);
        return message.reply(`${emojis.RESET} Successfully reset all autoreacts.`);
      }
    }

    // Standard Autoresponder commands (.autoresponder, create, delete, edit, config)
    if (!sub || sub === 'help') {
      const arCommands = [
        '.autoresponder', '.autoresponder create',
        '.autoresponder delete', '.autoresponder edit',
        '.autoresponder config'
      ];
      const reactCommands = ['.react', '.react add', '.react remove', '.react list', '.react reset'];

      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.AUTORESPOND} Autoresponder & Autoreact System`,
        description: `**Autoresponder**\n` + formatCodePills(arCommands) + `\n\n` +
          `**Autoreact**\n` + formatCodePills(reactCommands),
        requestedBy: message.author,
        footerText: 'Autoresponder overview'
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'create') {
      const trigger = args[1];
      const responseText = args.slice(2).join(' ');
      if (!trigger || !responseText) {
        return message.reply(`${emojis.WARNING} Usage: \`.autoresponder create <triggerWord> <reply message>\``);
      }
      const item = db.addAutoresponse(message.guild.id, trigger, responseText);
      return message.reply(`${emojis.SUCCESS} Created autoresponder \`[ID: ${item.id}]\` for trigger \`${trigger}\`!`);
    }

    if (sub === 'delete') {
      const triggerOrId = args[1];
      if (!triggerOrId) return message.reply(`${emojis.WARNING} Usage: \`.autoresponder delete <triggerWord|id>\``);
      const removed = db.deleteAutoresponse(message.guild.id, triggerOrId);
      return message.reply(removed ? `${emojis.REMOVE} Deleted autoresponse for \`${triggerOrId}\`.` : `${emojis.WARNING} Autoresponse not found.`);
    }

    if (sub === 'config' || sub === 'list') {
      const responses = db.getAutoresponses(message.guild.id);
      if (responses.length === 0) return message.reply(`${emojis.INFO} No autoresponses configured yet.`);
      const desc = responses.map((r, i) => `**${i + 1}.** \`${r.trigger}\` ➔ ${r.response}`).join('\n');
      const embed = createStyledEmbed({
        title: 'Autoresponder Configuration',
        subtitle: `${emojis.MESSAGES} Active Triggers (${responses.length})`,
        description: desc,
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }
  }
};
