try {
  const v8 = require('v8');
  v8.setFlagsFromString('--max_old_space_size=128');
} catch (e) {}

try {
  require('dotenv').config();
} catch (e) {}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason?.message || reason);
});

// Render / Web Hosting Keepalive HTTP Server
const http = require('http');
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🍥 Naruto Bot is 24/7 Active!\n');
}).listen(PORT, () => {
  console.log(`🌐 Keepalive HTTP server listening on port ${PORT}`);
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
  AttachmentBuilder,
  Options
} = require('discord.js');
const db = require('./database/db');
const emojis = require('./utils/emojis');
const { createStyledEmbed } = require('./utils/embedBuilder');
const { dispatchLog } = require('./utils/logger');
const { initLavalink } = require('./utils/lavalink');

const PREFIX = process.env.PREFIX || '.';

const client = new Client({
  makeCache: Options.cacheWithLimits({
    MessageManager: 25,
    StageInstanceManager: 0,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildStickerManager: 0,
    ReactionManager: 0,
    PresenceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    VoiceStateManager: 50,
    UserManager: 50
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 180,
      lifetime: 300
    }
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
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
client.once('clientReady', async () => {
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

const voiceJoinTimes = new Map();

// Member Join Welcome & AntiBotAdd Listener
client.on('guildMemberAdd', async (member) => {
  db.recordAnalyticsEvent(member.guild.id, member.id, 'join', 1);

  // 0. STRICT ANTIBOT-ADD ENFORCEMENT: No one can add bots unless explicitly whitelisted or Server Owner
  if (member.user.bot) {
    const antinukeCmd = client.commands.get('antinuke');
    if (antinukeCmd && antinukeCmd.getOrCreateAntinuke) {
      const antiConfig = antinukeCmd.getOrCreateAntinuke(member.guild.id);
      
      if (antiConfig.enabled && (antiConfig.filters.antiBotAdd || antiConfig.panicmode)) {
        try {
          const { AuditLogEvent } = require('discord.js');
          let executor = null;

          // Retry loop up to 3 times with 50ms delay for instant detection
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            const fetchedLogs = await member.guild.fetchAuditLogs({
              limit: 1,
              type: AuditLogEvent.BotAdd
            }).catch(() => null);

            const botAddLog = fetchedLogs?.entries.first();
            if (botAddLog && botAddLog.target?.id === member.id && (Date.now() - botAddLog.createdTimestamp) < 15000) {
              executor = botAddLog.executor;
              break;
            }
          }

          const isAllowed = executor ? (antinukeCmd.isUserWhitelistedForFeature(antiConfig, executor.id, 'antiBotAdd') || executor.id === member.guild.ownerId) : false;

          // IF NOT ALLOWED OR EXECUTOR NOT WHITELISTED -> KICK BOT INSTANTLY & LOCKOUT ADMIN
          if (!isAllowed) {
            // 1. Kick the unauthorized bot immediately
            await member.kick('AntiBotAdd Security: Unauthorized bot addition blocked').catch(() => {});

            if (executor) {
              if (executor && executor.id !== member.guild.ownerId) {
                await punishRogueAdmin(member.guild, executor.id, 'AntiBotAdd Security Violation');
              }

              // DM Alert to Owner
              try {
                const owner = await member.guild.fetchOwner().catch(() => null);
                if (owner) {
                  owner.send(
                    `🚨 **ANTIBOT-ADD CRITICAL SECURITY ALERT** 🚨\n\n` +
                    `An unauthorized admin/user <@${executor.id}> (\`${executor.tag}\`) attempted to add bot <@${member.id}> (\`${member.user.tag}\`) in your server **${member.guild.name}**!\n` +
                    `• **Action Taken:** Bot kicked, admin timed out for 1 hour, dangerous roles stripped, and total channel lockout applied.\n` +
                    `• **User ID:** \`${executor.id}\``
                  ).catch(() => {});
                }
              } catch (e) {}

              // Dispatch Security Log
              dispatchLog(member.guild, 'antinuke', {
                color: 0xED4245,
                title: '🛡️ ANTIBOT-ADD SECURITY INTERCEPTED',
                description:
                  `**Unauthorized Bot Addition Intercepted & Blocked!**\n\n` +
                  `• **Unauthorized Admin:** <@${executor.id}> (\`${executor.tag}\`)\n` +
                  `• **Attempted Bot:** <@${member.id}> (\`${member.user.tag}\`)\n` +
                  `• **Action Taken:** Bot kicked, admin 1-hr timeout, role strip & channel lockout applied!\n\n` +
                  `*Notice: Even top-role admins cannot add bots. The bot was kicked instantly and the admin was locked out.*`,
                footer: `AntiNuke Fail-Safe Security`
              });
            }
            return;
          }
        } catch (err) {}
      }
    }
  }

  // 1. Welcome Channel & DM System
  const welcomeCmd = client.commands.get('welcome');
  if (welcomeCmd && welcomeCmd.getOrCreateWelcomeConfig) {
    const config = welcomeCmd.getOrCreateWelcomeConfig(member.guild.id);

    // 1. Channel Welcome Card
    if (config.enabled && config.channelId) {
      const chan = member.guild.channels.cache.get(config.channelId);
      if (chan && chan.isTextBased()) {
        const payload = welcomeCmd.buildWelcomeCard(config, member);
        await chan.send(payload).catch(() => {});
      }
    }

    // 2. Member Join DM Message
    if (config.joinDmEnabled && config.joinDmText) {
      const joinDmText = welcomeCmd.parsePlaceholders(config.joinDmText, member);
      await member.send({ content: joinDmText }).catch(() => {});
    }
  }

  dispatchLog(member.guild, 'joinleave', {
    color: 0x57F287,
    title: '📥 Member Joined',
    description: `**User:** ${member.user.tag} (${member.id})\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    footer: `Total Members: ${member.guild.memberCount}`
  });
});

// Voice State Update Listener (VoiceMaster Join-to-Create, In-VC Auto Role, VC Audit Logs)
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;

  if (!guild || !member || member.user.bot) return;

  const vmCmd = client.commands.get('voicemaster');
  const config = vmCmd ? vmCmd.getOrCreateVMConfig(guild.id) : { enabled: false };

  // 1. In-VC Auto Role
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

  // 2. VC Audit Logs & Voice Timing Analytics
  if (!oldState.channelId && newState.channelId) {
    voiceJoinTimes.set(member.id, Date.now());
    dispatchLog(guild, 'vc', {
      color: 0x57F287,
      title: '🔊 Voice Channel Joined',
      description: `**Member:** <@${member.id}> (${member.user.tag})\n**Voice Channel:** <#${newState.channelId}>`,
      footer: `User ID: ${member.id}`
    });
  } else if (oldState.channelId && !newState.channelId) {
    if (voiceJoinTimes.has(member.id)) {
      const durationSec = Math.floor((Date.now() - voiceJoinTimes.get(member.id)) / 1000);
      if (durationSec > 0) {
        db.addVoiceTime(member.id, durationSec);
        db.recordAnalyticsEvent(guild.id, member.id, 'voice', durationSec);
      }
      voiceJoinTimes.delete(member.id);
    }
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
client.on('guildMemberRemove', async (member) => {
  db.recordAnalyticsEvent(member.guild.id, member.id, 'leave', 1);

  const welcomeCmd = client.commands.get('welcome');
  if (welcomeCmd && welcomeCmd.getOrCreateWelcomeConfig) {
    const config = welcomeCmd.getOrCreateWelcomeConfig(member.guild.id);

    // Member Leave DM Message
    if (config.leaveDmEnabled && config.leaveDmText) {
      const leaveDmText = welcomeCmd.parsePlaceholders(config.leaveDmText, member);
      await member.user.send({ content: leaveDmText }).catch(() => {});
    }
  }

  dispatchLog(member.guild, 'joinleave', {
    color: 0xED4245,
    title: '📤 Member Left',
    description: `**User:** ${member.user.tag} (${member.id})\n**Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    footer: `Total Members: ${member.guild.memberCount}`
  });
});

// Member Update Listener — Server Boost Event Detection
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const isBoost = !oldMember.premiumSince && newMember.premiumSince;
  if (isBoost) {
    const welcomeCmd = client.commands.get('welcome');
    if (welcomeCmd && welcomeCmd.getOrCreateWelcomeConfig) {
      const config = welcomeCmd.getOrCreateWelcomeConfig(newMember.guild.id);
      if (config.boostEnabled) {
        const targetChanId = config.boostChannelId || config.channelId;
        if (targetChanId) {
          const chan = newMember.guild.channels.cache.get(targetChanId);
          if (chan && chan.isTextBased()) {
            const boostText = welcomeCmd.parsePlaceholders(config.boostText, newMember);
            const boostEmbed = createStyledEmbed({
              title: `🚀 SERVER BOOST!`,
              description: boostText,
              requestedBy: newMember.user,
              clientUser: client.user
            });
            await chan.send({ content: `<@${newMember.id}>`, embeds: [boostEmbed] }).catch(() => {});
          }
        }
      }
    }
  }
});

// 🛡️ REUSABLE FAIL-SAFE ROGUE ADMIN 10-DAY QUARANTINE & JAIL LOCKOUT HELPER
async function punishRogueAdmin(guild, executorId, reason) {
  if (!guild || !executorId || executorId === guild.ownerId) return;

  const antinukeCmd = client.commands.get('antinuke');
  if (antinukeCmd) {
    const config = antinukeCmd.getOrCreateAntinuke(guild.id);
    if (config.extraOwners.has(executorId) || ['1529362747047805029', '1420687548807905324', '1514546738055348237'].includes(executorId)) {
      return; // Extra Owners & Bot Developers bypassed
    }
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000; // 864,000,000ms = 10 Days

  // 1. Apply 10-Day Discord Timeout
  await member.timeout(TEN_DAYS_MS, `AntiNuke 10-Day Quarantine Lockout: ${reason}`).catch(() => {});

  // 2. Strip ALL Non-@everyone Roles
  const rolesToStrip = member.roles.cache.filter(r => r.name !== '@everyone');
  if (rolesToStrip.size > 0) {
    await member.roles.remove(rolesToStrip, `AntiNuke Security Violation: ${reason}`).catch(() => {});
  }

  // 3. Find or Create "Quarantined" / "Jailed" Role
  let quarantineRole = guild.roles.cache.find(r => ['quarantined', 'jailed', 'quarantine', 'jail'].includes(r.name.toLowerCase()));
  if (!quarantineRole) {
    try {
      quarantineRole = await guild.roles.create({
        name: 'Quarantined',
        color: 0x2B2D31,
        permissions: [],
        hoist: true,
        reason: 'AntiNuke Security: Auto-created Quarantined Jail Role'
      });
    } catch (e) {}
  }

  if (quarantineRole) {
    await member.roles.add(quarantineRole, `AntiNuke 10-Day Jail Lockout: ${reason}`).catch(() => {});
  }

  // 4. Zero-Access Channel Overwrite Lockdown across ALL Channels
  // Strips ViewChannel, SendMessages, Connect, Speak, AddReactions so user sees NOTHING except server exists
  guild.channels.cache.forEach(chan => {
    if (chan.permissionOverwrites) {
      // User overwrite
      chan.permissionOverwrites.edit(executorId, {
        ViewChannel: false,
        SendMessages: false,
        Connect: false,
        Speak: false,
        AddReactions: false,
        UseApplicationCommands: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        SendMessagesInThreads: false
      }, { reason: `AntiNuke 10-Day User Lockdown: ${reason}` }).catch(() => {});

      // Quarantine Role overwrite
      if (quarantineRole) {
        chan.permissionOverwrites.edit(quarantineRole.id, {
          ViewChannel: false,
          SendMessages: false,
          Connect: false,
          Speak: false,
          AddReactions: false,
          UseApplicationCommands: false
        }, { reason: `AntiNuke 10-Day Role Lockdown: ${reason}` }).catch(() => {});
      }
    }
  });
}

// 🛡️ 1. ANTIBAN & ANTIKICK PROTECTION LISTENER
client.on('guildBanAdd', async (ban) => {
  const guild = ban.guild;
  const antinukeCmd = client.commands.get('antinuke');
  if (!antinukeCmd) return;
  const config = antinukeCmd.getOrCreateAntinuke(guild.id);

  if (config.enabled && (config.filters.antiBan || config.panicmode)) {
    try {
      const { AuditLogEvent } = require('discord.js');
      let executor = null;
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 400));
        const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
        const log = logs?.entries.first();
        if (log && log.target?.id === ban.user.id && (Date.now() - log.createdTimestamp) < 15000) {
          executor = log.executor;
          break;
        }
      }

      if (executor && executor.id !== guild.ownerId) {
        const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'antiBan');
        if (!isWhitelisted) {
          // 1. Unban victim immediately
          await guild.bans.remove(ban.user.id, 'AntiNuke: Unauthorized Ban Reverted').catch(() => {});

          // 2. Punish rogue admin (timeout, strip roles, channel lockout)
          await punishRogueAdmin(guild, executor.id, 'Unauthorized Member Ban');

          dispatchLog(guild, 'antinuke', {
            color: 0xED4245,
            title: '🛡️ ANTIBAN PROTECTION TRIGGERED',
            description: `**Unauthorized Ban Reverted & Admin Locked Out!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Banned Member:** ${ban.user.tag}\n• **Action:** Member unbanned, Admin roles stripped & channel locked out!`,
            footer: 'AntiNuke Security System'
          });
        }
      }
    } catch (e) {}
  }
});

// 🛡️ 2. ANTICHANNEL CREATED / DELETED LISTENERS
client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  const guild = channel.guild;
  const antinukeCmd = client.commands.get('antinuke');

  if (antinukeCmd) {
    const config = antinukeCmd.getOrCreateAntinuke(guild.id);
    if (config.enabled && (config.filters.antiChannelCreate || config.panicmode)) {
      try {
        const { AuditLogEvent } = require('discord.js');
        let executor = null;
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 400));
          const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
          const log = logs?.entries.first();
          if (log && log.target?.id === channel.id && (Date.now() - log.createdTimestamp) < 15000) {
            executor = log.executor;
            break;
          }
        }

        if (executor && executor.id !== guild.ownerId) {
          const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'antiChannel');
          if (!isWhitelisted) {
            // Delete rogue channel
            await channel.delete('AntiNuke: Unauthorized Channel Creation').catch(() => {});
            await punishRogueAdmin(guild, executor.id, 'Unauthorized Channel Creation');

            dispatchLog(guild, 'antinuke', {
              color: 0xED4245,
              title: '🛡️ ANTICHANNEL PROTECTION TRIGGERED',
              description: `**Unauthorized Channel Creation Blocked!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Channel Deleted:** \`${channel.name}\`\n• **Action:** Channel deleted & Admin locked out!`,
              footer: 'AntiNuke Security System'
            });
            return;
          }
        }
      } catch (e) {}
    }
  }

  dispatchLog(guild, 'channels', {
    color: 0x57F287,
    title: '📁 Channel Created',
    description: `**Channel:** <#${channel.id}> (\`${channel.name}\`)\n**Type:** ${channel.type}`,
    footer: `Channel ID: ${channel.id}`
  });
});

client.on('channelDelete', async (channel) => {
  if (!channel.guild) return;
  const guild = channel.guild;
  const antinukeCmd = client.commands.get('antinuke');

  if (antinukeCmd) {
    const config = antinukeCmd.getOrCreateAntinuke(guild.id);
    if (config.enabled && (config.filters.antiChannelDelete || config.panicmode)) {
      try {
        const { AuditLogEvent } = require('discord.js');
        let executor = null;
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 400));
          const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
          const log = logs?.entries.first();
          if (log && log.target?.id === channel.id && (Date.now() - log.createdTimestamp) < 15000) {
            executor = log.executor;
            break;
          }
        }

        if (executor && executor.id !== guild.ownerId) {
          const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'antiChannel');
          if (!isWhitelisted) {
            // Recreate deleted channel
            await guild.channels.create({
              name: channel.name,
              type: channel.type,
              topic: channel.topic,
              nsfw: channel.nsfw,
              parent: channel.parentId
            }).catch(() => {});

            await punishRogueAdmin(guild, executor.id, 'Unauthorized Channel Deletion');

            dispatchLog(guild, 'antinuke', {
              color: 0xED4245,
              title: '🛡️ ANTICHANNEL DELETION RESTORED',
              description: `**Unauthorized Channel Deletion Reverted!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Restored Channel:** \`${channel.name}\`\n• **Action:** Channel recreated & Admin locked out!`,
              footer: 'AntiNuke Security System'
            });
            return;
          }
        }
      } catch (e) {}
    }
  }

  dispatchLog(guild, 'channels', {
    color: 0xED4245,
    title: '🗑️ Channel Deleted',
    description: `**Channel Name:** \`${channel.name}\`\n**Type:** ${channel.type}`,
    footer: `Channel ID: ${channel.id}`
  });
});

// 🛡️ 3. ANTIROLE CREATED / DELETED LISTENERS
client.on('roleCreate', async (role) => {
  const guild = role.guild;
  const antinukeCmd = client.commands.get('antinuke');

  if (antinukeCmd) {
    const config = antinukeCmd.getOrCreateAntinuke(guild.id);
    if (config.enabled && (config.filters.antiRoleCreate || config.panicmode)) {
      try {
        const { AuditLogEvent } = require('discord.js');
        let executor = null;
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 400));
          const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate }).catch(() => null);
          const log = logs?.entries.first();
          if (log && log.target?.id === role.id && (Date.now() - log.createdTimestamp) < 15000) {
            executor = log.executor;
            break;
          }
        }

        if (executor && executor.id !== guild.ownerId) {
          const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'antiRole');
          if (!isWhitelisted) {
            await role.delete('AntiNuke: Unauthorized Role Creation').catch(() => {});
            await punishRogueAdmin(guild, executor.id, 'Unauthorized Role Creation');

            dispatchLog(guild, 'antinuke', {
              color: 0xED4245,
              title: '🛡️ ANTIROLE PROTECTION TRIGGERED',
              description: `**Unauthorized Role Creation Blocked!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Role Deleted:** \`${role.name}\`\n• **Action:** Role deleted & Admin locked out!`,
              footer: 'AntiNuke Security System'
            });
            return;
          }
        }
      } catch (e) {}
    }
  }

  dispatchLog(role.guild, 'roles', {
    color: 0x57F287,
    title: '🛡️ Role Created',
    description: `**Role:** <@&${role.id}> (\`${role.name}\`)`,
    footer: `Role ID: ${role.id}`
  });
});

client.on('roleDelete', async (role) => {
  const guild = role.guild;
  const antinukeCmd = client.commands.get('antinuke');

  if (antinukeCmd) {
    const config = antinukeCmd.getOrCreateAntinuke(guild.id);
    if (config.enabled && (config.filters.antiRoleDelete || config.panicmode)) {
      try {
        const { AuditLogEvent } = require('discord.js');
        let executor = null;
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 400));
          const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete }).catch(() => null);
          const log = logs?.entries.first();
          if (log && log.target?.id === role.id && (Date.now() - log.createdTimestamp) < 15000) {
            executor = log.executor;
            break;
          }
        }

        if (executor && executor.id !== guild.ownerId) {
          const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'antiRole');
          if (!isWhitelisted) {
            await punishRogueAdmin(guild, executor.id, 'Unauthorized Role Deletion');

            dispatchLog(guild, 'antinuke', {
              color: 0xED4245,
              title: '🛡️ ANTIROLE DELETION INTERCEPTED',
              description: `**Unauthorized Role Deletion Intercepted!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Role Deleted:** \`${role.name}\`\n• **Action:** Admin roles stripped & total channel lockout applied!`,
              footer: 'AntiNuke Security System'
            });
            return;
          }
        }
      } catch (e) {}
    }
  }

  dispatchLog(role.guild, 'roles', {
    color: 0xED4245,
    title: '🗑️ Role Deleted',
    description: `**Role Name:** \`${role.name}\``,
    footer: `Role ID: ${role.id}`
  });
});

// 🛡️ 4. ANTIGUILD UPDATE & VANITY THEFT PROTECTION LISTENER
client.on('guildUpdate', async (oldGuild, newGuild) => {
  const antinukeCmd = client.commands.get('antinuke');
  const vanityCmd = client.commands.get('vanityguard');

  const antiConfig = antinukeCmd ? antinukeCmd.getOrCreateAntinuke(newGuild.id) : null;
  const vanityConfig = vanityCmd ? vanityCmd.getOrCreateVanityConfig(newGuild.id) : null;

  const isVanityChanged = oldGuild.vanityURLCode !== newGuild.vanityURLCode ||
                          (vanityConfig && vanityConfig.protectedVanity && newGuild.vanityURLCode !== vanityConfig.protectedVanity);

  const shouldProtect = (antiConfig && antiConfig.enabled && (antiConfig.filters.antiGuildUpdate || antiConfig.panicmode)) ||
                        (vanityConfig && vanityConfig.enabled && isVanityChanged);

  if (shouldProtect) {
    try {
      const { AuditLogEvent } = require('discord.js');
      let executor = null;
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 50));
        const logs = await newGuild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.GuildUpdate }).catch(() => null);
        const log = logs?.entries.first();
        if (log && (Date.now() - log.createdTimestamp) < 15000) {
          executor = log.executor;
          break;
        }
      }

      if (executor && executor.id !== newGuild.ownerId) {
        const isWhitelisted = antinukeCmd ? antinukeCmd.isUserWhitelistedForFeature(antiConfig, executor.id, 'antiGuild') : false;
        if (!isWhitelisted) {
          // 1. Revert Server Name & Icon
          if (oldGuild.name !== newGuild.name) {
            await newGuild.setName(oldGuild.name, 'AntiNuke: Reverting Unauthorized Server Name Change').catch(() => {});
          }
          if (oldGuild.icon !== newGuild.icon) {
            await newGuild.setIcon(oldGuild.iconURL(), 'AntiNuke: Reverting Unauthorized Server Icon Change').catch(() => {});
          }

          // 2. Revert & Reclaim Vanity URL Code
          const targetVanity = vanityConfig?.protectedVanity || oldGuild.vanityURLCode;
          if (targetVanity && newGuild.vanityURLCode !== targetVanity) {
            await newGuild.setVanityCode(targetVanity, 'VanityGuard: Instant Reversion & Claim').catch(() => {});
          }

          // 3. 10-Day Quarantine & Jail Lockout for Vanity Thief
          await punishRogueAdmin(newGuild, executor.id, 'Unauthorized Server Settings / Vanity Theft Attempt');

          dispatchLog(newGuild, 'antinuke', {
            color: 0xED4245,
            title: '🛡️ VANITYGUARD / SERVER THEFT INTERCEPTED',
            description: `**Unauthorized Server Settings / Vanity Theft Reverted!**\n\n` +
                         `• **Rogue Admin:** <@${executor.id}>\n` +
                         `• **Target Vanity:** \`discord.gg/${targetVanity || 'Reverted'}\`\n` +
                         `• **Action:** Reverted & 10-Day Quarantine Jail applied!`,
            footer: 'VanityGuard Security System'
          });
        }
      }
    } catch (e) {}
  }
});

// 🛡️ 5. ANTIWEBHOOK CREATION / SPAM PROTECTION LISTENER
client.on('webhooksUpdate', async (channel) => {
  if (!channel || !channel.guild) return;
  const guild = channel.guild;
  const antinukeCmd = client.commands.get('antinuke');
  if (!antinukeCmd) return;
  const config = antinukeCmd.getOrCreateAntinuke(guild.id);

  if (config.enabled && (config.filters.antiWebhook || config.panicmode)) {
    try {
      const { AuditLogEvent } = require('discord.js');
      let executor = null;
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 400));
        const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.WebhookCreate }).catch(() => null);
        const log = logs?.entries.first();
        if (log && (Date.now() - log.createdTimestamp) < 15000) {
          executor = log.executor;
          break;
        }
      }

      if (executor && executor.id !== guild.ownerId) {
        const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'antiWebhook');
        if (!isWhitelisted) {
          // Delete created webhooks in channel
          const webhooks = await channel.fetchWebhooks().catch(() => null);
          if (webhooks) {
            webhooks.forEach(wh => wh.delete('AntiNuke: Unauthorized Webhook Creation').catch(() => {}));
          }

          // Punish rogue admin
          await punishRogueAdmin(guild, executor.id, 'Unauthorized Webhook Creation');

          dispatchLog(guild, 'antinuke', {
            color: 0xED4245,
            title: '🛡️ ANTIWEBHOOK CREATION INTERCEPTED',
            description: `**Unauthorized Webhook Creation Blocked & Deleted!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Channel:** <#${channel.id}>\n• **Action:** Webhooks deleted & Admin locked out!`,
            footer: 'AntiNuke Security System'
          });
        }
      }
    } catch (e) {}
  }
});

// 🎯 6. SNIPE ENGINE — STORES LAST 10 DELETED MESSAGES PER CHANNEL
client.on('messageDelete', async (message) => {
  if (!message || !message.channel || message.author?.bot) return;

  const infoCmd = client.commands.get('info');
  if (infoCmd && infoCmd.snipeStore) {
    const channelId = message.channel.id;
    const rawStore = infoCmd.snipeStore.get(channelId);
    const history = Array.isArray(rawStore) ? rawStore : (rawStore ? [rawStore] : []);

    const image = message.attachments?.first()?.proxyURL || message.attachments?.first()?.url || null;

    history.unshift({
      authorTag: message.author ? message.author.tag : 'Unknown User',
      authorId: message.author ? message.author.id : null,
      authorAvatar: message.author ? message.author.displayAvatarURL({ dynamic: true }) : null,
      content: message.content || (image ? '*[Attachment Image]*' : '*[Empty Message]*'),
      image: image,
      timestamp: Date.now()
    });

    if (history.length > 10) history.pop();

    infoCmd.snipeStore.set(channelId, history);
  }
});

// Message Listener (DM ModMail, AutoMod, Activity, Autoresponder, Autoreact, Sticky Notes, Commands)
client.on('messageCreate', async (message) => {
  // 🛡️ STRICT ANTI-EVERYONE / ANTI-HERE MASS PING PROTECTION (Applies to ALL Users & Added Bots, even with Top Role / Admin!)
  if (message.guild && (message.content.includes('@everyone') || message.content.includes('@here'))) {
    const antinukeCmd = client.commands.get('antinuke');
    if (antinukeCmd && antinukeCmd.getOrCreateAntinuke) {
      const antiConfig = antinukeCmd.getOrCreateAntinuke(message.guild.id);

      if (antiConfig.enabled && (antiConfig.filters.antiEveryone || antiConfig.panicmode)) {
        const isAllowed = antinukeCmd.isUserWhitelistedForFeature(antiConfig, message.author.id, 'antiEveryone') || message.author.id === message.guild.ownerId;

        if (!isAllowed) {
          // 1. DELETE MASS PING MESSAGE IMMEDIATELY
          await message.delete().catch(() => {});

          // 2. TIMEOUT / LOCKOUT SENDER (User or Bot)
          if (message.member) {
            await message.member.timeout(60000, 'AntiEveryone Protection: Unauthorized mass ping').catch(() => {});

            if (message.channel && message.channel.permissionOverwrites) {
              message.channel.permissionOverwrites.edit(message.author.id, {
                MentionEveryone: false,
                SendMessages: false
              }, { reason: 'AntiEveryone Security Lockout' }).catch(() => {});
            }
          }

          // 3. DISPATCH SECURITY LOG
          dispatchLog(message.guild, 'antinuke', {
            color: 0xED4245,
            title: '🛡️ ANTI-EVERYONE MASS PING INTERCEPTED',
            description:
              `**Unauthorized Mass Ping Blocked!**\n\n` +
              `• **Sender:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
              `• **Is Bot:** \`${message.author.bot ? 'Yes' : 'No'}\`\n` +
              `• **Channel:** <#${message.channel.id}>\n` +
              `• **Action Taken:** Message deleted, 1-Hour Timeout & MentionEveryone permission stripped!\n\n` +
              `*Notice: Having a top role or Administrator permission does NOT bypass AntiEveryone protection.*`,
            footer: `AntiNuke Security System`
          });
          return;
        }
      }
    }
  }

  if (message.author.bot) return;

  // 📬 DM MODMAIL LISTENER
  if (!message.guild) {
    const modmailCmd = client.commands.get('modmail');
    if (!modmailCmd) return;

    // Find main target guild
    const guild = client.guilds.cache.first();
    if (!guild) return;

    let ticket = modmailCmd.activeModmailTickets.get(message.author.id);

    if (!ticket) {
      const config = modmailCmd.getOrCreateModmailConfig(guild.id);
      let category = config.categoryId ? guild.channels.cache.get(config.categoryId) : null;
      if (!category) category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('modmail'));

      const cleanName = message.author.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const chanName = `ticket-${cleanName}`;

      try {
        const ticketChan = await guild.channels.create({
          name: chanName,
          type: ChannelType.GuildText,
          parent: category ? category.id : undefined,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        // Staff Alert Embed matching Screenshot 2
        const alertEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`New Ticket: ${message.author.username}`)
          .addFields(
            { name: 'User', value: `<@${message.author.id}> 🚩`, inline: true },
            { name: 'ID', value: `\`${message.author.id}\``, inline: true }
          )
          .setDescription(`Use \`.r <message>\` to reply to the user.\nUse \`.close [reason]\` to end the ticket.\nUse \`.modmailtranscript\` to generate HTML transcript.`)
          .setFooter({ text: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` });

        await ticketChan.send({ content: '@here', embeds: [alertEmbed] });

        ticket = {
          channelId: ticketChan.id,
          threadId: ticketChan.id,
          guildId: guild.id,
          messages: []
        };

        modmailCmd.activeModmailTickets.set(message.author.id, ticket);
        await message.reply(`📬 **ModMail Opened**: Your message has been received by support staff. We will reply shortly!`);
      } catch (e) {
        console.error('Failed to create ModMail channel:', e.message);
        return;
      }
    }

    // Forward user's DM to ModMail channel
    const targetChan = guild.channels.cache.get(ticket.channelId);
    if (targetChan) {
      const userMsgEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(message.content || '*[Attachment]*')
        .setTimestamp();

      await targetChan.send({ embeds: [userMsgEmbed] });

      ticket.messages.push({
        authorTag: message.author.tag,
        isStaff: false,
        content: message.content || '[Attachment]',
        timestamp: Date.now()
      });
      modmailCmd.activeModmailTickets.set(message.author.id, ticket);
    }
    return;
  }

  // 💤 AFK AUTO-CLEAR & MENTION RESPONDER
  const infoCmd = client.commands.get('info');
  const afkStore = infoCmd ? infoCmd.afkStore : null;

  if (afkStore) {
    if (afkStore.has(message.author.id)) {
      const afkData = afkStore.get(message.author.id);
      if (!afkData.scope || afkData.scope === 'global' || afkData.guildId === message.guild.id) {
        afkStore.delete(message.author.id);
        const afkTime = Math.floor((Date.now() - afkData.timestamp) / 1000);
        const mins = Math.floor(afkTime / 60);
        const secs = afkTime % 60;
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        message.channel.send(`${emojis.LEAF || '🍃'} Welcome back <@${message.author.id}>! I removed your AFK status (AFK for **${durationStr}**).`).catch(() => {});
      }
    }

    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach(async (mentionedUser) => {
        if (mentionedUser.id === message.author.id) return;
        if (afkStore.has(mentionedUser.id)) {
          const afkData = afkStore.get(mentionedUser.id);
          if (afkData.scope === 'server' && afkData.guildId !== message.guild.id) return;

          const afkTime = Math.floor((Date.now() - afkData.timestamp) / 1000);
          const mins = Math.floor(afkTime / 60);
          const secs = Math.floor(afkTime % 60);
          const timeAgo = mins > 0 ? `${mins}m ${secs}s ago` : `${secs}s ago`;

          message.channel.send(`${emojis.MEDITATE || '💤'} **<@${mentionedUser.id}> is currently AFK** (${timeAgo})\n**Reason:** *${afkData.reason}*`).catch(() => {});

          if (afkData.notifyDM !== false) {
            try {
              const dmEmbed = createStyledEmbed({
                title: `🔔 AFK Mention Alert`,
                description: `You were mentioned by **<@${message.author.id}>** (\`${message.author.username}\`) in **#${message.channel.name}** (**${message.guild.name}**) while AFK!\n\n**Message Content:**\n> ${message.content.slice(0, 500)}`,
                clientUser: client.user
              });
              await mentionedUser.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {}
          }
        }
      });
    }
  }

  // GUILD MESSAGES & LEVELING ENGINE
  const userBefore = db.getUser(message.author.id);
  const oldLvl = userBefore.level;

  db.addMessage(message.author.id, 1);
  db.recordAnalyticsEvent(message.guild.id, message.author.id, 'message', 1);

  const userAfter = db.getUser(message.author.id);
  if (userAfter.level > oldLvl) {
    const levelCmd = client.commands.get('level');
    const levelCfg = levelCmd ? levelCmd.getOrCreateLevelConfig(message.guild.id) : { enabled: true, channelId: null };

    // Auto-assign level rank role & perk roles if bot has ManageRoles permission
    if (message.member && message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      const currentRank = userAfter.rank;
      const targetRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === currentRank.toLowerCase() || (currentRank.includes('Student') && r.name.toLowerCase().includes('student')));

      if (targetRole && !message.member.roles.cache.has(targetRole.id)) {
        await message.member.roles.add(targetRole.id).catch(() => {});
      }

      const perkThresholds = [
        { lvl: 5, key: 'Genin Trainee' },
        { lvl: 15, key: 'Chunin Captain' },
        { lvl: 25, key: 'Special Jounin Operative' },
        { lvl: 40, key: 'Jounin Master' },
        { lvl: 60, key: 'ANBU Commander' },
        { lvl: 75, key: 'Sannin Legend' },
        { lvl: 100, key: 'Hokage Sovereign' }
      ];

      for (const perk of perkThresholds) {
        if (userAfter.level >= perk.lvl) {
          const perkRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(perk.key.toLowerCase()));
          if (perkRole && !message.member.roles.cache.has(perkRole.id)) {
            await message.member.roles.add(perkRole.id).catch(() => {});
          }
        }
      }
    }

    if (levelCfg.enabled !== false) {
      const targetChan = (levelCfg.channelId && message.guild.channels.cache.get(levelCfg.channelId)) || message.channel;

      const levelUpEmbed = createStyledEmbed({
        title: `${emojis.CELEBRATION || '🎉'} LEVEL UP! — Shinobi Rank Advancement`,
        description: `Congratulations <@${message.author.id}>! Your activity has elevated your Ninja Rank!`,
        fields: [
          { name: `${emojis.STAR || '⭐'} New Level`, value: `\`Level ${userAfter.level}\``, inline: true },
          { name: `${emojis.NINJA_RANK || '🍥'} Shinobi Rank`, value: `\`${userAfter.rank}\``, inline: true },
          { name: `${emojis.ZAP || '✨'} Total XP`, value: `\`${userAfter.xp} XP\``, inline: true }
        ],
        thumbnailUrl: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
        requestedBy: message.author,
        clientUser: client.user,
        footerText: `Naruto Leveling • Chat to unlock higher Ninja Ranks!`
      });

      targetChan.send({ content: `<@${message.author.id}>`, embeds: [levelUpEmbed] }).catch(() => {});
    }
  }

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

  // 🤖 AUTOREACT & AUTORESPONDER EVALUATION
  const isCommandMsg = message.content.startsWith(PREFIX) ||
                       message.content.startsWith(`<@${client.user.id}>`) ||
                       message.content.startsWith(`<@!${client.user.id}>`);

  if (!isCommandMsg) {
    // Autoreact
    const autoreacts = db.getAutoreacts(message.guild.id);
    for (const ar of autoreacts) {
      if (ar.trigger) {
        const cleanTrigger = ar.trigger.toLowerCase().trim();
        if (contentLower.includes(cleanTrigger)) {
          message.react(ar.emoji).catch(() => {});
        }
      }
    }

    // Autoresponder
    const autoresponses = db.getAutoresponses(message.guild.id);
    for (const resp of autoresponses) {
      if (!resp.trigger) continue;
      const cleanTrigger = resp.trigger.toLowerCase().trim();

      const isMatch = contentLower === cleanTrigger || contentLower.includes(cleanTrigger);

      if (isMatch) {
        let replyText = resp.response
          .replace(/{user}/g, `<@${message.author.id}>`)
          .replace(/{username}/g, message.author.username)
          .replace(/{server}/g, message.guild.name)
          .replace(/{membercount}/g, message.guild.memberCount.toString());

        console.log(`🤖 [Autoresponder Triggered] "${cleanTrigger}" in #${message.channel.name} by ${message.author.tag}`);
        message.channel.send(replyText).catch(() => {});
        break;
      }
    }
  }

  // 📌 ROCK-SOLID STICKY NOTES ENGINE (Always kept at the bottom)
  const stickyCmd = client.commands.get('stickynote');
  if (stickyCmd && stickyCmd.stickyNotesStore) {
    const stickyData = stickyCmd.stickyNotesStore.get(message.channel.id);
    if (stickyData && stickyData.text) {
      // Delete previous sticky message if present
      if (stickyData.lastMsgId) {
        message.channel.messages.fetch(stickyData.lastMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
      }
      const stickyEmbed = createStyledEmbed({
        title: `📌 Sticky Note`,
        description: stickyData.text,
        clientUser: client.user,
        footerText: `Sticky Message • Stays at the bottom of this channel`
      });
      // Send fresh sticky message at the bottom
      setTimeout(() => {
        message.channel.send({ embeds: [stickyEmbed] }).then(sentMsg => {
          stickyData.lastMsgId = sentMsg.id;
          stickyCmd.stickyNotesStore.set(message.channel.id, stickyData);
        }).catch(() => {});
      }, 500);
    }
  }

  const mentionPrefix = `<@${client.user.id}>`;
  const mentionNicknamePrefix = `<@!${client.user.id}>`;
  let usedPrefix = null;

  const noPrefixCmd = client.commands.get('noprefix');
  const isNoPrefixUser = noPrefixCmd && noPrefixCmd.noPrefixStore ? noPrefixCmd.noPrefixStore.has(message.author.id) : false;

  if (message.content.startsWith(PREFIX)) {
    usedPrefix = PREFIX;
  } else if (message.content.startsWith(mentionPrefix)) {
    usedPrefix = mentionPrefix;
  } else if (message.content.startsWith(mentionNicknamePrefix)) {
    usedPrefix = mentionNicknamePrefix;
  } else if (isNoPrefixUser) {
    const firstWord = message.content.trim().split(/ +/)[0].toLowerCase();
    if (client.commands.has(firstWord)) {
      usedPrefix = '';
    }
  }

  if (message.content.trim() === mentionPrefix || message.content.trim() === mentionNicknamePrefix) {
    const helpCmd = client.commands.get('help');
    if (helpCmd) return helpCmd.execute(message, []);
  }

  if (usedPrefix === null) return;

  const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  // PROBATION SECURITY GRID INTERCEPTION (Applies to ALL new joiners including Admins < 15 Days)
  const ADMIN_MOD_COMMANDS = [
    'ban', 'hackban', 'kick', 'nuke', 'nukeserver', 'nukeroles', 'nukechannels',
    'purge', 'purgebots', 'role', 'rolemenu', 'warn', 'channel', 'lock', 'unlock',
    'hide', 'unhide', 'lockall', 'unlockall', 'hideall', 'unhideall', 'automod',
    'antinuke', 'panicmode', 'whitelist', 'extraowner', 'bypassrole', 'autorole', 'massrole'
  ];

  if (ADMIN_MOD_COMMANDS.includes(commandName) && message.member) {
    const quarantineCmd = client.commands.get('quarantine');
    if (quarantineCmd && quarantineCmd.isMemberInQuarantine) {
      const qStatus = quarantineCmd.isMemberInQuarantine(message.member);
      if (qStatus.isQuarantined) {
        return message.reply(
          `${emojis.SHIELD} **SECURITY PROBATION GRID ACTIVE**\n` +
          `Your account has been in this server for **${qStatus.daysJoined} days** (Required Probation: **${qStatus.requiredDays} Days**).\n\n` +
          `*Notice: Administrator permissions do NOT override the Probation Grid. Members under the 15-Day Probation window cannot execute administrative or moderation commands.*\n` +
          `Remaining Probation Time: **${qStatus.remainingDays} Days**.`
        );
      }
    }
  }

  console.log(`⚡ [Executing Command] .${commandName} requested by ${message.author.tag}`);
  db.recordAnalyticsEvent(message.guild.id, message.author.id, 'command', 1);

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

// Interaction Listener
client.on('interactionCreate', async (interaction) => {
  // 1. TICKET CATEGORY SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});

    const guild = interaction.guild;
    const user = interaction.user;
    const catValue = interaction.values[0];

    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(guild.id) : { ticketCounter: 0, staffRoles: new Set(), categories: [] };
    
    // Check open ticket limit
    const existingTicket = guild.channels.cache.find(c =>
      c.isTextBased() &&
      c.topic &&
      c.topic.includes(`owner:${user.id}`)
    );

    if (existingTicket) {
      return interaction.editReply({
        content: `⚠️ You already have an open ticket in ${existingTicket}! Each user can only have **1 open ticket** at a time. Please close your active ticket before creating a new one.`
      }).catch(() => {});
    }

    const me = guild.members.me;
    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels) || !me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply({
        content: `❌ **Missing Bot Permissions**: The bot needs **Manage Channels** and **Manage Roles** permissions to create ticket channels and set permissions.`
      }).catch(() => {});
    }

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
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles] }
      ];

      config.staffRoles.forEach(roleId => {
        overwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] });
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

      db.recordAnalyticsEvent(guild.id, user.id, 'ticket_created', 1);
      ticketCmd.ticketConfigs.set(guild.id, config);
      return interaction.editReply({ content: `✅ Ticket created! Head over to ${ticketChan}` }).catch(() => {});
    } catch (e) {
      console.error('Failed to create ticket channel:', e);
      return interaction.editReply({
        content: `❌ **Failed to Create Ticket**: \`${e.message || 'Permission Error'}\`.`
      }).catch(() => {});
    }
  }

  // 2. AUDIO FILTER SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'music_filter_select') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const values = interaction.values;
    const filterNames = values.map(v => v.replace('filter_', '').toUpperCase());

    const { getLavalink } = require('./utils/lavalink');
    const lavalink = getLavalink();
    const player = lavalink?.getPlayer(interaction.guild.id);

    if (values.includes('filter_reset')) {
      if (player?.filterManager) await player.filterManager.resetFilters().catch(() => {});
      return interaction.editReply({ content: `🚫 Reset all audio filters to default.` }).catch(() => {});
    }

    if (player?.filterManager) {
      for (const val of values) {
        if (val === 'filter_bassboost') await player.filterManager.setBassboost(true).catch(() => {});
        if (val === 'filter_8d') await player.filterManager.set8D(true).catch(() => {});
        if (val === 'filter_nightcore') await player.filterManager.setNightcore(true).catch(() => {});
        if (val === 'filter_vaporwave') await player.filterManager.setVaporwave(true).catch(() => {});
      }
    }

    return interaction.editReply({ content: `🎶 Applied Audio Filters: **${filterNames.join(', ')}**!` }).catch(() => {});
  }

  // 2.5 VOICEMASTER QUICK MENU SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'vm_quick_menu') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const val = interaction.values[0];
    const voiceState = interaction.member?.voice;
    const channel = voiceState?.channel;

    if (!channel) {
      return interaction.editReply({ content: `${emojis.WARNING} You must be in your private Voice Channel to use quick controls!` }).catch(() => {});
    }

    if (val === 'vm_menu_lock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(() => {});
      return interaction.editReply({ content: `🔒 Private Voice Channel **locked**!` }).catch(() => {});
    }
    if (val === 'vm_menu_unlock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true }).catch(() => {});
      return interaction.editReply({ content: `🔓 Private Voice Channel **unlocked**!` }).catch(() => {});
    }
    if (val === 'vm_menu_mute') {
      channel.members.forEach(m => m.voice.setMute(true).catch(() => {}));
      return interaction.editReply({ content: `🔇 Server muted all members in VC.` }).catch(() => {});
    }
    if (val === 'vm_menu_unmute') {
      channel.members.forEach(m => m.voice.setMute(false).catch(() => {}));
      return interaction.editReply({ content: `🎙️ Server unmuted all members in VC.` }).catch(() => {});
    }
    if (val === 'vm_menu_limit') {
      return interaction.editReply({ content: `👥 Use \`.vc limit <1-99>\` to change slot limit.` }).catch(() => {});
    }
    if (val === 'vm_menu_claim') {
      return interaction.editReply({ content: `👑 Room ownership claimed!` }).catch(() => {});
    }
  }

  if (!interaction.isButton()) return;

  // GIVEAWAY ENTER BUTTON
  if (interaction.customId.startsWith('gw_enter_')) {
    const gwId = interaction.customId.replace('gw_enter_', '');
    const giveawayCmd = client.commands.get('giveaway');
    const gw = giveawayCmd ? giveawayCmd.giveaways.get(gwId) : null;

    if (!gw) {
      return interaction.reply({ content: `⚠️ This giveaway is no longer active!`, flags: 64 }).catch(() => {});
    }

    if (gw.ended) {
      return interaction.reply({ content: `⚠️ This giveaway has already ended!`, flags: 64 }).catch(() => {});
    }

    if (!gw.entries) gw.entries = new Set();

    if (gw.entries.has(interaction.user.id)) {
      return interaction.reply({ content: `🎉 You have already entered giveaway **${gwId}**!`, flags: 64 }).catch(() => {});
    }

    gw.entries.add(interaction.user.id);
    giveawayCmd.giveaways.set(gwId, gw);

    return interaction.reply({ content: `🎉 **Entry Confirmed!** You entered giveaway **${gwId}** for prize: **${gw.prize}**! Good luck! 🍀`, flags: 64 }).catch(() => {});
  }

  // 3. CALL STAFF BUTTON
  if (interaction.customId === 'ticket_callstaff_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

    const staffPings = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(' ') || '@here';
    await channel.send({ content: `📞 **Call Staff Alert**: ${staffPings}\n<@${user.id}> has requested immediate support staff attendance in this ticket!` }).catch(() => {});
    return interaction.reply({ content: `📞 Support staff summoned!`, flags: 64 }).catch(() => {});
  }

  // 4. CLAIM TICKET BUTTON
  if (interaction.customId === 'ticket_claim_btn') {
    const user = interaction.user;
    const member = interaction.member;
    const message = interaction.message;
    const channel = interaction.channel;

    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

    const isStaff = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                    Array.from(config.staffRoles).some(rId => member.roles.cache.has(rId));

    if (!isStaff) {
      return interaction.reply({ content: `❌ Only support staff members can claim tickets!`, flags: 64 }).catch(() => {});
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    const claimedField = embed.data.fields?.find(f => f.name.includes('Claimed'));

    if (claimedField && !claimedField.value.toLowerCase().includes('unclaimed') && !claimedField.value.toLowerCase().includes('none')) {
      return interaction.reply({ content: `⚠️ This ticket is already claimed by ${claimedField.value}! A ticket can only be claimed by 1 staff member.`, flags: 64 }).catch(() => {});
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

  // 5. PRIORITY TICKET BUTTON
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

  // 6. LOCK TICKET BUTTON
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

  // 7. CLOSE TICKET BUTTON
  if (interaction.customId === 'ticket_close_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');

    db.recordAnalyticsEvent(interaction.guild.id, user.id, 'ticket_closed', 1);

    await interaction.reply({ content: `🔒 Ticket closed by <@${user.id}>. Sending transcript & deleting in **5 seconds**...` }).catch(() => {});

    const msgs = await channel.messages.fetch({ limit: 100 });
    const buffer = ticketCmd ? ticketCmd.generateTranscriptBuffer(channel, msgs, user) : Buffer.from('Transcript', 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });

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

  // 8. VOICEMASTER INTERFACE CONTROLLER BUTTONS
  if (interaction.customId.startsWith('vm_')) {
    const voiceState = interaction.member?.voice;
    const channel = voiceState?.channel;

    if (!channel) {
      return interaction.reply({ content: `${emojis.WARNING} You must be connected to your private Voice Channel to use these controls!`, flags: 64 }).catch(() => {});
    }

    const action = interaction.customId.replace('vm_', '');

    switch (action) {
      // --- ROW 1 ---
      case 'status': {
        const everyoneConnect = channel.permissionsFor(interaction.guild.roles.everyone).has(PermissionsBitField.Flags.Connect);
        const everyoneView = channel.permissionsFor(interaction.guild.roles.everyone).has(PermissionsBitField.Flags.ViewChannel);
        return interaction.reply({
          content:
            `⚡ **VoiceMaster Room Status**\n` +
            `• **Room:** <#${channel.id}>\n` +
            `• **Bitrate:** \`${channel.bitrate / 1000} kbps\`\n` +
            `• **User Limit:** \`${channel.userLimit === 0 ? 'Unlimited' : channel.userLimit}\`\n` +
            `• **Locked:** \`${!everyoneConnect ? 'Yes 🔒' : 'No 🔓'}\` | **Hidden:** \`${!everyoneView ? 'Yes 🙈' : 'No 👁️'}\` | **Members:** \`${channel.members.size}\``,
          flags: 64
        });
      }
      case 'limit':
        return interaction.reply({ content: `👥 **Set Slot Limit**: Use \`.vc limit <1-99>\` in chat to change room capacity limit.`, flags: 64 });
      case 'logs':
        return interaction.reply({ content: `📜 **Room Logs**: Private channel generated for **<@${interaction.user.id}>** with active members: \`${channel.members.size}\`.`, flags: 64 });
      case 'ban':
        return interaction.reply({ content: `🔨 **Ban Member**: Use \`.vc ban @user\` to disconnect and ban a member from your room.`, flags: 64 });
      case 'unban':
        return interaction.reply({ content: `🔓 **Unban Member**: Use \`.vc unban @user\` to unban a member from joining your room.`, flags: 64 });

      // --- ROW 2 ---
      case 'hide':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false }).catch(() => {});
        return interaction.reply({ content: `🙈 **Private VC Hidden** — Channel is now hidden from member channel list.`, flags: 64 });
      case 'unhide':
      case 'reveal':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true }).catch(() => {});
        return interaction.reply({ content: `👁️ **Private VC Unhidden** — Channel is now visible in the channel list.`, flags: 64 });
      case 'region':
        return interaction.reply({ content: `🌐 **Voice Region**: Use \`.vc region <auto/us-east/india>\` to switch voice server region.`, flags: 64 });
      case 'unlock':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true }).catch(() => {});
        return interaction.reply({ content: `🔓 **Private VC Unlocked** — Channel access is now open to all members.`, flags: 64 });
      case 'lock':
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(() => {});
        return interaction.reply({ content: `🔒 **Private VC Locked** — Channel access is now restricted.`, flags: 64 });

      // --- ROW 3 ---
      case 'trust':
      case 'permit':
        return interaction.reply({ content: `➕ **Trust Member**: Use \`.vc permit @user\` to grant view & connect access to a user.`, flags: 64 });
      case 'untrust':
      case 'reject':
        return interaction.reply({ content: `➖ **Untrust Member**: Use \`.vc reject @user\` to revoke user access from your room.`, flags: 64 });
      case 'bitrate':
        return interaction.reply({ content: `📶 **Set Bitrate**: Use \`.vc bitrate <8-96>\` in chat to set audio bitrate quality.`, flags: 64 });
      case 'invite':
        return interaction.reply({ content: `📞 **Invite Member**: Use \`.vc invite @user\` to send a private VC invite link in DM.`, flags: 64 });
      case 'kick':
        return interaction.reply({ content: `🚫 **Kick Member**: Use \`.vc kick @user\` to disconnect a member from your voice channel.`, flags: 64 });

      // --- ROW 4 ---
      case 'suppress':
      case 'mute':
        channel.members.forEach(m => { if (!m.user.bot) m.voice.setMute(true).catch(() => {}); });
        return interaction.reply({ content: `🔇 **Server Muted** — All connected members in VC have been server muted.`, flags: 64 });
      case 'unsuppress':
      case 'unmute':
        channel.members.forEach(m => { if (!m.user.bot) m.voice.setMute(false).catch(() => {}); });
        return interaction.reply({ content: `🎙️ **Server Unmuted** — All members in VC have been unmuted.`, flags: 64 });
      case 'chat':
        return interaction.reply({ content: `💬 **Room Chat**: You can chat directly in your private room text thread!`, flags: 64 });
      case 'claim':
        return interaction.reply({ content: `👑 **Room Status**: You are currently managing private room **<#${channel.id}>**.`, flags: 64 });
      case 'transfer':
        return interaction.reply({ content: `↗️ **Transfer Ownership**: Use \`.vc transfer @user\` to pass room ownership to another user.`, flags: 64 });

      default:
        return interaction.reply({ content: `⚙️ VoiceMaster action executed.`, flags: 64 });
    }
  }
});

// 🏷️ AUTONICK & AUTOROLE LISTENER ON MEMBER JOIN
client.on('guildMemberAdd', async (member) => {
  if (!member || !member.guild) return;

  const rolesCmd = client.commands.get('roles');
  if (rolesCmd && rolesCmd.getOrCreateRoleConfig) {
    const roleCfg = rolesCmd.getOrCreateRoleConfig(member.guild.id);
    if (roleCfg.autonick) {
      try {
        const newNick = roleCfg.autonick.replace(/{user}/g, member.user.username).replace(/{username}/g, member.user.username);
        await member.setNickname(newNick).catch(() => {});
      } catch (e) {}
    }
  }
});

// 🔊 IN-VC AUTO ROLE LISTENER
client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || !member.guild || member.user.bot) return;

  const rolesCmd = client.commands.get('roles');
  if (rolesCmd && rolesCmd.getOrCreateRoleConfig) {
    const roleCfg = rolesCmd.getOrCreateRoleConfig(member.guild.id);
    if (roleCfg.invcrole) {
      const targetRole = member.guild.roles.cache.get(roleCfg.invcrole);
      if (targetRole) {
        if (!oldState.channelId && newState.channelId) {
          if (!member.roles.cache.has(targetRole.id)) {
            await member.roles.add(targetRole).catch(() => {});
          }
        } else if (oldState.channelId && !newState.channelId) {
          if (member.roles.cache.has(targetRole.id)) {
            await member.roles.remove(targetRole).catch(() => {});
          }
        }
      }
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
