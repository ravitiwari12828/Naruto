const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'autoresponder',
  description: 'Manage automated message responses and emoji reactions with placeholders',
  aliases: ['ar', 'react', 'autoreact', 'autoresponse'],

  async execute(message, args) {
    const rawCmd = message.content.trim().split(/ +/)[0];
    const invoked = rawCmd.replace(/^[^a-zA-Z0-9]/, '').toLowerCase();
    const isReact = invoked === 'react' || invoked === 'autoreact';
    const sub = args[0] ? args[0].toLowerCase() : null;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    if (isReact) {
      if (!sub || sub === 'help') {
        const { renderModuleHelpPanel } = require('../utils/panelRenderer');
        return renderModuleHelpPanel(message, 'autoresponder');
      }

      if (sub === 'add' || sub === 'create') {
        const trigger = args[1]?.toLowerCase();
        const emoji = args[2];
        if (!trigger || !emoji) {
          return message.reply(`${emojis.WARNING} Usage: \`.react add <triggerWord> <emoji>\``);
        }
        db.addAutoreact(message.guild.id, trigger, emoji);
        return message.reply(`${emojis.SUCCESS} Added autoreact! Messages containing \`${trigger}\` will react with ${emoji}`);
      }

      if (sub === 'remove' || sub === 'delete') {
        const triggerOrId = args[1]?.toLowerCase();
        if (!triggerOrId) return message.reply(`${emojis.WARNING} Usage: \`.react remove <triggerWord>\``);
        const removed = db.removeAutoreact(message.guild.id, triggerOrId);
        return message.reply(removed ? `${emojis.REMOVE} Removed autoreact for \`${triggerOrId}\`.` : `${emojis.WARNING} Autoreact not found.`);
      }

      if (sub === 'list' || sub === 'config') {
        const list = db.getAutoreacts(message.guild.id);
        if (list.length === 0) return message.reply(`${emojis.INFO} No autoreacts configured yet.`);
        const desc = list.map((item, idx) => `**${idx + 1}.** \`${item.trigger}\` ➔ ${item.emoji}`).join('\n');
        const embed = createStyledEmbed({
          title: 'Autoreact List',
          subtitle: `${emojis.AUTOREACT} Guild Autoreacts (${list.length})`,
          description: desc,
          requestedBy: message.author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (sub === 'reset') {
        db.resetAutoreact(message.guild.id);
        return message.reply(`${emojis.RESET} Successfully reset all autoreacts.`);
      }
    }

    // Standard Autoresponder commands (.autoresponder create, delete, list, config)
    if (!sub || sub === 'help') {
      const { renderModuleHelpPanel } = require('../utils/panelRenderer');
      return renderModuleHelpPanel(message, 'autoresponder');
    }

    if (sub === 'create' || sub === 'add') {
      const trigger = args[1]?.toLowerCase();
      const responseText = args.slice(2).join(' ');
      if (!trigger || !responseText) {
        return message.reply(`${emojis.WARNING} Usage: \`.ar add <triggerWord> <reply message>\`\n*Placeholders supported:* \`{user}\`, \`{username}\`, \`{server}\`, \`{membercount}\``);
      }
      const item = db.addAutoresponse(message.guild.id, trigger, responseText);
      return message.reply(`${emojis.SUCCESS} Created autoresponder \`[ID: ${item.id}]\` for trigger \`${trigger}\`!\n• **Trigger:** \`${trigger}\`\n• **Reply:** ${responseText}`);
    }

    if (sub === 'delete' || sub === 'remove') {
      const triggerOrId = args[1]?.toLowerCase();
      if (!triggerOrId) return message.reply(`${emojis.WARNING} Usage: \`.ar remove <triggerWord|id>\``);
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
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Fallback
    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'autoresponder');
  }
};
