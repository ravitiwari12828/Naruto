const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'enlarge',
  description: 'Enlarge any custom Discord emoji or sticker with a high-resolution download link button',
  aliases: ['e', 'bigemoji', 'jumbo', 'steal', 'emojiicon', 'emojienlarge'],

  async execute(message, args) {
    let targetEmojiStr = args[0];

    // Check if user replied to a message containing emojis/stickers
    if (!targetEmojiStr && message.reference) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMsg) {
          if (repliedMsg.content) {
            const matches = repliedMsg.content.match(/<a?:[a-zA-Z0-9_]+:\d{17,20}>/g);
            if (matches && matches.length > 0) targetEmojiStr = matches[0];
          }
          if (!targetEmojiStr && repliedMsg.stickers && repliedMsg.stickers.size > 0) {
            const sticker = repliedMsg.stickers.first();
            targetEmojiStr = sticker.url;
          }
        }
      } catch (e) {}
    }

    if (!targetEmojiStr && message.stickers && message.stickers.size > 0) {
      const sticker = message.stickers.first();
      targetEmojiStr = sticker.url;
    }

    if (!targetEmojiStr) {
      return message.reply(`${emojis.WARNING || '⚠️'} Please provide a custom emoji or reply to a message with an emoji to enlarge!\n> Example: \`.enlarge :custom_emoji:\``);
    }

    // Parse custom Discord Emoji format: <a:name:id> or <:name:id>
    const emojiMatch = targetEmojiStr.match(/<a?:([a-zA-Z0-9_]+):(\d{17,20})>/);

    let emojiName = 'Custom Emoji';
    let emojiUrl = null;
    let isAnimated = false;

    if (emojiMatch) {
      emojiName = emojiMatch[1];
      const emojiId = emojiMatch[2];
      isAnimated = targetEmojiStr.startsWith('<a:');
      const ext = isAnimated ? 'gif' : 'png';
      emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=1024&quality=lossless`;
    } else if (targetEmojiStr.startsWith('http://') || targetEmojiStr.startsWith('https://')) {
      emojiName = 'Custom Image';
      emojiUrl = targetEmojiStr;
    }

    if (!emojiUrl) {
      return message.reply(`${emojis.WARNING || '⚠️'} Invalid custom emoji format. Make sure to use a custom server emoji or image URL.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setColor(0x00DCFF)
      .setTitle(`Emoji: ${emojiName}`)
      .setImage(emojiUrl)
      .setFooter({ text: `${message.client.user.username} • Enlarge Suite`, iconURL: message.client.user.displayAvatarURL() });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Download Image')
        .setURL(emojiUrl)
        .setStyle(ButtonStyle.Link)
    );

    return message.reply({ embeds: [embed], components: [row] });
  }
};
