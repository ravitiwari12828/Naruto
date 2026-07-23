const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { isBotOwner } = require('../utils/owners');

module.exports = {
  name: 'owner',
  description: 'Dedicated Bot Owner Panel & Hub: Premium, No-Prefix, Server Lockdown, Extra Owner & PanicMode',
  aliases: ['owners', 'ownermenu', 'ownerhelp', 'botowner'],

  async execute(message, args) {
    const author = message.author;
    const client = message.client;

    if (!isBotOwner(author, client)) {
      return message.reply(`${emojis.WARNING} Access Denied: Only **Bot Owners** and **Extra Owners** can access the Owner Control Panel.`);
    }

    let clientUser = client.user;
    try {
      clientUser = await client.users.fetch(client.user.id, { force: true });
    } catch (e) {}

    const embed = createStyledEmbed({
      title: `👑 Bot Owner Executive Control Panel`,
      subtitle: `Bot Owner & System Administration Hub`,
      description:
        `Welcome **${author.username}**! Below is your executive management suite containing all owner-level controls:\n\n` +
        `💎 **Premium Management**\n` +
        `• \`.premium activate <guildId>\` — Activate Premium for server\n` +
        `• \`.premium revoke <guildId>\` — Revoke Premium from server\n` +
        `• \`.premium adduser @user\` — Grant user Lifetime VIP Premium\n` +
        `• \`.premium revokeuser @user\` — Revoke user VIP Premium\n` +
        `• \`.premium status\` — View active Premium servers & VIP users\n\n` +
        `⚡ **No-Prefix Authorization**\n` +
        `• \`.noprefix add @user\` — Grant No-Prefix command execution\n` +
        `• \`.noprefix remove @user\` — Revoke No-Prefix access\n` +
        `• \`.noprefix list\` — View all No-Prefix authorized users\n\n` +
        `🔒 **Private Lockdown & Server Whitelist**\n` +
        `• \`.botlock enable/disable\` — Toggle private server lockdown mode\n` +
        `• \`.botlock add <guildId>\` — Authorize server to use bot\n` +
        `• \`.botlock remove <guildId>\` — Revoke server authorization\n` +
        `• \`.botlock list\` — View whitelisted servers\n\n` +
        `👑 **Extra Owner & Security Delegation**\n` +
        `• \`.extraowner add @user\` — Grant Extra Owner status\n` +
        `• \`.extraowner remove @user\` — Revoke Extra Owner status\n` +
        `• \`.extraowner list\` — View Extra Owners\n\n` +
        `🚨 **Emergency Panic Mode & Executive Mass Deletion**\n` +
        `• \`.panicmode enable\` — Trigger server-wide emergency lockdown\n` +
        `• \`.nukeroles\` — Bulk delete all server roles\n` +
        `• \`.nukechannels\` — Bulk delete all channels\n` +
        `• \`.nukeserver\` — Reset server (bulk delete all roles & channels)`,
      fields: [
        { name: '📊 Operational Quick Links', value: `\`.stats\` • \`.analytics server\` • \`.advlogsetup\``, inline: false }
      ],
      thumbnailUrl: author.displayAvatarURL({ dynamic: true, size: 512 }),
      requestedBy: author,
      clientUser
    });

    return message.channel.send({ embeds: [embed] });
  }
};
