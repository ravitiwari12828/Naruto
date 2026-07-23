const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
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

    // If sub-command is help or empty
    if (!sub || sub === 'help') {
      const commandsList = [
        'activity', 'activity server', 'activity chat',
        'activity voice', 'activity invites', 'activity levels',
        'activity add messages <userId> <amount>',
        'activity remove messages <userId> <amount>',
        'activity add invites <userId> <amount>',
        'activity remove invites <userId> <amount>'
      ];

      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.ZAP} Activity Commands`,
        description: formatCodePills(commandsList),
        requestedBy: message.author,
        footerText: `Total ${commandsList.length} commands`
      });

      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'server') {
      const embed = createStyledEmbed({
        title: 'Server Activity Overview',
        subtitle: `${emojis.STATS} ${message.guild.name} Stats`,
        fields: [
          { name: `${emojis.MEMBERS} Total Members`, value: `${message.guild.memberCount}`, inline: true },
          { name: `${emojis.MESSAGES} Total Tracked Messages`, value: `${Object.values(db.data.users).reduce((acc, u) => acc + (u.messages || 0), 0)}`, inline: true },
          { name: `${emojis.SHINOBI} Active Shinobi`, value: `${Object.keys(db.data.users).length}`, inline: true }
        ],
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'chat') {
      const embed = createStyledEmbed({
        title: 'Chat Activity Stats',
        subtitle: `${emojis.MESSAGES} ${targetUser.username}'s Chat Stats`,
        fields: [
          { name: 'Total Messages', value: `\`${userData.messages}\` messages sent`, inline: true },
          { name: 'Level & XP', value: `Level **${userData.level}** (${userData.xp} XP)`, inline: true }
        ],
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'invites') {
      const embed = createStyledEmbed({
        title: 'Invite Activity Stats',
        subtitle: `${emojis.INVITES} ${targetUser.username}'s Invites`,
        fields: [
          { name: 'Total Invites', value: `\`${userData.invites}\` real invites`, inline: true }
        ],
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'add' || sub === 'remove') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply(`${emojis.DISABLED} You need **Administrator** permissions to modify activity data.`);
      }
      const type = args[1] ? args[1].toLowerCase() : null; // 'messages' or 'invites'
      const target = message.mentions.users.first() || (args[2] ? { id: args[2] } : null);
      const amount = parseInt(args[3], 10);

      if (!type || !target || isNaN(amount)) {
        return message.reply(`${emojis.WARNING} Usage: \`.activity ${sub} <messages|invites> <@user|userId> <amount>\``);
      }

      const modifier = sub === 'add' ? amount : -amount;
      if (type === 'messages') {
        db.addMessage(target.id, modifier);
        return message.reply(`${emojis.SUCCESS} Successfully updated messages for <@${target.id}> by \`${modifier}\`.`);
      } else if (type === 'invites') {
        db.addInvites(target.id, modifier);
        return message.reply(`${emojis.SUCCESS} Successfully updated invites for <@${target.id}> by \`${modifier}\`.`);
      }
    }

    // Default stats embed
    const embed = createStyledEmbed({
      title: `${targetUser.username}'s Activity Card`,
      subtitle: `${emojis.SCROLL} Shinobi Status: **${userData.rank}**`,
      fields: [
        { name: `${emojis.MESSAGES} Messages Sent`, value: `\`${userData.messages}\``, inline: true },
        { name: `${emojis.INVITES} Invites`, value: `\`${userData.invites}\``, inline: true },
        { name: `${emojis.STAR} Shinobi Level`, value: `\`Level ${userData.level}\` (${userData.xp} XP)`, inline: true }
      ],
      requestedBy: message.author
    });
    return message.channel.send({ embeds: [embed] });
  }
};
