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
    // 1. SHINOBI MESSAGE TRACKING PANEL (.messaged)
    // ─────────────────────────────────────────
    if (['messaged', 'msghelp', 'messageshelp'].includes(invoked)) {
      const infoBox = createDynamicBox('SHINOBI MESSAGE TRACKING SUITE', [
        `Module    : Message Stats & Filter Suite`,
        `Authority : Admin & Hokage Management`,
        `Commands  : 5 Executive Tracking Tools`
      ]);

      const cmdBox = createDynamicBox('MESSAGE STATS MODIFIERS', [
        '.addmessages <@user> <count> : Add messages (or .lad)',
        '.removemessages <@user> <cnt>: Remove messages (or .lrm)',
        '.clearmsgs [@user]           : Clear user/server stats'
      ]);

      const filterBox = createDynamicBox('CHANNEL & CATEGORY FILTERS', [
        '.blacklist channel add/remove #chan : Disable tracking',
        '.whitelist channel add/remove #chan : Force tracking',
        '.msg allowed view                   : View filter list'
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.MESSAGES || '💬'} Shinobi Message Tracking Panel`,
        subtitle: `Admin Message Stats Management & Channel Filters`,
        description:
          '```\n' + infoBox + '\n```\n\n' +
          `${emojis.ANALYTICS_ZAP || '⚙️'} **Message Stats Modifiers**\n` +
          '```\n' + cmdBox + '\n```\n\n' +
          `${emojis.SHIELD || '🛡️'} **Channel & Category Filters**\n` +
          '```\n' + filterBox + '\n```',
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 2. SHINOBI VOICE TRACKING PANEL (.voiced / .vcd)
    // ─────────────────────────────────────────
    if (['voiced', 'vchelp', 'voicehelp', 'vcd'].includes(invoked)) {
      const infoBox = createDynamicBox('SHINOBI VOICE TRACKING SUITE', [
        `Module    : Voice Time & Filter Suite`,
        `Authority : Admin & Hokage Management`,
        `Commands  : 5 Executive Tracking Tools`
      ]);

      const cmdBox = createDynamicBox('VOICE TIME MODIFIERS', [
        '.addvctime <@user> <mins>    : Add voice mins (or .avt / .lavt)',
        '.reducevctime <@user> <mins> : Reduce voice mins (or .lrvt)',
        '.clearvoice [@user]          : Clear voice stats (or .lcv)'
      ]);

      const filterBox = createDynamicBox('VOICE CHANNEL & CATEGORY FILTERS', [
        '.vblacklist channel add/remove #vc : Disable VC tracking',
        '.vwhitelist channel add/remove #vc : Force VC tracking',
        '.vcd allowed view                  : View VC filter list'
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.VOICE || '🎙️'} Shinobi Voice Tracking Panel`,
        subtitle: `Admin Voice Minutes Management & VC Filters`,
        description:
          '```\n' + infoBox + '\n```\n\n' +
          `${emojis.ANALYTICS_ZAP || '⚙️'} **Voice Time Modifiers**\n` +
          '```\n' + cmdBox + '\n```\n\n' +
          `${emojis.SHIELD || '🛡️'} **Voice Channel & Category Filters**\n` +
          '```\n' + filterBox + '\n```',
        requestedBy: author,
        clientUser
      });

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
