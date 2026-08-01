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
const priorityTimers = new Map(); // ticketChannelId -> Interval ID
const staffCallCooldowns = new Map(); // ticketChannelId -> Timestamp

function resolveEmojiDisplay(emoji) {
  if (!emoji) return '🎫';
  if (typeof emoji === 'string') return emoji;
  if (typeof emoji === 'object' && emoji.id) {
    return (emoji.animated ? '<a:' : '<:') + emoji.name + ':' + emoji.id + '>';
  }
  return '🎫';
}

function resolveSelectMenuEmoji(emoji) {
  if (!emoji) return '🎫';
  if (typeof emoji === 'object' && emoji.id) {
    return { name: emoji.name, id: emoji.id, animated: !!emoji.animated };
  }
  if (typeof emoji === 'string') {
    const match = emoji.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
    if (match) {
      return { name: match[1], id: match[2], animated: emoji.startsWith('<a:') };
    }
    return emoji;
  }
  return '🎫';
}

function getOrCreateTicketConfig(guildId) {
  if (!ticketConfigs.has(guildId)) {
    ticketConfigs.set(guildId, {
      ticketCounter: 0,
      panelChanId: null,
      logChanId: null,
      transcriptChanId: null,
      staffRoles: new Set(),
      categories: [
        { id: 'cat_support', name: 'General Support', emoji: emojis.OBJ_TICKETS || '🎫', description: 'Need help or general assistance?' },
        { id: 'cat_promo', name: 'Promotion', emoji: emojis.OBJ_GIVEAWAY || '📢', description: 'Inquire about promotional deals' },
        { id: 'cat_report', name: 'Report', emoji: emojis.OBJ_ANTINUKE || '🚨', description: 'Report a user or server violation' },
        { id: 'cat_reward', name: 'Reward', emoji: emojis.OBJ_LEVEL || '🎁', description: 'Claim your event or activity rewards' },
        { id: 'cat_staff', name: 'Staff Apply', emoji: emojis.OBJ_MOD || '💼', description: 'Apply for staff position' },
        { id: 'cat_server_promo', name: 'Server Promo', emoji: emojis.OBJ_ALL_MODULES || '🌐', description: 'Request server cross-promotions' }
      ]
    });
  }
  const cfg = ticketConfigs.get(guildId);
  if (cfg.ticketCounter === undefined) cfg.ticketCounter = 0;
  if (!cfg.staffRoles) cfg.staffRoles = new Set();
  
  if (cfg.categories) {
    cfg.categories = cfg.categories.filter(c => c.id !== 'cat_event_promo' && c.id !== 'cat_reg');
  }
  return cfg;
}

async function ensureTicketLogChannels(guild) {
  const config = getOrCreateTicketConfig(guild.id);

  // 1. Auto-create & link @Ticket Staff role if missing
  await guild.roles.fetch().catch(() => {});
  let staffRole = guild.roles.cache.find(r => r.name.trim().toLowerCase() === 'ticket staff');
  if (!staffRole) {
    try {
      staffRole = await guild.roles.create({
        name: 'Ticket Staff',
        color: 0x00FFBB,
        reason: 'Auto-created for Naruto Ticket System'
      });
    } catch (e) {}
  }
  if (staffRole) {
    config.staffRoles.add(staffRole.id);
  }

  // 2. Ticket Logs Category & Channels
  const db = require('../database/db');
  const { getOrCreateAdvLogStore } = require('../utils/logger');
  const advStore = getOrCreateAdvLogStore(guild.id);

  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name.includes('Ticket') || c.name.includes('ticket')));
  if (!category) {
    try {
      category = await guild.channels.create({
        name: '🎟️ · Ticket & ModMail Logs ·',
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
  } else if (category && logChan.parentId !== category.id) {
    await logChan.setParent(category.id).catch(() => {});
  }

  if (logChan) {
    config.logChanId = logChan.id;
    advStore.channels.set('ticketlogs', logChan.id);
    db.saveLogChannel(guild.id, 'ticketlogs', logChan.id);
  }

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
  } else if (category && transcriptChan.parentId !== category.id) {
    await transcriptChan.setParent(category.id).catch(() => {});
  }

  if (transcriptChan) {
    config.transcriptChanId = transcriptChan.id;
    advStore.channels.set('transcripts', transcriptChan.id);
    db.saveLogChannel(guild.id, 'transcripts', transcriptChan.id);
  }

  ticketConfigs.set(guild.id, config);
  return { logChan, transcriptChan, category, staffRole };
}

function updateTicketStaffReminderTimer(client, channel, priorityText, claimedStaffId) {
  // Clear any existing timer for this channel
  if (priorityTimers.has(channel.id)) {
    clearInterval(priorityTimers.get(channel.id));
    priorityTimers.delete(channel.id);
  }

  if (!claimedStaffId || claimedStaffId === 'none' || claimedStaffId === 'Unclaimed') return;

  let intervalMs = 0;
  if (priorityText === 'Urgent') {
    intervalMs = 4 * 60 * 60 * 1000; // 4 Hours
  } else if (priorityText === 'Normal') {
    intervalMs = 11 * 60 * 60 * 1000; // 11 Hours
  } else {
    return; // Low priority -> No reminder needed
  }

  const timerId = setInterval(async () => {
    try {
      const staffUser = await client.users.fetch(claimedStaffId).catch(() => null);
      if (staffUser) {
        const embed = createStyledEmbed({
          title: `🎟️ Claimed Ticket Reminder`,
          description:
            `Hello **${staffUser.username}**! You claimed ticket **#${channel.name}** in **${channel.guild.name}**.\n\n` +
            `• **Priority:** \`${priorityText}\`\n` +
            `• **Ticket Channel:** <#${channel.id}>\n\n` +
            `Please check back on this ticket to assist the user!`,
          clientUser: client.user
        });
        await staffUser.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {}
  }, intervalMs);

  priorityTimers.set(channel.id, timerId);
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

function buildTicketEmbed(ticketNum, categoryName, opener, priorityText = 'Low', claimedByText = 'Unclaimed', anonMode = 'OFF') {
  const priorityColorMap = {
    'Urgent': 0xFF0055,
    'Normal': 0xFEE75C,
    'Low': 0x57F287
  };

  const color = priorityColorMap[priorityText] || 0x57F287;

  const ticketEmoji = emojis.TICKETS || '🎟️';
  const profileEmoji = emojis.PROFILE || '👤';
  const zapEmoji = emojis.ANALYTICS_ZAP || emojis.ZAP || '⚡';
  const crownEmoji = emojis.SPECIAL_ROLES || '👑';
  const anonEmoji = emojis.PROFILE || '🎭';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${ticketEmoji} ${opener.username}'s Ticket — ${categoryName}`)
    .setDescription(
      `Welcome <@${opener.id}>! Thanks for reaching out to support.\n` +
      `Our staff team will assist you shortly — please explain your request in full detail below.`
    )
    .addFields(
      { name: `${profileEmoji} Opened By`, value: `<@${opener.id}> (\`${opener.tag || opener.username}\`)`, inline: true },
      { name: `${zapEmoji} Priority Level`, value: `\`${priorityText}\``, inline: true },
      { name: `${crownEmoji} Claimed By`, value: claimedByText, inline: true },
      { name: `${anonEmoji} Anonymous Mode`, value: `\`${anonMode}\``, inline: true }
    )
    .setFooter({
      text: `Ticket ID #${ticketNum} • Support Desk`,
      iconURL: opener.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();
}

function buildTicketActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim_btn').setEmoji(emojis.OBJ_OWNER || '👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_lock_btn').setEmoji(emojis.OBJ_LOCK || '🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_callstaff_btn').setEmoji(emojis.OBJ_INVITES || '📞').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_priority_btn').setEmoji(emojis.OBJ_ZAP || '⚡').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_anon_btn').setEmoji(emojis.OBJ_PROFILE || '🎭').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_addmember_btn').setEmoji(emojis.OBJ_TOOLS || '➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close_btn').setEmoji(emojis.OBJ_REMOVE || emojis.ERROR).setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

module.exports = {
  name: 'ticket',
  description: 'Complete Ticket System: setup, claim, close, reopen, callstaff, anonymous & priority timers',
  aliases: [
    'tickets', 't', 'ticketpanel', 'staffrole',
    'panel_deploy', 'ticket_setup', 'add_member', 'remove_member',
    'category_add', 'category_edit', 'category_remove', 'category_list', 'categories',
    'claim', 'reopen', 'callstaff', 'ticketinfo', 'anonymous'
  ],
  ticketConfigs,
  priorityTimers,
  staffCallCooldowns,
  getOrCreateTicketConfig,
  ensureTicketLogChannels,
  updateTicketStaffReminderTimer,
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
    if (invoked === 'claim') sub = 'claim';
    if (invoked === 'reopen') sub = 'reopen';
    if (invoked === 'callstaff') sub = 'callstaff';
    if (invoked === 'anonymous') sub = 'anonymous';

    const guild = message.guild;
    const author = message.author;
    const config = getOrCreateTicketConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Strict Ticket Channel Scope Restriction
    const isTicketChannel = message.channel.name.startsWith('ticket-') || 
                            message.channel.name.startsWith('ticket') || 
                            (message.channel.topic && message.channel.topic.includes('ticket|'));

    const ticketOnlySubcommands = [
      'claim', 'close', 'reopen', 'add', 'remove',
      'add_member', 'remove_member', 'callstaff', 'anonymous',
      'anon', 'lock', 'transcript'
    ];

    if (ticketOnlySubcommands.includes(sub) && !isTicketChannel) {
      return message.reply(`${emojis.WARNING} The \`.${sub}\` command can only be used inside active ticket channels!`);
    }

    // 1. TICKET SETUP (Deploys multi-category dropdown panel & log channels)
    if (['panel', 'setup', 'panel_deploy', 'wizard'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING || emojis.WARNING} Only Administrators can run ticket setup.`);
      }

      const { logChan, transcriptChan, staffRole } = await ensureTicketLogChannels(guild);

      const staffRoleMentions = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(', ') || (staffRole ? `<@&${staffRole.id}>` : '`Administrator`');

      const { createDynamicBox } = require('../utils/boxBuilder');

      const panelEmbed = new EmbedBuilder()
        .setColor(0x00FFBB)
        .setTitle(`${emojis.TICKETS || '🎫'} ${guild.name} Private Support Desk`)
        .setDescription(
          `Welcome to **${guild.name}** Support Center!\n\n` +
          `Select a category from the dropdown menu below to open a private support ticket.\n\n` +
          `**Available Support Categories:**\n` +
          config.categories.map(c => `• ${resolveEmojiDisplay(c.emoji)} **${c.name}** — ${c.description}`).join('\n') + `\n\n` +
          `**Support Staff Role**: ${staffRoleMentions}`
        )
        .setFooter({ text: 'Naruto Ticket System • Fast Private Support' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('🏷️ Select a support category...')
        .addOptions(
          config.categories.map(c => ({
            label: c.name,
            value: c.id,
            description: c.description,
            emoji: resolveSelectMenuEmoji(c.emoji)
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await message.channel.send({ embeds: [panelEmbed], components: [row] });

      config.panelChanId = message.channel.id;
      ticketConfigs.set(guild.id, config);

      const statusBox = createDynamicBox('TICKET DESK DEPLOYED', [
        { key: 'Panel', value: 'Active' },
        { key: 'Staff', value: staffRole ? staffRole.name : 'Created' },
        { key: 'Logs ', value: logChan ? logChan.name : 'Created' }
      ]);

      return message.reply({
        embeds: [
          createStyledEmbed({
            title: `${emojis.SUCCESS} Ticket Desk Deployed Successfully`,
            subtitle: `${emojis.TICKETS} Ticket Panel Status`,
            description:
              '```\n' + statusBox + '\n```\n\n' +
              `• **Ticket Panel**: Active in <#${message.channel.id}>\n` +
              `• **Staff Role Linked**: ${staffRole ? `<@&${staffRole.id}>` : '`Created`'}\n` +
              `• **Ticket Logs**: ${logChan ? `<#${logChan.id}>` : '`Created`'}\n` +
              `• **Ticket Transcripts**: ${transcriptChan ? `<#${transcriptChan.id}>` : '`Created`'}`,
            requestedBy: author,
            clientUser
          })
        ]
      });
    }

    // 2. ANONYMOUS STAFF MODE TOGGLE (.ticket anonymous on/off)
    if (sub === 'anonymous' || sub === 'anon') {
      const mode = args[1]?.toLowerCase();
      const topic = message.channel.topic || '';

      if (!topic.includes('ticket|')) {
        return message.reply(`${emojis.WARNING} Command must be executed inside an active ticket channel!`);
      }

      const isAnonOn = topic.includes('anon:on');
      let newAnon = isAnonOn ? 'off' : 'on';
      if (mode === 'on') newAnon = 'on';
      if (mode === 'off') newAnon = 'off';

      let updatedTopic = topic;
      if (updatedTopic.includes('anon:')) {
        updatedTopic = updatedTopic.replace(/anon:(on|off)/, `anon:${newAnon}`);
      } else {
        updatedTopic += `|anon:${newAnon}`;
      }

      await message.channel.setTopic(updatedTopic).catch(() => {});

      return message.reply({
        content: `🎭 **Anonymous Staff Mode** is now **${newAnon.toUpperCase()}** for this ticket! Staff responses will be sent under Support Team identity.`,
        flags: 64
      });
    }

    // 3. STAFF CALL COOLDOWN (.ticket callstaff / .callstaff)
    if (sub === 'callstaff') {
      const lastCall = staffCallCooldowns.get(message.channel.id) || 0;
      const cooldownMs = 60 * 60 * 1000; // 1 Hour
      const elapsed = Date.now() - lastCall;

      if (elapsed < cooldownMs) {
        const remainingMins = Math.ceil((cooldownMs - elapsed) / 60000);
        return message.reply({
          content: `⏳ **Staff Call Cooldown**: Staff was called recently. You can call staff again in **${remainingMins} minutes**.`,
          flags: 64
        });
      }

      staffCallCooldowns.set(message.channel.id, Date.now());

      const staffPings = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(' ') || '@here';
      await message.channel.send({ content: `📞 **Call Staff Alert**: ${staffPings}\n<@${author.id}> has summoned support staff!` }).catch(() => {});
      return message.reply({ content: `${emojis.SUCCESS} Support staff summoned!`, flags: 64 });
    }

    // 4. STAFF ROLES MANAGEMENT
    if (sub === 'staff' || sub === 'staffrole') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can manage ticket staff roles.`);
      }

      const action = args[1]?.toLowerCase();
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);

      if (action === 'add' && role) {
        config.staffRoles.add(role.id);
        ticketConfigs.set(guild.id, config);
        return message.reply({ content: `${emojis.SUCCESS} Added <@&${role.id}> as Ticket Support Staff.`, allowedMentions: { parse: [], repliedUser: false } });
      } else if (action === 'remove' && role) {
        config.staffRoles.delete(role.id);
        ticketConfigs.set(guild.id, config);
        return message.reply({ content: `${emojis.SUCCESS} Removed <@&${role.id}> from Ticket Support Staff.`, allowedMentions: { parse: [], repliedUser: false } });
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

    // 4.5 ADD MEMBER / REMOVE MEMBER (.add_member @user / .remove_member @user)
    if (sub === 'add' || sub === 'add_member') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.add_member @user\``);

      await message.channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      }).catch(() => {});

      return message.reply(`${emojis.SUCCESS} Added <@${target.id}> to this ticket channel.`);
    }

    if (sub === 'remove' || sub === 'remove_member') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.remove_member @user\``);

      await message.channel.permissionOverwrites.edit(target.id, {
        ViewChannel: false,
        SendMessages: false
      }).catch(() => {});

      return message.reply(`${emojis.SUCCESS} Removed <@${target.id}> from this ticket channel.`);
    }

    // 5. CLAIM TICKET (.ticket claim / .claim)
    if (sub === 'claim') {
      const isStaff = message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      Array.from(config.staffRoles).some(rId => message.member.roles.cache.has(rId));

      if (!isStaff) {
        return message.reply(`${emojis.WARNING} Only support staff members can claim tickets!`);
      }

      return message.reply(`${emojis.SUCCESS} Ticket claimed by <@${author.id}>.`);
    }

    // 6. REOPEN TICKET (.ticket reopen / .reopen)
    if (sub === 'reopen') {
      const topic = message.channel.topic || '';
      const match = topic.match(/owner:(\d+)/);
      const ownerId = match ? match[1] : null;

      if (ownerId) {
        await message.channel.permissionOverwrites.edit(ownerId, {
          ViewChannel: true,
          SendMessages: true
        }).catch(() => {});
      }

      return message.reply(`${emojis.SUCCESS} Ticket reopened by <@${author.id}>.`);
    }

    // 7. LOCK TICKET (.ticket lock / .lock)
    if (sub === 'lock') {
      const topic = message.channel.topic || '';
      const match = topic.match(/owner:(\d+)/);
      const ownerId = match ? match[1] : null;

      if (ownerId) {
        await message.channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => {});
      }

      return message.reply(`🔒 Ticket locked by <@${author.id}>.`);
    }

    // 8. TICKET TRANSCRIPT (.ticket transcript / .transcript)
    if (sub === 'transcript') {
      const fetchedMsgs = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!fetchedMsgs) return message.reply(`${emojis.WARNING} Could not fetch ticket message history.`);

      const buffer = generateTranscriptBuffer(message.channel, fetchedMsgs, author);
      const attachment = new AttachmentBuilder(buffer, { name: `transcript-${message.channel.name}.txt` });

      return message.reply({
        content: `📜 **Ticket Transcript Exported:**`,
        files: [attachment]
      });
    }

    // 9. CLOSE TICKET (.ticket close / .close)
    if (sub === 'close') {
      return message.reply(`🔒 Closing ticket channel in 3 seconds...`).then(() => {
        setTimeout(() => message.channel.delete().catch(() => {}), 3000);
      });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'ticket');
  }
};

