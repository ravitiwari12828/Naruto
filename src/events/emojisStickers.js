const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const { dispatchLog } = require('../utils/logger');

module.exports = (client) => {
  async function fetchExecutor(guild, type, targetId) {
    if (!guild.members.me.permissions.has('ViewAuditLog')) return null;
    try {
      const logs = await guild.fetchAuditLogs({ limit: 5, type });
      const entry = logs.entries.find(e => e.targetId === targetId);
      if (entry) return entry.executor;
    } catch (e) {}
    return null;
  }

  client.on('emojiCreate', async (emoji) => {
    const executor = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Emoji created')
      .setThumbnail(emoji.url)
      .setDescription(`**Name:** ${emoji.name}\n**ID:** \`${emoji.id}\`\n**Animated:** ${emoji.animated ? '✅' : '❌'}`);
    
    if (executor) {
      embed.setFooter({ text: `@${executor.username}`, iconURL: executor.displayAvatarURL() });
    }
    embed.setTimestamp();

    dispatchLog(emoji.guild, 'emojis', embed);
  });

  client.on('emojiDelete', async (emoji) => {
    const executor = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
    const createdAgo = `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`;
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Emoji deleted')
      .setThumbnail(emoji.url)
      .setDescription(`**Name:** ${emoji.name}\n**ID:** \`${emoji.id}\`\n**Animated:** ${emoji.animated ? '✅' : '❌'}\n**Created:** ${createdAgo}`);
    
    if (executor) {
      embed.setFooter({ text: `@${executor.username}`, iconURL: executor.displayAvatarURL() });
    }
    embed.setTimestamp();

    dispatchLog(emoji.guild, 'emojis', embed);
  });

  client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
    if (oldEmoji.name === newEmoji.name) return;
    const executor = await fetchExecutor(newEmoji.guild, AuditLogEvent.EmojiUpdate, newEmoji.id);
    const embed = new EmbedBuilder()
      .setColor('#ffff00')
      .setTitle('Emoji updated')
      .setThumbnail(newEmoji.url)
      .setDescription(`**Old Name:** ${oldEmoji.name}\n**New Name:** ${newEmoji.name}\n**ID:** \`${newEmoji.id}\``);
    
    if (executor) {
      embed.setFooter({ text: `@${executor.username}`, iconURL: executor.displayAvatarURL() });
    }
    embed.setTimestamp();

    dispatchLog(newEmoji.guild, 'emojis', embed);
  });

  // STICKERS
  client.on('stickerCreate', async (sticker) => {
    const executor = await fetchExecutor(sticker.guild, AuditLogEvent.StickerCreate, sticker.id);
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Sticker created')
      .setThumbnail(sticker.url)
      .setDescription(`**Name:** ${sticker.name}\n**ID:** \`${sticker.id}\`\n**Description:** ${sticker.description || 'None'}`);
    
    if (executor) {
      embed.setFooter({ text: `@${executor.username}`, iconURL: executor.displayAvatarURL() });
    }
    embed.setTimestamp();

    dispatchLog(sticker.guild, 'emojis', embed);
  });

  client.on('stickerDelete', async (sticker) => {
    const executor = await fetchExecutor(sticker.guild, AuditLogEvent.StickerDelete, sticker.id);
    const createdAgo = `<t:${Math.floor(sticker.createdTimestamp / 1000)}:R>`;
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Sticker deleted')
      .setThumbnail(sticker.url)
      .setDescription(`**Name:** ${sticker.name}\n**ID:** \`${sticker.id}\`\n**Description:** ${sticker.description || 'None'}\n**Created:** ${createdAgo}`);
    
    if (executor) {
      embed.setFooter({ text: `@${executor.username}`, iconURL: executor.displayAvatarURL() });
    }
    embed.setTimestamp();

    dispatchLog(sticker.guild, 'emojis', embed);
  });

  client.on('stickerUpdate', async (oldSticker, newSticker) => {
    if (oldSticker.name === newSticker.name && oldSticker.description === newSticker.description) return;
    const executor = await fetchExecutor(newSticker.guild, AuditLogEvent.StickerUpdate, newSticker.id);
    const embed = new EmbedBuilder()
      .setColor('#ffff00')
      .setTitle('Sticker updated')
      .setThumbnail(newSticker.url)
      .setDescription(`**Name:** ${newSticker.name}\n**ID:** \`${newSticker.id}\``);
    
    if (executor) {
      embed.setFooter({ text: `@${executor.username}`, iconURL: executor.displayAvatarURL() });
    }
    embed.setTimestamp();

    dispatchLog(newSticker.guild, 'emojis', embed);
  });
};
