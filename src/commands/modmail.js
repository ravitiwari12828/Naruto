const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global ModMail Store (guildId -> { categoryId, transcriptChanId, staffRoleId })
// activeTickets: userId -> { threadId, channelId, guildId, messages: [] }
const modmailConfigs = new Map();
const activeModmailTickets = new Map();

function getOrCreateModmailConfig(guildId) {
  if (!modmailConfigs.has(guildId)) {
    modmailConfigs.set(guildId, {
      enabled: true,
      categoryId: null,
      transcriptChanId: null,
      staffRoleId: null
    });
  }
  return modmailConfigs.get(guildId);
}

function generateHTMLModmailTranscript(username, messages, closedByTag, reason) {
  const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);

  const messageBlocks = sorted.map(m => {
    const timeStr = new Date(m.timestamp).toUTCString();
    return `
    <div class="msg ${m.isStaff ? 'staff' : 'user'}">
      <div class="msg-header">
        <span class="author">${escapeHtml(m.authorTag)}</span>
        <span class="badge">${m.isStaff ? 'STAFF' : 'USER'}</span>
        <span class="time">${timeStr}</span>
      </div>
      <div class="content">${escapeHtml(m.content)}</div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transcript - ${escapeHtml(username)}</title>
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #0f0f17; color: #e1e1e6; padding: 25px; margin: 0; }
    .header { background: #161622; border-left: 4px solid #5865f2; border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .header h2 { margin: 0 0 10px 0; color: #ffffff; font-size: 22px; }
    .meta { color: #9494a8; font-size: 14px; line-height: 1.6; }
    .msg { background: #161622; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; border-left: 4px solid #4e5058; }
    .msg.staff { border-left-color: #5865f2; }
    .msg.user { border-left-color: #57f287; }
    .msg-header { margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .author { font-weight: 600; color: #ffffff; font-size: 15px; }
    .badge { background: #2b2d31; color: #b5bac1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .msg.staff .badge { background: #5865f2; color: #ffffff; }
    .time { color: #80848e; font-size: 12px; margin-left: auto; }
    .content { font-size: 14px; line-height: 1.5; color: #dbdee1; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="header">
    <h2>ModMail Transcript - ${escapeHtml(username)}</h2>
    <div class="meta">
      <div><strong>Closed By:</strong> ${escapeHtml(closedByTag)}</div>
      <div><strong>Reason:</strong> ${escapeHtml(reason || 'No reason provided')}</div>
      <div><strong>Total Messages:</strong> ${sorted.length}</div>
    </div>
  </div>
  ${messageBlocks}
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  name: 'modmail',
  description: 'Complete ModMail Support System matching screenshot 2/3 with HTML transcripts',
  aliases: ['r', 'reply', 'close', 'modmailsetup'],
  modmailConfigs,
  activeModmailTickets,
  getOrCreateModmailConfig,
  generateHTMLModmailTranscript,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'r' || invoked === 'reply') sub = 'reply';
    if (invoked === 'close') sub = 'close';

    const author = message.author;
    const guild = message.guild;

    // 1. SETUP COMMAND (.modmail setup)
    if (sub === 'setup' || invoked === 'modmailsetup') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can setup ModMail.`);
      }

      let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('modmail'));
      if (!category) {
        try {
          category = await guild.channels.create({
            name: '📬 ModMail Tickets',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
            ]
          });
        } catch (e) {}
      }

      let transcriptChan = guild.channels.cache.find(c => c.name === 'modmail-transcripts');
      if (!transcriptChan) {
        try {
          transcriptChan = await guild.channels.create({
            name: 'modmail-transcripts',
            type: ChannelType.GuildText,
            parent: category ? category.id : undefined,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
            ]
          });
        } catch (e) {}
      }

      const config = getOrCreateModmailConfig(guild.id);
      config.categoryId = category ? category.id : null;
      config.transcriptChanId = transcriptChan ? transcriptChan.id : null;
      config.enabled = true;
      modmailConfigs.set(guild.id, config);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `📬 ModMail System Deployed Successfully`,
            description:
              `• **ModMail Category**: ${category ? `<#${category.id}>` : '`Created`'}\n` +
              `• **HTML Transcript Channel**: ${transcriptChan ? `<#${transcriptChan.id}>` : '`Created`'}\n\n` +
              `When users send a DM to the bot, a ModMail thread will be opened for staff to reply using \`.r <message>\`!`,
            requestedBy: author,
            clientUser: message.client.user
          })
        ]
      });
    }

    // 2. REPLY TO TICKET (.r <message> / .reply <message>)
    if (sub === 'reply' || invoked === 'r' || invoked === 'reply') {
      const text = (['r', 'reply'].includes(invoked) ? args : args.slice(1)).join(' ');
      if (!text) return message.reply(`${emojis.WARNING} Usage: \`.r <message>\` or \`.reply <message>\``);

      let targetTicket = null;
      for (const [userId, t] of activeModmailTickets.entries()) {
        if (t.threadId === message.channel.id || t.channelId === message.channel.id) {
          targetTicket = { userId, ...t };
          break;
        }
      }

      if (!targetTicket) {
        return message.reply(`${emojis.WARNING} This command can only be used inside an active ModMail ticket channel or thread!`);
      }

      try {
        const user = await message.client.users.fetch(targetTicket.userId);
        const replyEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setAuthor({ name: `${guild?.name || 'Support'} Staff`, iconURL: author.displayAvatarURL({ dynamic: true }) })
          .setDescription(text)
          .setTimestamp();

        await user.send({ embeds: [replyEmbed] });

        targetTicket.messages.push({
          authorTag: author.tag,
          isStaff: true,
          content: text,
          timestamp: Date.now()
        });

        activeModmailTickets.set(targetTicket.userId, targetTicket);
        return message.reply(`✅ Sent reply to **${user.tag}**.`);
      } catch (e) {
        return message.reply(`❌ Could not send DM reply to user: ${e.message}`);
      }
    }

    // 3. CLOSE TICKET (.close [reason])
    if (sub === 'close' || invoked === 'close') {
      const reason = (invoked === 'close' ? args : args.slice(1)).join(' ') || 'No response';

      let targetTicket = null;
      let targetUserId = null;
      for (const [userId, t] of activeModmailTickets.entries()) {
        if (t.threadId === message.channel.id || t.channelId === message.channel.id) {
          targetTicket = t;
          targetUserId = userId;
          break;
        }
      }

      if (!targetTicket) {
        return message.reply(`${emojis.WARNING} This command can only be used inside an active ModMail ticket channel or thread!`);
      }

      await message.reply(`🔒 Closing ModMail ticket in **5 seconds**...`);

      const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
      const htmlBuffer = generateHTMLModmailTranscript(targetUser ? targetUser.username : 'user', targetTicket.messages, author.tag, reason);
      const filename = `transcript-${targetUser ? targetUser.username : targetUserId}.html`;
      const attachment = new AttachmentBuilder(htmlBuffer, { name: filename });

      // Embed matching screenshot 3
      const transcriptEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`Transcript Saved`)
        .setDescription(
          `Ticket closed by **${author.tag}**\n` +
          `**User:** <@${targetUserId}>\n` +
          `**Reason:** ${reason}`
        )
        .setTimestamp();

      const config = getOrCreateModmailConfig(guild.id);
      let transcriptChan = config.transcriptChanId ? guild.channels.cache.get(config.transcriptChanId) : null;
      if (!transcriptChan) transcriptChan = guild.channels.cache.find(c => c.name === 'modmail-transcripts');

      if (transcriptChan) {
        await transcriptChan.send({ embeds: [transcriptEmbed], files: [attachment] }).catch(() => {});
      }

      // Send to user's DM
      if (targetUser) {
        try {
          const userCloseEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`ModMail Ticket Closed`)
            .setDescription(`Your support ticket in **${guild.name}** has been closed.\n**Reason:** ${reason}`)
            .setTimestamp();
          await targetUser.send({ embeds: [userCloseEmbed], files: [attachment] }).catch(() => {});
        } catch (e) {}
      }

      activeModmailTickets.delete(targetUserId);

      setTimeout(() => {
        message.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};
