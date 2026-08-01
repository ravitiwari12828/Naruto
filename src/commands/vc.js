const { PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');

module.exports = {
  name: 'vc',
  description: 'Shinobi Voice Tracking Suite: .vc, .vc add, .vc remove, .vc clear',
  aliases: ['voiced', 'vctime', 'addvctime', 'reducevctime', 'clearvoice'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const sub = args[0]?.toLowerCase();

    // ─────────────────────────────────────────
    // 1. ADD VOICE TIME (.vc add <@user> <mins> or .addvctime <@user> <mins>)
    // ─────────────────────────────────────────
    if (invoked === 'addvctime' || sub === 'add') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can modify user voice time.`);
      }

      const startIndex = invoked === 'addvctime' ? 0 : 1;
      const target = message.mentions.users.first() || (args[startIndex] ? await message.client.users.fetch(args[startIndex]).catch(() => null) : null);
      const amountStr = message.mentions.users.first() ? args[startIndex + 1] : args[startIndex + 1] || args[startIndex];
      const minutes = parseInt(amountStr, 10);

      if (!target || isNaN(minutes)) {
        return message.reply(`⚠️ Usage: \`.vc add <@user|userId> <minutes>\` (Example: \`.vc add @user 3300\`)`);
      }

      const secondsDelta = Math.abs(minutes) * 60;
      db.addVoiceTime(target.id, secondsDelta);
      const userData = db.getUser(target.id);
      const totalMins = Math.floor((userData.voiceSeconds || 0) / 60);

      const boxText =
        '```\n' +
        createDynamicBox('VOICE TIME UPDATED', [
          'Action   : Add Voice Time',
          'Target   : ' + String(target.username).slice(0, 12),
          'Amount   : +' + String(Math.abs(minutes)) + ' Mins',
          'New Total: ' + String(totalMins) + ' Mins'
        ]) +
        '\n```';

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS || '✅'} Voice Time Added`,
        description: boxText,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 2. REDUCE VOICE TIME (.vc remove <@user> <mins> or .reducevctime <@user> <mins>)
    // ─────────────────────────────────────────
    if (invoked === 'reducevctime' || sub === 'remove' || sub === 'rm') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can modify user voice time.`);
      }

      const startIndex = invoked === 'reducevctime' ? 0 : 1;
      const target = message.mentions.users.first() || (args[startIndex] ? await message.client.users.fetch(args[startIndex]).catch(() => null) : null);
      const amountStr = message.mentions.users.first() ? args[startIndex + 1] : args[startIndex + 1] || args[startIndex];
      const minutes = parseInt(amountStr, 10);

      if (!target || isNaN(minutes)) {
        return message.reply(`⚠️ Usage: \`.vc remove <@user|userId> <minutes>\` (Example: \`.vc remove @user 60\`)`);
      }

      const secondsDelta = -Math.abs(minutes) * 60;
      db.addVoiceTime(target.id, secondsDelta);
      const userData = db.getUser(target.id);
      const totalMins = Math.floor((userData.voiceSeconds || 0) / 60);

      const boxText =
        '```\n' +
        createDynamicBox('VOICE TIME UPDATED', [
          'Action   : Reduce Voice Time',
          'Target   : ' + String(target.username).slice(0, 12),
          'Amount   : -' + String(Math.abs(minutes)) + ' Mins',
          'New Total: ' + String(totalMins) + ' Mins'
        ]) +
        '\n```';

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS || '✅'} Voice Time Reduced`,
        description: boxText,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 3. CLEAR VOICE TIME (.vc clear [@user] or .clearvoice [@user])
    // ─────────────────────────────────────────
    if (invoked === 'clearvoice' || sub === 'clear' || sub === 'reset') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can clear voice stats.`);
      }
      const target = message.mentions.users.first();
      db.clearVoiceTime(target ? target.id : null);

      const boxText =
        '```\n' +
        createDynamicBox('VOICE TIME CLEARED', [
          'Scope  : ' + (target ? String(target.username).slice(0, 12) : 'Entire Server'),
          'Status : Reset to 0 Mins'
        ]) +
        '\n```';

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS || '🧹'} Voice Stats Cleared`,
        description: boxText,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 4. MAIN VOICE TRACKING DASHBOARD (.vc)
    // ─────────────────────────────────────────
    const infoBox = createDynamicBox('SHINOBI VOICE TRACKING SUITE', [
      `Module    : Voice Time & Filter Suite`,
      `Authority : Admin & Hokage Management`,
      `Commands  : Executive Tracking Tools`
    ]);

    const cmdBox = createDynamicBox('VOICE TIME MODIFIERS', [
      '.vc add <@user> <mins>    : Add voice mins',
      '.vc remove <@user> <mins> : Reduce voice mins',
      '.vc clear [@user]          : Clear user/server stats'
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
};
