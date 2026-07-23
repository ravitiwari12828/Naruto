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

// Ticket Configs & Stores per Guild
const ticketConfigs = new Map();

function getOrCreateTicketConfig(guildId) {
  if (!ticketConfigs.has(guildId)) {
    ticketConfigs.set(guildId, {
      ticketCounter: 0,
      panelChanId: null,
      logChanId: null,
      transcriptChanId: null,
      staffRoles: new Set(),
      categories: [
        { name: 'General Support', enabled: true },
        { name: 'Billing & Upgrades', enabled: true },
        { name: 'Report Member', enabled: true }
      ]
    });
  }
  const cfg = ticketConfigs.get(guildId);
  if (cfg.ticketCounter === undefined) cfg.ticketCounter = 0;
  if (!cfg.staffRoles) cfg.staffRoles = new Set();
  if (!cfg.categories) {
    cfg.categories = [
      { name: 'General Support', enabled: true },
      { name: 'Billing & Upgrades', enabled: true },
      { name: 'Report Member', enabled: true }
    ];
  }
  return cfg;
}

/**
 * Ensures ticket category, #ticket-logs, and #ticket-transcripts exist automatically.
 */
async function ensureTicketLogChannels(guild) {
  const config = getOrCreateTicketConfig(guild.id);

  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('ticket logs'));
  if (!category) {
    try {
      category = await guild.channels.create({
        name: '♡. Ticket Logs ♡',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
    } catch (e) {}
  }

  let logChan = guild.channels.cache.find(c => c.name === 'ticket-logs');
  if (!logChan) {
    try {
      logChan = await guild.channels.create({
        name: 'ticket-logs',
        type: ChannelType.GuildText,
        parent: category ? category.id : undefined,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
    } catch (e) {}
  }
  if (logChan) config.logChanId = logChan.id;

  let transcriptChan = guild.channels.cache.find(c => c.name === 'ticket-transcripts');
  if (!transcriptChan) {
    try {
      transcriptChan = await guild.channels.create({
        name: 'ticket-transcripts',
        type: ChannelType.GuildText,
        parent: category ? category.id : undefined,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
    } catch (e) {}
  }
  if (transcriptChan) config.transcriptChanId = transcriptChan.id;

  ticketConfigs.set(guild.id, config);
  return { logChan, transcriptChan, category };
}

/**
 * Generates formatted plain text transcript file buffer from message collection.
 */
function generateTranscriptBuffer(channel, messages, closedBy) {
  const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let logHeader =
    `=========================================================================\n` +
    `                     TICKET TRANSCRIPT ARCHIVE                           \n` +
    `=========================================================================\n` +
    ` Server      : ${channel.guild.name} (${channel.guild.id})\n` +
    ` Ticket Name : ${channel.name}\n` +
    ` Closed By   : ${closedBy.tag} (${closedBy.id})\n` +
    ` Closed At   : ${new Date().toUTCString()}\n` +
    ` Total Msgs  : ${sorted.length}\n` +
    `=========================================================================\n\n`;

  const lines = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toISOString().replace('T', ' ').slice(0, 19);
    const content = m.content || (m.attachments.size > 0 ? `[Attachment: ${m.attachments.first().url}]` : '[Embed/System Message]');
    return `[${time}] ${m.author.tag} (${m.author.id}):\n  ${content}\n`;
  });

  return Buffer.from(logHeader + lines.join('\n'), 'utf-8');
}

/**
 * Builds the exact ticket embed matching the user's screenshot.
 */
function buildTicketEmbed(ticketNum, categoryName, opener, priorityText, claimedByText) {
  const priorityColorMap = {
    'Urgent': 0xED4245,
    'Normal': 0xFEE75C,
    'Low': 0x57F287
  };

  const color = priorityColorMap[priorityText] || 0xED4245;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🏷️ Ticket #${ticketNum} — ${categoryName}`)
    .setDescription(`Thanks for reaching out! Support will be with you shortly — please describe your issue in as much detail as possible.`)
    .addFields(
      { name: 'Opened by', value: `<@${opener.id}>`, inline: false },
      { name: 'Priority', value: `${priorityText === 'Urgent' ? '🔴' : priorityText === 'Normal' ? '🟡' : '🟢'} ${priorityText}`, inline: false },
      { name: 'Claimed by', value: claimedByText, inline: false }
    )
    .setFooter({
      text: `Ticket ID: ${ticketNum} | ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    });
}

function buildTicketActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim_btn').setLabel('Claim').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_priority_btn').setLabel('Priority').setEmoji('🚦').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_addmember_btn').setLabel('Add Member').setEmoji('➕').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_lock_btn').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close_btn').setLabel('Close').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

module.exports = {
  name: 'ticket',
  description: 'Complete Ticket Suite: setup, staff, category_add, category_list, panel, claim, close, reopen, add, remove, info, transcript',
  aliases: [
    'tickets', 't', 'ticketpanel', 'staffrole',
    'category_add', 'category_edit', 'category_remove', 'category_toggle', 'category_list',
    'panel_deploy', 'ticket_setup', 'add_member', 'remove_member'
  ],
  ticketConfigs,
  getOrCreateTicketConfig,
  ensureTicketLogChannels,
  generateTranscriptBuffer,
  buildTicketEmbed,
  buildTicketActionRows,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked.startsWith('category_')) sub = invoked;
    if (invoked === 'panel_deploy') sub = 'panel';
    if (invoked === 'add_member') sub = 'add';
    if (invoked === 'remove_member') sub = 'remove';
    if (invoked === 'staffrole') sub = 'staff';

    const guild = message.guild;
    const author = message.author;
    const config = getOrCreateTicketConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. TICKET SETUP (Deploys panel & creates ticket-logs & ticket-transcripts channels automatically)
    if (['panel', 'setup', 'panel_deploy', 'wizard'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can run ticket setup.`);
      }

      // Auto create ticket-logs & ticket-transcripts channels
      const { logChan, transcriptChan } = await ensureTicketLogChannels(guild);

      const staffRoleMentions = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(', ') || '`Administrator (Default)`';

      const panelEmbed = createStyledEmbed({
        title: `🎟️ Support Ticket Desk`,
        subtitle: `${emojis.SHIELD} Private Support & Assistance Center`,
        description:
          `Need help, reporting a user, or claiming rewards?\n\n` +
          `Click **Create Ticket** below to open a private assistance room with our staff team!\n\n` +
          `**Categories:** ${config.categories.filter(c => c.enabled).map(c => `\`${c.name}\``).join(', ')}\n` +
          `**Support Staff Roles:** ${staffRoleMentions}`,
        requestedBy: author,
        clientUser,
        footerText: 'Konoha Ticket System'
      });

      const button = new ButtonBuilder()
        .setCustomId('create_ticket_btn')
        .setLabel('Create Ticket')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);
      await message.channel.send({ embeds: [panelEmbed], components: [row] });

      config.panelChanId = message.channel.id;
      ticketConfigs.set(guild.id, config);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `✅ Ticket System Deployed Successfully`,
            description:
              `• **Ticket Panel**: Sent to <#${message.channel.id}>\n` +
              `• **Ticket Logs**: ${logChan ? `<#${logChan.id}>` : '`Created`'}\n` +
              `• **Ticket Transcripts**: ${transcriptChan ? `<#${transcriptChan.id}>` : '`Created`'}`,
            requestedBy: author,
            clientUser
          })
        ]
      });
    }

    // 2. STAFF ROLE MANAGEMENT (.ticket staff add @role / remove @role / list)
    if (sub === 'staff' || sub === 'staffrole') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can manage Ticket Staff Roles.`);
      }

      const action = args[1]?.toLowerCase();
      const role = message.mentions.roles.first();

      if (action === 'add') {
        if (!role) return message.reply(`${emojis.WARNING} Usage: \`.ticket staff add @role\``);
        config.staffRoles.add(role.id);
        ticketConfigs.set(guild.id, config);
        return message.reply(`${emojis.SHIELD} Added <@&${role.id}> as an official **Ticket Staff Role**!`);
      }

      if (action === 'remove') {
        if (!role) return message.reply(`${emojis.WARNING} Usage: \`.ticket staff remove @role\``);
        config.staffRoles.delete(role.id);
        ticketConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} Removed <@&${role.id}> from Ticket Staff Roles.`);
      }

      const list = Array.from(config.staffRoles).map(id => `<@&${id}>`).join('\n') || '*No custom staff roles added yet (Defaults to Administrators).*';
      const embed = createStyledEmbed({
        title: `🎟️ Ticket Staff Roles`,
        description: list,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 3. TICKET OPEN (.ticket open [reason])
    if (sub === 'create' || sub === 'open') {
      const reason = args.slice(1).join(' ') || 'General Support';

      config.ticketCounter++;
      const ticketNum = config.ticketCounter;
      const chanName = `ticket-${ticketNum}`;

      const { logChan, category } = await ensureTicketLogChannels(guild);

      const overwrites = [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: author.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
        { id: message.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
      ];

      config.staffRoles.forEach(roleId => {
        overwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] });
      });

      const ticketChan = await guild.channels.create({
        name: chanName,
        type: ChannelType.GuildText,
        topic: `ticket|owner:${author.id}|type:General|priority:Urgent|claim:none`,
        parent: category ? category.id : undefined,
        permissionOverwrites: overwrites
      });

      const ticketEmbed = buildTicketEmbed(ticketNum, 'General Support', author, 'Urgent', 'Unclaimed');
      const actionRows = buildTicketActionRows();

      await ticketChan.send({ content: `<@${author.id}>`, embeds: [ticketEmbed], components: actionRows });

      // Log to #ticket-logs
      if (logChan) {
        const logEmbed = createStyledEmbed({
          title: `🎟️ New Ticket Opened`,
          description: `**User:** <@${author.id}> (${author.tag})\n**Ticket:** ${ticketChan}\n**Reason:** *${reason}*`,
          requestedBy: author,
          clientUser
        });
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }

      ticketConfigs.set(guild.id, config);
      return message.reply(`✅ Ticket created! Head over to ${ticketChan}`);
    }

    // 4. TICKET TRANSCRIPT (.ticket transcript)
    if (sub === 'transcript') {
      if (!message.channel.name.startsWith('ticket-')) return message.reply(`${emojis.WARNING} Only in ticket channels!`);

      const msgs = await message.channel.messages.fetch({ limit: 100 });
      const buffer = generateTranscriptBuffer(message.channel, msgs, author);
      const attachment = new AttachmentBuilder(buffer, { name: `${message.channel.name}-transcript.txt` });

      const embed = createStyledEmbed({
        title: `📜 Ticket Transcript Exported`,
        description: `Exported **${msgs.size} messages** from ${message.channel}.`,
        requestedBy: author,
        clientUser
      });

      await message.channel.send({ embeds: [embed], files: [attachment] });

      const { transcriptChan } = await ensureTicketLogChannels(guild);
      if (transcriptChan) {
        await transcriptChan.send({ embeds: [embed], files: [attachment] }).catch(() => {});
      }
      return;
    }

    // 5. TICKET CLOSE (.ticket close)
    if (sub === 'close') {
      if (!message.channel.name.startsWith('ticket-')) return message.reply(`${emojis.WARNING} Only in ticket channels!`);

      const msgs = await message.channel.messages.fetch({ limit: 100 });
      const buffer = generateTranscriptBuffer(message.channel, msgs, author);
      const attachment = new AttachmentBuilder(buffer, { name: `${message.channel.name}-transcript.txt` });

      const closeEmbed = createStyledEmbed({
        title: `🔒 Closing Ticket Desk`,
        description: `Ticket closed by **${author.tag}**. Generating transcript & deleting channel in **5 seconds**...`,
        requestedBy: author,
        clientUser
      });

      await message.channel.send({ embeds: [closeEmbed] });

      const { transcriptChan } = await ensureTicketLogChannels(guild);
      if (transcriptChan) {
        const logEmbed = createStyledEmbed({
          title: `📜 Ticket Closed & Archived`,
          description: `**Ticket Channel:** \`${message.channel.name}\`\n**Closed By:** ${author.tag} (${author.id})\n**Total Messages:** ${msgs.size}`,
          requestedBy: author,
          clientUser
        });
        await transcriptChan.send({ embeds: [logEmbed], files: [attachment] }).catch(() => {});
      }

      setTimeout(() => {
        message.channel.delete().catch(() => {});
      }, 5000);
      return;
    }

    // Default Ticket Help Card
    const embed = createStyledEmbed({
      title: `${emojis.TICKETS} Support Ticket Commands`,
      description:
        `\`.ticket setup\` — Deploy panel & auto-create #ticket-logs and #ticket-transcripts\n` +
        `\`.ticket staff add @role\` — Add staff role for ticket management\n` +
        `\`.ticket staff remove @role\` — Remove staff role\n` +
        `\`.ticket staff list\` — List configured staff roles\n` +
        `\`.ticket open [reason]\` — Open private support ticket\n` +
        `\`.ticket claim\` — Claim a ticket\n` +
        `\`.ticket close\` — Close ticket & save transcript to #ticket-transcripts\n` +
        `\`.ticket transcript\` — Export ticket transcript file`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
