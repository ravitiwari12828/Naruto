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
function formatIST(timestamp) {
  if (!timestamp) return 'N/A';
  const d = new Date(timestamp);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
}


module.exports = (client) => {

  // ─────────────────────────────────────────
  // 🗑️ SINGLE MESSAGE DELETE LOGGER ( Sapphire Style with Media Image Preview )
  // ─────────────────────────────────────────
  client.on('messageDelete', async (message) => {
    try {
      if (!message || !message.guild) return;

      const cached = message.client.rawMessageCache ? message.client.rawMessageCache.get(message.id) : null;
      const author = message.author || (cached ? { id: cached.authorId, username: cached.authorUsername, tag: cached.authorTag, bot: false, displayAvatarURL: () => null } : null);
      const channel = message.channel || (cached ? { id: cached.channelId, name: cached.channelName } : null);

      const isBot = author ? author.bot : false;
      if (isBot) return;

      const textContent = (message.content ? message.content.trim() : '') || (cached ? cached.content : '');

      const attachmentNames = [];
      let previewImageUrl = null;

      if (message.attachments && message.attachments.size > 0) {
        message.attachments.forEach(att => {
          attachmentNames.push(`│ [${att.name || 'Attachment'}](${att.url})`);
          if (!previewImageUrl && (att.contentType?.startsWith('image/') || /.(png|jpe?g|webp|gif)$/i.test(att.name || ''))) {
            previewImageUrl = att.url || att.proxyURL;
          }
        });
      } else if (cached && cached.attachments && cached.attachments.length > 0) {
        cached.attachments.forEach(att => {
          attachmentNames.push(`│ [${att.name || 'Attachment'}](${att.url})`);
          if (!previewImageUrl && (att.contentType?.startsWith('image/') || /.(png|jpe?g|webp|gif)$/i.test(att.name || ''))) {
            previewImageUrl = att.url || att.proxyURL;
          }
        });
      }

      if (!previewImageUrl && cached && cached.gifUrls && cached.gifUrls.length > 0) {
        previewImageUrl = cached.gifUrls[0];
      }

      const timestamp = cached?.timestamp || message.createdTimestamp || Date.now();
      const createdUnix = Math.floor(timestamp / 1000);
      const createdAgo = `<t:${createdUnix}:R>`;

      let description =
        `│ **Channel:** #${channel ? channel.name : 'unknown'} (<#${channel ? channel.id : '0'}>)\n` +
        `│ **Message ID:** ${message.id}\n` +
        `│ **Message author:** @${author ? author.username : 'Unknown'} ( <@${author ? author.id : '0'}> )\n` +
        `│ **Message created:** ${createdAgo} (${formatIST(timestamp)})`;

      if (textContent) {
        description += `\n│\n│ **Content:**\n>>> ${textContent.slice(0, 900)}`;
      }

      if (attachmentNames.length > 0) {
        description += `\n│\n│ **${attachmentNames.length} Attachment(s)**\n` + attachmentNames.join('\n');
      }

      if (cached && cached.gifUrls && cached.gifUrls.length > 0) {
        description += `\n│\n│ **GIF / Link:** ${cached.gifUrls[0]}`;
      }

      const logEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('Message deleted')
        .setDescription(description)
        .setTimestamp();

      if (author && typeof author.displayAvatarURL === 'function') {
        const av = author.displayAvatarURL({ dynamic: true });
        if (av) {
          logEmbed.setFooter({
            text: `@${author.tag || author.username} (ID: ${author.id})`,
            iconURL: av
          });
        }
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

      const sorted = Array.from(messages.values()).sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));

      const transcriptBlocks = sorted.map(m => {
        const cached = client.rawMessageCache ? client.rawMessageCache.get(m.id) : null;

        const timestamp = cached?.timestamp || m.createdTimestamp || Date.now();
        const timeStr = formatIST(timestamp);

        const authorUsername = cached ? cached.authorUsername : (m.author ? m.author.username : 'unknown');
        const authorDisplayName = cached?.authorDisplayName || m.member?.displayName || m.author?.displayName || authorUsername;
        const authorId = cached?.authorId || (m.author ? m.author.id : 'unknown');

        const textContent = (cached ? cached.content : (m.content || '')).trim();
        const gifUrls = cached ? (cached.gifUrls || []) : [];
        const attachments = cached ? (cached.attachments || []) : (m.attachments ? Array.from(m.attachments.values()).map(a => ({ name: a.name || 'Attachment', url: a.url })) : []);
        const stickers = cached ? (cached.stickers || []) : (m.stickers ? Array.from(m.stickers.values()).map(s => ({ name: s.name, url: s.url })) : []);

        const lines = [];
        lines.push(`[${timeStr}] @${authorUsername} (${authorDisplayName} | ID: ${authorId}) =>`);

        if (textContent) {
          lines.push(`  Content: ( ${textContent} )`);
        } else if (attachments.length === 0 && gifUrls.length === 0 && stickers.length === 0) {
          lines.push(`  Content: [No Text Content]`);
        }

        if (gifUrls.length > 0) {
          lines.push(`  GIFs / Links: ${gifUrls.join(', ')}`);
        }

        if (attachments.length > 0) {
          lines.push(`  Attachments: ${attachments.map(a => `${a.name} (${a.url})`).join(', ')}`);
        }

        if (stickers.length > 0) {
          lines.push(`  Stickers: ${stickers.map(s => `${s.name} (${s.url})`).join(', ')}`);
        }

        lines.push(`  Message ID: ${m.id}`);
        return lines.join('\n');
      });

      const header = [
        `==================================================`,
        `NARUTO EXECUTIVE PURGE AUDIT TRANSCRIPT`,
        `Server  : ${guild.name} (${guild.id})`,
        `Channel : #${channel ? channel.name : 'unknown'} (${channel ? channel.id : '0'})`,
        `Purged  : ${count} Messages`,
        `Time    : ${formatIST(Date.now())}`,
        `==================================================\n`
      ].join('\n');

      const logBuffer = Buffer.from(header + transcriptBlocks.join('\n\n--------------------------------------------------\n\n'), 'utf-8');
      const fileName = `${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_Purge_Logs.txt`;
      const fileAttachment = new AttachmentBuilder(logBuffer, { name: fileName });

      const bulkEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${count} messages deleted (Purged)`)
        .setDescription(`│ **Channel:** #${channel ? channel.name : 'unknown'} (<#${channel ? channel.id : '0'}>)\n│ **Messages Logged:** ${count} Messages archived with author IDs, text, gifs & media attachments in the file below.`)
        .setFooter({ text: `${guild.name} • Audit Logging • Times shown in IST` })
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
