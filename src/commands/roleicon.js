const {
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'roleicon',
  description: 'Set or update a custom icon image/emoji for a server role',
  aliases: ['setroleicon', 'seticon', 'ricon'],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply(`${emojis.WARNING || '⚠️'} Only staff with **Manage Roles** permission can set role icons.`);
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply(`${emojis.WARNING || '⚠️'} I need **Manage Roles** permission to update role icons.`);
    }

    const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

    if (!targetRole) {
      return message.reply(`${emojis.WARNING || '⚠️'} Please mention a valid role or provide a Role ID!\n> Example: \`.roleicon @Role <emoji / image_attachment / URL>\``);
    }

    let iconUrl = null;

    // 1. Check Image Attachment Upload
    if (message.attachments.size > 0) {
      iconUrl = message.attachments.first().url;
    }

    // 2. Check Custom Emoji Argument
    if (!iconUrl && args[1]) {
      const emojiMatch = args[1].match(/<a?:[a-zA-Z0-9_]+:(\d{17,20})>/);
      if (emojiMatch) {
        const emojiId = emojiMatch[1];
        const isAnimated = args[1].startsWith('<a:');
        const ext = isAnimated ? 'gif' : 'png';
        iconUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;
      } else if (args[1].startsWith('http://') || args[1].startsWith('https://')) {
        iconUrl = args[1];
      }
    }

    // 3. Check Replied Message Attachments or Emojis
    if (!iconUrl && message.reference) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMsg) {
          if (repliedMsg.attachments.size > 0) {
            iconUrl = repliedMsg.attachments.first().url;
          } else if (repliedMsg.content) {
            const matches = repliedMsg.content.match(/<a?:[a-zA-Z0-9_]+:(\d{17,20})>/);
            if (matches && matches.length > 0) {
              const emojiId = matches[0].match(/\d{17,20}/)[0];
              const ext = matches[0].startsWith('<a:') ? 'gif' : 'png';
              iconUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;
            }
          }
        }
      } catch (e) {}
    }

    if (!iconUrl) {
      return message.reply(`${emojis.WARNING || '⚠️'} Please provide a custom emoji, attach an image, or provide an image URL to set as the role icon.`);
    }

    try {
      // Set role icon in Discord Server
      await targetRole.setIcon(iconUrl, `Role icon updated by ${message.author.tag}`);

      const successEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`${emojis.SUCCESS || '✅'} Successfully updated the icon for <@&${targetRole.id}>.`);

      return message.reply({ embeds: [successEmbed] });
    } catch (err) {
      console.error('[RoleIcon Error]', err);
      return message.reply(`${emojis.ERROR || '❌'} Failed to update role icon: **${err.message || 'Server may require Boost Level 2 for custom role icons.'}**`);
    }
  }
};
