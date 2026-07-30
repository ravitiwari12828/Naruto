const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');

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
        createDynamicBox('SERVER OVERVIEW', [
          'Guild    : ' + String(message.guild.name).slice(0, 12),
          'Members  : ' + String(message.guild.memberCount),
          'Messages : ' + String(totalMsgs),
          'Shinobi  : ' + String(totalShinobi)
        ]) +
        '\n```';

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
        createDynamicBox('CHAT STATS', [
          'Username : ' + String(targetUser.username).slice(0, 12),
          'Messages : ' + String(userData.messages),
          'Level    : Level ' + String(userData.level),
          'Total XP : ' + String(userData.xp) + ' XP'
        ]) +
        '\n```';

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
        createDynamicBox('INVITE STATS', [
          'Username : ' + String(targetUser.username).slice(0, 12),
          'Invites  : ' + String(userData.invites)
        ]) +
        '\n```';

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

    // Default stats embed with 28-char device-proof box
    const boxText =
      '```\n' +
      createDynamicBox('SHINOBI PROFILE', [
        'Username : ' + String(targetUser.username).slice(0, 12),
        'Rank     : ' + String(userData.rank).slice(0, 12),
        'Messages : ' + String(userData.messages),
        'Invites  : ' + String(userData.invites),
        'Level    : Level ' + String(userData.level) + ' (' + String(userData.xp) + ' XP)'
      ]) +
      '\n```';

    const embed = createStyledEmbed({
      title: `${emojis.ANALYTICS_ZAP} ${targetUser.username}'s Activity Card`,
      description: boxText,
      requestedBy: message.author
    });
    return message.channel.send({ embeds: [embed] });
  }
};
