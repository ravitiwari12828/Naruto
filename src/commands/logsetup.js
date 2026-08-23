const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Logging Stores (guildId -> { unifiedChanId, modLogs, securityLogs, automodLogs, messageLogs, voiceLogs, ticketLogs })
const loggingConfigs = new Map();

function getOrCreateLoggingConfig(guildId) {
  if (!loggingConfigs.has(guildId)) {
    loggingConfigs.set(guildId, {
      enabled: true,
      mode: 'unified',
      unifiedChanId: null,
      modLogs: null,
      securityLogs: null,
      automodLogs: null,
      messageLogs: null,
      voiceLogs: null,
      ticketLogs: null,
      emojiLogs: null,
      modCaseLogs: null
    });
  }
  return loggingConfigs.get(guildId);
}

function findExistingLogChannel(guild, chKey, defaultName, assignedSet = new Set()) {
  const channelAliases = {
    securitydef: ['security-defense', 'security-logs', 'defense-logs'],
    noprefix: ['noprefix-audit', 'audit-logs'],
    narutologs: ['naruto-logs', 'all-logs', 'bot-logs'],
    server: ['server-logs', 'server-log', 'serverlogs', 'guild-logs'],
    messages: ['message-logs', 'message-log', 'msg-logs', 'chat-logs'],
    channels: ['channel-logs', 'channel-log', 'chan-logs'],
    roles: ['role-logs', 'role-log', 'roles-log'],
    members: ['member-logs', 'member-log'],
    users: ['user-logs', 'users-log'],
    voice: ['voice-logs', 'vc-logs', 'voice-log'],
    joinleave: ['join-leave-logs', 'join-leave', 'welcome-logs'],
    emojis: ['naruto-emoji-logs', 'emoji-logs', 'emojis-log'],
    emojiaudit: ['emoji-logs', 'emojis-log'],
    ticketlogs: ['ticket-logs', 'tickets-log'],
    transcripts: ['ticket-transcripts', 'transcripts'],
    modmaillogs: ['modmail-logs', 'modmail-log'],
    modmailtranscripts: ['modmail-transcripts'],
    applications: ['application-logs', 'applications-logs', 'apps-log'],
    automodrules: ['automod-logs', 'automod-log'],
    automod: ['naruto-automod-logs', 'automod-logs'],
    events: ['event-logs', 'events-log', 'scheduled-events-logs'],
    invites: ['invite-logs', 'invites-log'],
    polls: ['poll-logs', 'polls-log'],
    stage: ['stage-logs', 'stage-log'],
    stickers: ['sticker-logs', 'stickers-log'],
    soundboard: ['soundboard-logs', 'soundboard-log'],
    threads: ['thread-logs', 'threads-log'],
    webhooks: ['webhook-logs', 'webhooks-log'],
    moderation: ['mod-logs', 'moderation-logs'],
    modlogs: ['naruto-mod-logs', 'mod-logs'],
    modcases: ['naruto-mod-cases', 'mod-cases'],
    antinuke: ['naruto-security-logs', 'security-logs'],
    limitlogs: ['naruto-limit-logs', 'limit-logs']
  };

  const aliases = channelAliases[chKey] || [defaultName];
  if (!aliases.includes(defaultName)) aliases.push(defaultName);

  // 1. Check exact name match first across text channels (not already assigned)
  let found = guild.channels.cache.find(c => c.isTextBased() && !assignedSet.has(c.id) && aliases.some(a => c.name.toLowerCase() === a.toLowerCase()));
  if (found) {
    assignedSet.add(found.id);
    return found;
  }

  // 2. Check strict cleanAlias match
  found = guild.channels.cache.find(c => c.isTextBased() && !assignedSet.has(c.id) && aliases.some(a => {
    const cleanAlias = a.toLowerCase().replace(/^naruto-/, '');
    return c.name.toLowerCase() === cleanAlias || c.name.toLowerCase().endsWith('-' + cleanAlias) || c.name.toLowerCase().startsWith(cleanAlias + '-');
  }));

  if (found) {
    assignedSet.add(found.id);
    return found;
  }

  return null;
}

module.exports = {
  name: 'logsetup',
  description: 'Setup and deploy audit logging channels (Unified single channel or Pro channels - reuses existing channels automatically)',
  aliases: ['logs', 'log', 'setuplogs', 'setuplog', 'auditlog'],
  loggingConfigs,
  findExistingLogChannel,

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply(`${emojis.WARNING} Only Administrators can configure server audit logs.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const config = getOrCreateLoggingConfig(guild.id);

    function buildDashboardEmbed(actionText = '') {
      const dbChannels = (() => { try { return require('../database/db').getLogChannels(guild.id); } catch(e) { return {}; } })();
      const resolve = (key, configKey, defaultName) => {
        const existing = findExistingLogChannel(guild, key, defaultName);
        const id = config[configKey] || dbChannels[key] || existing?.id;
        return id ? `<#${id}>` : '`Not Set`';
      };

      return createStyledEmbed({
        title: `${emojis.SCROLL || '<a:scroll_animated:1537179663791693844>'} Audit Logging System Architecture`,
        subtitle: `${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} Server Event & Moderation Logging Grid`,
        description:
          `**${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} Security Logs Category**\n` +
          `\`\`\`\n` +
          `naruto-logs         : ${resolve('narutologs', 'unifiedChanId', 'naruto-logs')}\n` +
          `naruto-automod-logs : ${resolve('automod', 'automodLogs', 'naruto-automod-logs')}\n` +
          `naruto-emoji-logs   : ${resolve('emojis', 'emojiLogs', 'naruto-emoji-logs')}\n` +
          `naruto-mod-cases    : ${resolve('modcases', 'modCaseLogs', 'naruto-mod-cases')}\n` +
          `naruto-security-logs: ${resolve('antinuke', 'securityLogs', 'naruto-security-logs')}\n` +
          `naruto-mod-logs     : ${resolve('modlogs', 'modLogs', 'naruto-mod-logs')}\n` +
          `\`\`\`\n\n` +
          `**${emojis.TOOLS || '<a:settings_animated:1537177506170404905>'} Full Server Audit Categories (18/18)**\n` +
          `\`\`\`\n` +
          `application-logs: ${resolve('applications', 'appLogs', 'application-logs')}\n` +
          `channel-logs    : ${resolve('channels', 'channelLogs', 'channel-logs')}\n` +
          `automod-logs    : ${resolve('automodrules', 'automodLogs', 'automod-logs')}\n` +
          `emoji-logs      : ${resolve('emojiaudit', 'emojiLogs', 'emoji-logs')}\n` +
          `event-logs      : ${resolve('events', 'eventLogs', 'event-logs')}\n` +
          `invite-logs     : ${resolve('invites', 'inviteLogs', 'invite-logs')}\n` +
          `message-logs    : ${resolve('messages', 'messageLogs', 'message-logs')}\n` +
          `poll-logs       : ${resolve('polls', 'pollLogs', 'poll-logs')}\n` +
          `role-logs       : ${resolve('roles', 'roleLogs', 'role-logs')}\n` +
          `stage-logs      : ${resolve('stage', 'stageLogs', 'stage-logs')}\n` +
          `server-logs     : ${resolve('server', 'serverLogs', 'server-logs')}\n` +
          `sticker-logs    : ${resolve('stickers', 'stickerLogs', 'sticker-logs')}\n` +
          `soundboard-logs : ${resolve('soundboard', 'soundboardLogs', 'soundboard-logs')}\n` +
          `thread-logs     : ${resolve('threads', 'threadLogs', 'thread-logs')}\n` +
          `user-logs       : ${resolve('users', 'userLogs', 'user-logs')}\n` +
          `voice-logs      : ${resolve('voice', 'voiceLogs', 'voice-logs')}\n` +
          `webhook-logs    : ${resolve('webhooks', 'webhookLogs', 'webhook-logs')}\n` +
          `mod-logs        : ${resolve('moderation', 'modLogs', 'mod-logs')}\n` +
          `\`\`\`\n\n` +
          `**${emojis.TICKETS || '<a:tickety_animated:1537177533961732106>'} Ticket & ModMail Logs Category**\n` +
          `\`\`\`\n` +
          `ticket-logs        : ${resolve('ticketlogs', 'ticketLogs', 'ticket-logs')}\n` +
          `modmail-logs       : ${resolve('modmaillogs', 'modmailLogs', 'modmail-logs')}\n` +
          `\`\`\`\n\n` +
          (actionText ? `> ${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Status:** ${actionText}\n\n` : '') +
          `**Mode:** \`${config.mode.toUpperCase()}\` | **Choose your setup method below:**\n` +
          `*(Existing server channels will be automatically re-used to prevent duplicate channels!)*`,
        requestedBy: author,
        clientUser
      });
    }

    function buildButtons() {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('log_setup_single')
            .setLabel('1-Click Unified Channel (#naruto-logs)')
            .setEmoji(emojis.OBJ_ZAP)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('log_setup_multi')
            .setLabel('1-Click Pro Setup (Re-uses Existing Channels)')
            .setEmoji(emojis.OBJ_AN_SHIELD)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('log_setup_disable')
            .setLabel('Disable Logging')
            .setEmoji(emojis.OBJ_DISABLED)
            .setStyle(ButtonStyle.Danger)
        )
      ];
    }

    const setupMsg = await message.channel.send({
      embeds: [buildDashboardEmbed()],
      components: buildButtons()
    });

    const collector = setupMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180000
    });

    function findExistingLogCategory(guild) {
      return guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && (
          c.name.toLowerCase().includes('log') ||
          c.name.toLowerCase().includes('audit') ||
          c.name.toLowerCase().includes('security')
        )
      ) || null;
    }

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: `${emojis.ERROR || '<a:wrong_animated:1537179702928875631>'} Only the administrator can use these buttons.`, flags: 64, ephemeral: true });
      }

      await interaction.deferUpdate();

      let actionStatus = '';

      if (interaction.customId === 'log_setup_single') {
        let chan = findExistingLogChannel(guild, 'narutologs', 'naruto-logs');

        if (!chan) {
          const category = findExistingLogCategory(guild);
          try {
            chan = await guild.channels.create({
              name: 'naruto-logs',
              type: ChannelType.GuildText,
              parent: category ? category.id : undefined,
              topic: 'Unified Moderation, Security & Server Audit Logs',
              permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
              ]
            });
          } catch (e) {}
        }

        config.enabled = true;
        config.mode = 'unified';
        config.unifiedChanId = chan?.id || null;
        loggingConfigs.set(guild.id, config);

        actionStatus = `Unified single log channel mapped to <#${chan?.id}>!`;
      }

      else if (interaction.customId === 'log_setup_multi') {
        const db = require('../database/db');
        const { getOrCreateAdvLogStore } = require('../utils/logger');
        const store = getOrCreateAdvLogStore(guild.id);

        const categoryStructure = [
          {
            name: '<a:security_animated:1537177499862171741> · Security Logs ·',
            channels: [
              { key: 'narutologs', name: 'naruto-logs' },
              { key: 'automod', name: 'naruto-automod-logs' },
              { key: 'emojis', name: 'naruto-emoji-logs' },
              { key: 'modcases', name: 'naruto-mod-cases' },
              { key: 'antinuke', name: 'naruto-security-logs' },
              { key: 'limitlogs', name: 'naruto-limit-logs' },
              { key: 'modlogs', name: 'naruto-mod-logs' }
            ]
          },
          {
            name: '<a:openfolder_animated:1537177452936437760> · Server Audit Logs (Part 1) ·',
            channels: [
              { key: 'applications', name: 'application-logs' },
              { key: 'channels', name: 'channel-logs' },
              { key: 'automodrules', name: 'automod-logs' },
              { key: 'emojiaudit', name: 'emoji-logs' },
              { key: 'events', name: 'event-logs' },
              { key: 'invites', name: 'invite-logs' },
              { key: 'messages', name: 'message-logs' },
              { key: 'polls', name: 'poll-logs' },
              { key: 'roles', name: 'role-logs' }
            ]
          },
          {
            name: '<a:openfolder_animated:1537177452936437760> · Server Audit Logs (Part 2) ·',
            channels: [
              { key: 'stage', name: 'stage-logs' },
              { key: 'server', name: 'server-logs' },
              { key: 'stickers', name: 'sticker-logs' },
              { key: 'soundboard', name: 'soundboard-logs' },
              { key: 'threads', name: 'thread-logs' },
              { key: 'users', name: 'user-logs' },
              { key: 'voice', name: 'voice-logs' },
              { key: 'webhooks', name: 'webhook-logs' },
              { key: 'moderation', name: 'mod-logs' }
            ]
          },
          {
            name: '<a:tickety_animated:1537177533961732106> · Ticket & ModMail Logs ·',
            channels: [
              { key: 'ticketlogs', name: 'ticket-logs' },
              { key: 'transcripts', name: 'ticket-transcripts' },
              { key: 'modmaillogs', name: 'modmail-logs' },
              { key: 'modmailtranscripts', name: 'modmail-transcripts' }
            ]
          }
        ];

        config.enabled = true;
        config.mode = 'multi';
        let reusedCount = 0;
        let createdCount = 0;
        const assignedSet = new Set();

        for (const catDef of categoryStructure) {
          let categoryChan = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name === catDef.name || c.name.toLowerCase().includes(catDef.name.replace(/[^a-zA-Z]/g, '').toLowerCase())));

          for (const chDef of catDef.channels) {
            let textChan = findExistingLogChannel(guild, chDef.key, chDef.name, assignedSet);

            if (textChan) {
              reusedCount++;
            } else {
              if (!categoryChan) {
                try {
                  categoryChan = await guild.channels.create({
                    name: catDef.name,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                    ]
                  });
                } catch (e) {}
              }

              try {
                textChan = await guild.channels.create({
                  name: chDef.name,
                  type: ChannelType.GuildText,
                  parent: categoryChan ? categoryChan.id : undefined,
                  permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                  ]
                });
                createdCount++;
              } catch (e) {}
            }

            if (textChan) {
              config[chDef.key] = textChan.id;
              store.channels.set(chDef.key, textChan.id);
              db.saveLogChannel(guild.id, chDef.key, textChan.id);
            }
          }
        }

        loggingConfigs.set(guild.id, config);
        actionStatus = `Logging channels mapped! (${reusedCount} existing channels re-used, ${createdCount} new created)`;
      }

      else if (interaction.customId === 'log_setup_disable') {
        config.enabled = false;
        loggingConfigs.set(guild.id, config);
        actionStatus = `Audit logging system disabled.`;
      }

      await setupMsg.edit({ embeds: [buildDashboardEmbed(actionStatus)], components: buildButtons() });
    });
  }
};
