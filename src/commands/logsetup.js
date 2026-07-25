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

module.exports = {
  name: 'logsetup',
  description: 'Setup and deploy audit logging channels (Unified single channel or 8 Specialized Pro channels)',
  aliases: ['logs', 'logging', 'auditlogs', 'setuplogs'],
  loggingConfigs,

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
      return createStyledEmbed({
        title: `📜 Audit Logging System Architecture`,
        subtitle: `${emojis.SHIELD} Server Event & Moderation Logging Grid`,
        description:
          `Configure audit logging channels to track every action performed on your server.\n\n` +
          `**Current Log Configuration:**\n` +
          `• Mode: \`${config.mode.toUpperCase()}\`\n` +
          `• Unified Channel: ${config.unifiedChanId ? `<#${config.unifiedChanId}>` : '*Not Created*'}\n` +
          `• Mod Logs: ${config.modLogs ? `<#${config.modLogs}>` : '*Not Set*'}\n` +
          `• Security Logs: ${config.securityLogs ? `<#${config.securityLogs}>` : '*Not Set*'}\n` +
          `• AutoMod Logs: ${config.automodLogs ? `<#${config.automodLogs}>` : '*Not Set*'}\n` +
          `• Message Logs: ${config.messageLogs ? `<#${config.messageLogs}>` : '*Not Set*'}\n` +
          `• Voice Logs: ${config.voiceLogs ? `<#${config.voiceLogs}>` : '*Not Set*'}\n` +
          `• Ticket Transcripts: ${config.ticketLogs ? `<#${config.ticketLogs}>` : '*Not Set*'}\n` +
          `• Emoji & Sticker Logs: ${config.emojiLogs ? `<#${config.emojiLogs}>` : '*Not Set*'}\n` +
          `• Moderation Case Logs: ${config.modCaseLogs ? `<#${config.modCaseLogs}>` : '*Not Set*'}\n\n` +
          (actionText ? `> 💡 **Action:** ${actionText}\n\n` : '') +
          `**Choose your preferred setup method below:**`,
        requestedBy: author,
        clientUser
      });
    }

    function buildButtons() {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('log_setup_single')
            .setLabel('⚡ 1-Click Unified Channel (#naruto-logs)')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('log_setup_multi')
            .setLabel('🛡️ 1-Click Pro Setup (8 Channels)')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('log_setup_disable')
            .setLabel('❌ Disable Logging')
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

async function getOrCreateLogCategory(guild) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && (c.name.toLowerCase().includes('audit logs') || c.name.toLowerCase().includes('server logs'))
  );
  if (!category) {
    try {
      category = await guild.channels.create({
        name: '📜 AUDIT LOGS 📜',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
    } catch (e) {}
  }
  return category;
}

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Only the administrator can use these buttons.', ephemeral: true });
      }

      await interaction.deferUpdate();

      let actionStatus = '';

      if (interaction.customId === 'log_setup_single') {
        const category = await getOrCreateLogCategory(guild);
        let chan = guild.channels.cache.find(c => c.name === 'naruto-logs');
        if (!chan) {
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
        } else if (category && chan.parentId !== category.id) {
          await chan.setParent(category.id).catch(() => {});
        }

        config.enabled = true;
        config.mode = 'unified';
        config.unifiedChanId = chan?.id || null;
        loggingConfigs.set(guild.id, config);

        actionStatus = `Unified single log channel deployed under **${category?.name || 'Category'}**: <#${chan?.id}>!`;
      }

      else if (interaction.customId === 'log_setup_multi') {
        const category = await getOrCreateLogCategory(guild);
        const channelDefs = [
          { key: 'modLogs', name: 'naruto-mod-logs', topic: 'Kicks, Bans, Mutes, Purges & Warns' },
          { key: 'securityLogs', name: 'naruto-security-logs', topic: 'AntiNuke Triggers & Panic Mode Events' },
          { key: 'automodLogs', name: 'naruto-automod-logs', topic: 'Profanity, AntiSpam & AntiBot Kicks' },
          { key: 'messageLogs', name: 'naruto-message-logs', topic: 'Message Deletions, Edits & Snipe Logs' },
          { key: 'voiceLogs', name: 'naruto-voice-logs', topic: 'Voice State Changes & Temp VCs' },
          { key: 'ticketLogs', name: 'naruto-ticket-logs', topic: 'Ticket Transcripts & Support Logs' },
          { key: 'emojiLogs', name: 'naruto-emoji-logs', topic: 'Emoji & Sticker Add, Delete, Update Events' },
          { key: 'modCaseLogs', name: 'naruto-mod-cases', topic: 'Moderation Cases (Warn, Ban, Kick, Mute Logs with Case IDs)' }
        ];

        config.enabled = true;
        config.mode = 'multi';

        for (const def of channelDefs) {
          let chan = guild.channels.cache.find(c => c.name === def.name);
          if (!chan) {
            try {
              chan = await guild.channels.create({
                name: def.name,
                type: ChannelType.GuildText,
                parent: category ? category.id : undefined,
                topic: def.topic,
                permissionOverwrites: [
                  { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
              });
            } catch (e) {}
          } else if (category && chan.parentId !== category.id) {
            await chan.setParent(category.id).catch(() => {});
          }
          config[def.key] = chan?.id || null;
        }

        loggingConfigs.set(guild.id, config);
        actionStatus = `All 8 Pro specialized log channels created inside category **${category?.name || 'Audit Logs'}**!`;
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
