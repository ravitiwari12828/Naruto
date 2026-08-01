const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'activity',
  description: 'Track, manage, and view message & voice activity stats',
  aliases: [
    'act', 'stats',
    'addmessages', 'lad', 'addmsgs',
    'removemessages', 'lrm', 'rmmsgs',
    'clearmsgs', 'clearmsg', 'resetmessages',
    'messaged', 'msghelp', 'messageshelp',
    'addvctime', 'lavt', 'avt', 'addvoice', 'addvc',
    'reducevctime', 'lrvt', 'rmvoice', 'rmvc',
    'clearvoice', 'lcv', 'resetvoice',
    'voiced', 'vchelp', 'voicehelp', 'vcd'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ─────────────────────────────────────────
    // 1. MESSAGED HELP PANEL (.messaged) — Screenshot 2
    // ─────────────────────────────────────────
    if (['messaged', 'msghelp', 'messageshelp'].includes(invoked)) {
      const p = message.guild ? '.' : '.';
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`👑 Premium Message Tracking`)
        .setDescription(
          `⚙️ **Admin: Management & Filters (Page 2)**\n\n` +
          `🛡️ \`${p}addmessages\` / \`${p}removemessages\` *(or ${p}lad / ${p}lrm)*\n` +
          `➡️ Add or remove messages from a user.\n\n` +
          `🛡️ \`${p}clearmsgs\` *[@user]*\n` +
          `➡️ Clear messages for a user or the entire server.\n\n` +
          `🛡️ \`${p}blacklist\` / \`${p}whitelist\` *channel add/remove #channel*\n` +
          `➡️ Prevent or allow tracking in specific channels.\n\n` +
          `🛡️ \`${p}blacklist\` / \`${p}whitelist\` *category add/remove <ID>*\n` +
          `➡️ Prevent or allow tracking in specific categories.\n\n` +
          `🛡️ \`${p}msg\` *allowed view*\n` +
          `➡️ View all blacklisted and whitelisted channels/categories.`
        )
        .setFooter({ text: `Page 2 of 3 | Total Commands: 15` });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 2. VOICED HELP PANEL (.voiced / .vcd) — Screenshot 3
    // ─────────────────────────────────────────
    if (['voiced', 'vchelp', 'voicehelp', 'vcd'].includes(invoked)) {
      const p = message.guild ? '.' : '.';
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`👑 Premium Voice Tracking`)
        .setDescription(
          `⚙️ **Admin: Management & Filters (Page 2)**\n\n` +
          `🛡️ \`${p}addvctime\` / \`${p}reducevctime\` *[@user] [mins]* *(or ${p}lavt / ${p}avt / ${p}lrvt)*\n` +
          `➡️ Add or remove voice minutes from a user.\n\n` +
          `🛡️ \`${p}clearvoice\` *[@user]* *(or ${p}lcv)*\n` +
          `➡️ Clear voice stats for a user or the entire server.\n\n` +
          `🛡️ \`${p}vblacklist\` / \`${p}vwhitelist\` *channel add/remove #channel*\n` +
          `➡️ Prevent or allow tracking in specific channels.\n\n` +
          `🛡️ \`${p}vblacklist\` / \`${p}vwhitelist\` *category add/remove <ID>*\n` +
          `➡️ Prevent or allow tracking in specific categories.\n\n` +
          `🛡️ \`${p}vcd\` *allowed view*\n` +
          `➡️ View all blacklisted and whitelisted channels/categories.`
        )
        .setFooter({ text: `Page 2 of 3 | Total Commands: 20` });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 3. ADD / REMOVE MESSAGES (.addmessages, .lad, .removemessages, .lrm)
    // ─────────────────────────────────────────
    if (['addmessages', 'lad', 'addmsgs', 'removemessages', 'lrm', 'rmmsgs'].includes(invoked)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can modify user message counts.`);
      }

      const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
      const amountStr = message.mentions.users.first() ? args[1] : args[1] || args[0];
      const amount = parseInt(amountStr, 10);

      if (!target || isNaN(amount)) {
        return message.reply(`⚠️ Usage: \`.${invoked} <@user|userId> <amount>\` (Example: \`.addmessages @user 100\`)`);
      }

      const isAdd = ['addmessages', 'lad', 'addmsgs'].includes(invoked);
      const delta = isAdd ? Math.abs(amount) : -Math.abs(amount);

      db.addMessage(target.id, delta);
      const userData = db.getUser(target.id);

      return message.reply({
        content: `✅ ${isAdd ? 'Added' : 'Removed'} **${Math.abs(amount)}** messages for **${target.username}**! (New Total: \`${userData.messages}\`)`,
        allowedMentions: { parse: [], repliedUser: false }
      });
    }

    // ─────────────────────────────────────────
    // 4. ADD / REDUCE VOICE TIME (.addvctime, .lavt, .avt, .reducevctime, .lrvt)
    // ─────────────────────────────────────────
    if (['addvctime', 'lavt', 'avt', 'addvoice', 'addvc', 'reducevctime', 'lrvt', 'rmvoice', 'rmvc'].includes(invoked)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can modify user voice time.`);
      }

      const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
      const amountStr = message.mentions.users.first() ? args[1] : args[1] || args[0];
      const minutes = parseInt(amountStr, 10);

      if (!target || isNaN(minutes)) {
        return message.reply(`⚠️ Usage: \`.${invoked} <@user|userId> <minutes>\` (Example: \`.avt @user 3300\`)`);
      }

      const isAdd = ['addvctime', 'lavt', 'avt', 'addvoice', 'addvc'].includes(invoked);
      const secondsDelta = (isAdd ? Math.abs(minutes) : -Math.abs(minutes)) * 60;

      db.addVoiceTime(target.id, secondsDelta);
      const userData = db.getUser(target.id);
      const totalMins = Math.floor((userData.voiceSeconds || 0) / 60);

      return message.reply({
        content: `✅ ${isAdd ? 'Added' : 'Reduced'} **${Math.abs(minutes)}** minutes to **${target.username}**'s voice time! (New Total: \`${totalMins}m\`)`,
        allowedMentions: { parse: [], repliedUser: false }
      });
    }

    // ─────────────────────────────────────────
    // 5. CLEAR MESSAGES / VOICE (.clearmsgs, .clearvoice, .lcv)
    // ─────────────────────────────────────────
    if (['clearmsgs', 'clearmsg', 'resetmessages'].includes(invoked)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can clear message stats.`);
      }
      const target = message.mentions.users.first();
      db.clearMessages(target ? target.id : null);
      return message.reply(`✅ Cleared message stats for ${target ? `**${target.username}**` : 'the entire server'}!`);
    }

    if (['clearvoice', 'lcv', 'resetvoice'].includes(invoked)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can clear voice stats.`);
      }
      const target = message.mentions.users.first();
      db.clearVoiceTime(target ? target.id : null);
      return message.reply(`✅ Cleared voice stats for ${target ? `**${target.username}**` : 'the entire server'}!`);
    }

    // ─────────────────────────────────────────
    // 6. DEFAULT ACTIVITY / SERVER STATS OVERVIEW
    // ─────────────────────────────────────────
    const sub = args[0] ? args[0].toLowerCase() : null;
    const targetUser = (message.mentions?.users && typeof message.mentions.users.first === 'function' ? message.mentions.users.first() : null) || author;
    const userData = db.getUser(targetUser.id);

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
        title: `${emojis.ANALYTICS_ZAP || '📈'} Server Activity Overview`,
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
      title: `${emojis.ANALYTICS_ZAP || '📈'} ${targetUser.username}'s Activity Card`,
      description: boxText,
      requestedBy: message.author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
