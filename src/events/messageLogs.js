const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const { dispatchLog } = require('../utils/logger');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = (client) => {

  // ─────────────────────────────────────────
  // 🗑️ MESSAGE DELETE LOGGER (Text, Media, Attachments, Links, Stickers & Audit Log Executor)
  // ─────────────────────────────────────────
  client.on('messageDelete', async (message) => {
    try {
      if (!message || !message.guild) return;

      const author = message.author;
      const channel = message.channel;

      // Ignore bots or system messages if needed, but log staff deletions cleanly
      const isBot = author ? author.bot : false;

      // 1. Fetch Audit Log Executor (Who deleted the message?)
      let executor = null;
      if (message.guild.members.me?.permissions?.has(PermissionsBitField.Flags.ViewAuditLog)) {
        try {
          const auditLogs = await message.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MessageDelete });
          const entry = auditLogs.entries.find(e => 
            e.extra?.channel?.id === channel.id &&
            (targetId => targetId === (author ? author.id : null) || true)(e.targetId) &&
            (Date.now() - e.createdTimestamp < 10000)
          );
          if (entry && (Date.now() - entry.createdTimestamp < 10000)) {
            executor = entry.executor;
          }
        } catch (e) {}
      }

      // 2. Process Text Content & Extracted URLs
      const textContent = message.content ? message.content.trim() : '';
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const detectedUrls = textContent ? (textContent.match(urlRegex) || []) : [];

      // 3. Process File Attachments (Images, Videos, Audio, Documents)
      const attachmentList = [];
      let previewImageUrl = null;

      if (message.attachments && message.attachments.size > 0) {
        message.attachments.forEach(att => {
          const sizeStr = formatBytes(att.size);
          attachmentList.push(`📎 [${att.name || 'Attachment'}](${att.url}) (\`${sizeStr}\`)`);
          
          if (!previewImageUrl && att.contentType && att.contentType.startsWith('image/')) {
            previewImageUrl = att.url || att.proxyURL;
          } else if (!previewImageUrl && /\.(png|jpe?g|webp|gif)$/i.test(att.name || '')) {
            previewImageUrl = att.url || att.proxyURL;
          }
        });
      }

      // 4. Process Stickers
      const stickerList = [];
      if (message.stickers && message.stickers.size > 0) {
        message.stickers.forEach(st => {
          stickerList.push(`🏷️ **Sticker:** [${st.name}](${st.url})`);
        });
      }

      // 5. Process Message Embeds
      const embedInfoList = [];
      if (message.embeds && message.embeds.length > 0) {
        message.embeds.forEach((emb, i) => {
          const title = emb.title || emb.author?.name || 'Embedded Content';
          const url = emb.url || emb.video?.url || emb.image?.url;
          embedInfoList.push(`🖼️ **Embed #${i + 1}:** ${url ? `[${title}](${url})` : title}`);
        });
      }

      // 6. Build Rich Log Description & Fields
      const infoBox = createDynamicBox('DELETED MESSAGE AUDIT LOG', [
        `Author   : ${author ? (author.tag || author.username) : 'Unknown User'}`,
        `AuthorID : ${author ? author.id : 'Unknown'}`,
        `Channel  : #${channel ? channel.name : 'Unknown'}`,
        `Executor : ${executor ? (executor.tag || executor.username) : 'Self / Unknown'}`
      ]);

      const logEmbed = new EmbedBuilder()
        .setColor(0xED4245) // Security Red
        .setTitle(`🗑️ Message Deleted in #${channel ? channel.name : 'Unknown'}`)
        .setDescription(
          '```\n' + infoBox + '\n```\n\n' +
          `• **Author:** ${author ? `<@${author.id}> (\`${author.tag}\`)` : '`Unknown / Uncached User`'}\n` +
          `• **Channel:** ${channel ? `<#${channel.id}>` : '`Unknown`'}\n` +
          `• **Deleted By:** ${executor ? `<@${executor.id}> (\`${executor.tag}\`)` : '`Self Delete / Automated`'}\n\n` +
          `**Message Content:**\n${textContent ? `>>> ${textContent.slice(0, 1024)}` : '*[No Text Content]*'}`
        )
        .setFooter({ text: `Message ID: ${message.id} • Author ID: ${author ? author.id : 'Unknown'}` })
        .setTimestamp();

      if (author) {
        logEmbed.setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) });
      }

      // Add Attachments Field
      if (attachmentList.length > 0) {
        logEmbed.addFields({
          name: `📁 Attachments / Media Files (${attachmentList.length})`,
          value: attachmentList.join('\n').slice(0, 1024)
        });
      }

      // Add Stickers Field
      if (stickerList.length > 0) {
        logEmbed.addFields({
          name: `🏷️ Deleted Stickers (${stickerList.length})`,
          value: stickerList.join('\n').slice(0, 1024)
        });
      }

      // Add Detected Links / Embeds Field
      if (detectedUrls.length > 0 || embedInfoList.length > 0) {
        const combinedLinks = [
          ...detectedUrls.map(u => `🔗 \`${u.slice(0, 100)}\``),
          ...embedInfoList
        ];
        logEmbed.addFields({
          name: `🌐 Links & Media Embeds (${combinedLinks.length})`,
          value: combinedLinks.join('\n').slice(0, 1024)
        });
      }

      // Embed Image Preview
      if (previewImageUrl) {
        logEmbed.setImage(previewImageUrl);
      }

      dispatchLog(message.guild, 'messages', logEmbed);
    } catch (err) {
      console.error('⚠️ [Message Delete Log Error]:', err.message);
    }
  });

  // ─────────────────────────────────────────
  // 📝 MESSAGE EDIT / UPDATE LOGGER
  // ─────────────────────────────────────────
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (!oldMessage || !oldMessage.guild || oldMessage.author?.bot) return;

      const oldContent = sanitizeMentions(oldMessage.content ? oldMessage.content.trim() : '');
      const newContent = sanitizeMentions(newMessage.content ? newMessage.content.trim() : '');

      if (oldContent === newContent) return;

      const author = oldMessage.author || newMessage.author;
      const channel = oldMessage.channel || newMessage.channel;

      const infoBox = createDynamicBox('MESSAGE EDITED AUDIT LOG', [
        `Author   : ${author ? (author.tag || author.username) : 'Unknown User'}`,
        `AuthorID : ${author ? author.id : 'Unknown'}`,
        `Channel  : #${channel ? channel.name : 'Unknown'}`
      ]);

      const editEmbed = new EmbedBuilder()
        .setColor(0xFEE75C) // Warning Gold
        .setTitle(`📝 Message Edited in #${channel ? channel.name : 'Unknown'}`)
        .setDescription(
          '```\n' + infoBox + '\n```\n\n' +
          `• **Author:** <@${author.id}> (\`${author.tag}\`)\n` +
          `• **Channel:** <#${channel.id}>\n` +
          `• **Jump to Message:** [Click Here](${newMessage.url})\n\n` +
          `**Before (Original):**\n${oldContent ? `>>> ${oldContent.slice(0, 1000)}` : '*[Empty / Attachment Only]*'}\n\n` +
          `**After (Edited):**\n${newContent ? `>>> ${newContent.slice(0, 1000)}` : '*[Empty / Attachment Only]*'}`
        )
        .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) })
        .setFooter({ text: `Message ID: ${newMessage.id} • Author ID: ${author.id}` })
        .setTimestamp();

      dispatchLog(oldMessage.guild, 'messages', editEmbed);
    } catch (err) {
      console.error('⚠️ [Message Edit Log Error]:', err.message);
    }
  });
};
