const { EmbedBuilder, AuditLogEvent, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const { dispatchLog } = require('../utils/logger');

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${mins}`;
}

module.exports = (client) => {

  // ─────────────────────────────────────────
  // 🗑️ SINGLE MESSAGE DELETE LOGGER ( Sapphire Style with Media Image Preview )
  // ─────────────────────────────────────────
  client.on('messageDelete', async (message) => {
    try {
      if (!message || !message.guild) return;

      const author = message.author;
      const channel = message.channel;

      const isBot = author ? author.bot : false;
      if (isBot) return; // Skip bot messages from spamming logs

      const textContent = message.content ? message.content.trim() : '';

      // Extract Attachments & Image Preview URL
      const attachmentNames = [];
      let previewImageUrl = null;

      if (message.attachments && message.attachments.size > 0) {
        message.attachments.forEach(att => {
          attachmentNames.push(`│ [${att.name || 'Attachment'}](${att.url})`);
          if (!previewImageUrl && att.contentType && att.contentType.startsWith('image/')) {
            previewImageUrl = att.url || att.proxyURL;
          } else if (!previewImageUrl && /\.(png|jpe?g|webp|gif)$/i.test(att.name || '')) {
            previewImageUrl = att.url || att.proxyURL;
          }
        });
      }

      const createdUnix = message.createdTimestamp ? Math.floor(message.createdTimestamp / 1000) : null;
      const createdAgo = createdUnix ? `<t:${createdUnix}:R>` : 'Unknown';

      let description =
        `│ **Channel:** #${channel ? channel.name : 'unknown'} (<#${channel ? channel.id : '0'}>)\n` +
        `│ **Message ID:** ${message.id}\n` +
        `│ **Message author:** @${author ? author.username : 'Unknown'} ( <@${author ? author.id : '0'}> )\n` +
        `│ **Message created:** ${createdAgo}`;

      if (textContent) {
        description += `\n│\n│ **Content:**\n>>> ${textContent.slice(0, 900)}`;
      }

      if (attachmentNames.length > 0) {
        description += `\n│\n│ **${attachmentNames.length} Attachment(s)**\n` + attachmentNames.join('\n');
      }

      const logEmbed = new EmbedBuilder()
        .setColor(0xED4245) // Sapphire Crimson Red
        .setTitle('Message deleted')
        .setDescription(description)
        .setTimestamp();

      if (author) {
        logEmbed.setFooter({
          text: `@${author.tag || author.username}`,
          iconURL: author.displayAvatarURL({ dynamic: true })
        });
      }

      if (previewImageUrl) {
        logEmbed.setImage(previewImageUrl);
      }

      dispatchLog(message.guild, 'messages', logEmbed);
    } catch (err) {
      console.error('[Message Delete Log Error]:', err.message);
    }
  });

  // ─────────────────────────────────────────
  // 🧹 BULK DELETE / PURGE LOGGER ( TXT File Transcript Attachment )
  // ─────────────────────────────────────────
  client.on('messageDeleteBulk', async (messages) => {
    try {
      const firstMsg = messages.first();
      if (!firstMsg || !firstMsg.guild) return;

      const guild = firstMsg.guild;
      const channel = firstMsg.channel;
      const count = messages.size;

      const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const transcriptLines = sorted.map(m => {
        const timeStr = formatDate(m.createdTimestamp || Date.now());
        const userTag = m.author ? `@${m.author.username}` : '@unknown';
        const userId = m.author ? m.author.id : 'unknown';
        const content = m.content || (m.attachments?.size > 0 ? Array.from(m.attachments.values()).map(a => a.url).join('\n') : '[No Text Content]');
        return `[${timeStr}] ${userTag} (${userId})\n${content}\nID: ${m.id}\n`;
      }).join('\n');

      const logBuffer = Buffer.from(transcriptLines, 'utf-8');
      const fileName = `${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_Purge_Logs.txt`;
      const fileAttachment = new AttachmentBuilder(logBuffer, { name: fileName });

      const bulkEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${count} messages deleted`)
        .setDescription(`│ **Channel:** #${channel.name} (<#${channel.id}>)`)
        .setFooter({ text: `${guild.name} • Audit Logging` })
        .setTimestamp();

      dispatchLog(guild, 'messages', bulkEmbed, [fileAttachment]);
    } catch (err) {
      console.error('[Message Bulk Delete Log Error]:', err.message);
    }
  });

  // ─────────────────────────────────────────
  // ✏️ MESSAGE EDIT / UPDATE LOGGER ( With Media Attachments )
  // ─────────────────────────────────────────
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (!oldMessage || !oldMessage.guild || oldMessage.author?.bot) return;

      const oldContent = oldMessage.content ? oldMessage.content.trim() : '';
      const newContent = newMessage.content ? newMessage.content.trim() : '';

      if (oldContent === newContent) return;

      const author = oldMessage.author || newMessage.author;
      const channel = oldMessage.channel || newMessage.channel;

      let previewImageUrl = null;
      if (oldMessage.attachments && oldMessage.attachments.size > 0) {
        oldMessage.attachments.forEach(att => {
          if (!previewImageUrl && (att.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.name || ''))) {
            previewImageUrl = att.url || att.proxyURL;
          }
        });
      }

      const description =
        `│ **Channel:** #${channel ? channel.name : 'unknown'} (<#${channel ? channel.id : '0'}>)\n` +
        `│ **Message ID:** ${newMessage.id}\n` +
        `│ **Message author:** @${author ? author.username : 'Unknown'} ( <@${author ? author.id : '0'}> )\n` +
        `│ **Jump to Message:** [Click Here](${newMessage.url})\n\n` +
        `**Before (Original):**\n${oldContent ? `>>> ${oldContent.slice(0, 900)}` : '*[Empty / Attachment Only]*'}\n\n` +
        `**After (Edited):**\n${newContent ? `>>> ${newContent.slice(0, 900)}` : '*[Empty / Attachment Only]*'}`;

      const editEmbed = new EmbedBuilder()
        .setColor(0xFEE75C) // Gold
        .setTitle('Message edited')
        .setDescription(description)
        .setFooter({ text: `@${author.tag || author.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      if (previewImageUrl) {
        editEmbed.setImage(previewImageUrl);
      }

      dispatchLog(oldMessage.guild, 'messages', editEmbed);
    } catch (err) {
      console.error('[Message Edit Log Error]:', err.message);
    }
  });
};
