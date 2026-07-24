const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Stores
const ticketConfigs = new Map();
const priorityTimers = new Map(); // ticketChannelId -> Timeout/Interval ID

function getOrCreateTicketConfig(guildId) {
  if (!ticketConfigs.has(guildId)) {
    ticketConfigs.set(guildId, {
      ticketCounter: 0,
      panelChanId: null,
      logChanId: null,
      transcriptChanId: null,
      staffRoles: new Set(),
      categories: [
        { id: 'cat_support', name: 'General Support', emoji: '🎫', description: 'Need help or general assistance?' },
        { id: 'cat_promo', name: 'Promotion', emoji: '📢', description: 'Inquire about promotional deals' },
        { id: 'cat_report', name: 'Report', emoji: '🚨', description: 'Report a user or server violation' },
        { id: 'cat_reward', name: 'Reward', emoji: '🎁', description: 'Claim your event or activity rewards' },
        { id: 'cat_staff', name: 'Staff Apply', emoji: '💼', description: 'Apply for staff position' },
        { id: 'cat_server_promo', name: 'Server Promo', emoji: '🌐', description: 'Request server cross-promotions' }
      ]
    });
  }
  const cfg = ticketConfigs.get(guildId);
  if (cfg.ticketCounter === undefined) cfg.ticketCounter = 0;
  if (!cfg.staffRoles) cfg.staffRoles = new Set();
  
  // Filter out removed categories (registration & event_promo) if already stored in memory
  if (cfg.categories) {
    cfg.categories = cfg.categories.filter(c => c.id !== 'cat_event_promo' && c.id !== 'cat_reg');
  }
  return cfg;
}

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

function buildTicketEmbed(ticketNum, categoryName, opener, priorityText, claimedByText) {
  const priorityColorMap = {
    'Urgent': 0xFF0055,
    'Normal': 0xFEE75C,
    'Low': 0x57F287
  };

  const color = priorityColorMap[priorityText] || 0xFF0055;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emojis.TICKETS} ${opener.username}'s Ticket — ${categoryName}`)
    .setDescription(
      `Welcome <@${opener.id}>! Thanks for reaching out to support.\n` +
      `Our team will assist you shortly — please explain your request in full detail below.`
    )
    .addFields(
      { name: `${emojis.HUMAN} Opened By`, value: `<@${opener.id}> (\`${opener.tag}\`)`, inline: true },
      { name: `${emojis.ZAP} Priority Level`, value: `${priorityText === 'Urgent' ? emojis.WARNING : priorityText === 'Normal' ? emojis.STAR : emojis.SUCCESS} ${priorityText}`, inline: true },
      { name: `${emojis.MOD} Claimed By`, value: claimedByText, inline: true }
    )
    .setFooter({
      text: `Ticket ID #${ticketNum} • Naruto Support Desk`,
      iconURL: opener.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();
}

function buildTicketActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim_btn').setLabel('Claim').setEmoji(emojis.OBJ_MOD).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_callstaff_btn').setLabel('Call Staff').setEmoji(emojis.OBJ_PRIORITY).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_priority_btn').setLabel('Priority').setEmoji(emojis.OBJ_ZAP).setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_addmember_btn').setLabel('Add Member').setEmoji(emojis.OBJ_TOOLS).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_lock_btn').setLabel('Lock').setEmoji(emojis.OBJ_SHIELD).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close_btn').setLabel('Close').setEmoji(emojis.OBJ_REMOVE).setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

module.exports = {
  name: 'ticket',
  description: 'Complete Ticket System with 6 active categories, Call Staff, Transcripts to DM & Priority Escalation',
  aliases: [
    'tickets', 't', 'ticketpanel', 'staffrole',
    'panel_deploy', 'ticket_setup', 'add_member', 'remove_member'
  ],
  ticketConfigs,
  priorityTimers,
  getOrCreateTicketConfig,
  ensureTicketLogChannels,
  generateTranscriptBuffer,
  buildTicketEmbed,
  buildTicketActionRows,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

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

    // 1. TICKET SETUP (Deploys multi-category dropdown panel & log channels)
    if (['panel', 'setup', 'panel_deploy', 'wizard'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can run ticket setup.`);
      }

      const { logChan, transcriptChan } = await ensureTicketLogChannels(guild);

      const staffRoleMentions = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(', ') || '`Administrator`';

      const panelEmbed = new EmbedBuilder()
        .setColor(0x00FFBB)
        .setTitle(`${emojis.TICKETS} Naruto Private Support Desk`)
        .setDescription(
          `Welcome to **${guild.name}** Support Center!\n\n` +
          `Select a category from the dropdown menu below to open a private ticket with our staff.\n\n` +
          `**${emojis.STAR} Available Support Categories:**\n` +
          `• 🎫 **General Support** — Assistance & Questions\n` +
          `• 📢 **Promotion** — Inquire about server promotions\n` +
          `• 🚨 **Report** — Report a user or rule violation\n` +
          `• 🎁 **Reward** — Claim event prizes & activity rewards\n` +
          `• 💼 **Staff Apply** — Submit staff application\n` +
          `• 🌐 **Server Promo** — Server cross-promotions\n\n` +
          `**${emojis.GEAR} Staff Roles Assigned**: ${staffRoleMentions}`
        )
        .setFooter({ text: 'Naruto Ticket System • Dedicated Fast Support' })
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('🏷️ Select a ticket category...')
        .addOptions(
          config.categories.map(c => ({
            label: c.name,
            value: c.id,
            description: c.description,
            emoji: c.emoji
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await message.channel.send({ embeds: [panelEmbed], components: [row] });

      config.panelChanId = message.channel.id;
      ticketConfigs.set(guild.id, config);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `${emojis.SUCCESS} Ticket Desk Deployed Successfully`,
            description:
              `• **Ticket Panel**: Active in <#${message.channel.id}>\n` +
              `• **Ticket Logs**: ${logChan ? `<#${logChan.id}>` : '`Created`'}\n` +
              `• **Ticket Transcripts**: ${transcriptChan ? `<#${transcriptChan.id}>` : '`Created`'}`,
            requestedBy: author,
            clientUser
          })
        ]
      });
    }

    // 2. STAFF ROLES MANAGEMENT
    if (sub === 'staff' || sub === 'staffrole') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can manage ticket staff roles.`);
      }

      const action = args[1]?.toLowerCase();
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);

      if (action === 'add' && role) {
        config.staffRoles.add(role.id);
        ticketConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} Added <@&${role.id}> as Ticket Support Staff.`);
      } else if (action === 'remove' && role) {
        config.staffRoles.delete(role.id);
        ticketConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} Removed <@&${role.id}> from Ticket Support Staff.`);
      } else {
        const staffList = Array.from(config.staffRoles).map(id => `<@&${id}>`).join('\n') || 'None assigned (Administrators only)';
        return message.reply({
          embeds: [
            createStyledEmbed({
              title: `${emojis.SHIELD} Ticket Staff Roles`,
              description: `**Current Support Staff Roles:**\n${staffList}\n\n**Usage:**\n\`.ticket staff add @role\`\n\`.ticket staff remove @role\``,
              requestedBy: author,
              clientUser
            })
          ]
        });
      }
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'ticket');
  }
};
