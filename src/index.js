try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, process.env values will be used directly
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason?.message || reason);
});
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  // Initialize Synn Lavalink connection
  try {
    initLavalink(client);
  } catch (e) {
    console.error('Lavalink init warning:', e.message);
  }

  try {
    const fetchedUser = await client.users.fetch(client.user.id, { force: true });
    client.botBannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });
    console.log(`[Developer Portal Banner URL]: ${client.botBannerURL || 'None set on Discord Dev Portal'}`);
  } catch (e) {
    console.error('Failed to fetch bot banner on startup:', e.message);
  }

  // Auto-set bot avatar using the generated Naruto avatar image
  try {
    const avatarPath = path.join(__dirname, '../assets/naruto_avatar.png');
    if (fs.existsSync(avatarPath)) {
      await client.user.setAvatar(avatarPath);
      console.log('[Avatar] ✅ Naruto avatar set successfully!');
    }
  } catch (e) {
    // Avatar update can be rate-limited by Discord (once every 10 mins), suppress error
    console.warn('[Avatar] Skipped avatar update (rate limited or already set):', e.message);
  }

  console.log(`\n==============================================`);
  console.log(`🍥 Naruto is ONLINE! Logged in as ${client.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`==============================================\n`);

  client.user.setActivity('🍥 Naruto | .help', { type: 3 }); // Watching .help
});

// Guild Join Listener — Bot Owner Private Whitelist & Lockdown System
client.on('guildCreate', async (guild) => {
  console.log(`🏠 [Bot Added to Server] ${guild.name} (ID: ${guild.id})`);

  const botlockCmd = client.commands.get('botlock');
  if (botlockCmd && botlockCmd.isGuildAuthorized) {
    const isAuth = botlockCmd.isGuildAuthorized(guild.id, guild.ownerId);
    if (!isAuth) {
      console.log(`🔒 [Lockdown Triggered] Leaving unauthorized server: ${guild.name} (ID: ${guild.id})`);

      try {
        const sysChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
        if (sysChannel) {
          const embed = createStyledEmbed({
            title: `🔒 Private Server Lockdown Mode`,
            description: `**${guild.name}** is not on the authorized server list.\n\nOnly the **Bot Owner (Synn)** can approve servers to host Naruto Bot. Leaving server automatically...`,
            clientUser: client.user
          });
          await sysChannel.send({ embeds: [embed] }).catch(() => {});
        }
      } catch (e) {}

      // Leave unauthorized server immediately
      await guild.leave().catch(() => {});
    }
  }
});

// Auto-Role Listener on Member Join
client.on('guildMemberAdd', async (member) => {
  try {
    const isBot = member.user.bot;
    const config = db.getAutoroles(member.guild.id);
    const automodConfig = db.getAutomod(member.guild.id);

    // Anti-Bot Protection check
    if (isBot) {
      if (automodConfig.enabled && !automodConfig.whitelistedBots.includes(member.user.id)) {
        console.log(`🛡️ AntiBot Triggered: Kick unwhitelisted bot ${member.user.tag}`);
        await member.kick('AntiBot Protection: Unwhitelisted Bot');
        return;
      }
    }

    const roleList = isBot ? config.bots : config.humans;
    for (const roleId of roleList) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role);
      }
    }

    // Welcome System Handler
    const welcomeCmd = client.commands.get('welcome');
    if (welcomeCmd && welcomeCmd.welcomeConfigs) {
      const welcConf = welcomeCmd.welcomeConfigs.get(member.guild.id);
      if (welcConf && welcConf.enabled && welcConf.channelId) {
        const welcChan = member.guild.channels.cache.get(welcConf.channelId);
        if (welcChan) {
          const formatted = welcConf.message
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount.toString());

          const embed = createStyledEmbed({
            title: `👋 Welcome to ${member.guild.name}!`,
            subtitle: `${emojis.NARUTO} New Shinobi Joined the Village!`,
            description: formatted,
            clientUser: client.user,
            thumbnailUrl: member.user.displayAvatarURL({ dynamic: true, size: 512 })
          });
          welcChan.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Error in guildMemberAdd:', err.message);
  }
});

// VoiceMaster & Temp VC Listener
client.on('voiceStateUpdate', async (oldState, newState) => {
  const vmCmd = client.commands.get('voicemaster');
  if (!vmCmd || !vmCmd.voicemasterConfigs) return;

  const guild = newState.guild || oldState.guild;
  const config = vmCmd.voicemasterConfigs.get(guild.id);
  if (!config || !config.enabled || !config.triggerChanId) return;

  // Joined trigger channel
  if (newState.channelId === config.triggerChanId) {
    try {
      const member = newState.member;
      const category = newState.channel.parent;

      const tempChan = await guild.channels.create({
        name: `🔊 ${member.user.username}'s Room`,
        type: ChannelType.GuildVoice,
        parent: category || undefined,
        permissionOverwrites: [
          { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.Connect] }
        ]
      });

      config.activeTempVCs.add(tempChan.id);
      await member.voice.setChannel(tempChan);
    } catch (e) {
      console.error('VoiceMaster create error:', e.message);
    }
  }

  // Left temp channel (delete if empty)
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

  console.log(`💬 [Message] ${message.author.tag} in #${message.channel.name}: "${message.content}"`);

  // 1. Activity Tracking
  db.addMessage(message.author.id, 1);

  // 15-Day Quarantine Probation Mass Ping Check
  const quarantineCmd = client.commands.get('quarantine');
  if (quarantineCmd && quarantineCmd.isMemberInQuarantine) {
    const qCheck = quarantineCmd.isMemberInQuarantine(message.member);
    if (qCheck.isQuarantined) {
      if (message.content.includes('@everyone') || message.content.includes('@here')) {
        await message.delete().catch(() => {});
        return message.channel.send(`🚨 **Mass Ping Blocked!** <@${message.author.id}> has been in this server for **${qCheck.daysJoined} days** (Quarantine Probation: **${qCheck.requiredDays} Days**). Mass pings are restricted.`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
      }
    }
  }

  // 2. AutoMod Filters
  const automod = db.getAutomod(message.guild.id);
  if (automod.enabled && !message.member.permissions.has('Administrator')) {
    // Profanity Filter
    const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger'];
    if (automod.profanity && badWords.some(w => contentLower.includes(w))) {
      await message.delete().catch(() => {});
      return message.channel.send(`${emojis.WARNING} <@${message.author.id}>, profanity is disabled on this server!`)
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    // Caps Filter
    if (automod.caps && message.content.length > 8) {
      const caps = message.content.replace(/[^A-Z]/g, '').length;
      if (caps / message.content.length > 0.7) {
        await message.delete().catch(() => {});
        return message.channel.send(`${emojis.WARNING} <@${message.author.id}>, please refrain from excessive caps!`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }
    }
  }

  // 3. Autoreact Engine
  const autoreacts = db.getAutoreacts(message.guild.id);
  for (const ar of autoreacts) {
    if (contentLower.includes(ar.trigger)) {
      message.react(ar.emoji).catch(() => {});
    }
  }

  // 4. Autoresponder Engine
  const autoresponses = db.getAutoresponses(message.guild.id);
  for (const resp of autoresponses) {
    if (contentLower === resp.trigger || contentLower.includes(resp.trigger)) {
      message.channel.send(resp.response).catch(() => {});
    }
  }

  // 4b. Sticky Notes Engine
  const stickyCmd = client.commands.get('stickynote');
  if (stickyCmd && stickyCmd.stickyNotesStore) {
    const stickyData = stickyCmd.stickyNotesStore.get(message.channel.id);
    if (stickyData && stickyData.text) {
      if (stickyData.lastMsgId) {
        message.channel.messages.fetch(stickyData.lastMsgId).then(m => m.delete()).catch(() => {});
      }
      const stickyEmbed = createStyledEmbed({
        title: `📌 Sticky Note`,
        description: stickyData.text,
        clientUser: client.user,
        footerText: `Sticky Message • Stays at the bottom of this channel`
      });
      message.channel.send({ embeds: [stickyEmbed] }).then(sentMsg => {
        stickyData.lastMsgId = sentMsg.id;
      }).catch(() => {});
    }
  }

  // 5. Check if Bot is Mentioned Directly
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

  // If user just pinged the bot with no command
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

// Button Interaction Handler (Ticket creation, etc.)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // 1. Create Ticket Button
  if (interaction.customId === 'create_ticket_btn') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});

    const guild = interaction.guild;
    const user = interaction.user;

    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(guild.id) : { ticketCounter: 0, staffRoles: new Set() };
    const { logChan, category } = ticketCmd ? await ticketCmd.ensureTicketLogChannels(guild) : { logChan: null, category: null };

    config.ticketCounter++;
    const ticketNum = config.ticketCounter;
    const chanName = `ticket-${ticketNum}`;

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
        topic: `ticket|owner:${user.id}|type:General|priority:Urgent|claim:none`,
        parent: category ? category.id : undefined,
        permissionOverwrites: overwrites
      });

      const ticketEmbed = ticketCmd.buildTicketEmbed(ticketNum, 'General Support', user, 'Urgent', 'Unclaimed');
      const actionRows = ticketCmd.buildTicketActionRows();

      const pings = [`<@${user.id}>`, ...Array.from(config.staffRoles).map(id => `<@&${id}>`)].join(' ');
      await ticketChan.send({ content: pings, embeds: [ticketEmbed], components: actionRows });

      if (logChan) {
        const logEmbed = createStyledEmbed({
          title: `🎟️ New Ticket Opened`,
          description: `**User:** <@${user.id}> (${user.tag})\n**Ticket:** ${ticketChan}\n**Ticket ID:** #${ticketNum}`,
          requestedBy: user,
          clientUser: client.user
        });
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }

      ticketCmd.ticketConfigs.set(guild.id, config);
      return interaction.editReply({ content: `✅ Ticket created! Head over to ${ticketChan}` }).catch(() => {});
    } catch (e) {
      console.error('Failed to create ticket channel:', e);
      return interaction.editReply({ content: `❌ Failed to create ticket channel. Make sure the bot has \`Manage Channels\` permission.` }).catch(() => {});
    }
  }

  // 2. Claim Ticket Button
  if (interaction.customId === 'ticket_claim_btn' || interaction.customId === 'claim_ticket_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const message = interaction.message;
    const ticketCmd = client.commands.get('ticket');

    const embed = EmbedBuilder.from(message.embeds[0]);
    embed.spliceFields(2, 1, { name: 'Claimed by', value: `<@${user.id}>`, inline: false });

    await message.edit({ embeds: [embed] }).catch(() => {});
    await interaction.reply({ content: `🛡️ Ticket claimed by <@${user.id}>.` }).catch(() => {});

    if (ticketCmd) {
      const { logChan } = await ticketCmd.ensureTicketLogChannels(interaction.guild);
      if (logChan) {
        const logEmbed = createStyledEmbed({
          title: `🙋‍♂️ Ticket Claimed`,
          description: `**Staff Member:** <@${user.id}> (${user.tag})\n**Channel:** ${channel}`,
          requestedBy: user,
          clientUser: client.user
        });
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  }

  // 3. Priority Button
  if (interaction.customId === 'ticket_priority_btn') {
    const user = interaction.user;
    const message = interaction.message;

    const currentPriorityField = message.embeds[0].fields.find(f => f.name === 'Priority')?.value || '🔴 Urgent';
    let newPriority = 'Urgent';

    if (currentPriorityField.includes('Urgent')) newPriority = 'Normal';
    else if (currentPriorityField.includes('Normal')) newPriority = 'Low';
    else if (currentPriorityField.includes('Low')) newPriority = 'Urgent';

    const embed = EmbedBuilder.from(message.embeds[0]);
    const color = newPriority === 'Urgent' ? 0xED4245 : newPriority === 'Normal' ? 0xFEE75C : 0x57F287;
    embed.setColor(color);
    embed.spliceFields(1, 1, { name: 'Priority', value: `${newPriority === 'Urgent' ? '🔴' : newPriority === 'Normal' ? '🟡' : '🟢'} ${newPriority}`, inline: false });

    await message.edit({ embeds: [embed] }).catch(() => {});
    await interaction.reply({ content: `🚦 Priority set to **${newPriority}** by <@${user.id}>.` }).catch(() => {});
  }

  // 4. Add Member Button
  if (interaction.customId === 'ticket_addmember_btn') {
    const user = interaction.user;
    const channel = interaction.channel;

    await interaction.reply({ content: `➕ Please type the username or mention the member you want to add e.g. \`.ticket add @user\``, ephemeral: true }).catch(() => {});
  }

  // 5. Lock Ticket Button
  if (interaction.customId === 'ticket_lock_btn') {
    const user = interaction.user;
    const channel = interaction.channel;

    try {
      const topic = channel.topic || '';
      const match = topic.match(/owner:(\d+)/);
      const ownerId = match ? match[1] : null;

      if (ownerId) {
        await channel.permissionOverwrites.edit(ownerId, { SendMessages: false });
      }

      await interaction.reply({ content: `🔒 Ticket locked by <@${user.id}>.` }).catch(() => {});
    } catch (e) {
      await interaction.reply({ content: `🔒 Ticket locked by <@${user.id}>.` }).catch(() => {});
    }
  }

  // 6. Close Ticket Button
  if (interaction.customId === 'ticket_close_btn' || interaction.customId === 'close_ticket_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');

    await interaction.reply({ content: `🔒 Ticket closed by <@${user.id}>. Deleting in **5 seconds**...` }).catch(() => {});

    const msgs = await channel.messages.fetch({ limit: 100 });
    const buffer = ticketCmd ? ticketCmd.generateTranscriptBuffer(channel, msgs, user) : Buffer.from('Transcript error', 'utf-8');
    const { AttachmentBuilder } = require('discord.js');
    const attachment = new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });

    if (ticketCmd) {
      const { logChan, transcriptChan } = await ticketCmd.ensureTicketLogChannels(interaction.guild);
      if (transcriptChan) {
        const transEmbed = createStyledEmbed({
          title: `📜 Saved Ticket Transcript`,
          description: `**Channel:** \`${channel.name}\`\n**Closed By:** ${user.tag} (${user.id})\n**Messages Recorded:** ${msgs.size}`,
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

  // 4. Music Player Controller Buttons
  if (interaction.customId.startsWith('music_')) {
    const musicCmd = client.commands.get('music');
    if (!musicCmd) return;

    const actionMap = {
      music_prev: 'previous',
      music_pause: 'pause',
      music_skip: 'skip',
      music_loop: 'loop',
      music_stop: 'stop'
    };

    const action = actionMap[interaction.customId];
    if (action) {
      await interaction.deferUpdate().catch(() => {});
      const mockMsg = {
        guild: interaction.guild,
        author: interaction.user,
        member: interaction.member,
        channel: interaction.channel,
        content: `.${action}`,
        client,
        reply: (opts) => interaction.followUp(opts).catch(() => {})
      };
      await musicCmd.execute(mockMsg, [action]);
    }
  }
});

// Bot Login (if Token provided)
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'your_discord_bot_token_here') {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to log in:', err.message);
  });
} else {
  console.log('\n⚠️ DISCORD_TOKEN is not set in .env file!');
  console.log('To start the bot on Discord, open .env and add your DISCORD_TOKEN.\n');
}

module.exports = client;
