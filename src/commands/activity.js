const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');

module.exports = {
  name: 'activity',
  description: 'Track and view user & server activity stats',
  aliases: ['useractivity', 'guildactivity', 'statsactivity'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();

    const author = message.author;
    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const sub = args[0] ? args[0].toLowerCase() : null;
    const targetUser = (message.mentions?.users && typeof message.mentions.users.first === 'function' ? message.mentions.users.first() : null) || author;
    const userData = db.getUser(targetUser.id, message.guild.id);

    if (invoked === 'guildactivity' || sub === 'server' || sub === 'guild') {
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
        title: `${emojis.ANALYTICS_ZAP || '<a:chart_animated:1537179539514462308>'} Server Activity Overview`,
        description: boxText,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    const voiceMins = Math.floor((userData.voiceSeconds || 0) / 60);

    const boxText =
      '```\n' +
      createDynamicBox('SHINOBI PROFILE', [
        'Username : ' + String(targetUser.username).slice(0, 12),
        'Rank     : ' + String(userData.rank).slice(0, 12),
        'Messages : ' + String(userData.messages),
        'Voice Mins: ' + String(voiceMins) + 'm',
        'Level    : Level ' + String(userData.level) + ' (' + String(userData.xp) + ' XP)'
      ]) +
      '\n```';

    const embed = createStyledEmbed({
      title: `${emojis.ANALYTICS_ZAP || '<a:chart_animated:1537179539514462308>'} ${targetUser.username}'s Activity Card`,
      description: boxText,
      requestedBy: message.author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
