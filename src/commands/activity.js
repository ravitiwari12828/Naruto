const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'activity',
  description: 'Track and manage user & server activity stats',
  aliases: ['act', 'stats'],

  async execute(message, args) {
    const sub = args[0] ? args[0].toLowerCase() : null;
    const targetUser = message.mentions.users.first() || message.author;
    const userData = db.getUser(targetUser.id);

    // If sub-command is help
    if (sub === 'help') {
      const { renderModuleHelpPanel } = require('../utils/panelRenderer');
      return renderModuleHelpPanel(message, 'info');
    }

    if (sub === 'server') {
      const totalMsgs = Object.values(db.data.users).reduce((acc, u) => acc + (u.messages || 0), 0);
      const totalShinobi = Object.keys(db.data.users).length;

      const boxText =
        '```\n' +
        '╭──────────────────────────────────╮\n' +
        '│     SERVER ACTIVITY OVERVIEW     │\n' +
        '├──────────────────────────────────┤\n' +
        '│ Guild Name : ' + String(message.guild.name).slice(0, 18).padEnd(18, ' ') + ' │\n' +
        '│ Members    : ' + String(message.guild.memberCount).padEnd(18, ' ') + ' │\n' +
        '│ Messages   : ' + String(totalMsgs).padEnd(18, ' ') + ' │\n' +
        '│ Shinobi    : ' + String(totalShinobi).padEnd(18, ' ') + ' │\n' +
        '╰──────────────────────────────────╯\n' +
        '```';

      const embed = createStyledEmbed({
        title: `${emojis.ANALYTICS_ZAP} Server Activity Overview`,
        description: boxText,
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'chat') {
      const boxText =
        '```\n' +
        '╭──────────────────────────────────╮\n' +
        '│       CHAT ACTIVITY STATS        │\n' +
        '├──────────────────────────────────┤\n' +
        '│ Username   : ' + String(targetUser.username).slice(0, 18).padEnd(18, ' ') + ' │\n' +
        '│ Messages   : ' + String(userData.messages).padEnd(18, ' ') + ' │\n' +
        '│ Level      : ' + String('Level ' + userData.level).padEnd(18, ' ') + ' │\n' +
        '│ Total XP   : ' + String(userData.xp + ' XP').padEnd(18, ' ') + ' │\n' +
        '╰──────────────────────────────────╯\n' +
        '```';

      const embed = createStyledEmbed({
        title: `${emojis.MESSAGES} Chat Activity Stats — ${targetUser.username}`,
        description: boxText,
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'invites') {
      const boxText =
        '```\n' +
        '╭──────────────────────────────────╮\n' +
        '│      INVITE ACTIVITY STATS       │\n' +
        '├──────────────────────────────────┤\n' +
        '│ Username   : ' + String(targetUser.username).slice(0, 18).padEnd(18, ' ') + ' │\n' +
        '│ Invites    : ' + String(userData.invites).padEnd(18, ' ') + ' │\n' +
        '╰──────────────────────────────────╯\n' +
        '```';

      const embed = createStyledEmbed({
        title: `${emojis.INVITES} Invite Activity Stats — ${targetUser.username}`,
        description: boxText,
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'add' || sub === 'remove') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply(`${emojis.DISABLED} You need **Administrator** permissions to modify activity data.`);
      }
      const type = args[1] ? args[1].toLowerCase() : null;
      const target = message.mentions.users.first() || (args[2] ? { id: args[2] } : null);
      const amount = parseInt(args[3], 10);

      if (!type || !target || isNaN(amount)) {
        return message.reply(`${emojis.WARNING} Usage: \`.activity ${sub} <messages|invites> <@user|userId> <amount>\``);
      }

      const modifier = sub === 'add' ? amount : -amount;
      if (type === 'messages') {
        db.addMessage(target.id, modifier);
        return message.reply({ content: `${emojis.SUCCESS} Successfully updated messages for <@${target.id}> by \`${modifier}\`.`, allowedMentions: { parse: [], repliedUser: false } });
      } else if (type === 'invites') {
        db.addInvites(target.id, modifier);
        return message.reply({ content: `${emojis.SUCCESS} Successfully updated invites for <@${target.id}> by \`${modifier}\`.`, allowedMentions: { parse: [], repliedUser: false } });
      }
    }

    // Default stats embed
    const boxText =
      '```\n' +
      '╭──────────────────────────────────╮\n' +
      '│     SHINOBI ACTIVITY PROFILE     │\n' +
      '├──────────────────────────────────┤\n' +
      '│ Username   : ' + String(targetUser.username).slice(0, 18).padEnd(18, ' ') + ' │\n' +
      '│ Rank       : ' + String(userData.rank).slice(0, 18).padEnd(18, ' ') + ' │\n' +
      '│ Messages   : ' + String(userData.messages).padEnd(18, ' ') + ' │\n' +
      '│ Invites    : ' + String(userData.invites).padEnd(18, ' ') + ' │\n' +
      '│ Level      : ' + String('Level ' + userData.level + ' (' + userData.xp + ' XP)').slice(0, 18).padEnd(18, ' ') + ' │\n' +
      '╰──────────────────────────────────╯\n' +
      '```';

    const embed = createStyledEmbed({
      title: `${emojis.ANALYTICS_ZAP} ${targetUser.username}'s Activity Card`,
      description: boxText,
      requestedBy: message.author
    });
    return message.channel.send({ embeds: [embed] });
  }
};
