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

function findExistingLogChannel(guild, chKey, defaultName) {
  const channelAliases = {
    modlogs: ['mod-logs', 'modlogs', 'moderation-logs', 'mod-log', 'moderation', 'modcases'],
    modcases: ['mod-cases', 'cases-log', 'modcases', 'mod-logs'],
    automod: ['automod-logs', 'automod', 'naruto-automod-logs'],
    antinuke: ['antinuke-logs', 'security-logs', 'naruto-security-logs'],
    securitydef: ['security-defense', 'security-logs', 'defense-logs'],
    noprefix: ['noprefix-audit', 'audit-logs'],
    narutologs: ['naruto-logs', 'all-logs', 'bot-logs'],
    server: ['server-logs', 'server-log', 'serverlogs', 'audit-logs', 'guild-logs'],
    messages: ['message-logs', 'message-log', 'msg-logs', 'chat-logs'],
    channels: ['channel-logs', 'channel-log', 'chan-logs'],
    roles: ['role-logs', 'role-log', 'roles-log'],
    members: ['member-logs', 'member-log', 'user-logs'],
    voice: ['voice-logs', 'vc-logs', 'voice-log'],
    joinleave: ['join-leave-logs', 'join-leave', 'welcome-logs'],
    emojis: ['emoji-logs', 'emojis-log', 'naruto-emoji-logs'],
    ticketlogs: ['ticket-logs', 'tickets-log'],
    transcripts: ['ticket-transcripts', 'transcripts'],
    modmaillogs: ['modmail-logs', 'modmail-log'],
    modmailtranscripts: ['modmail-transcripts']
  };

  const aliases = channelAliases[chKey] || [defaultName];
  aliases.push(defaultName);

  // 1. Check exact name match first across text channels
  let found = guild.channels.cache.find(c => c.isTextBased() && aliases.some(a => c.name.toLowerCase() === a.toLowerCase()));
  if (found) return found;

  // 2. Check fuzzy name includes e.g. "my-server-logs" or "mod-logs-2"
  found = guild.channels.cache.find(c => c.isTextBased() && aliases.some(a => {
    const cleanAlias = a.toLowerCase().replace(/naruto-/g, '');
    return c.name.toLowerCase().includes(cleanAlias);
  }));
  return found || null;
}

module.exports = {
  name: 'logsetup',
  description: 'Setup and deploy audit logging channels (Unified single channel or Pro channels - reuses existing channels automatically)',
  aliases: ['logs', 'logging', 'auditlogs', 'setuplogs'],
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
        title: `${emojis.SCROLL || '📜'} Audit Logging System Architecture`,
        subtitle: `${emojis.SHIELD || '🛡️'} Server Event & Moderation Logging Grid`,
        description:
          `**${emojis.SHIELD || '🛡️'} Security Logs Category**\n` +
          `\`\`\`\n` +
          `naruto-logs         : ${resolve('narutologs', 'unifiedChanId', 'naruto-logs')}\n` +
          `naruto-automod-logs : ${resolve('automod', 'automodLogs', 'naruto-automod-logs')}\n` +
          `naruto-emoji-logs   : ${resolve('emojis', 'emojiLogs', 'naruto-emoji-logs')}\n` +
          `naruto-mod-cases    : ${resolve('modcases', 'modCaseLogs', 'naruto-mod-cases')}\n` +
          `naruto-security-logs: ${resolve('antinuke', 'securityLogs', 'naruto-security-logs')}\n` +
          `naruto-mod-logs     : ${resolve('modlogs', 'modLogs', 'naruto-mod-logs')}\n` +
          `\`\`\`\n\n` +
          `**${emojis.TOOLS || '⚙️'} Server Audit Logs Category**\n` +
          `\`\`\`\n` +
          `server-logs   : ${resolve('server', 'messageLogs', 'server-logs')}\n` +
          `message-logs  : ${resolve('messages', 'messageLogs', 'message-logs')}\n` +
          `channel-logs  : ${resolve('channels', 'channelLogs', 'channel-logs')}\n` +
          `role-logs     : ${resolve('roles', 'roleLogs', 'role-logs')}\n` +
          `member-logs   : ${resolve('members', 'memberLogs', 'member-logs')}\n` +
          `voice-logs    : ${resolve('voice', 'voiceLogs', 'voice-logs')}\n` +
          `join-leave-logs: ${resolve('joinleave', 'joinleaveLogs', 'join-leave-logs')}\n` +
          `\`\`\`\n\n` +
          `**${emojis.TICKETS || '🎟️'} Ticket & ModMail Logs Category**\n` +
          `\`\`\`\n` +
          `ticket-logs        : ${resolve('ticketlogs', 'ticketLogs', 'ticket-logs')}\n` +
          `modmail-logs       : ${resolve('modmaillogs', 'modmailLogs', 'modmail-logs')}\n` +
          `\`\`\`\n\n` +
          (actionText ? `> ${emojis.SUCCESS || '✅'} **Status:** ${actionText}\n\n` : '') +
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
        return interaction.reply({ content: `${emojis.ERROR || '❌'} Only the administrator can use these buttons.`, ephemeral: true });
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
            name: '🛡️ · Security Logs ·',
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
            name: '📁 · Server Audit Logs ·',
            channels: [
              { key: 'server', name: 'server-logs' },
              { key: 'messages', name: 'message-logs' },
              { key: 'channels', name: 'channel-logs' },
              { key: 'roles', name: 'role-logs' },
              { key: 'members', name: 'member-logs' },
              { key: 'voice', name: 'voice-logs' },
              { key: 'joinleave', name: 'join-leave-logs' }
            ]
          },
          {
            name: '🎟️ · Ticket & ModMail Logs ·',
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

        for (const catDef of categoryStructure) {
          let categoryChan = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name === catDef.name || c.name.toLowerCase().includes(catDef.name.replace(/[^a-zA-Z]/g, '').toLowerCase())));

          for (const chDef of catDef.channels) {
            let textChan = findExistingLogChannel(guild, chDef.key, chDef.name);

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
