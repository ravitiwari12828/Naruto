const { PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');

module.exports = {
  name: 'msg',
  description: 'Shinobi Message Tracking Suite: .msg, .msg add, .msg remove, .msg clear, .msg allowed view',
  aliases: ['messaged', 'message', 'messages', 'addmessages', 'removemessages', 'clearmsgs', 'msgfilter', 'blacklist', 'whitelist'],

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
    const sub2 = args[1]?.toLowerCase();

    // ─────────────────────────────────────────
    // 1. ALLOWED / FILTER VIEW (.msg allowed view / .msg allowed / .msg filter)
    // ─────────────────────────────────────────
    if (
      (sub === 'allowed' || sub === 'filter' || sub === 'view' || sub === 'list') ||
      (invoked === 'blacklist' && (sub === 'view' || sub === 'list')) ||
      (invoked === 'whitelist' && (sub === 'view' || sub === 'list'))
    ) {
      const config = db.getAutomod(guild.id);
      const blChans = config.ignoredChannels || [];
      const wlChans = config.whitelistedChannels || [];
      const blCats = config.ignoredCategories || [];
      const wlCats = config.whitelistedCategories || [];

      const totalBl = blChans.length + blCats.length;
      const totalWl = wlChans.length + wlCats.length;

      if (totalBl === 0 && totalWl === 0) {
        const boxText =
          '```\n' +
          createDynamicBox('MESSAGE TRACKING FILTERS', [
            'Server  : ' + String(guild.name).slice(0, 12),
            'Status  : No Channels Blacklisted/WL',
            'Tracking: All text channels active'
          ]) +
          '\n```';

        const embed = createStyledEmbed({
          title: `${emojis.SHIELD || '🛡️'} Message Channel Filter View`,
          description: boxText + '\n\n• **No channels are whitelisted or blacklisted.** All text channels are currently being tracked for message activity.',
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } else {
        const boxText =
          '```\n' +
          createDynamicBox('MESSAGE TRACKING FILTERS', [
            'Blacklisted : ' + String(blChans.length) + ' Chans, ' + String(blCats.length) + ' Cats',
            'Whitelisted : ' + String(wlChans.length) + ' Chans, ' + String(wlCats.length) + ' Cats'
          ]) +
          '\n```';

        let details = '';
        if (blChans.length > 0) details += `\n🚫 **Blacklisted Channels:** ${blChans.map(id => `<#${id}>`).join(', ')}`;
        if (blCats.length > 0) details += `\n🚫 **Blacklisted Categories:** ${blCats.map(id => `<#${id}>`).join(', ')}`;
        if (wlChans.length > 0) details += `\n✅ **Whitelisted Channels:** ${wlChans.map(id => `<#${id}>`).join(', ')}`;
        if (wlCats.length > 0) details += `\n✅ **Whitelisted Categories:** ${wlCats.map(id => `<#${id}>`).join(', ')}`;

        const embed = createStyledEmbed({
          title: `${emojis.SHIELD || '🛡️'} Message Channel Filter View`,
          description: boxText + details,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    // ─────────────────────────────────────────
    // 2. ADD MESSAGES (.msg add <@user> <amount> or .addmessages <@user> <amount>)
    // ─────────────────────────────────────────
    if (invoked === 'addmessages' || sub === 'add') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can modify user message counts.`);
      }

      const startIndex = invoked === 'addmessages' ? 0 : 1;
      const target = message.mentions.users.first() || (args[startIndex] ? await message.client.users.fetch(args[startIndex]).catch(() => null) : null);
      const amountStr = message.mentions.users.first() ? args[startIndex + 1] : args[startIndex + 1] || args[startIndex];
      const amount = parseInt(amountStr, 10);

      if (!target || isNaN(amount)) {
        return message.reply(`⚠️ Usage: \`.msg add <@user|userId> <amount>\` (Example: \`.msg add @user 100\`)`);
      }

      const delta = Math.abs(amount);
      db.addMessage(target.id, delta);
      const userData = db.getUser(target.id);

      const boxText =
        '```\n' +
        createDynamicBox('MESSAGE STATS UPDATED', [
          'Action   : Add Messages',
          'Target   : ' + String(target.username).slice(0, 12),
          'Amount   : +' + String(delta) + ' Msgs',
          'New Total: ' + String(userData.messages) + ' Msgs'
        ]) +
        '\n```';

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS || '✅'} Message Count Added`,
        description: boxText,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 3. REMOVE MESSAGES (.msg remove <@user> <amount> or .removemessages <@user> <amount>)
    // ─────────────────────────────────────────
    if (invoked === 'removemessages' || sub === 'remove' || sub === 'rm') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can modify user message counts.`);
      }

      const startIndex = invoked === 'removemessages' ? 0 : 1;
      const target = message.mentions.users.first() || (args[startIndex] ? await message.client.users.fetch(args[startIndex]).catch(() => null) : null);
      const amountStr = message.mentions.users.first() ? args[startIndex + 1] : args[startIndex + 1] || args[startIndex];
      const amount = parseInt(amountStr, 10);

      if (!target || isNaN(amount)) {
        return message.reply(`⚠️ Usage: \`.msg remove <@user|userId> <amount>\` (Example: \`.msg remove @user 50\`)`);
      }

      const delta = -Math.abs(amount);
      db.addMessage(target.id, delta);
      const userData = db.getUser(target.id);

      const boxText =
        '```\n' +
        createDynamicBox('MESSAGE STATS UPDATED', [
          'Action   : Remove Messages',
          'Target   : ' + String(target.username).slice(0, 12),
          'Amount   : -' + String(Math.abs(amount)) + ' Msgs',
          'New Total: ' + String(userData.messages) + ' Msgs'
        ]) +
        '\n```';

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS || '✅'} Message Count Reduced`,
        description: boxText,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 4. CLEAR MESSAGES (.msg clear [@user] or .clearmsgs [@user])
    // ─────────────────────────────────────────
    if (invoked === 'clearmsgs' || sub === 'clear' || sub === 'reset') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
        return message.reply(`⚠️ Only Administrators can clear message stats.`);
      }
      const target = message.mentions.users.first();
      db.clearMessages(target ? target.id : null);

      const boxText =
        '```\n' +
        createDynamicBox('MESSAGE STATS CLEARED', [
          'Scope  : ' + (target ? String(target.username).slice(0, 12) : 'Entire Server'),
          'Status : Reset to 0 Msgs'
        ]) +
        '\n```';

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS || '🧹'} Message Stats Cleared`,
        description: boxText,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 5. MAIN MESSAGE TRACKING DASHBOARD (.msg)
    // ─────────────────────────────────────────
    const infoBox = createDynamicBox('SHINOBI MESSAGE TRACKING SUITE', [
      `Module    : Message Stats & Filter Suite`,
      `Authority : Admin & Hokage Management`,
      `Commands  : Executive Tracking Tools`
    ]);

    const cmdBox = createDynamicBox('MESSAGE STATS MODIFIERS', [
      '.msg add <@user> <count>   : Add messages',
      '.msg remove <@user> <cnt>  : Remove messages',
      '.msg clear [@user]         : Clear user/server stats'
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
};
