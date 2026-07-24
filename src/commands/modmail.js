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
  const sorted = (messages || []).sort((a, b) => a.timestamp - b.timestamp);

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
  <title>ModMail Transcript - ${escapeHtml(username)}</title>
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
      <div><strong>Closed By:</strong> ${escapeHtml(closedByTag || 'System')}</div>
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

function buildModmailOverviewEmbed(guild, config, activeCount, author, clientUser) {
  const category = config.categoryId ? guild.channels.cache.get(config.categoryId) : null;
  const transcriptChan = config.transcriptChanId ? guild.channels.cache.get(config.transcriptChanId) : null;

  return createStyledEmbed({
    title: `📬 ModMail System Control & Overview`,
    subtitle: `Support Suite & Direct Ticket Routing — ${guild.name}`,
    description:
      `Welcome to the **ModMail Management Suite**.\n` +
      `Users can DM the bot directly to open support tickets in real-time!\n\n` +
      `**⚙️ System Status**\n` +
      `• **Status:** \`${config.enabled ? '🟢 Active & Listening' : '🔴 Disabled'}\`\n` +
      `• **ModMail Category:** ${category ? `<#${category.id}>` : '`Not Deployed (Run .modmail setup)`'}\n` +
      `• **Transcripts Channel:** ${transcriptChan ? `<#${transcriptChan.id}>` : '`Not Deployed`'}\n` +
      `• **Active Open Tickets:** \`${activeCount}\` active tickets\n\n` +
      `**📜 ModMail Command Suite**\n` +
      `\`\`\`\n` +
      `.modmail setup           • Deploy category & transcript channel\n` +
      `.r <message>             • Reply to user inside ticket channel\n` +
      `.close [reason]          • End ticket & generate HTML transcript\n` +
      `.modmailtranscript       • Generate HTML transcript on demand\n` +
      `.modmail                 • View this status control dashboard\n` +
      `\`\`\``,
    thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
    requestedBy: author,
    clientUser
  });
}

function buildModmailOverviewRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mm_setup')
      .setLabel('Deploy Setup')
      .setEmoji('🛠️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('mm_active')
      .setLabel('Active Tickets')
      .setEmoji('📬')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mm_transcripts')
      .setLabel('Transcripts')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mm_refresh')
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  name: 'modmail',
  description: 'Complete ModMail Support Suite (.modmail setup, .r, .close, .modmailtranscript)',
  aliases: ['r', 'reply', 'close', 'modmailsetup', 'modmailtranscript', 'transcript', 'transcripts'],
  modmailConfigs,
  activeModmailTickets,
  getOrCreateModmailConfig,
  generateHTMLModmailTranscript,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (['r', 'reply'].includes(invoked)) sub = 'reply';
    if (['close', 'modmailclose'].includes(invoked)) sub = 'close';
    if (['modmailsetup'].includes(invoked)) sub = 'setup';
    if (['modmailtranscript', 'transcript', 'transcripts'].includes(invoked)) sub = 'transcript';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. SETUP COMMAND (.modmail setup)
    if (sub === 'setup') {
      if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
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
            clientUser
          })
        ]
      });
    }

    // 2. REPLY TO TICKET (.r <message> / .reply <message>)
    if (sub === 'reply') {
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
    if (sub === 'close') {
      const reason = (invoked === 'close' ? args : args.slice(1)).join(' ') || 'No reason provided';

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
      return;
    }

    // 4. TRANSCRIPT GENERATOR (.modmailtranscript / .transcript)
    if (sub === 'transcript') {
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
        return message.reply(`${emojis.WARNING} Usage: Use \`.modmailtranscript\` inside an active ModMail ticket channel to generate its HTML transcript file!`);
      }

      const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
      const htmlBuffer = generateHTMLModmailTranscript(targetUser ? targetUser.username : 'user', targetTicket.messages, author.tag, 'On-Demand Transcript Request');
      const filename = `transcript-${targetUser ? targetUser.username : targetUserId}.html`;
      const attachment = new AttachmentBuilder(htmlBuffer, { name: filename });

      return message.reply({
        content: `📜 **HTML Transcript Generated for Ticket:**`,
        files: [attachment]
      });
    }

    // 5. OVERVIEW / DASHBOARD (.modmail)
    const config = getOrCreateModmailConfig(guild.id);
    let activeCount = 0;
    for (const t of activeModmailTickets.values()) {
      if (t.guildId === guild.id) activeCount++;
    }

    const embed = buildModmailOverviewEmbed(guild, config, activeCount, author, clientUser);
    const row = buildModmailOverviewRow();

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 300000 });
    collector.on('collect', async (i) => {
      if (i.customId === 'mm_setup') {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return i.reply({ content: `${emojis.WARNING} Only Administrators can run ModMail setup.`, ephemeral: true });
        }
        let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('modmail'));
        if (!category) {
          try {
            category = await guild.channels.create({
              name: '📬 ModMail Tickets',
              type: ChannelType.GuildCategory,
              permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
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
              permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
            });
          } catch (e) {}
        }
        config.categoryId = category ? category.id : null;
        config.transcriptChanId = transcriptChan ? transcriptChan.id : null;
        config.enabled = true;
        modmailConfigs.set(guild.id, config);
        await i.reply({ content: `✅ ModMail system deployed successfully!`, ephemeral: true });
      } else if (i.customId === 'mm_active') {
        await i.reply({ content: `📬 Current Active ModMail Tickets in server: **${activeCount}**`, ephemeral: true });
      } else if (i.customId === 'mm_transcripts') {
        const chan = config.transcriptChanId ? `<#${config.transcriptChanId}>` : 'None';
        await i.reply({ content: `📜 HTML ModMail Transcripts Channel: ${chan}`, ephemeral: true });
      }

      const updatedConfig = getOrCreateModmailConfig(guild.id);
      let newCount = 0;
      for (const t of activeModmailTickets.values()) {
        if (t.guildId === guild.id) newCount++;
      }
      const updatedEmbed = buildModmailOverviewEmbed(guild, updatedConfig, newCount, author, clientUser);
      return i.update({ embeds: [updatedEmbed], components: [buildModmailOverviewRow()] }).catch(() => {});
    });
    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  }
};
