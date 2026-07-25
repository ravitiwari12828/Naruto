const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

const SUPPORT_SERVER_INVITE = 'https://discord.gg/ZPKcPreUMT';

module.exports = {
  name: 'support',
  description: 'Official Support Server invite link and bot help center',
  aliases: ['invite', 'supportserver', 'server', 'community'],

  async execute(message, args) {
    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const embed = createStyledEmbed({
      title: `🍥 Naruto One Support & Community Server`,
      subtitle: `Official Headquarters & Help Center`,
      description:
        `Need help with bot setup, AntiNuke configuration, VoiceMaster, ModMail, or custom emojis?\n\n` +
        `Join our official support community server for instant 24/7 staff assistance, updates & giveaways!\n\n` +
        `🔗 **Official Support Link**: [discord.gg/ZPKcPreUMT](${SUPPORT_SERVER_INVITE})`,
      requestedBy: message.author,
      clientUser
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Support Server')
        .setURL(SUPPORT_SERVER_INVITE)
        .setStyle(ButtonStyle.Link)
        .setEmoji('💬'),
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands`)
        .setStyle(ButtonStyle.Link)
        .setEmoji('🤖')
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
};
