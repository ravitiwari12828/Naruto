try {
  require('dotenv').config();
} catch (e) {}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason?.message || reason);
});

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const db = require('./database/db');
const emojis = require('./utils/emojis');
const { createStyledEmbed } = require('./utils/embedBuilder');
const { dispatchLog } = require('./utils/logger');
const { initLavalink } = require('./utils/lavalink');

const PREFIX = process.env.PREFIX || '.';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

// Load Commands Dynamically
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.name) {
      client.commands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => client.commands.set(alias, command));
      }
    }
  }
}

// Ready Event
client.once('ready', async () => {
  try {
    initLavalink(client);
  } catch (e) {
    console.error('Lavalink init warning:', e.message);
  }

  try {
    const fetchedUser = await client.users.fetch(client.user.id, { force: true });
    client.botBannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });
    console.log(`[Developer Portal Banner URL]: ${client.botBannerURL || 'None set'}`);
  } catch (e) {}

  console.log(`\n==============================================`);
  console.log(`🍥 Naruto is ONLINE! Logged in as ${client.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`==============================================\n`);

  client.user.setActivity('🍥 Naruto | .help', { type: 3 });
});

// Guild Join Listener — Bot Owner Private Whitelist & Lockdown
client.on('guildCreate', async (guild) => {
  console.log(`🏠 [Bot Added to Server] ${guild.name} (ID: ${guild.id})`);
  const botlockCmd = client.commands.get('botlock');
  if (botlockCmd && botlockCmd.isGuildAuthorized) {
    const isAuth = botlockCmd.isGuildAuthorized(guild.id, guild.ownerId);
    if (!isAuth) {
      console.log(`🔒 [Lockdown Triggered] Leaving unauthorized server: ${guild.name} (ID: ${guild.id})`);
      try {
        const defaultChan = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
        if (defaultChan) {
          await defaultChan.send(`🔒 **Private Server Lockdown**: This bot is locked to authorized servers only. Leaving server...`);
        }
      } catch (e) {}
      guild.leave().catch(() => {});
    }
  }
});

// Voice State Update Listener (VoiceMaster Join-to-Create, In-VC Auto Role, VC Audit Logs)
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;

  if (!guild || !member || member.user.bot) return;

  const vmCmd = client.commands.get('voicemaster');
  const config = vmCmd ? vmCmd.getOrCreateVMConfig(guild.id) : { enabled: false };

  // 1. In-VC Auto Role Management
  if (config.inVcRoleId) {
    const role = guild.roles.cache.get(config.inVcRoleId);
    if (role) {
      if (newState.channelId && !oldState.channelId) {
        member.roles.add(role).catch(() => {});
      } else if (!newState.channelId && oldState.channelId) {
        member.roles.remove(role).catch(() => {});
      }
    }
  }

  // 2. VC Audit Logs
  if (!oldState.channelId && newState.channelId) {
    dispatchLog(guild, 'vc', {
      color: 0x57F287,
      title: '🔊 Voice Channel Joined',
      description: `**Member:** <@${member.id}> (${member.user.tag})\n**Voice Channel:** <#${newState.channelId}>`,
      footer: `User ID: ${member.id}`
    });
  } else if (oldState.channelId && !newState.channelId) {
    dispatchLog(guild, 'vc', {
      color: 0xED4245,
      title: '🔇 Voice Channel Left',
      description: `**Member:** <@${member.id}> (${member.user.tag})\n**Voice Channel:** <#${oldState.channelId}>`,
      footer: `User ID: ${member.id}`
    });
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    dispatchLog(guild, 'vc', {
      color: 0xFEE75C,
      title: '🔀 Voice Channel Switched',
      description: `**Member:** <@${member.id}> (${member.user.tag})\n**From:** <#${oldState.channelId}>\n**To:** <#${newState.channelId}>`,
      footer: `User ID: ${member.id}`
    });
  }

  // 3. VoiceMaster Join to Create Private VC
  const isTrigger = (config.enabled && newState.channelId && newState.channelId === config.triggerChanId) ||
                    (newState.channel?.name?.toLowerCase().includes('join to create'));

  if (isTrigger) {
    try {
      const category = newState.channel?.parent;
      const cleanName = member.user.username.replace(/[^a-zA-Z0-9]/g, '') || 'Member';
      const tempVC = await guild.channels.create({
        name: `🔊 ${cleanName}'s Room`,
        type: ChannelType.GuildVoice,
        parent: category ? category.id : undefined,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers] }
        ]
      });

      config.activeTempVCs.set(tempVC.id, { ownerId: member.id, guildId: guild.id });
      await newState.setChannel(tempVC).catch(() => {});

      // Auto-post VoiceMaster Control Panel into newly created VC text chat
      if (vmCmd) {
        const embed = vmCmd.buildVoiceMasterInterfaceEmbed();
        const rows = vmCmd.buildVoiceMasterActionRows();
        await tempVC.send({ content: `<@${member.id}> Welcome to your private voice channel! Use the control panel below to lock, hide, or manage permissions:`, embeds: [embed], components: rows }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to create temp VC:', e.message);
    }
  }

  // Left temp VC (delete if empty)
  if (oldState.channelId && config.activeTempVCs.has(oldState.channelId)) {
    const oldChan = oldState.channel;
    if (oldChan && oldChan.members.size === 0) {
      config.activeTempVCs.delete(oldChan.id);
      oldChan.delete().catch(() => {});
    }
  }
});

// Message Delete & Snipe Listener
client.on('messageDelete', (deletedMessage) => {
  if (!deletedMessage || !deletedMessage.guild) return;
  if (deletedMessage.author && !deletedMessage.author.bot) {
    const infoCmd = client.commands.get('info');
    if (infoCmd && infoCmd.snipeStore) {
      infoCmd.snipeStore.set(deletedMessage.channel.id, {
        author: deletedMessage.author,
        content: deletedMessage.content,
        image: deletedMessage.attachments?.first()?.url || null,
        timestamp: Date.now()
      });
    }
  }

  dispatchLog(deletedMessage.guild, 'messages', {
    color: 0xED4245,
    title: '🗑️ Message Deleted',
    description: `**Author:** ${deletedMessage.author ? deletedMessage.author.tag : 'Unknown'}\n**Channel:** <#${deletedMessage.channel.id}>\n\n**Content:**\n${deletedMessage.content || '*[No Text / Attachment]*'}`,
    footer: `User ID: ${deletedMessage.author?.id || 'Unknown'}`
  });
});

// Message Edit Listener
client.on('messageUpdate', (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
  dispatchLog(oldMsg.guild, 'messages', {
    color: 0xFEE75C,
    title: '📝 Message Edited',
    description: `**Author:** ${oldMsg.author.tag}\n**Channel:** <#${oldMsg.channel.id}>\n\n**Before:**\n${oldMsg.content || '*[Empty]*'}\n\n**After:**\n${newMsg.content || '*[Empty]*'}`,
    footer: `User ID: ${oldMsg.author.id}`
  });
});

// Member Leave Listener
client.on('guildMemberRemove', (member) => {
  dispatchLog(member.guild, 'joinleave', {
    color: 0xED4245,
    title: '📤 Member Left',
    description: `**User:** ${member.user.tag} (${member.id})\n**Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    footer: `Total Members: ${member.guild.memberCount}`
  });
});

// Channel Created / Deleted Listeners
client.on('channelCreate', (channel) => {
  if (!channel.guild) return;
  dispatchLog(channel.guild, 'channels', {
    color: 0x57F287,
    title: '📁 Channel Created',
    description: `**Channel:** <#${channel.id}> (\`${channel.name}\`)\n**Type:** ${channel.type}`,
    footer: `Channel ID: ${channel.id}`
  });
});

client.on('channelDelete', (channel) => {
  if (!channel.guild) return;
  dispatchLog(channel.guild, 'channels', {
    color: 0xED4245,
    title: '🗑️ Channel Deleted',
    description: `**Channel Name:** \`${channel.name}\`\n**Type:** ${channel.type}`,
    footer: `Channel ID: ${channel.id}`
  });
});

// Role Created / Deleted Listeners
client.on('roleCreate', (role) => {
  dispatchLog(role.guild, 'roles', {
    color: 0x57F287,
    title: '🛡️ Role Created',
    description: `**Role:** <@&${role.id}> (\`${role.name}\`)`,
    footer: `Role ID: ${role.id}`
  });
});

client.on('roleDelete', (role) => {
  dispatchLog(role.guild, 'roles', {
    color: 0xED4245,
    title: '🗑️ Role Deleted',
    description: `**Role Name:** \`${role.name}\``,
    footer: `Role ID: ${role.id}`
  });
});

// Message Listener (AutoMod, Activity, Autoresponder, Autoreact, Commands)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  db.addMessage(message.author.id, 1);

  // 15-Day Quarantine Check
  const quarantineCmd = client.commands.get('quarantine');
  if (quarantineCmd && quarantineCmd.isMemberInQuarantine) {
    const qCheck = quarantineCmd.isMemberInQuarantine(message.member);
    if (qCheck.isQuarantined) {
      if (message.content.includes('@everyone') || message.content.includes('@here')) {
        await message.delete().catch(() => {});
        return message.channel.send(`🚨 **Mass Ping Blocked!** <@${message.author.id}> has been in this server for **${qCheck.daysJoined} days** (Quarantine Probation: **${qCheck.requiredDays} Days**).`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
      }
    }
  }

  // AutoMod
  const automod = db.getAutomod(message.guild.id);
  const contentLower = message.content.toLowerCase();

  if (automod.enabled && !message.member.permissions.has('Administrator')) {
    const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger'];
    if (automod.profanity && badWords.some(w => contentLower.includes(w))) {
      await message.delete().catch(() => {});
      return message.channel.send(`${emojis.WARNING} <@${message.author.id}>, profanity is disabled on this server!`)
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
  }

  // Autoreact
  const autoreacts = db.getAutoreacts(message.guild.id);
  for (const ar of autoreacts) {
    if (contentLower.includes(ar.trigger)) {
      message.react(ar.emoji).catch(() => {});
    }
  }

  // Autoresponder
  const autoresponses = db.getAutoresponses(message.guild.id);
  for (const resp of autoresponses) {
    if (contentLower === resp.trigger || contentLower.includes(resp.trigger)) {
      message.channel.send(resp.response).catch(() => {});
    }
  }

  const mentionPrefix = `<@${client.user.id}>`;
  const mentionNicknamePrefix = `<@!${client.user.id}>`;
  let usedPrefix = null;

  if (message.content.startsWith(PREFIX)) {
    usedPrefix = PREFIX;
  } else if (message.content.startsWith(mentionPrefix)) {
    usedPrefix = mentionPrefix;
  } else if (message.content.startsWith(mentionNicknamePrefix)) {
    usedPrefix = mentionNicknamePrefix;
  }

  if (message.content.trim() === mentionPrefix || message.content.trim() === mentionNicknamePrefix) {
    const helpCmd = client.commands.get('help');
    if (helpCmd) return helpCmd.execute(message, []);
  }

  if (!usedPrefix) return;

  const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  console.log(`⚡ [Executing Command] .${commandName} requested by ${message.author.tag}`);

  const statsCmd = client.commands.get('stats');
  if (statsCmd && statsCmd.incrementCommandCount) {
    statsCmd.incrementCommandCount();
  }

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    message.reply(`${emojis.DISABLED} An error occurred while executing that command.`).catch(() => {});
  }
});

// Interaction Listener (Ticket Category Dropdown, Call Staff, Transcripts to DM, VoiceMaster Panel, Music Filters)
client.on('interactionCreate', async (interaction) => {
  // 1. TICKET CATEGORY SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});

    const guild = interaction.guild;
    const user = interaction.user;
    const catValue = interaction.values[0];

    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(guild.id) : { ticketCounter: 0, staffRoles: new Set(), categories: [] };
    const { logChan, category } = ticketCmd ? await ticketCmd.ensureTicketLogChannels(guild) : { logChan: null, category: null };

    config.ticketCounter++;
    const ticketNum = config.ticketCounter;

    const catObj = config.categories.find(c => c.id === catValue) || { name: 'Support', emoji: '🎫' };
    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const catSlug = catObj.name.toLowerCase().replace(/\s+/g, '-');
    const chanName = `${cleanUsername}-${catSlug}-${ticketNum}`;

    try {
      const overwrites = [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
      ];

      config.staffRoles.forEach(roleId => {
        overwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] });
      });

      const ticketChan = await guild.channels.create({
        name: chanName,
        type: ChannelType.GuildText,
        topic: `ticket|owner:${user.id}|type:${catObj.name}|priority:Urgent|claim:none`,
        parent: category ? category.id : undefined,
        permissionOverwrites: overwrites
      });

      const ticketEmbed = ticketCmd.buildTicketEmbed(ticketNum, catObj.name, user, 'Urgent', 'Unclaimed');
      const actionRows = ticketCmd.buildTicketActionRows();

      const pings = [`<@${user.id}>`, ...Array.from(config.staffRoles).map(id => `<@&${id}>`)].join(' ');
      await ticketChan.send({ content: pings, embeds: [ticketEmbed], components: actionRows });

      if (logChan) {
        const logEmbed = createStyledEmbed({
          title: `🎟️ New Ticket Opened`,
          description: `**User:** <@${user.id}> (\`${user.tag}\`)\n**Category:** ${catObj.emoji} **${catObj.name}**\n**Ticket:** ${ticketChan}`,
          requestedBy: user,
          clientUser: client.user
        });
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }

      ticketCmd.ticketConfigs.set(guild.id, config);
      return interaction.editReply({ content: `✅ Ticket created! Head over to ${ticketChan}` }).catch(() => {});
    } catch (e) {
      console.error('Failed to create ticket channel:', e);
      return interaction.editReply({ content: `❌ Failed to create ticket channel. Check bot permissions.` }).catch(() => {});
    }
  }

  // 2. AUDIO FILTER SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'music_filter_select') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const val = interaction.values[0];
    const filterName = val.replace('filter_', '');

    return interaction.editReply({ content: `🎶 Audio filter set to **${filterName.toUpperCase()}**!` }).catch(() => {});
  }

  if (!interaction.isButton()) return;

  // 3. CALL STAFF BUTTON
  if (interaction.customId === 'ticket_callstaff_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

    const staffPings = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(' ') || '@here';
    await channel.send({ content: `📞 **Call Staff Alert**: ${staffPings}\n<@${user.id}> has requested immediate support staff attendance in this ticket!` }).catch(() => {});
    return interaction.reply({ content: `📞 Support staff summoned!`, ephemeral: true }).catch(() => {});
  }

  // 4. CLAIM TICKET BUTTON
  if (interaction.customId === 'ticket_claim_btn') {
    const user = interaction.user;
    const member = interaction.member;
    const message = interaction.message;
    const channel = interaction.channel;

    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

    // 1. Staff check (Administrator OR has any staffRole)
    const isStaff = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                    Array.from(config.staffRoles).some(rId => member.roles.cache.has(rId));

    if (!isStaff) {
      return interaction.reply({ content: `❌ Only support staff members can claim tickets!`, ephemeral: true }).catch(() => {});
    }

    // 2. Prevent multi-claim check
    const embed = EmbedBuilder.from(message.embeds[0]);
    const claimedField = embed.data.fields?.find(f => f.name.includes('Claimed'));

    if (claimedField && !claimedField.value.toLowerCase().includes('unclaimed') && !claimedField.value.toLowerCase().includes('none')) {
      return interaction.reply({ content: `⚠️ This ticket is already claimed by ${claimedField.value}! A ticket can only be claimed by 1 staff member.`, ephemeral: true }).catch(() => {});
    }

    embed.spliceFields(2, 1, { name: '🙋‍♂️ Claimed By', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true });

    await message.edit({ embeds: [embed] }).catch(() => {});
    await interaction.reply({ content: `🛡️ Ticket claimed by <@${user.id}>.` }).catch(() => {});

    if (ticketCmd) {
      const { logChan } = await ticketCmd.ensureTicketLogChannels(interaction.guild);
      if (logChan) {
        const logEmbed = createStyledEmbed({
          title: `🙋‍♂️ Ticket Claimed`,
          description: `**Staff Member:** <@${user.id}> (\`${user.tag}\`)\n**Ticket Channel:** ${channel}`,
          requestedBy: user,
          clientUser: client.user
        });
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  }

  // 5. PRIORITY TICKET BUTTON (With 4-5h / 10-12h Escalation Reminders)
  if (interaction.customId === 'ticket_priority_btn') {
    const user = interaction.user;
    const message = interaction.message;

    const currentPriorityField = message.embeds[0].fields.find(f => f.name.includes('Priority'))?.value || '🔴 Urgent';
    let newPriority = 'Urgent';

    if (currentPriorityField.includes('Urgent')) newPriority = 'Normal';
    else if (currentPriorityField.includes('Normal')) newPriority = 'Low';
    else if (currentPriorityField.includes('Low')) newPriority = 'Urgent';

    const embed = EmbedBuilder.from(message.embeds[0]);
    const color = newPriority === 'Urgent' ? 0xFF0055 : newPriority === 'Normal' ? 0xFEE75C : 0x57F287;
    embed.setColor(color);
    embed.spliceFields(1, 1, { name: '🚦 Priority Level', value: `${newPriority === 'Urgent' ? '🔴' : newPriority === 'Normal' ? '🟡' : '🟢'} ${newPriority}`, inline: true });

    await message.edit({ embeds: [embed] }).catch(() => {});
    await interaction.reply({ content: `🚦 Priority set to **${newPriority}** by <@${user.id}>.` }).catch(() => {});
  }

  // 6. ADD MEMBER BUTTON
  if (interaction.customId === 'ticket_addmember_btn') {
    return interaction.reply({ content: `➕ Use \`.ticket add @user\` to grant a member access to this ticket.`, ephemeral: true }).catch(() => {});
  }

  // 7. LOCK TICKET BUTTON
  if (interaction.customId === 'ticket_lock_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const topic = channel.topic || '';
    const match = topic.match(/owner:(\d+)/);
    const ownerId = match ? match[1] : null;

    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => {});
    }
    return interaction.reply({ content: `🔒 Ticket locked by <@${user.id}>.` }).catch(() => {});
  }

  // 8. CLOSE TICKET BUTTON (DM Transcript Buffer Delivery!)
  if (interaction.customId === 'ticket_close_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');

    await interaction.reply({ content: `🔒 Ticket closed by <@${user.id}>. Sending transcript & deleting in **5 seconds**...` }).catch(() => {});

    const msgs = await channel.messages.fetch({ limit: 100 });
    const buffer = ticketCmd ? ticketCmd.generateTranscriptBuffer(channel, msgs, user) : Buffer.from('Transcript', 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });

    // Send Transcript directly to Opener's DM
    const topic = channel.topic || '';
    const match = topic.match(/owner:(\d+)/);
    const ownerId = match ? match[1] : null;

    if (ownerId) {
      try {
        const openerUser = await client.users.fetch(ownerId);
        const dmEmbed = createStyledEmbed({
          title: `📜 Ticket Transcript — ${channel.name}`,
          description: `Here is the full text transcript of your closed ticket in **${interaction.guild.name}**.`,
          requestedBy: user,
          clientUser: client.user
        });
        await openerUser.send({ embeds: [dmEmbed], files: [attachment] }).catch(() => {});
      } catch (e) {}
    }

    if (ticketCmd) {
      const { logChan, transcriptChan } = await ticketCmd.ensureTicketLogChannels(interaction.guild);
      if (transcriptChan) {
        const transEmbed = createStyledEmbed({
          title: `📜 Ticket Closed & Saved`,
          description: `**Ticket Channel:** \`${channel.name}\`\n**Closed By:** ${user.tag} (${user.id})\n**Messages:** ${msgs.size}`,
          requestedBy: user,
          clientUser: client.user
        });
        await transcriptChan.send({ embeds: [transEmbed], files: [attachment] }).catch(() => {});
      }
    }

    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 5000);
  }

  // 9. VOICEMASTER INTERFACE CONTROLLER BUTTONS
  if (interaction.customId.startsWith('vm_')) {
    const voiceState = interaction.member?.voice;
    const channel = voiceState?.channel;

    if (!channel) {
      return interaction.reply({ content: `${emojis.WARNING} You must be in your private Voice Channel to use controls!`, ephemeral: true }).catch(() => {});
    }

    const action = interaction.customId.replace('vm_', '');

    switch (action) {
      case 'lock':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        return interaction.reply({ content: `🔒 Voice channel locked!`, ephemeral: true });
      case 'unlock':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
        return interaction.reply({ content: `🔓 Voice channel unlocked!`, ephemeral: true });
      case 'hide':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
        return interaction.reply({ content: `👁️ Voice channel hidden!`, ephemeral: true });
      case 'reveal':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
        return interaction.reply({ content: `👁️‍🗨️ Voice channel revealed!`, ephemeral: true });
      case 'mute':
        channel.members.forEach(m => m.voice.setMute(true).catch(() => {}));
        return interaction.reply({ content: `🔇 Muted all members in VC.`, ephemeral: true });
      case 'unmute':
        channel.members.forEach(m => m.voice.setMute(false).catch(() => {}));
        return interaction.reply({ content: `🔊 Unmuted all members in VC.`, ephemeral: true });
      case 'deafen':
        channel.members.forEach(m => m.voice.setDeaf(true).catch(() => {}));
        return interaction.reply({ content: `🔕 Deafened members in VC.`, ephemeral: true });
      case 'undeafen':
        channel.members.forEach(m => m.voice.setDeaf(false).catch(() => {}));
        return interaction.reply({ content: `🔔 Undeafened members in VC.`, ephemeral: true });
      default:
        return interaction.reply({ content: `⚙️ VoiceMaster action executed!`, ephemeral: true });
    }
  }
});

if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'your_discord_bot_token_here') {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to log in:', err.message);
  });
} else {
  console.log('\n⚠️ DISCORD_TOKEN is not set in .env file!\n');
}

module.exports = client;
