try {
  const v8 = require('v8');
  v8.setFlagsFromString('--max_old_space_size=128');
} catch (e) {}

try {
  require('dotenv').config();
} catch (e) {}

process.on('uncaughtException', (err) => {
  console.error('${emojis.WARNING} [Uncaught Exception]:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('${emojis.WARNING} [Unhandled Rejection]:', reason?.message || reason);
});

// Render / Web Hosting Keepalive & Commands Web Dashboard HTTP Server
const http = require('http');
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  const commandsHtmlPath = path.join(__dirname, '..', 'public', 'commands.html');
  if (fs.existsSync(commandsHtmlPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(commandsHtmlPath).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🍥 Naruto Bot is 24/7 Active!\n');
}).listen(PORT, () => {
  console.log(`🌐 Keepalive & Commands Web Server listening on port ${PORT}`);
});

// Render Keepalive Self-Ping Loop (Pings every 10 minutes to prevent Render Free Tier from going to sleep)
if (process.env.RENDER_EXTERNAL_URL) {
  const url = process.env.RENDER_EXTERNAL_URL;
  setInterval(() => {
    http.get(url, (res) => {
      console.log(`📡 Keepalive self-ping sent to ${url} (Status: ${res.statusCode})`);
    }).on('error', (err) => {
      console.error('⚠️ Keepalive self-ping error:', err.message);
    });
  }, 10 * 60 * 1000); // 10 minutes
}


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
const everyonePingViolations = new Map();

const client = new Client({
  makeCache: Options.cacheWithLimits({
    MessageManager: 25,
    StageInstanceManager: 0,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildStickerManager: 100,
    GuildEmojiManager: 100,
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

// Load Commands Dynamically (Recursively scan subdirectories)
function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command.name) {
          client.commands.set(command.name, command);
          if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => client.commands.set(alias, command));
          }
        }
      } catch (e) {
        console.error(`[Command Load Error (${entry.name})]:`, e.message);
      }
    }
  }
}

const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

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

  client.user.setActivity('💬 DM me for Support | .help', { type: 3 });
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
                title: '${emojis.SHIELD} ANTIBOT-ADD SECURITY INTERCEPTED',
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

  // 🚪 WICK-STYLE JOINGATE SECURITY ENFORCEMENT
  const antinukeCmd = client.commands.get('antinuke');
  if (antinukeCmd && antinukeCmd.getOrCreateAntinuke) {
    const antiConfig = antinukeCmd.getOrCreateAntinuke(member.guild.id);
    const jg = antiConfig.joinGate;

    if (antiConfig.enabled && jg && jg.enabled && !member.user.bot) {
      // 1. Anti No Avatar Gate
      if (jg.antiNoAvatar && !member.user.avatar) {
        await member.kick('JoinGate Protection: No Profile Avatar').catch(() => {});
        dispatchLog(member.guild, 'antinuke', {
          color: 0xFEE75C,
          title: '🚪 JOINGATE: NO AVATAR MEMBER KICKED',
          description: `**Member Kicked:** <@${member.id}> (\`${member.user.tag}\`) had no profile picture.`,
          footer: 'JoinGate Security'
        });
        return;
      }

      // 2. Anti Account Age Gate (Younger than X days)
      if (jg.antiAccountAge) {
        const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < jg.minAccountAgeDays) {
          await member.kick(`JoinGate Protection: Account age under ${jg.minAccountAgeDays} days`).catch(() => {});
          dispatchLog(member.guild, 'antinuke', {
            color: 0xED4245,
            title: '🚪 JOINGATE: YOUNG ACCOUNT KICKED',
            description: `**Young Account Blocked:** <@${member.id}> (\`${member.user.tag}\`)\n• **Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n• **Requirement:** Minimum ${jg.minAccountAgeDays} Days.`,
            footer: 'JoinGate Security'
          });
          return;
        }
      }

      // 3. Anti Advertising Name Gate (Discord invite link in username)
      if (jg.antiAdvertisingName) {
        const hasAd = /(discord\.(gg|com\/invite)|.gg\/|https?:\/\/)/i.test(member.user.username);
        if (hasAd) {
          await member.timeout(24 * 60 * 60 * 1000, 'JoinGate Protection: Invite link in username').catch(() => {});
          dispatchLog(member.guild, 'antinuke', {
            color: 0xFEE75C,
            title: '🚪 JOINGATE: ADVERTISING USERNAME TIMED OUT',
            description: `**Advertising Username Intercepted:** <@${member.id}> (\`${member.user.tag}\`) timed out for 24h due to invite link in username.`,
            footer: 'JoinGate Security'
          });
        }
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

      if (vmCmd && vmCmd.buildChannelCreatedEmbed) {
        const embed = vmCmd.buildChannelCreatedEmbed(member);
        await tempVC.send({ content: `<@${member.id}>`, embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to create temp VC:', e.message);
    }
  }

  // Left temp VC (delete if no human members remain)
  if (oldState.channelId && config.activeTempVCs.has(oldState.channelId)) {
    const oldChan = oldState.channel;
    if (oldChan) {
      const humanCount = oldChan.members.filter(m => !m.user.bot).size;
      if (humanCount === 0) {
        config.activeTempVCs.delete(oldChan.id);

        // Destroy Lavalink player if active in this temp VC
        try {
          const { getLavalink } = require('./utils/lavalink');
          const lavalink = getLavalink();
          const player = lavalink?.getPlayer(guild.id);
          if (player && player.voiceChannelId === oldChan.id) {
            player.destroy().catch(() => {});
          }
        } catch (e) {}

        // Delete empty temporary voice channel
        setTimeout(() => {
          oldChan.delete().catch(() => {});
        }, 1000);
      }
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
      if (config.boostEnabled !== false) {
        const targetChanId = config.boostChannelId || config.channelId;
        if (targetChanId) {
          const chan = newMember.guild.channels.cache.get(targetChanId);
          if (chan && chan.isTextBased()) {
            const boostEmbed = welcomeCmd.buildBoosterEmbed ? welcomeCmd.buildBoosterEmbed(newMember) : createStyledEmbed({
              title: `${newMember.user.username} boosted!`,
              description: `Thanks for boosting the server, <@${newMember.id}>!`,
              clientUser: client.user
            });
            await chan.send({ content: `<@${newMember.id}>`, embeds: [boostEmbed] }).catch(() => {});
          }
        }
      }
    }
  }
});

// ${emojis.SHIELD} REUSABLE FAIL-SAFE ROGUE ADMIN 10-DAY QUARANTINE & JAIL LOCKOUT HELPER
async function punishRogueAdmin(guild, executorId, reason) {
  if (!guild || !executorId || executorId === guild.ownerId) return;

  const antinukeCmd = client.commands.get('antinuke');
  if (antinukeCmd) {
    const config = antinukeCmd.getOrCreateAntinuke(guild.id);
    if (config.extraOwners.has(executorId) || ['1529362747047805029', '1420687548807905324', '1514546738055348237', '1446040693725466687'].includes(executorId)) {
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

// ${emojis.SHIELD} 1. ANTIBAN & ANTIKICK PROTECTION LISTENER
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
            title: '${emojis.SHIELD} ANTIBAN PROTECTION TRIGGERED',
            description: `**Unauthorized Ban Reverted & Admin Locked Out!**\n\n• **Rogue Admin:** <@${executor.id}>\n• **Banned Member:** ${ban.user.tag}\n• **Action:** Member unbanned, Admin roles stripped & channel locked out!`,
            footer: 'AntiNuke Security System'
          });
        }
      }
    } catch (e) {}
  }
});

// ${emojis.SHIELD} 2. ANTICHANNEL CREATED / DELETED LISTENERS
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
              title: '${emojis.SHIELD} ANTICHANNEL PROTECTION TRIGGERED',
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
              title: '${emojis.SHIELD} ANTICHANNEL DELETION RESTORED',
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

// ${emojis.SHIELD} 3. ANTIROLE CREATED / DELETED LISTENERS
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
              title: '${emojis.SHIELD} ANTIROLE PROTECTION TRIGGERED',
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
    title: '${emojis.SHIELD} Role Created',
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
              title: '${emojis.SHIELD} ANTIROLE DELETION INTERCEPTED',
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

// ${emojis.SHIELD} AUTO QUARANTINE & PUBLIC ROLES (@everyone) PROTECTION LISTENER
client.on('roleUpdate', async (oldRole, newRole) => {
  const guild = newRole.guild;
  const antinukeCmd = client.commands.get('antinuke');
  if (!antinukeCmd || !antinukeCmd.getOrCreateAntinuke) return;

  const config = antinukeCmd.getOrCreateAntinuke(guild.id);
  const aq = config.autoQuarantine;

  if (config.enabled && aq && aq.enabled) {
    const dangerousFlags = [
      PermissionsBitField.Flags.Administrator,
      PermissionsBitField.Flags.ManageGuild,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.MentionEveryone
    ];

    const gainedDangerousPerm = dangerousFlags.some(flag => !oldRole.permissions.has(flag) && newRole.permissions.has(flag));

    // A. PUBLIC ROLES (@everyone) GUARD
    if (newRole.id === guild.roles.everyone.id && gainedDangerousPerm && aq.monitorPublicRoles) {
      // Revert @everyone permissions immediately
      await newRole.setPermissions(oldRole.permissions).catch(() => {});

      try {
        const { AuditLogEvent } = require('discord.js');
        const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate }).catch(() => null);
        const log = logs?.entries.first();
        if (log && (Date.now() - log.createdTimestamp) < 15000) {
          const executor = log.executor;
          if (executor && executor.id !== guild.ownerId) {
            const isWhitelisted = antinukeCmd.isUserWhitelistedForFeature(config, executor.id, 'role');
            if (!isWhitelisted) {
              await punishRogueAdmin(guild, executor.id, 'Unauthorized Dangerous Permission Grant to @everyone');
              dispatchLog(guild, 'antinuke', {
                color: 0xED4245,
                title: '☣️ AUTO QUARANTINE: PUBLIC ROLE GUARD INTERCEPTED',
                description: `**Rogue Admin Intercepted:** <@${executor.id}>\n• **Attempt:** Granted dangerous perms to \`@everyone\`\n• **Action Taken:** Reverted perms & admin quarantined!`,
                footer: 'Auto Quarantine Security'
              });
            }
          }
        }
      } catch (e) {}
    }
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ 4. VANITYGUARD — DECOY SYSTEM + BOOST RECOVERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOW IT WORKS:
//   • Protected (real) vanity = the code set via .vanity set <code>
//   • If ANY admin changes the server vanity → it's treated as a DECOY being swapped
//     The bot INSTANTLY reclaims the real protected vanity back
//   • Log says: "Decoy vanity left, REAL vanity is still LOCKED & SAFE"
//   • If server loses Level 3 boost (vanity goes null) → bot SAVES the protected code
//   • When boost returns (vanity becomes available again) → bot AUTO-RECLAIMS the real vanity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

client.on('guildUpdate', async (oldGuild, newGuild) => {
  const antinukeCmd = client.commands.get('antinuke');
  const vanityCmd   = client.commands.get('vanityguard');

  const antiConfig   = antinukeCmd ? antinukeCmd.getOrCreateAntinuke(newGuild.id) : null;
  const vanityConfig = vanityCmd   ? vanityCmd.getOrCreateVanityConfig(newGuild.id) : null;

  // ──────────────────────────────────────────
  // CASE A: Boost dropped → vanity lost (null)
  //   Save protected code so we can reclaim later
  // ──────────────────────────────────────────
  if (vanityConfig && oldGuild.vanityURLCode && !newGuild.vanityURLCode) {
    // Server lost Level 3 boost — vanity went away
    // Save the last known real vanity code for auto-reclaim later
    if (!vanityConfig.protectedVanity) {
      vanityConfig.protectedVanity = oldGuild.vanityURLCode;
    }
    vanityConfig.boostLost = true;
    vanityCmd.vanityConfigs.set(newGuild.id, vanityConfig);

    dispatchLog(newGuild, 'antinuke', {
      color: 0xFEE75C,
      title: '⚠️ VANITYGUARD — BOOST LOST',
      description:
        `**Server dropped below Level 3 Boost!**\n\n` +
        `🔒 **Protected Vanity Saved:** \`discord.gg/${vanityConfig.protectedVanity}\`\n` +
        `📦 **Status:** Code is locked in bot memory — will AUTO-RECLAIM when boost returns!\n\n` +
        `> Boost your server back to **Level 3** to automatically restore \`discord.gg/${vanityConfig.protectedVanity}\``,
      footer: 'VanityGuard Decoy System'
    });
    return;
  }

  // ──────────────────────────────────────────
  // CASE B: Boost returned → vanity available again
  //   Auto-reclaim the protected code immediately
  // ──────────────────────────────────────────
  if (vanityConfig && vanityConfig.boostLost && !oldGuild.vanityURLCode && newGuild.vanityURLCode) {
    vanityConfig.boostLost = false;
    vanityCmd.vanityConfigs.set(newGuild.id, vanityConfig);

    if (vanityConfig.protectedVanity && newGuild.vanityURLCode !== vanityConfig.protectedVanity) {
      await newGuild.setVanityCode(vanityConfig.protectedVanity, 'VanityGuard: Auto-Reclaim after boost restore').catch(() => {});

      dispatchLog(newGuild, 'antinuke', {
        color: 0x57F287,
        title: '✅ VANITYGUARD — REAL VANITY RECLAIMED',
        description:
          `**Server boosted back to Level 3!**\n\n` +
          `🔒 **Real Vanity Reclaimed:** \`discord.gg/${vanityConfig.protectedVanity}\`\n` +
          `⚡ **Recovery Time:** < 1 second\n` +
          `🛡️ **Status:** Protected & LOCKED`,
        footer: 'VanityGuard Decoy System'
      });
    }
    return;
  }

  // ──────────────────────────────────────────
  // CASE C: Rogue admin tried to change vanity / server settings
  //   Real vanity is locked → treat what left as DECOY
  // ──────────────────────────────────────────
  const isVanityChanged = oldGuild.vanityURLCode !== newGuild.vanityURLCode ||
                          (vanityConfig && vanityConfig.protectedVanity &&
                           newGuild.vanityURLCode !== vanityConfig.protectedVanity);

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
          // 1. Revert Server Name & Icon if changed
          if (oldGuild.name !== newGuild.name) {
            await newGuild.setName(oldGuild.name, 'AntiNuke: Reverting Unauthorized Server Name Change').catch(() => {});
          }
          if (oldGuild.icon !== newGuild.icon) {
            await newGuild.setIcon(oldGuild.iconURL(), 'AntiNuke: Reverting Unauthorized Server Icon Change').catch(() => {});
          }

          // 2. DECOY SYSTEM: Revert & Reclaim the REAL protected vanity
          //    Whatever code "left" was just the DECOY — real vanity is re-locked instantly
          const realVanity   = vanityConfig?.protectedVanity || oldGuild.vanityURLCode;
          const decoyVanity  = newGuild.vanityURLCode;  // what the rogue admin set (the "decoy")

          if (realVanity && newGuild.vanityURLCode !== realVanity) {
            await newGuild.setVanityCode(realVanity, 'VanityGuard: Decoy Rejected — Real Vanity Reclaimed').catch(() => {});
          }

          // 3. Quarantine the rogue admin
          await punishRogueAdmin(newGuild, executor.id, 'Vanity Theft / Unauthorized Server Settings Change');

          // 4. Log with DECOY language
          dispatchLog(newGuild, 'antinuke', {
            color: 0xED4245,
            title: '🛡️ VANITYGUARD — DECOY REJECTED',
            description:
              `**Vanity Theft Intercepted & Neutralized!**\n\n` +
              `🔴 **Rogue Admin:** <@${executor.id}>\n` +
              `🎭 **Decoy Vanity (gone):** \`${decoyVanity ? 'discord.gg/' + decoyVanity : 'Changed/Removed'}\`\n` +
              `🔒 **Real Vanity (SAFE):** \`discord.gg/${realVanity}\` — **LOCKED & PROTECTED**\n` +
              `⚡ **Recovery Speed:** < 50ms\n` +
              `⛓️ **Punishment:** 10-Day Quarantine Jail Applied to Rogue Admin\n\n` +
              `> The decoy vanity left — your real vanity \`discord.gg/${realVanity}\` was NEVER at risk!`,
            footer: 'VanityGuard Decoy System'
          });
        }
      }
    } catch (e) {}
  }
});



// ${emojis.SHIELD} 5. ANTIWEBHOOK CREATION / SPAM PROTECTION LISTENER
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
            title: '${emojis.SHIELD} ANTIWEBHOOK CREATION INTERCEPTED',
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
  // 🛡️ STRICT ANTI-EVERYONE / ANTI-HERE MASS PING PROTECTION
  if (message.guild && (message.content.includes('@everyone') || message.content.includes('@here'))) {
    const antinukeCmd = client.commands.get('antinuke');
    if (antinukeCmd && antinukeCmd.getOrCreateAntinuke) {
      const antiConfig = antinukeCmd.getOrCreateAntinuke(message.guild.id);

      if (antiConfig.enabled && (antiConfig.filters.antiEveryone || antiConfig.panicmode)) {
        const isAllowed = message.author.id === message.guild.ownerId || 
                          antinukeCmd.isUserWhitelistedForFeature(antiConfig, message.author.id, 'everyone') ||
                          antinukeCmd.isUserWhitelistedForFeature(antiConfig, message.author.id, 'antiEveryone');

        if (!isAllowed) {
          // 1. DELETE MASS PING MESSAGE IMMEDIATELY
          await message.delete().catch(() => {});

          const violKey = `${message.guild.id}-${message.author.id}`;
          const currentCount = (everyonePingViolations.get(violKey) || 0) + 1;
          everyonePingViolations.set(violKey, currentCount);

          if (message.member) {
            if (currentCount === 1) {
              // 1st Violation: 3.5 Hours Timeout (NO channel permission overwrites!)
              const timeoutMs = 3.5 * 60 * 60 * 1000; // 3.5 Hours
              await message.member.timeout(timeoutMs, 'AntiEveryone Protection: 1st unauthorized mass ping (3.5h Timeout)').catch(() => {});

              dispatchLog(message.guild, 'antinuke', {
                color: 0xE67E22,
                title: `${emojis.SHIELD || '🛡️'} ANTI-EVERYONE MASS PING — 1ST VIOLATION`,
                description:
                  `**Unauthorized Mass Ping Intercepted!**\n\n` +
                  `• **Sender:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
                  `• **Channel:** <#${message.channel.id}>\n` +
                  `• **Violation Count:** \`1st Warning\`\n` +
                  `• **Action Taken:** Message deleted & **3.5 Hours Timeout** applied!\n\n` +
                  `*Notice: Repeat violation will result in an immediate KICK/BAN from the server.*`,
                footer: `AntiNuke Mass Ping Guard`
              });
            } else if (currentCount === 2) {
              // 2nd Violation: Direct KICK from server
              await message.member.kick('AntiEveryone Protection: 2nd unauthorized mass ping violation (Kick)').catch(async () => {
                // If Kick fails, attempt Ban
                await message.guild.members.ban(message.author.id, { reason: 'AntiEveryone Protection: 2nd unauthorized mass ping (Ban)' }).catch(() => {});
              });

              dispatchLog(message.guild, 'antinuke', {
                color: 0xED4245,
                title: `${emojis.SHIELD || '🛡️'} ANTI-EVERYONE MASS PING — REPEAT VIOLATION (KICK)`,
                description:
                  `**Repeat Unauthorized Mass Ping Intercepted!**\n\n` +
                  `• **Sender:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
                  `• **Channel:** <#${message.channel.id}>\n` +
                  `• **Violation Count:** \`2nd Violation (Repeat)\`\n` +
                  `• **Action Taken:** Message deleted & **KICKED FROM SERVER**!\n\n` +
                  `*Notice: Further attempts will result in an automatic permanent BAN.*`,
                footer: `AntiNuke Mass Ping Guard`
              });
            } else {
              // 3rd+ Violation: Direct BAN from server
              await message.guild.members.ban(message.author.id, { reason: 'AntiEveryone Protection: 3rd+ unauthorized mass ping violation (Ban)' }).catch(() => {});

              dispatchLog(message.guild, 'antinuke', {
                color: 0x992D22,
                title: `${emojis.SHIELD || '🛡️'} ANTI-EVERYONE MASS PING — PERMANENT BAN`,
                description:
                  `**Persistent Unauthorized Mass Ping Intercepted!**\n\n` +
                  `• **Sender:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
                  `• **Channel:** <#${message.channel.id}>\n` +
                  `• **Violation Count:** \`${currentCount}rd Violation\`\n` +
                  `• **Action Taken:** Message deleted & **PERMANENTLY BANNED**!`,
                footer: `AntiNuke Mass Ping Guard`
              });
            }
          }
          return;
        }
      }
    }
  }

  if (message.author.bot) return;
  const contentLower = message.content ? message.content.toLowerCase().trim() : '';

  // ⚡ AUTOMATIC SPAM CONTROL (Timeout 2 Minutes on Fast Message Spamming)
  if (message.guild && message.member) {
    const antinukeCmd = client.commands.get('antinuke');
    const antiConfig = antinukeCmd ? antinukeCmd.getOrCreateAntinuke(message.guild.id) : null;
    const isOwnerOrWhitelisted = antiConfig ? (antinukeCmd.isUserWhitelistedForFeature(antiConfig, message.author.id, 'antiSpam') || message.author.id === message.guild.ownerId) : (message.author.id === message.guild.ownerId);

    if (!isOwnerOrWhitelisted) {
      if (!client.spamTracker) client.spamTracker = new Map();

      const userKey = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();
      let userLogs = client.spamTracker.get(userKey) || [];

      // Filter message timestamps within last 4 seconds
      userLogs = userLogs.filter(t => now - t < 4000);
      userLogs.push(now);
      client.spamTracker.set(userKey, userLogs);

      // Trigger threshold: 5 messages in 4 seconds -> 2 Minute Timeout
      if (userLogs.length >= 5) {
        client.spamTracker.delete(userKey);

        // Delete the spam message
        await message.delete().catch(() => {});

        try {
          // Timeout member for 2 minutes (120,000 ms)
          await message.member.timeout(2 * 60 * 1000, 'AntiSpam Protection: Fast message spamming');

          const alertEmbed = createStyledEmbed({
            title: `⚡ AntiSpam Protection Triggered`,
            description:
              `**Spammer:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
              `**Action:** Timed out for **2 minutes** (120 seconds)\n` +
              `**Reason:** Fast message spamming detected in <#${message.channel.id}>.`,
            clientUser: client.user
          });

          await message.channel.send({ embeds: [alertEmbed] }).catch(() => {});
        } catch (e) {
          console.error('Failed to timeout spammer:', e.message);
        }
        return;
      }
    }
  }

  // 🎟️ TICKET MESSAGE RECEIPT REACTION & ANONYMOUS STAFF MODE
  if (message.guild && message.channel.topic && message.channel.topic.includes('ticket|')) {
    // React to confirm message receipt for both user & staff
    await message.react(emojis.SUCCESS).catch(() => {});

    // Anonymous Staff Mode masking
    if (message.channel.topic.includes('anon:on')) {
      const isOpener = message.channel.topic.includes(`owner:${message.author.id}`);
      if (!isOpener) {
        const content = message.content;
        const attachments = Array.from(message.attachments.values()).map(a => a.url);

        await message.delete().catch(() => {});

        const anonEmbed = new EmbedBuilder()
          .setColor(0x00FFBB)
          .setAuthor({ name: 'Support Agent (Anonymous Mode)', iconURL: client.user.displayAvatarURL() })
          .setDescription(content || '*[Attachment]*')
          .setFooter({ text: 'Naruto Support Desk • Staff Identity Protected' });

        return message.channel.send({ embeds: [anonEmbed], files: attachments }).catch(() => {});
      }
    }
  }

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
        let ticketChan = guild.channels.cache.find(c => c.name === chanName && c.parentId === (category ? category.id : c.parentId));
        let isNew = false;

        if (!ticketChan) {
          isNew = true;
          ticketChan = await guild.channels.create({
            name: chanName,
            type: ChannelType.GuildText,
            parent: category ? category.id : undefined,
            permissionOverwrites: [
              { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
            ]
          });
        }

        if (isNew) {
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
          await message.reply(`📬 **ModMail Opened**: Your message has been received by support staff. We will reply shortly!`);
        }

        ticket = {
          channelId: ticketChan.id,
          threadId: ticketChan.id,
          guildId: guild.id,
          messages: []
        };

        modmailCmd.activeModmailTickets.set(message.author.id, ticket);
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

  // 🛡️ WICK-GRADE AUTOMOD FILTERS EVALUATION
  const automod = db.getAutomod(message.guild.id);

  if (automod.enabled && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    // 1. INVITE LINKS FILTER
    if (automod.inviteLinks) {
      const hasInvite = /(discord\.(gg|com\/invite)|.gg\/)/i.test(message.content);
      if (hasInvite) {
        await message.delete().catch(() => {});
        return message.channel.send(`📢 <@${message.author.id}>, posting Discord server invite links is **PROHIBITED** on this server!`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
      }
    }

    // 2. MALICIOUS / SCAM LINKS FILTER
    if (automod.maliciousLinks) {
      const maliciousPatterns = [/grabify/i, /iplogger/i, /free-nitro/i, /discord-nitro/i, /steamgift/i, /bit\.ly/i];
      if (maliciousPatterns.some(pat => pat.test(message.content))) {
        await message.delete().catch(() => {});
        return message.channel.send(`${emojis.SHIELD} <@${message.author.id}>, **Malicious/Phishing link blocked!**`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 6000));
      }
    }

    // 3. WORD BLACKLIST & PROFANITY FILTER
    if (automod.profanity) {
      const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', ...(automod.wordBlacklist || [])];
      if (badWords.some(w => w && contentLower.includes(w.toLowerCase()))) {
        await message.delete().catch(() => {});
        return message.channel.send(`${emojis.WARNING} <@${message.author.id}>, blacklisted word/profanity is **DISABLED** on this server!`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }
    }

    // 4. LINK BLACKLIST FILTER
    if (automod.linkBlacklist && automod.linkBlacklist.length > 0) {
      if (automod.linkBlacklist.some(domain => contentLower.includes(domain.toLowerCase()))) {
        await message.delete().catch(() => {});
        return message.channel.send(`🔗 <@${message.author.id}>, blacklisted website link is **NOT ALLOWED** on this server!`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }
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
          const reactionTarget = emojis.resolveEmojiForReaction ? emojis.resolveEmojiForReaction(client, message.guild, ar.emoji) : ar.emoji;
          if (reactionTarget) {
            message.react(reactionTarget).catch(err => {
              console.error(`[Autoreact Error] Failed to react with "${ar.emoji}":`, err.message);
            });
          }
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

    // 🗳️ SINGLE REACTION CHANNEL AUTO-REACT
    const rxConfig = db.getReactionChannel(message.guild.id, message.channel.id);
    if (rxConfig && rxConfig.enabled && rxConfig.emoji) {
      const rxEmoji = emojis.resolveEmojiForReaction ? emojis.resolveEmojiForReaction(client, message.guild, rxConfig.emoji) : rxConfig.emoji;
      if (rxEmoji) {
        message.react(rxEmoji).catch(() => {});
      }
    }
  }

  // 📌 ROCK-SOLID STICKY NOTES ENGINE (Always kept at the bottom)
  const isStickyRemoveCmd = message.content.toLowerCase().includes('remove') ||
                            message.content.toLowerCase().includes('delete') ||
                            message.content.toLowerCase().includes('clear') ||
                            message.content.toLowerCase().includes('off') ||
                            message.content.toLowerCase().includes('unsticky');

  const stickyCmd = client.commands.get('stickynote');
  if (stickyCmd && stickyCmd.stickyNotesStore && !isStickyRemoveCmd) {
    const stickyData = stickyCmd.stickyNotesStore.get(message.channel.id);
    if (stickyData && stickyData.text) {
      // Delete previous sticky message if present
      if (stickyData.lastMsgId) {
        message.channel.messages.fetch(stickyData.lastMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
      }
      const stickyEmbed = createStyledEmbed({
        title: `${emojis.STICKY || '📌'} Sticky Note`,
        description: stickyData.text,
        clientUser: client.user,
        footerText: `Sticky Message • Stays at the bottom of this channel`
      });
      // Send fresh sticky message at the bottom
      setTimeout(() => {
        // Re-verify that sticky note wasn't deleted during timeout delay
        if (!stickyCmd.stickyNotesStore.has(message.channel.id)) return;
        message.channel.send({ embeds: [stickyEmbed] }).then(sentMsg => {
          if (!stickyCmd.stickyNotesStore.has(message.channel.id)) {
            sentMsg.delete().catch(() => {});
            return;
          }
          stickyData.lastMsgId = sentMsg.id;
          stickyCmd.stickyNotesStore.set(message.channel.id, stickyData);
        }).catch(() => {});
      }, 500);
    }
  }

  const mentionPrefix = `<@${client.user.id}>`;
  const mentionNicknamePrefix = `<@!${client.user.id}>`;
  let usedPrefix = null;

  const { isBotOwner } = require('./utils/owners');
  const noPrefixCmd = client.commands.get('noprefix');
  const isNoPrefixUser = (noPrefixCmd && noPrefixCmd.noPrefixStore ? noPrefixCmd.noPrefixStore.has(message.author.id) : false) || isBotOwner(message.author, client);

  if (message.content.startsWith(PREFIX)) {
    usedPrefix = PREFIX;
  } else if (message.content.startsWith(mentionPrefix)) {
    usedPrefix = mentionPrefix;
  } else if (message.content.startsWith(mentionNicknamePrefix)) {
    usedPrefix = mentionNicknamePrefix;
  } else if (isNoPrefixUser) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const firstWord = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const foundCmd = client.commands.get(firstWord) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(firstWord));
    if (foundCmd) {
      usedPrefix = message.content.startsWith(rawFirstWord) ? '' : message.content.slice(0, message.content.indexOf(rawFirstWord));
    }
  }

  if (message.content.trim() === mentionPrefix || message.content.trim() === mentionNicknamePrefix) {
    const helpCmd = client.commands.get('help');
    if (helpCmd) return helpCmd.execute(message, []);
  }

  if (usedPrefix === null) return;

  const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
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
        content: `${emojis.WARNING} You already have an open ticket in ${existingTicket}! Each user can only have **1 open ticket** at a time. Please close your active ticket before creating a new one.`
      }).catch(() => {});
    }

    const me = guild.members.me;
    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels) || !me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply({
        content: `${emojis.ERROR} **Missing Bot Permissions**: The bot needs **Manage Channels** and **Manage Roles** permissions to create ticket channels and set permissions.`
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
      return interaction.editReply({ content: `${emojis.SUCCESS} Ticket created! Head over to ${ticketChan}` }).catch(() => {});
    } catch (e) {
      console.error('Failed to create ticket channel:', e);
      return interaction.editReply({
        content: `${emojis.ERROR} **Failed to Create Ticket**: \`${e.message || 'Permission Error'}\`.`
      }).catch(() => {});
    }
  }

  // 1.9 SUGGESTED SONGS SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'music_suggested_select') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const val = interaction.values[0];
    const voiceState = interaction.member?.voice;
    if (!voiceState?.channel) {
      return interaction.editReply({ content: `${emojis.WARNING} You must be in a Voice Channel to play suggested songs!` }).catch(() => {});
    }

    const { getLavalink } = require('./utils/lavalink');
    const lavalink = getLavalink();

    try {
      let player = lavalink?.getPlayer(interaction.guild.id);
      if (!player && lavalink) {
        player = await lavalink.createPlayer({
          guildId: interaction.guild.id,
          voiceChannelId: voiceState.channel.id,
          textChannelId: interaction.channel.id,
          selfDeaf: true
        });
        await player.connect();
      }

      // Handle dynamic suggested tracks
      if (val.startsWith('sug_dyn_')) {
        const idx = parseInt(val.replace('sug_dyn_', ''));
        const track = player?.suggestedTracks?.[idx];
        if (track) {
          await player.queue.add(track);
          if (!player.playing && !player.paused) {
            await player.play();
            return interaction.editReply({ content: `✨ **Playing Suggested Track:** \`${track.info.title}\`` }).catch(() => {});
          } else {
            return interaction.editReply({ content: `✨ **Added to Queue:** \`${track.info.title}\` at position **#${player.queue.tracks.length}**.` }).catch(() => {});
          }
        }
      }

      const map = {
        'sug_bluebird': 'Naruto Shippuden OP 3 - Blue Bird',
        'sug_silhouette': 'Naruto Shippuden OP 16 - Silhouette',
        'sug_sadness': 'Naruto OST - Sadness and Sorrow',
        'sug_heeriye': 'Heeriye Jasleen Royal Arijit Singh',
        'sug_jagjit': 'Tere Baare Mein Jab Socha Jagjit Singh'
      };

      const query = map[val] || 'Naruto Blue Bird';
      let res = await player.search({ query, source: 'spsearch' }, interaction.user);
      if (!res || !res.tracks.length) {
        res = await player.search({ query, source: 'ytmsearch' }, interaction.user);
      }
      if (!res || !res.tracks.length) {
        return interaction.editReply({ content: `${emojis.ERROR} Could not find track: **${query}**.` }).catch(() => {});
      }

      const track = res.tracks[0];
      await player.queue.add(track);

      if (!player.playing && !player.paused) {
        await player.play();
        return interaction.editReply({ content: `✨ **Playing Suggested Track:** \`${track.info.title}\`` }).catch(() => {});
      } else {
        return interaction.editReply({ content: `✨ **Added to Queue:** \`${track.info.title}\` at position **#${player.queue.tracks.length}**.` }).catch(() => {});
      }
    } catch (e) {
      return interaction.editReply({ content: `${emojis.ERROR} Failed to play suggested song: ${e.message}` }).catch(() => {});
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

    if (!player) {
      return interaction.editReply({ content: `${emojis.WARNING} No active music player in this server!` }).catch(() => {});
    }

    try {
      if (values.includes('filter_reset')) {
        if (player.filterManager && typeof player.filterManager.resetFilters === 'function') {
          await player.filterManager.resetFilters().catch(() => {});
        }
        return interaction.editReply({ content: `🚫 Reset all audio filters to default.` }).catch(() => {});
      }

      if (player.filterManager) {
        for (const val of values) {
          try {
            if (val === 'filter_bassboost') {
              if (typeof player.filterManager.setBassboost === 'function') {
                await player.filterManager.setBassboost(0.25).catch(() => {});
              } else if (typeof player.filterManager.setEqualizer === 'function') {
                await player.filterManager.setEqualizer([
                  { band: 0, gain: 0.25 },
                  { band: 1, gain: 0.20 },
                  { band: 2, gain: 0.15 },
                  { band: 3, gain: 0.10 }
                ]).catch(() => {});
              }
            } else if (val === 'filter_8d') {
              if (typeof player.filterManager.set8D === 'function') {
                await player.filterManager.set8D(true).catch(() => {});
              } else if (typeof player.filterManager.setRotation === 'function') {
                await player.filterManager.setRotation({ rotationHz: 0.2 }).catch(() => {});
              }
            } else if (val === 'filter_nightcore') {
              if (typeof player.filterManager.setNightcore === 'function') {
                await player.filterManager.setNightcore(true).catch(() => {});
              } else if (typeof player.filterManager.setTimescale === 'function') {
                await player.filterManager.setTimescale({ speed: 1.25, pitch: 1.25, rate: 1.0 }).catch(() => {});
              }
            } else if (val === 'filter_vaporwave') {
              if (typeof player.filterManager.setVaporwave === 'function') {
                await player.filterManager.setVaporwave(true).catch(() => {});
              } else if (typeof player.filterManager.setTimescale === 'function') {
                await player.filterManager.setTimescale({ speed: 0.85, pitch: 0.80, rate: 1.0 }).catch(() => {});
              }
            }
          } catch (err) {
            console.error('[Filter Error]', err.message);
          }
        }
      }

      return interaction.editReply({ content: `🎶 Applied Audio Filters: **${filterNames.join(', ')}**!` }).catch(() => {});
    } catch (e) {
      return interaction.editReply({ content: `${emojis.ERROR} Error applying audio filters: ${e.message}` }).catch(() => {});
    }
  }

  // 2.5 SYNNS MUSIC CONTROLS SELECT MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'music_controls_select') {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const val = interaction.values[0];
    const { getLavalink } = require('./utils/lavalink');
    const player = getLavalink()?.getPlayer(interaction.guild.id);

    if (!player) {
      return interaction.editReply({ content: `${emojis.WARNING} No active music player in this server!` }).catch(() => {});
    }

    if (val === 'ctrl_shuffle') {
      await player.queue.shuffle();
      return interaction.editReply({ content: `🔀 Queue order randomized!` }).catch(() => {});
    }
    if (val === 'ctrl_loop_off') {
      await player.setRepeatMode('off');
      return interaction.editReply({ content: `➡️ Loop mode disabled.` }).catch(() => {});
    }
    if (val === 'ctrl_loop_track') {
      await player.setRepeatMode('track');
      return interaction.editReply({ content: `🔂 Repeating current track.` }).catch(() => {});
    }
    if (val === 'ctrl_loop_queue') {
      await player.setRepeatMode('queue');
      return interaction.editReply({ content: `🔁 Repeating entire queue.` }).catch(() => {});
    }
    if (val === 'ctrl_autoplay') {
      player.autoplay = !player.autoplay;
      const status = player.autoplay ? '🟢 **ENABLED**' : '🔴 **DISABLED**';
      return interaction.editReply({ content: `♾️ **Autoplay Mode:** ${status}!` }).catch(() => {});
    }
    if (val === 'ctrl_fav_add') {
      const db = require('./database/db');
      const currentTrack = player?.queue?.current;
      if (!currentTrack) {
        return interaction.editReply({ content: `${emojis.WARNING} No track currently playing!` }).catch(() => {});
      }
      const res = db.addFavorite(interaction.user.id, currentTrack);
      if (!res.added) {
        return interaction.editReply({ content: `${emojis.WARNING} ${res.message}` }).catch(() => {});
      }
      return interaction.editReply({ content: `❤️ **Saved to Favorites:** [${res.favorite.title}](${res.favorite.uri})!` }).catch(() => {});
    }
    if (val === 'ctrl_fav_play') {
      const db = require('./database/db');
      const favs = db.getFavorites(interaction.user.id);
      if (!favs.length) {
        return interaction.editReply({ content: `💔 You have no saved favorite tracks! Use \`.fav add\` while listening.` }).catch(() => {});
      }
      let queuedCount = 0;
      for (const f of favs) {
        try {
          let res = await player.search({ query: f.uri || f.title, source: 'ytmsearch' }, interaction.user);
          if (res && res.tracks.length) {
            await player.queue.add(res.tracks[0]);
            queuedCount++;
          }
        } catch (e) {}
      }
      if (!player.playing && !player.paused) {
        await player.play().catch(() => {});
      }
      return interaction.editReply({ content: `⭐ Queued **${queuedCount} Favorite Songs** into queue!` }).catch(() => {});
    }
    if (val === 'ctrl_voldown') {
      const vol = Math.max(10, (player.volume || 100) - 20);
      await player.setVolume(vol);
      return interaction.editReply({ content: `🔉 Volume reduced to **${vol}%**.` }).catch(() => {});
    }
    if (val === 'ctrl_volup') {
      const vol = Math.min(200, (player.volume || 100) + 20);
      await player.setVolume(vol);
      return interaction.editReply({ content: `🔊 Volume increased to **${vol}%**.` }).catch(() => {});
    }
    if (val === 'ctrl_prev') {
      return interaction.editReply({ content: `⏮️ Replaying previous track.` }).catch(() => {});
    }
    if (val === 'ctrl_pause') {
      if (player.paused) {
        await player.resume();
        return interaction.editReply({ content: `▶️ Playback resumed.` }).catch(() => {});
      } else {
        await player.pause();
        return interaction.editReply({ content: `⏸️ Playback paused.` }).catch(() => {});
      }
    }
    if (val === 'ctrl_skip') {
      await player.skip();
      return interaction.editReply({ content: `⏭️ Skipped track.` }).catch(() => {});
    }
    if (val === 'ctrl_stop') {
      await player.destroy();
      return interaction.editReply({ content: `⏹️ Stopped music player & cleared queue.` }).catch(() => {});
    }
  }

  // 2.6 VOICEMASTER QUICK MENU SELECT MENU
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

  // MUSIC BUTTON CONTROLS
  if (interaction.customId.startsWith('music_') || interaction.customId.startsWith('queue_')) {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const action = interaction.customId;
    const { getLavalink } = require('./utils/lavalink');
    const player = getLavalink()?.getPlayer(interaction.guild.id);

    if (!player) {
      return interaction.editReply({ content: `${emojis.WARNING} No active music player in this server!` }).catch(() => {});
    }

    if (action === 'music_pause') {
      if (player.paused) {
        await player.resume();
        return interaction.editReply({ content: `▶️ Playback resumed.` }).catch(() => {});
      } else {
        await player.pause();
        return interaction.editReply({ content: `⏸️ Playback paused.` }).catch(() => {});
      }
    }
    if (action === 'music_skip') {
      await player.skip();
      return interaction.editReply({ content: `⏭️ Skipped track.` }).catch(() => {});
    }
    if (action === 'music_stop') {
      await player.destroy();
      return interaction.editReply({ content: `⏹️ Stopped player & cleared queue.` }).catch(() => {});
    }
    if (action === 'music_loop') {
      const mode = player.repeatMode === 'track' ? 'queue' : player.repeatMode === 'queue' ? 'off' : 'track';
      await player.setRepeatMode(mode);
      return interaction.editReply({ content: `🔁 Loop mode set to: **${mode.toUpperCase()}**.` }).catch(() => {});
    }
    if (action === 'music_shuffle') {
      await player.queue.shuffle();
      return interaction.editReply({ content: `🔀 Queue randomized!` }).catch(() => {});
    }
    if (action === 'music_volup') {
      const vol = Math.min(200, (player.volume || 100) + 15);
      await player.setVolume(vol);
      return interaction.editReply({ content: `🔊 Volume set to **${vol}%**.` }).catch(() => {});
    }
    if (action === 'music_clear') {
      await player.queue.clear();
      return interaction.editReply({ content: `🔄 Cleared queue.` }).catch(() => {});
    }
    if (action === 'music_prev') {
      if (player.queue.previous && player.queue.previous.length) {
        const prevTrack = player.queue.previous[player.queue.previous.length - 1];
        await player.queue.add(prevTrack, 0);
        await player.skip();
        return interaction.editReply({ content: `⏮️ Replaying previous track: **${prevTrack.info.title}**.` }).catch(() => {});
      } else {
        await player.seek(0).catch(() => {});
        return interaction.editReply({ content: `⏮️ Replayed track from beginning.` }).catch(() => {});
      }
    }
    if (action === 'queue_playnow') {
      if (player.queue.tracks.length > 0) {
        const lastTrack = player.queue.tracks.pop();
        if (lastTrack) {
          player.queue.tracks.unshift(lastTrack);
          await player.skip();
          return interaction.editReply({ content: `▶️ Playing now: **${lastTrack.info.title}**!` }).catch(() => {});
        }
      }
      return interaction.editReply({ content: `${emojis.WARNING} No track found to play now.` }).catch(() => {});
    }

    if (action === 'queue_playnext') {
      if (player.queue.tracks.length > 1) {
        const lastTrack = player.queue.tracks.pop();
        if (lastTrack) {
          player.queue.tracks.unshift(lastTrack);
          return interaction.editReply({ content: `⏭️ **${lastTrack.info.title}** will play next!` }).catch(() => {});
        }
      }
      return interaction.editReply({ content: `ℹ️ Track is already set to play next.` }).catch(() => {});
    }

    if (action === 'queue_remove') {
      if (player.queue.tracks.length > 0) {
        const removed = player.queue.tracks.pop();
        return interaction.editReply({ content: `🗑️ Removed **${removed?.info?.title || 'Track'}** from queue.` }).catch(() => {});
      }
      return interaction.editReply({ content: `${emojis.WARNING} Queue is empty.` }).catch(() => {});
    }

    if (action === 'music_autoplay') {
      player.autoplay = !player.autoplay;
      const status = player.autoplay ? '🟢 **ENABLED**' : '🔴 **DISABLED**';
      return interaction.editReply({ content: `♾️ **Autoplay Mode:** ${status}!` }).catch(() => {});
    }
    if (action === 'music_fav_add') {
      const db = require('./database/db');
      const currentTrack = player?.queue?.current;
      if (!currentTrack) {
        return interaction.editReply({ content: `${emojis.WARNING} No track currently playing!` }).catch(() => {});
      }
      const res = db.addFavorite(interaction.user.id, currentTrack);
      if (!res.added) {
        return interaction.editReply({ content: `${emojis.WARNING} ${res.message}` }).catch(() => {});
      }
      return interaction.editReply({ content: `❤️ **Saved to Favorites:** [${res.favorite.title}](${res.favorite.uri})!` }).catch(() => {});
    }
    if (action === 'music_fav_play') {
      const db = require('./database/db');
      const favs = db.getFavorites(interaction.user.id);
      if (!favs.length) {
        return interaction.editReply({ content: `💔 You have no saved favorite tracks! Use \`.fav add\` while listening.` }).catch(() => {});
      }
      let queuedCount = 0;
      for (const f of favs) {
        try {
          let res = await player.search({ query: f.uri || f.title, source: 'ytmsearch' }, interaction.user);
          if (res && res.tracks.length) {
            await player.queue.add(res.tracks[0]);
            queuedCount++;
          }
        } catch (e) {}
      }
      if (!player.playing && !player.paused) {
        await player.play().catch(() => {});
      }
      return interaction.editReply({ content: `⭐ Queued **${queuedCount} Favorite Songs** into queue!` }).catch(() => {});
    }
    if (action === 'music_lyrics') {
      const currentTrack = player?.queue?.current;
      if (!currentTrack?.info?.title) {
        return interaction.editReply({ content: `${emojis.WARNING} No track currently playing!` }).catch(() => {});
      }
      const lyricsCmd = require('./commands/lyrics');
      const cleanTitle = currentTrack.info.title.replace(/\(Official Video\)/gi, '').replace(/\[Official Music Video\]/gi, '').trim();
      const artist = currentTrack.info.author || '';
      const res = await lyricsCmd.fetchLyrics(cleanTitle, artist);
      if (!res || !res.lyrics) {
        return interaction.editReply({ content: `${emojis.ERROR} **Lyrics Not Found** for **${cleanTitle}**.` }).catch(() => {});
      }
      let lyricsText = res.lyrics;
      if (lyricsText.length > 1900) lyricsText = lyricsText.slice(0, 1900) + '\n...*(truncated)*';
      return interaction.editReply({ content: `📜 **Lyrics — ${res.title} (${res.artist}):**\n\`\`\`\n${lyricsText}\n\`\`\`` }).catch(() => {});
    }
  }

  // GIVEAWAY ENTER BUTTON
  if (interaction.customId.startsWith('gw_enter_')) {
    const gwId = interaction.customId.replace('gw_enter_', '');
    const giveawayCmd = client.commands.get('giveaway');
    const gw = giveawayCmd ? giveawayCmd.giveaways.get(gwId) : null;

    if (!gw) {
      return interaction.reply({ content: `${emojis.WARNING} This giveaway is no longer active!`, flags: 64 }).catch(() => {});
    }

    if (gw.ended) {
      return interaction.reply({ content: `${emojis.WARNING} This giveaway has already ended!`, flags: 64 }).catch(() => {});
    }

    if (!gw.entries) gw.entries = new Set();

    if (gw.entries.has(interaction.user.id)) {
      return interaction.reply({ content: `🎉 You have already entered giveaway **${gwId}**!`, flags: 64 }).catch(() => {});
    }

    gw.entries.add(interaction.user.id);
    giveawayCmd.giveaways.set(gwId, gw);

    // Update live giveaway embed participant count using the premium buildActiveEmbed format
    try {
      const endTimestamp = Math.floor(gw.endTime / 1000);
      const updatedEmbed = giveawayCmd.buildActiveEmbed(
        gw.prize,
        gw.winnerCount,
        endTimestamp,
        gw.id,
        gw.hostId,
        gw.entries.size,
        client.user
      );
      await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
    } catch (e) {}

    // Send DM matching Paradox bot aesthetic (Picture 2)
    const endTimestamp = Math.floor(gw.endTime / 1000);
    const msgUrl = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.message.id}`;

    const dmEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('Giveaway Entry Confirmed! 🎉')
      .setDescription(
        `Your entry for **${gw.prize}** has been confirmed!\n\n` +
        `**Giveaway Info**\n` +
        `**Server:** ${interaction.guild?.name || 'Server'}\n` +
        `**Ends:** <t:${endTimestamp}:R>`
      );

    const dmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('View Giveaway')
        .setStyle(ButtonStyle.Link)
        .setURL(msgUrl)
    );

    await interaction.user.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => {});

    return interaction.reply({ content: `🎉 **Entry Confirmed!** Check your DMs for details! 📩`, flags: 64 }).catch(() => {});
  }

  // GIVEAWAY CLAIM REWARD BUTTON → Opens a Reward Ticket
  if (interaction.customId.startsWith('gw_claim_')) {
    const gwId = interaction.customId.replace('gw_claim_', '');
    const giveawayCmd = client.commands.get('giveaway');
    const gw = giveawayCmd ? giveawayCmd.giveaways.get(gwId) : null;

    if (!gw) {
      return interaction.reply({ content: `${emojis.WARNING} This giveaway is no longer active in memory. Please contact the host directly.`, flags: 64 }).catch(() => {});
    }

    const guild = interaction.guild;
    const user = interaction.user;

    // Check if user is a winner
    // (winners aren't stored by ID in memory, so we gate by: gw must be ended)
    if (!gw.ended) {
      return interaction.reply({ content: `${emojis.WARNING} This giveaway hasn't ended yet!`, flags: 64 }).catch(() => {});
    }

    await interaction.deferReply({ flags: 64 }).catch(() => {});

    try {
      const ticketCmd = client.commands.get('ticket');
      const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(guild.id) : { ticketCounter: 0, staffRoles: new Set(), categories: [] };

      // Check open ticket limit
      const existingTicket = guild.channels.cache.find(c =>
        c.isTextBased() && c.topic && c.topic.includes(`owner:${user.id}`)
      );

      if (existingTicket) {
        return interaction.editReply({
          content: `${emojis.WARNING} You already have an open ticket in ${existingTicket}! Please close it before claiming your reward.`
        }).catch(() => {});
      }

      const me = guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.editReply({ content: `${emojis.ERROR} I need **Manage Channels** permission to create a reward ticket!` }).catch(() => {});
      }

      const { logChan, category } = ticketCmd ? await ticketCmd.ensureTicketLogChannels(guild) : { logChan: null, category: null };
      config.ticketCounter++;
      const ticketNum = config.ticketCounter;

      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const chanName = `${cleanUsername}-reward-${ticketNum}`;

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
        topic: `ticket|owner:${user.id}|type:Reward|priority:High|claim:none`,
        parent: category ? category.id : undefined,
        permissionOverwrites: overwrites
      });

      const rewardEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`${emojis.GOLD_CUP || '🏆'}  Reward Claim Ticket`)
        .setDescription(
          `> **Prize:** ${gw.prize}\n\n` +
          `<@${user.id}> has claimed their giveaway reward!\n\n` +
          `${emojis.GIVEAWAY_PING || '🎉'} **Giveaway ID:** \`${gw.id}\`\n` +
          `${emojis.GOLD_CUP || '🏆'} **Host:** <@${gw.hostId}>\n\n` +
          `*Please wait — a staff member will assist you shortly.*`
        )
        .setFooter({ text: `Ticket #${ticketNum} • Reward Claim`, iconURL: client.user?.displayAvatarURL() || undefined })
        .setTimestamp();

      const closeRow = ticketCmd ? ticketCmd.buildTicketActionRows() : [];

      const pings = [`<@${user.id}>`, ...Array.from(config.staffRoles).map(id => `<@&${id}>`)].join(' ');
      await ticketChan.send({ content: pings, embeds: [rewardEmbed], components: closeRow });

      if (logChan) {
        const logEmbed = createStyledEmbed({
          title: `🏆 Reward Claim Ticket Opened`,
          description: `**User:** <@${user.id}> (\`${user.tag}\`)\n**Prize:** ${gw.prize}\n**Giveaway ID:** \`${gw.id}\`\n**Ticket:** ${ticketChan}`,
          requestedBy: user,
          clientUser: client.user
        });
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }

      ticketCmd?.ticketConfigs?.set(guild.id, config);
      return interaction.editReply({ content: `${emojis.SUCCESS} Reward ticket created! Head over to ${ticketChan} 🎁` }).catch(() => {});
    } catch (e) {
      console.error('Failed to create reward ticket:', e);
      return interaction.editReply({ content: `${emojis.ERROR} Failed to create reward ticket: \`${e.message || 'Permission Error'}\`` }).catch(() => {});
    }
  }

  // 3. CALL STAFF BUTTON
  if (interaction.customId === 'ticket_callstaff_btn') {
    try {
      const user = interaction.user;
      const channel = interaction.channel;
      const ticketCmd = client.commands.get('ticket');
      const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

      if (ticketCmd && ticketCmd.staffCallCooldowns) {
        const lastCall = ticketCmd.staffCallCooldowns.get(channel.id) || 0;
        const cooldownMs = 60 * 60 * 1000;
        const elapsed = Date.now() - lastCall;
        if (elapsed < cooldownMs) {
          const remainingMins = Math.ceil((cooldownMs - elapsed) / 60000);
          return interaction.reply({
            content: `⏳ **Staff Call Cooldown**: Staff was called recently. Call again in **${remainingMins} minutes**.`,
            flags: 64
          }).catch(() => {});
        }
        ticketCmd.staffCallCooldowns.set(channel.id, Date.now());
      }

      const staffPings = Array.from(config.staffRoles).map(id => `<@&${id}>`).join(' ') || '@here';
      await channel.send({ content: `📞 **Call Staff Alert**: ${staffPings}\n<@${user.id}> has requested immediate support staff attendance in this ticket!` }).catch(() => {});
      return interaction.reply({ content: `📞 Support staff summoned!`, flags: 64 }).catch(() => {});
    } catch (e) {
      console.error('ticket_callstaff_btn error:', e);
      return interaction.reply({ content: `${emojis.ERROR} Failed to call staff: ${e.message}`, flags: 64 }).catch(() => {});
    }
  }

  // 4. CLAIM TICKET BUTTON
  if (interaction.customId === 'ticket_claim_btn') {
    try {
      const user = interaction.user;
      const member = interaction.member;
      const message = interaction.message;
      const channel = interaction.channel;

      const ticketCmd = client.commands.get('ticket');
      const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

      const isStaff = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      Array.from(config.staffRoles).some(rId => member.roles.cache.has(rId));

      if (!isStaff) {
        return interaction.reply({ content: `${emojis.ERROR} Only support staff members can claim tickets!`, flags: 64 }).catch(() => {});
      }

      if (!message.embeds?.[0]) {
        return interaction.reply({ content: `${emojis.ERROR} Could not read ticket embed. Please re-run ticket setup.`, flags: 64 }).catch(() => {});
      }

      const embed = EmbedBuilder.from(message.embeds[0]);
      const claimedField = embed.data.fields?.find(f => f.name.includes('Claimed'));

      if (claimedField && !claimedField.value.toLowerCase().includes('unclaimed') && !claimedField.value.toLowerCase().includes('none')) {
        return interaction.reply({ content: `${emojis.WARNING} This ticket is already claimed by ${claimedField.value}!`, flags: 64 }).catch(() => {});
      }

      embed.spliceFields(2, 1, { name: '👑 Claimed By', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true });

      let topic = channel.topic || '';
      if (topic.includes('claim:')) {
        topic = topic.replace(/claim:[^|]+/, `claim:${user.id}`);
      } else {
        topic += `|claim:${user.id}`;
      }
      await channel.setTopic(topic).catch(() => {});
      await message.edit({ embeds: [embed] }).catch(() => {});
      await interaction.reply({ content: `${emojis.SHIELD} Ticket claimed by <@${user.id}>.` }).catch(() => {});

      if (ticketCmd) {
        const priorityMatch = topic.match(/priority:([^|]+)/);
        const prioText = priorityMatch ? priorityMatch[1] : 'Low';
        ticketCmd.updateTicketStaffReminderTimer(client, channel, prioText, user.id);
        const { logChan } = await ticketCmd.ensureTicketLogChannels(interaction.guild);
        if (logChan) {
          const logEmbed = createStyledEmbed({
            title: `🙋‍♂️ Ticket Claimed`,
            description: `**Staff Member:** <@${user.id}> (\`${user.tag}\`)\n**Ticket Channel:** ${channel}`,
            requestedBy: user, clientUser: client.user
          });
          await logChan.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('ticket_claim_btn error:', e);
      return interaction.reply({ content: `${emojis.ERROR} Failed to claim ticket: ${e.message}`, flags: 64 }).catch(() => {});
    }
  }

  // 5. PRIORITY TICKET BUTTON
  if (interaction.customId === 'ticket_priority_btn') {
    try {
      const user = interaction.user;
      const message = interaction.message;
      const channel = interaction.channel;
      const ticketCmd = client.commands.get('ticket');

      if (!message.embeds?.[0]) {
        return interaction.reply({ content: `${emojis.ERROR} Could not read ticket embed.`, flags: 64 }).catch(() => {});
      }

      let topic = channel.topic || '';
      const priorityField = message.embeds[0].fields?.find(f => f.name.includes('Priority'))?.value || 'Low';
      let newPriority = priorityField.includes('Low') ? 'Normal' : priorityField.includes('Normal') ? 'Urgent' : 'Low';

      const embed = EmbedBuilder.from(message.embeds[0]);
      const color = newPriority === 'Urgent' ? 0xFF0055 : newPriority === 'Normal' ? 0xFEE75C : 0x57F287;
      embed.setColor(color);
      embed.spliceFields(1, 1, { name: '⚡ Priority Level', value: `\`${newPriority}\``, inline: true });

      topic = topic.includes('priority:') ? topic.replace(/priority:[^|]+/, `priority:${newPriority}`) : topic + `|priority:${newPriority}`;
      await channel.setTopic(topic).catch(() => {});
      await message.edit({ embeds: [embed] }).catch(() => {});
      await interaction.reply({ content: `⚡ Priority set to **${newPriority}** by <@${user.id}>.` }).catch(() => {});

      if (ticketCmd) {
        const claimMatch = topic.match(/claim:([^|]+)/);
        ticketCmd.updateTicketStaffReminderTimer(client, channel, newPriority, claimMatch?.[1] || null);
      }
    } catch (e) {
      console.error('ticket_priority_btn error:', e);
      return interaction.reply({ content: `${emojis.ERROR} Failed to update priority: ${e.message}`, flags: 64 }).catch(() => {});
    }
  }

  // 6. ANONYMOUS STAFF MODE TOGGLE BUTTON
  if (interaction.customId === 'ticket_anon_btn') {
    try {
      const channel = interaction.channel;
      let topic = channel.topic || '';
      const isAnonOn = topic.includes('anon:on');
      const newAnon = isAnonOn ? 'off' : 'on';

      topic = topic.includes('anon:') ? topic.replace(/anon:(on|off)/, `anon:${newAnon}`) : topic + `|anon:${newAnon}`;
      await channel.setTopic(topic).catch(() => {});

      const message = interaction.message;
      if (message.embeds?.[0]) {
        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.spliceFields(3, 1, { name: '🎭 Anonymous Mode', value: `\`${newAnon.toUpperCase()}\``, inline: true });
        await message.edit({ embeds: [embed] }).catch(() => {});
      }

      return interaction.reply({
        content: `🎭 **Anonymous Staff Mode** is now **${newAnon.toUpperCase()}**!`,
        flags: 64
      }).catch(() => {});
    } catch (e) {
      console.error('ticket_anon_btn error:', e);
      return interaction.reply({ content: `${emojis.ERROR} Failed to toggle anon mode: ${e.message}`, flags: 64 }).catch(() => {});
    }
  }

  // 7. LOCK TICKET BUTTON
  if (interaction.customId === 'ticket_lock_btn') {
    try {
      const user = interaction.user;
      const channel = interaction.channel;
      const topic = channel.topic || '';
      const match = topic.match(/owner:(\d+)/);
      const ownerId = match ? match[1] : null;

      if (ownerId) {
        await channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => {});
      }
      return interaction.reply({ content: `🔒 Ticket locked by <@${user.id}>.` }).catch(() => {});
    } catch (e) {
      console.error('ticket_lock_btn error:', e);
      return interaction.reply({ content: `${emojis.ERROR} Failed to lock ticket: ${e.message}`, flags: 64 }).catch(() => {});
    }
  }

  // 8. CLOSE TICKET BUTTON
  if (interaction.customId === 'ticket_close_btn') {
    const user = interaction.user;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');

    if (ticketCmd && ticketCmd.priorityTimers.has(channel.id)) {
      clearInterval(ticketCmd.priorityTimers.get(channel.id));
      ticketCmd.priorityTimers.delete(channel.id);
    }

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

  // 8b. ADD MEMBER TO TICKET BUTTON
  if (interaction.customId === 'ticket_addmember_btn') {
    const user = interaction.user;
    const member = interaction.member;
    const channel = interaction.channel;
    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : { staffRoles: new Set() };

    const isStaff = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                    Array.from(config.staffRoles).some(rId => member.roles.cache.has(rId));

    if (!isStaff) {
      return interaction.reply({ content: `${emojis.ERROR} Only support staff members can add users to tickets!`, flags: 64 }).catch(() => {});
    }

    return interaction.reply({
      content: `➕ **Add Member to Ticket**\nUse \`.ticket add @user\` command in this channel to add a member to this ticket.`,
      flags: 64
    }).catch(() => {});
  }

  // 8c. TICKET CREATE DEFAULT BUTTON (fallback from old panels — redirect to dropdown)
  if (interaction.customId === 'ticket_create_default') {
    const ticketCmd = client.commands.get('ticket');
    const config = ticketCmd ? ticketCmd.getOrCreateTicketConfig(interaction.guild.id) : null;
    const categories = config ? config.categories : [
      { id: 'cat_support', name: 'General Support', emoji: '🎫', description: 'Need help or general assistance?' },
      { id: 'cat_promo', name: 'Promotion', emoji: '📢', description: 'Inquire about promotional deals' },
      { id: 'cat_report', name: 'Report', emoji: '🚨', description: 'Report a user or server violation' },
      { id: 'cat_reward', name: 'Reward', emoji: '🎁', description: 'Claim your event or activity rewards' },
      { id: 'cat_staff', name: 'Staff Apply', emoji: '💼', description: 'Apply for staff position' },
      { id: 'cat_server_promo', name: 'Server Promo', emoji: '🌐', description: 'Request server cross-promotions' }
    ];

    const { StringSelectMenuBuilder } = require('discord.js');
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('🏷️ Select a support category...')
      .addOptions(
        categories.map(c => ({
          label: c.name,
          value: c.id,
          description: c.description,
          emoji: c.emoji
        }))
      );

    return interaction.reply({
      content: `🎟️ **Choose a ticket category to open your private support ticket:**`,
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      flags: 64
    }).catch(() => {});
  }

  // 9. VOICEMASTER INTERFACE CONTROLLER BUTTONS
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
        return interaction.reply({ content: `${emojis.MOD} **Ban Member**: Use \`.vc ban @user\` to disconnect and ban a member from your room.`, flags: 64 });
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
        return interaction.reply({ content: `${emojis.GEAR} VoiceMaster action executed.`, flags: 64 });
    }
  }

  // 10. LEVEL CALCULATOR GAUGE BUTTONS
  if (interaction.customId && interaction.customId.startsWith('gauge_start_')) {
    try {
      await interaction.deferUpdate().catch(() => {});
      const parts = interaction.customId.split('_');
      const cmdName = parts[2] || 'smartrate';
      const targetUserId = parts[3] || interaction.user.id;
      const authorId = parts[4] || interaction.user.id;

      let targetUser = interaction.user;
      try {
        targetUser = await client.users.fetch(targetUserId);
      } catch (e) {}

      const score = Math.floor(Math.random() * 100) + 1;
      const funCmd = client.commands.get('fun');

      if (funCmd && funCmd.renderGaugeResultEmbed) {
        const { activeEmbed, doneRow } = funCmd.renderGaugeResultEmbed(cmdName, targetUser, interaction.user, client.user, score);
        await interaction.message.edit({ embeds: [activeEmbed], components: [doneRow] }).catch(() => {});
      }
    } catch (e) {
      console.error('gauge_start_ button error:', e);
    }
  }

  // 11. SERVERINFO TAB BUTTONS
  if (interaction.customId && interaction.customId.startsWith('sinfo_')) {
    try {
      if (interaction.message?.interaction?.user && interaction.user.id !== interaction.message.interaction.user.id) {
        return interaction.reply({ content: `${emojis.WARNING} **Access Denied**: Only the user who requested this panel can use these buttons.`, flags: 64 }).catch(() => {});
      }
      await interaction.deferUpdate().catch(() => {});
      const action = interaction.customId.replace('sinfo_', '');
      const infoCmd = client.commands.get('info');
      if (!infoCmd || !interaction.guild) return;

      const owner = await interaction.guild.fetchOwner().catch(() => null);
      const activeTab = action === 'refresh' ? 'overview' : action;

      const embed = infoCmd.buildServerInfoMainEmbed(interaction.guild, owner, activeTab, interaction.user, client.user);
      const row1 = infoCmd.buildServerInfoRow1(activeTab);
      const row2 = infoCmd.buildServerInfoRow2(interaction.guild, activeTab);

      await interaction.message.edit({ embeds: [embed], components: [row1, row2] }).catch(() => {});
    } catch (e) {
      console.error('sinfo_ button error:', e);
    }
  }

  // Analytics buttons (stf_, scat_, msgtf_, vctf_, invtf_, jltf_, cmdtf_, tktf_, ucat_, utf_)
  // are handled by per-message collectors in analytics.js — no global handler needed here.
});

// 🏷️ AUTONICK & AUTOROLE LISTENER ON MEMBER JOIN
client.on('guildMemberAdd', async (member) => {
  if (!member || !member.guild) return;

  // 1. AutoRole Assignment (Humans & Bots)
  try {
    const arConfig = db.getAutoroles(member.guild.id);
    const isBot = member.user.bot;
    const targetRoles = isBot ? (arConfig.bots || []) : (arConfig.humans || []);

    for (const roleId of targetRoles) {
      const role = member.guild.roles.cache.get(roleId);
      if (role && !member.roles.cache.has(role.id)) {
        const me = member.guild.members.me;
        if (me && me.permissions.has(PermissionsBitField.Flags.ManageRoles) && role.position < me.roles.highest.position) {
          await member.roles.add(role, `AutoRole Assignment (${isBot ? 'Bot' : 'Human'})`).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('[AutoRole Join Error]:', e.message);
  }

  // 2. AutoNick Assignment
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

// 🗳️ SINGLE REACTION MODE ENFORCEMENT & DUP VOTE STRIPPING
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch().catch(() => null);
    if (reaction.message?.partial) await reaction.message.fetch().catch(() => null);

    const guild = reaction.message?.guild;
    if (!guild) return;

    const channelId = reaction.message.channel.id;
    const rxConfig = db.getReactionChannel(guild.id, channelId);
    if (!rxConfig || !rxConfig.enabled) return;

    const existingVote = db.getReactionVote(guild.id, channelId, user.id);

    if (existingVote) {
      // User has already voted in this single reaction channel -> strip duplicate reaction
      await reaction.users.remove(user.id).catch(() => null);

      if (rxConfig.log_channel_id) {
        const { dispatchLog } = require('./utils/logger');
        dispatchLog(guild, 'modlogs', {
          color: 0xED4245,
          title: `🚫 Single Reaction Violation — Duplicate Vote Stripped`,
          description:
            `• **User:** <@${user.id}> (\`${user.tag}\`)\n` +
            `• **Channel:** <#${channelId}>\n` +
            `• **Emoji:** ${reaction.emoji.toString()}\n` +
            `• **Action:** Stripped duplicate reaction (User already voted in this single-reaction channel)`,
          footer: `Single Reaction Enforcement • Server Audit Logs`
        });
      }
    } else {
      // First reaction -> record user's vote
      db.setReactionVote(guild.id, channelId, user.id, reaction.message.id);

      if (rxConfig.log_channel_id) {
        const { dispatchLog } = require('./utils/logger');
        dispatchLog(guild, 'modlogs', {
          color: 0x57F287,
          title: `🗳️ Single Reaction Vote Recorded`,
          description:
            `• **User:** <@${user.id}> (\`${user.tag}\`)\n` +
            `• **Channel:** <#${channelId}>\n` +
            `• **Emoji:** ${reaction.emoji.toString()}`,
          footer: `Single Reaction Enforcement • Server Audit Logs`
        });
      }
    }
  } catch (err) {
    console.error('[SingleReaction Event Error]', err.message);
  }
});

// Load custom event handlers
require('./events/emojisStickers')(client);

if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'your_discord_bot_token_here') {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to log in:', err.message);
  });
} else {
  console.log('\n${emojis.WARNING} DISCORD_TOKEN is not set in .env file!\n');
}

module.exports = client;
