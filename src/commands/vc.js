const { PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');

module.exports = {
  name: 'vc',
  description: 'Shinobi Voice Tracking Suite: .vc, .vc add, .vc remove, .vc clear, .vc allowed view',
  aliases: ['voiced', 'vctime', 'addvctime', 'reducevctime', 'clearvoice', 'vcd', 'vfilter', 'vblacklist', 'vwhitelist', 'vchelp'],

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
    // 0. VOICEMASTER TEMP VC HELP (.vc help / .vchelp)
    // ─────────────────────────────────────────
    if (invoked === 'vchelp' || sub === 'help' || sub === 'h' || sub === 'menu') {
      const voicemasterCmd = message.client.commands.get('voicemaster');
      if (voicemasterCmd && typeof voicemasterCmd.buildVoiceHelpEmbed === 'function') {
        const embed = voicemasterCmd.buildVoiceHelpEmbed(message.member);
        return message.channel.send({ embeds: [embed] });
      }
    }

    // Forward VoiceMaster temp channel subcommands (.vc transfer, .vc claim, .vc name, .vc lock, etc.)
    const vmSubcommands = [
      'transfer', 'claim', 'name', 'rename', 'size', 'limit', 'lock', 'unlock',
      'ghost', 'hide', 'unghost', 'unhide', 'reveal', 'permit', 'allow', 'unpermit',
      'revoke', 'kick', 'vckick', 'ban', 'unban', 'activity', 'info', 'settings'
    ];

    if (vmSubcommands.includes(sub)) {
      const voiceCmd = message.client.commands.get('voice');
      if (voiceCmd && typeof voiceCmd.execute === 'function') {
        return voiceCmd.execute(message, args);
      }
    }

    // Determine if user is running .vblacklist / .vwhitelist or .vc vblacklist / .vc vwhitelist
    const isFilterCmd = ['vblacklist', 'vwhitelist'].includes(invoked) || ['vblacklist', 'vwhitelist', 'blacklist', 'whitelist'].includes(sub);

    if (isFilterCmd) {
      const mode = (invoked === 'vblacklist' || sub === 'vblacklist' || sub === 'blacklist') ? 'vblacklist' : 'vwhitelist';
      const fullTokens = [invoked, ...args].map(x => (x || '').toLowerCase());

      let targetType = null;
      if (fullTokens.includes('category')) targetType = 'category';
      else if (fullTokens.includes('channel')) targetType = 'channel';

      let action = null;
      if (fullTokens.includes('add')) action = 'add';
      else if (fullTokens.includes('remove') || fullTokens.includes('del') || fullTokens.includes('delete')) action = 'remove';

      if (targetType && action) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
          return message.reply(`⚠️ Only Administrators can manage voice channel & category filters.`);
        }

        const config = db.getAutomod(guild.id);
        if (!config.ignoredVoiceChannels) config.ignoredVoiceChannels = [];
        if (!config.whitelistedVoiceChannels) config.whitelistedVoiceChannels = [];
        if (!config.ignoredVoiceCategories) config.ignoredVoiceCategories = [];
        if (!config.whitelistedVoiceCategories) config.whitelistedVoiceCategories = [];

        const mentionChan = message.mentions?.channels && typeof message.mentions.channels.first === 'function' ? message.mentions.channels.first() : null;
        const targetInput = mentionChan ? mentionChan.id : args[args.length - 1];

        let targetId = null;
        let targetName = '';

        if (targetType === 'channel') {
          const chan = mentionChan || (guild.channels?.cache?.get ? guild.channels.cache.get(targetInput) : null);
          if (!chan) return message.reply(`⚠️ Please mention a valid voice channel or provide a channel ID.`);
          targetId = chan.id;
          targetName = chan.name;
        } else {
          const catId = targetInput?.replace(/[<#>]/g, '');
          if (!catId) return message.reply(`⚠️ Please provide a valid category ID.`);
          const category = guild.channels?.cache?.get ? guild.channels.cache.get(catId) : null;
          targetId = catId;
          targetName = category ? category.name : catId;
        }

        const isAdd = action === 'add';
        const arrName = mode === 'vblacklist'
          ? (targetType === 'channel' ? 'ignoredVoiceChannels' : 'ignoredVoiceCategories')
          : (targetType === 'channel' ? 'whitelistedVoiceChannels' : 'whitelistedVoiceCategories');

        let targetArray = config[arrName] || [];

        if (isAdd) {
          if (!targetArray.includes(targetId)) targetArray.push(targetId);
        } else {
          config[arrName] = targetArray.filter(id => id !== targetId);
        }

        db.saveJSON();

        const boxText =
          '```\n' +
          createDynamicBox('VOICE FILTER UPDATED', [
            'Filter   : ' + mode.toUpperCase() + ' ' + targetType.toUpperCase(),
            'Action   : ' + (isAdd ? 'Added' : 'Removed'),
            'Target   : ' + String(targetName).slice(0, 12),
            'ID       : ' + String(targetId)
          ]) +
          '\n```';

        const embed = createStyledEmbed({
          title: `${isAdd ? '🚫' : '✅'} Voice Filter Updated`,
          description: boxText,
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [embed] });
      }
    }

    // ─────────────────────────────────────────
    // 2. ALLOWED / FILTER VIEW (.vc allowed view / .vcd allowed view / .vcd)
    // ─────────────────────────────────────────
    if (
      (sub === 'allowed' || sub === 'filter' || sub === 'view' || sub === 'list') ||
      (invoked === 'vcd' && (sub === 'allowed' || sub === 'view' || sub === 'list' || !sub)) ||
      (isFilterCmd && (sub === 'view' || sub === 'list' || sub2 === 'view' || sub2 === 'list' || (!sub2 && invoked !== 'vc')))
    ) {
      const config = db.getAutomod(guild.id);
      const blVc = config.ignoredVoiceChannels || [];
      const wlVc = config.whitelistedVoiceChannels || [];
      const blVcCats = config.ignoredVoiceCategories || [];
      const wlVcCats = config.whitelistedVoiceCategories || [];

      const totalBl = blVc.length + blVcCats.length;
      const totalWl = wlVc.length + wlVcCats.length;

      if (totalBl === 0 && totalWl === 0) {
        const boxText =
          '```\n' +
          createDynamicBox('VOICE TRACKING FILTERS', [
            'Server  : ' + String(guild.name).slice(0, 12),
            'Status  : No Voice Channels Blacklisted/WL',
            'Tracking: All voice channels active'
          ]) +
          '\n```';

        const embed = createStyledEmbed({
          title: `${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} Voice Channel Filter View`,
          description: boxText + '\n\n• **No channels or categories are whitelisted or blacklisted.** All voice channels are currently being tracked for voice time activity.',
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } else {
        const boxText =
          '```\n' +
          createDynamicBox('VOICE TRACKING FILTERS', [
            'Blacklisted : ' + String(blVc.length) + ' VCs, ' + String(blVcCats.length) + ' Cats',
            'Whitelisted : ' + String(wlVc.length) + ' VCs, ' + String(wlVcCats.length) + ' Cats'
          ]) +
          '\n```';

        let details = '';
        if (blVc.length > 0) details += `\n🚫 **Blacklisted Voice Channels:** ${blVc.map(id => `<#${id}>`).join(', ')}`;
        if (blVcCats.length > 0) details += `\n🚫 **Blacklisted Voice Categories:** ${blVcCats.map(id => `\`${id}\``).join(', ')}`;
        if (wlVc.length > 0) details += `\n✅ **Whitelisted Voice Channels:** ${wlVc.map(id => `<#${id}>`).join(', ')}`;
        if (wlVcCats.length > 0) details += `\n✅ **Whitelisted Voice Categories:** ${wlVcCats.map(id => `\`${id}\``).join(', ')}`;

        const embed = createStyledEmbed({
          title: `${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} Voice Channel Filter View`,
          description: boxText + details,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    // ─────────────────────────────────────────
    // 3. ADD VOICE TIME (.vc add <@user> <mins> or .addvctime <@user> <mins>)
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
    // 4. REDUCE VOICE TIME (.vc remove <@user> <mins> or .reducevctime <@user> <mins>)
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
    // 5. CLEAR VOICE TIME (.vc clear [@user] or .clearvoice [@user])
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
    // 6. MAIN VOICE TRACKING DASHBOARD (.vc)
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
      title: `${emojis.VOICE || '<a:microphone_animated:1537177439527112755>'} Shinobi Voice Tracking Panel`,
      subtitle: `Admin Voice Minutes Management & VC Filters`,
      description:
        '```\n' + infoBox + '\n```\n\n' +
        `${emojis.ANALYTICS_ZAP || '<a:settings_animated:1537177506170404905>'} **Voice Time Modifiers**\n` +
        '```\n' + cmdBox + '\n```\n\n' +
        `${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} **Voice Channel & Category Filters**\n` +
        '```\n' + filterBox + '\n```',
      requestedBy: author,
      clientUser
    });

    return message.channel.send({ embeds: [embed] });
  }
};
