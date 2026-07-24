const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
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

    const botAvatar = clientUser.displayAvatarURL({ dynamic: true, size: 512 });
    const devPortalBanner = client.botBannerURL || null;

    const embed = new EmbedBuilder()
      .setColor(0x00E5FF)
      .setAuthor({ name: 'Naruto Executive Suite', iconURL: botAvatar })
      .setThumbnail(botAvatar)
      .setTitle(`${emojis.OWNER_CROWN} Bot Owner Executive Commands`)
      .setDescription(
        `Welcome **${author.username}**! Below is your executive management suite for **Bot Owner Controls**.\n` +
        `Type any command below in your server to execute.\n\n` +
        `**${emojis.PREMIUM} Premium Management**\n` +
        `\`\`\`\n` +
        `.premium activate <guildId>\n` +
        `.premium revoke <guildId>\n` +
        `.premium adduser @user\n` +
        `.premium revokeuser @user\n` +
        `.premium status\n` +
        `\`\`\`\n\n` +
        `**${emojis.ANALYTICS_ZAP} No-Prefix Authorization**\n` +
        `\`\`\`\n` +
        `.noprefix add @user\n` +
        `.noprefix remove @user\n` +
        `.noprefix list\n` +
        `\`\`\`\n\n` +
        `**${emojis.LOCK} Private Lockdown & Whitelist**\n` +
        `\`\`\`\n` +
        `.botlock enable\n` +
        `.botlock disable\n` +
        `.botlock add <guildId>\n` +
        `.botlock remove <guildId>\n` +
        `.botlock list\n` +
        `\`\`\`\n\n` +
        `**${emojis.OWNER_CROWN} Extra Owner & Security Delegation**\n` +
        `\`\`\`\n` +
        `.extraowner add @user\n` +
        `.extraowner remove @user\n` +
        `.extraowner list\n` +
        `\`\`\`\n\n` +
        `**${emojis.ANTINUKE} Emergency Panic & Executive Mass Deletion**\n` +
        `\`\`\`\n` +
        `.panicmode enable\n` +
        `.panicmode disable\n` +
        `.panicmode set <1-3>\n` +
        `.nukeroles\n` +
        `.nukechannels\n` +
        `.nukeserver\n` +
        `\`\`\``
      )
      .setFooter({
        text: `Requested by ${author.username} • Executive Owner Controls`,
        iconURL: author.displayAvatarURL({ dynamic: true })
      });

    if (devPortalBanner) embed.setImage(devPortalBanner);

    return message.channel.send({ embeds: [embed] });
  }
};
