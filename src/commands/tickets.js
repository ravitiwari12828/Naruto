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
  description: 'Complete Ticket System with category_add, category_edit, category_remove, category_list, claim, close, reopen, callstaff & transcript',
  aliases: [
    'tickets', 't', 'ticketpanel', 'staffrole',
    'panel_deploy', 'ticket_setup', 'add_member', 'remove_member',
    'category_add', 'category_edit', 'category_remove', 'category_list', 'categories',
    'claim', 'reopen', 'callstaff', 'ticketinfo'
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
    if (invoked === 'category_add') sub = 'category_add';
    if (invoked === 'category_edit') sub = 'category_edit';
    if (invoked === 'category_remove') sub = 'category_remove';
    if (invoked === 'category_list' || invoked === 'categories') sub = 'categories';
    if (invoked === 'claim') sub = 'claim';
    if (invoked === 'reopen') sub = 'reopen';
    if (invoked === 'callstaff') sub = 'callstaff';

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
          config.categories.map(c => `• ${c.emoji || '🎫'} **${c.name}** — ${c.description}`).join('\n') + `\n\n` +
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

    // 3. CATEGORY LIST (.ticket category list / .category_list / .categories)
    if (sub === 'categories' || sub === 'category_list' || (sub === 'category' && (args[1]?.toLowerCase() === 'list' || !args[1]))) {
      const catList = config.categories.map((c, i) =>
        `**${i + 1}.** ${c.emoji || '🎫'} **${c.name}** (\`${c.id}\`)\n` +
        `   • *${c.description || 'No description'}*`
      ).join('\n\n') || '*No categories configured.*';

      const embed = createStyledEmbed({
        title: `${emojis.TICKETS} Ticket Support Categories (${config.categories.length})`,
        subtitle: `Category Configuration Hub — ${guild.name}`,
        description:
          `Below are the active support categories available in your ticket panel dropdown:\n\n` +
          `${catList}\n\n` +
          `**${emojis.SCROLL} Category Management Suite:**\n` +
          `\`\`\`\n` +
          `.ticket category add <Name> [Emoji] [Description]\n` +
          `.ticket category edit <ID> <New Name> [Emoji] [Desc]\n` +
          `.ticket category remove <ID/Name>\n` +
          `.ticket category list\n` +
          `\`\`\``,
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [embed] });
    }

    // 4. CATEGORY ADD (.ticket category add <Name> [Emoji] [Description] / .category_add)
    if (sub === 'category_add' || (sub === 'category' && args[1]?.toLowerCase() === 'add')) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can add ticket categories.`);
      }

      const params = sub === 'category_add' ? args : args.slice(2);
      if (params.length === 0) {
        return message.reply(`${emojis.WARNING} Usage: \`.ticket category add <Name> [Emoji] [Description]\``);
      }

      if (config.categories.length >= 25) {
        return message.reply(`${emojis.WARNING} Reached maximum limit of 25 ticket categories.`);
      }

      const name = params[0];
      const emoji = params[1] && params[1].length <= 50 ? params[1] : '🎫';
      const description = params.slice(2).join(' ') || `Open a ${name} support ticket`;
      const catId = `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      config.categories.push({ id: catId, name, emoji, description });
      ticketConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `${emojis.SUCCESS} Ticket Category Created`,
        description:
          `Successfully added **${name}** to active ticket categories!\n\n` +
          `• **Category ID:** \`${catId}\`\n` +
          `• **Display Name:** ${emoji} **${name}**\n` +
          `• **Description:** *${description}*\n\n` +
          `*Run \`.ticket setup\` to redeploy your updated panel!*`,
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [embed] });
    }

    // 5. CATEGORY EDIT (.ticket category edit <id> <newName> [emoji] [desc] / .category_edit)
    if (sub === 'category_edit' || (sub === 'category' && args[1]?.toLowerCase() === 'edit')) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can edit ticket categories.`);
      }

      const params = sub === 'category_edit' ? args : args.slice(2);
      const targetId = params[0]?.toLowerCase();
      if (!targetId || !params[1]) {
        return message.reply(`${emojis.WARNING} Usage: \`.ticket category edit <Category ID or Name> <New Name> [New Emoji] [New Desc]\``);
      }

      const catObj = config.categories.find(c => c.id.toLowerCase() === targetId || c.name.toLowerCase() === targetId);
      if (!catObj) {
        return message.reply(`${emojis.WARNING} Category \`${targetId}\` not found. Run \`.ticket category list\` to view all valid IDs.`);
      }

      catObj.name = params[1];
      if (params[2]) catObj.emoji = params[2];
      if (params.slice(3).length > 0) catObj.description = params.slice(3).join(' ');

      ticketConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `${emojis.TOOLS} Ticket Category Updated`,
        description:
          `Successfully updated category **${catObj.name}**!\n\n` +
          `• **Category ID:** \`${catObj.id}\`\n` +
          `• **New Name:** ${catObj.emoji} **${catObj.name}**\n` +
          `• **New Description:** *${catObj.description}*`,
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [embed] });
    }

    // 6. CATEGORY REMOVE (.ticket category remove <id/name> / .category_remove)
    if (sub === 'category_remove' || (sub === 'category' && args[1]?.toLowerCase() === 'remove')) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can remove ticket categories.`);
      }

      const params = sub === 'category_remove' ? args : args.slice(2);
      const targetId = params[0]?.toLowerCase();
      if (!targetId) {
        return message.reply(`${emojis.WARNING} Usage: \`.ticket category remove <Category ID or Name>\``);
      }

      const initialCount = config.categories.length;
      config.categories = config.categories.filter(c => c.id.toLowerCase() !== targetId && c.name.toLowerCase() !== targetId);

      if (config.categories.length === initialCount) {
        return message.reply(`${emojis.WARNING} Category \`${targetId}\` not found.`);
      }

      ticketConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `${emojis.REMOVE} Ticket Category Removed`,
        description:
          `Successfully removed category \`${targetId}\` from ticket panel!\n` +
          `Remaining active categories: **${config.categories.length}**`,
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [embed] });
    }

    // 7. ADD MEMBER TO TICKET (.ticket add @user / .add_member @user)
    if (sub === 'add' || sub === 'add_member') {
      const member = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!member) return message.reply(`${emojis.WARNING} Usage: \`.ticket add @user\``);

      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      }).catch(() => {});

      return message.reply(`${emojis.SUCCESS} Added <@${member.id}> to ticket channel ${message.channel}.`);
    }

    // 8. REMOVE MEMBER FROM TICKET (.ticket remove @user / .remove_member @user)
    if (sub === 'remove' || sub === 'remove_member') {
      const member = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!member) return message.reply(`${emojis.WARNING} Usage: \`.ticket remove @user\``);

      await message.channel.permissionOverwrites.delete(member.id).catch(() => {});

      return message.reply(`${emojis.SUCCESS} Removed <@${member.id}> from ticket channel ${message.channel}.`);
    }

    // 9. CLAIM TICKET (.ticket claim / .claim)
    if (sub === 'claim') {
      const isStaff = message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      Array.from(config.staffRoles).some(rId => message.member.roles.cache.has(rId));

      if (!isStaff) {
        return message.reply(`${emojis.WARNING} Only support staff members can claim tickets!`);
      }

      return message.reply(`${emojis.SUCCESS} Ticket claimed by <@${author.id}>.`);
    }

    // 10. REOPEN TICKET (.ticket reopen / .reopen)
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

    // 11. LOCK TICKET (.ticket lock / .lock)
    if (sub === 'lock') {
      const topic = message.channel.topic || '';
      const match = topic.match(/owner:(\d+)/);
      const ownerId = match ? match[1] : null;

      if (ownerId) {
        await message.channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => {});
      }

      return message.reply(`${emojis.LOCK} Ticket locked by <@${author.id}>.`);
    }

    // 12. CALL STAFF (.ticket callstaff / .callstaff)
    if (sub === 'callstaff') {
      const staffPings = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(' ') || '@here';
      await message.channel.send({ content: `📞 **Call Staff Alert**: ${staffPings}\n<@${author.id}> has requested immediate support staff attendance in this ticket!` }).catch(() => {});
      return message.reply(`${emojis.SUCCESS} Support staff summoned!`);
    }

    // 13. TICKET INFO (.ticket info / .ticketinfo)
    if (sub === 'info' || sub === 'ticketinfo') {
      const topic = message.channel.topic || '';
      const ownerMatch = topic.match(/owner:(\d+)/);
      const typeMatch = topic.match(/type:([^|]+)/);
      const priorityMatch = topic.match(/priority:([^|]+)/);
      const claimMatch = topic.match(/claim:([^|]+)/);

      const embed = createStyledEmbed({
        title: `${emojis.TICKETS} Ticket Audit Details`,
        subtitle: `Channel: #${message.channel.name}`,
        fields: [
          { name: `${emojis.HUMAN} Ticket Owner`, value: ownerMatch ? `<@${ownerMatch[1]}>` : 'Unknown', inline: true },
          { name: `${emojis.TICKETS} Category`, value: typeMatch ? typeMatch[1] : 'General Support', inline: true },
          { name: `${emojis.ZAP} Priority`, value: priorityMatch ? priorityMatch[1] : 'Urgent', inline: true },
          { name: `${emojis.MOD} Claimed By`, value: claimMatch ? claimMatch[1] : 'Unclaimed', inline: true },
          { name: `${emojis.STAR} Channel ID`, value: `\`${message.channel.id}\``, inline: true }
        ],
        thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
        requestedBy: author,
        clientUser
      });

      return message.reply({ embeds: [embed] });
    }

    // 14. TICKET TRANSCRIPT (.ticket transcript / .transcript)
    if (sub === 'transcript') {
      const fetchedMsgs = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!fetchedMsgs) return message.reply(`${emojis.WARNING} Could not fetch ticket message history.`);

      const buffer = generateTranscriptBuffer(message.channel, fetchedMsgs, author);
      const attachment = new AttachmentBuilder(buffer, { name: `transcript-${message.channel.name}.txt` });

      return message.reply({
        content: `${emojis.SCROLL} **Ticket Transcript Exported:**`,
        files: [attachment]
      });
    }

    // 15. CLOSE TICKET (.ticket close / .close)
    if (sub === 'close') {
      const modmailCmd = message.client.commands.get('modmail');
      if (modmailCmd) {
        return modmailCmd.execute(message, args);
      }
      return message.reply(`${emojis.LOCK} Closing ticket channel...`).then(() => {
        setTimeout(() => message.channel.delete().catch(() => {}), 3000);
      });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'ticket');
  }
};
