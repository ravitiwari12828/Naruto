const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { parseDurationMs, formatExpiryText } = require('./noprefix');
const { createDynamicBox } = require('../utils/boxBuilder');
const db = require('../database/db');

// Global Premium Stores (ID -> expiresAt | null for Infinite)
const premiumGuilds = new Map();
const premiumUsers = new Map([
  ['1420687548807905324', null],
  [ null],
  
  ]);

// Temporary draft state for appearance customization before Save
const appearanceDrafts = new Map();

function isGuildPremium(guildId) {
  if (!premiumGuilds.has(guildId)) return false;
  const exp = premiumGuilds.get(guildId);
  if (exp === null || exp === undefined) return true;
  if (exp > Date.now()) return true;
  premiumGuilds.delete(guildId);
  return false;
}

function isUserPremium(userId) {
  if (!premiumUsers.has(userId)) return false;
  const exp = premiumUsers.get(userId);
  if (exp === null || exp === undefined) return true;
  if (exp > Date.now()) return true;
  premiumUsers.delete(userId);
  return false;
}

function buildAppearanceDashboard(guild, draft, author, clientUser) {
  const nickname = draft.nickname || guild.members.me?.nickname || clientUser.username;
  const bio = draft.bio || 'Naruto Shinobi Bot Active';
  const avatarStatus = draft.avatar ? 'Custom Image [Pending Save]' : (clientUser.avatar ? 'Custom Avatar' : 'Default Avatar');
  const bannerStatus = draft.banner ? 'Custom Banner [Pending Save]' : 'Default Banner';

  const box = createDynamicBox('BOT APPEARANCE SUITE', [
    { key: 'Nickname', value: nickname.slice(0, 16) },
    { key: 'StatusBio', value: bio.slice(0, 16) },
    { key: 'Avatar  ', value: avatarStatus.slice(0, 16) },
    { key: 'Banner  ', value: bannerStatus.slice(0, 16) },
    { key: 'Tier    ', value: 'PREMIUM VIP' }
  ]);

  const embed = createStyledEmbed({
    title: `<a:paint_animated:1537177457403363389> Bot Appearance Customization Suite`,
    subtitle: `${guild.name} • Premium Feature`,
    description:
      '```\n' + box + '\n```\n\n' +
      `• **Set Nickname:** \`.botnickname <text>\` or \`.premium nickname <text>\`\n` +
      `• **Set Status Bio:** \`.botbio <text>\` or \`.premium bio <text>\`\n` +
      `• **Set Avatar:** \`.setavatar <imageURL/attachment>\`\n` +
      `• **Set Banner:** \`.setbanner <imageURL/attachment>\`\n\n` +
      `*Use the interactive buttons below to **Save**, **Refresh**, or **Reset** appearance settings!*`,
    requestedBy: author,
    clientUser
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('app_save')
      .setLabel('Save Settings')
      .setEmoji('💾')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('app_refresh')
      .setLabel('Refresh Profile')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('app_reset')
      .setLabel('Reset Defaults')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  name: 'premium',
  description: 'Premium Suite: Activate Guild, Add VIP User, Bot Appearance (Bio, Avatar, Banner, Nickname, Save/Refresh/Reset)',
  aliases: [
    'vip', 'donator', 'premiumguild', 'premiumuser',
    'botappearance', 'appearance', 'setavatar', 'botavatar',
    'setbanner', 'botbanner', 'setbio', 'botbio',
    'setnickname', 'botnickname', 'resetappearance'
  ],
  premiumGuilds,
  premiumUsers,
  isGuildPremium,
  isUserPremium,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'premiumguild') sub = 'guild';
    if (invoked === 'botappearance' || invoked === 'appearance') sub = 'appearance';
    if (invoked === 'setavatar' || invoked === 'botavatar') sub = 'avatar';
    if (invoked === 'setbanner' || invoked === 'botbanner') sub = 'banner';
    if (invoked === 'setbio' || invoked === 'botbio') sub = 'bio';
    if (invoked === 'setnickname' || invoked === 'botnickname') sub = 'nickname';
    if (invoked === 'resetappearance') sub = 'reset';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const { isBotOwner } = require('../utils/owners');
    const isOwner = isBotOwner(author, message.client);

    // ─────────────────────────────────────────
    // BOT APPEARANCE CUSTOMIZATION SUITE (PREMIUM FEATURE)
    // ─────────────────────────────────────────
    if (['appearance', 'avatar', 'banner', 'bio', 'nickname', 'save', 'refresh', 'reset'].includes(sub)) {
      const hasAccess = isOwner || isGuildPremium(guild.id) || isUserPremium(author.id);
      if (!hasAccess) {
        return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537177373613629542>'} **Premium Required!** Bot Appearance Customization (Avatar, Banner, Bio & Nickname) requires **Premium Tier**! Type \`.premium status\` to check eligibility.`);
      }

      const storedApp = db.getGuildAppearance(guild.id);

      if (!appearanceDrafts.has(guild.id)) {
        appearanceDrafts.set(guild.id, {
          nickname: storedApp.nickname || guild.members.me?.nickname || '',
          bio: storedApp.bio || '',
          avatar: storedApp.avatar || null,
          banner: storedApp.banner || null
        });
      }

      const draft = appearanceDrafts.get(guild.id);

      // 1. SET NICKNAME (.botnickname <name> / .premium nickname <name>)
      if (sub === 'nickname') {
        const newNick = args.slice(invoked.startsWith('set') || invoked.startsWith('bot') ? 0 : 1).join(' ');
        if (!newNick) return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537177373613629542>'} Please specify a nickname! Usage: \`.botnickname <name>\``);

        draft.nickname = newNick;
        db.setGuildAppearance(guild.id, { nickname: newNick });
        try {
          if (guild.members.me?.permissions.has('ChangeNickname')) {
            await guild.members.me.setNickname(newNick);
          }
        } catch (e) {}

        return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Server bot nickname updated to **"${newNick}"**! Click **Save Settings** in \`.botappearance\` to confirm.`);
      }

      // 2. SET BIO (.botbio <text> / .premium bio <text>)
      if (sub === 'bio') {
        const newBio = args.slice(invoked.startsWith('set') || invoked.startsWith('bot') ? 0 : 1).join(' ');
        if (!newBio) return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537177373613629542>'} Please specify a status bio! Usage: \`.botbio <text>\``);

        draft.bio = newBio;
        db.setGuildAppearance(guild.id, { bio: newBio });

        return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} Server bot status bio updated to **"${newBio}"**!`);
      }

      // 3. SET AVATAR (.setavatar <URL/Attachment>)
      if (sub === 'avatar') {
        const messageAttachment = message.attachments?.first();
        let refAttachment = null;
        if (!messageAttachment && message.reference) {
          try {
            const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            refAttachment = refMsg?.attachments?.first();
          } catch (e) {}
        }
        const attachment = messageAttachment || refAttachment;

        let imgUrl = attachment ? attachment.url : (invoked === 'setavatar' || invoked === 'botavatar' ? args[0] : args[1]);

        if (!imgUrl && message.mentions?.users?.first()) {
          imgUrl = message.mentions.users.first().displayAvatarURL({ extension: 'png', size: 1024 });
        }

        if (!imgUrl) return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537177373613629542>'} Provide an image URL, attach an image, or reply to an image! Usage: \`.setavatar <imageURL/attachment>\``);

        draft.avatar = imgUrl;
        db.setGuildAppearance(guild.id, { avatar: imgUrl });

        let setStatus = 'Saved in server database!';

        try {
          if (guild.members.me && typeof guild.members.me.edit === 'function') {
            await guild.members.me.edit({ avatar: imgUrl });
            setStatus = 'Updated for this server live on Discord!';
          }
        } catch (err) {
          setStatus = `Saved in bot DB! *(Note: ${err.message})*`;
        }

        if (isOwner) {
          try {
            await message.client.user.setAvatar(imgUrl);
            setStatus += ' *(Also updated live on Global Bot Profile!)*';
          } catch (err) {
            setStatus += ` *(Global update note: ${err.message})*`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`${emojis.SUCCESS || '✅'} Bot Avatar Updated`)
          .setDescription(`Bot avatar image updated for **${guild.name}**!\n> **Status:** ${setStatus}`)
          .setThumbnail(imgUrl);

        return message.reply({ embeds: [embed] });
      }

      // 4. SET BANNER (.setbanner <URL/Attachment>)
      if (sub === 'banner') {
        const messageAttachment = message.attachments?.first();
        let refAttachment = null;
        if (!messageAttachment && message.reference) {
          try {
            const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            refAttachment = refMsg?.attachments?.first();
          } catch (e) {}
        }
        const attachment = messageAttachment || refAttachment;

        let imgUrl = attachment ? attachment.url : (invoked === 'setbanner' || invoked === 'botbanner' ? args[0] : args[1]);

        if (!imgUrl) return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537177373613629542>'} Provide a banner image URL, attach an image, or reply to an image! Usage: \`.setbanner <imageURL/attachment>\``);

        draft.banner = imgUrl;
        db.setGuildAppearance(guild.id, { banner: imgUrl });

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`${emojis.SUCCESS || '✅'} Server Bot Banner Saved`)
          .setDescription(`Server bot banner updated for **${guild.name}**!`)
          .setImage(imgUrl);

        return message.reply({ embeds: [embed] });
      }

      // 5. RESET APPEARANCE (.resetappearance / .premium reset)
      if (sub === 'reset') {
        draft.nickname = '';
        draft.bio = '';
        draft.avatar = null;
        draft.banner = null;
        db.setGuildAppearance(guild.id, { nickname: '', bio: '', avatar: null, banner: null });

        try {
          if (guild.members.me?.permissions.has('ChangeNickname')) {
            await guild.members.me.setNickname(null);
          }
        } catch (e) {}

        return message.reply(`${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **SERVER BOT APPEARANCE RESET!** Restored default nickname, avatar, banner, and bio for **${guild.name}**.`);
      }

      // 6. DASHBOARD MAIN INTERACTIVE PANEL (.botappearance / .appearance)
      const payload = buildAppearanceDashboard(guild, draft, author, clientUser);
      const dashboardMsg = await message.channel.send(payload);

      // Create Interactive Collector for Save, Refresh, and Reset Buttons
      const collector = dashboardMsg.createMessageComponentCollector({
        filter: i => i.user.id === author.id,
        time: 180000
      });

      collector.on('collect', async i => {
        if (i.customId === 'app_save') {
          // SAVE & APPLY ALL SETTINGS PER GUILD
          try {
            db.setGuildAppearance(guild.id, {
              nickname: draft.nickname,
              bio: draft.bio,
              avatar: draft.avatar,
              banner: draft.banner
            });
            if (draft.nickname && guild.members.me?.permissions.has('ChangeNickname')) {
              await guild.members.me.setNickname(draft.nickname).catch(() => {});
            }
            await i.reply({ content: `${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Server bot appearance settings saved and active for ${guild.name}!** *(Original global bot account is untouched)*.`, flags: 64, ephemeral: true });
          } catch (err) {
            await i.reply({ content: `<a:wrong_animated:1537179702928875631> Error applying settings: ${err.message}`, flags: 64, ephemeral: true });
          }
        } else if (i.customId === 'app_refresh') {
          // REFRESH BOT PROFILE STATUS
          const updatedUser = await message.client.users.fetch(message.client.user.id, { force: true }).catch(() => clientUser);
          const updatedPayload = buildAppearanceDashboard(guild, draft, author, updatedUser);
          await i.update(updatedPayload).catch(() => {});
        } else if (i.customId === 'app_reset') {
          // RESET DEFAULTS
          draft.nickname = '';
          draft.bio = '';
          draft.avatar = null;
          draft.banner = null;
          db.setGuildAppearance(guild.id, { nickname: '', bio: '', avatar: null, banner: null });

          try {
            if (guild.members.me?.permissions.has('ChangeNickname')) {
              await guild.members.me.setNickname(null).catch(() => {});
            }
          } catch (e) {}

          const updatedPayload = buildAppearanceDashboard(guild, draft, author, clientUser);
          await i.update(updatedPayload).catch(() => {});
        }
      });

      return;
    }

    // 1. PREMIUM ACTIVATE GUILD (.premium guild [guildId] [duration])
    if (sub === 'activate' || sub === 'addguild' || sub === 'guild' || sub === 'server') {
      if (!isOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can activate Premium for servers.`);

      const targetGuildId = (args[1] && !args[1].match(/^[0-9]+[dhmyw]$/i) && args[1] !== 'infinite') ? args[1] : guild.id;
      const durationArg = args[2] || (args[1] && args[1] !== targetGuildId ? args[1] : 'infinite');
      const durationMs = parseDurationMs(durationArg);

      const expiresAt = durationMs ? (Date.now() + durationMs) : null;
      premiumGuilds.set(targetGuildId, expiresAt);

      const expiryText = formatExpiryText(expiresAt);

      const box = createDynamicBox('PREMIUM ACTIVATED', [
        { key: 'Server ID', value: targetGuildId },
        { key: 'Duration ', value: expiryText },
        { key: 'Status   ', value: 'ACTIVE (PREMIUM TIER)' },
        { key: 'Perks    ', value: 'Bot Appearance, 2x XP, Priority AI' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.PREMIUM || '<a:dimond_animated:1537177370719551498>'} Premium Activated for Guild`,
        description:
          `Server ID **\`${targetGuildId}\`** is now upgraded to **Premium Tier**!\n\n` +
          '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. PREMIUM REVOKE GUILD (.premium revoke <guildId>)
    if (sub === 'revoke' || sub === 'removeguild') {
      if (!isOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can revoke Premium from servers.`);

      const targetGuildId = args[1] || guild.id;
      premiumGuilds.delete(targetGuildId);

      const box = createDynamicBox('PREMIUM REVOKED', [
        { key: 'Server ID', value: targetGuildId },
        { key: 'Status   ', value: 'REVOKED (STANDARD TIER)' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.WARNING} Premium Revoked from Guild`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 3. PREMIUM ADD USER (.premium adduser @user [duration])
    if (sub === 'adduser' || sub === 'add') {
      if (!isOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can grant user Premium.`);

      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.premium adduser @user [30d / infinite]\``);

      const durationArg = args[2] || 'infinite';
      const durationMs = parseDurationMs(durationArg);

      const expiresAt = durationMs ? (Date.now() + durationMs) : null;
      premiumUsers.set(user.id, expiresAt);

      const expiryText = formatExpiryText(expiresAt);

      const box = createDynamicBox('USER VIP ACTIVATED', [
        { key: 'Username', value: user.username.slice(0, 14) },
        { key: 'Duration', value: expiryText },
        { key: 'Status  ', value: 'ACTIVE (VIP USER)' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.PREMIUM || '<a:dimond_animated:1537177370719551498>'} Premium VIP Granted — ${user.username}`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 4. PREMIUM REVOKE USER (.premium revokeuser @user)
    if (sub === 'revokeuser' || sub === 'removeuser') {
      if (!isOwner) return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can revoke user Premium.`);

      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.premium revokeuser @user\``);

      premiumUsers.delete(user.id);
      return message.reply(`${emojis.WARNING} **${user.username}** premium status has been revoked.`);
    }

    // 5. PREMIUM STATUS / CHECK (.premium status)
    if (sub === 'status' || sub === 'check') {
      const isGuildPrem = isGuildPremium(guild.id);
      const isUserPrem = isUserPremium(author.id);

      const guildExp = premiumGuilds.get(guild.id);
      const userExp = premiumUsers.get(author.id);

      const box = createDynamicBox('PREMIUM STATUS DASHBOARD', [
        { key: 'Server Status', value: isGuildPrem ? 'PREMIUM (ACTIVE)' : 'STANDARD TIER' },
        { key: 'Server Expiry', value: formatExpiryText(guildExp) },
        { key: 'User VIP     ', value: isUserPrem ? 'VIP (ACTIVE)' : 'STANDARD USER' },
        { key: 'User Expiry  ', value: formatExpiryText(userExp) },
        { key: 'Total Guilds ', value: String(premiumGuilds.size) + ' servers' },
        { key: 'Total Users  ', value: String(premiumUsers.size) + ' users' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.PREMIUM || '<a:dimond_animated:1537177370719551498>'} Premium Status Dashboard`,
        description: '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Help Guide
    const box = createDynamicBox('PREMIUM SUITE GUIDE', [
      '.botappearance       : Interactive Appearance Dashboard',
      '.setnickname <name>  : Set Guild Bot Nickname',
      '.setbio <text>       : Set Bot Status Bio',
      '.setavatar <imageURL>: Set Bot Profile Avatar',
      '.setbanner <imageURL>: Set Bot Profile Banner',
      '.resetappearance     : Reset Bot Appearance',
      '.premium activate    : Upgrade Server to Premium'
    ]);

    const embed = createStyledEmbed({
      title: `${emojis.PREMIUM || '<a:dimond_animated:1537177370719551498>'} Premium Management Suite`,
      description: '```\n' + box + '\n```',
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
