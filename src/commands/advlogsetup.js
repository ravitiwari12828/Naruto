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
const { getOrCreateAdvLogStore } = require('../utils/logger');

module.exports = {
  name: 'advlogsetup',
  description: 'Deploy complete multi-category server logging channels (Security Logs, Server Logs, Emergency Logs, Ticket Logs)',
  aliases: ['logmodule', 'createlogcategory', 'logssetup', 'advlogs'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Administrators and Server Owners can deploy advanced logging channels.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const store = getOrCreateAdvLogStore(guild.id);

    function buildDashboardEmbed(actionText = '') {
      return createStyledEmbed({
        title: `📜 Advanced Multi-Category Server Logging System`,
        subtitle: `${emojis.SHIELD} Full Event & Audit Trail Architecture`,
        description:
          `Deploy organized category trees and log channels matching your exact server security layout.\n\n` +
          `**Configured Logging Categories:**\n` +
          `• ❄️ **Security Logs**: \`modlogs\`, \`wick-logs\`, \`bot-antinuke-logs\`, \`olympus-limit-logs\`, \`olympus-automod\`\n` +
          `• ❄️ **Server Logs**: \`server-logs\`, \`msgs-log\`, \`invites-log\`, \`channel-logs\`, \`moderation-logs\`, \`vc-logs\`, \`join-leave-logs\`, \`role-logs\`, \`member-logs\`, \`webhook-logs\`, \`ban-unban-logs\`\n` +
          `• ♡ **Emergency Logs**: \`anti-raid-logs\`, \`bot-logging\`, \`safety-logs\`\n` +
          `• ♡ **Ticket Logs**: \`ticket-logs\`, \`ticket-transcripts\`\n\n` +
          `• Active Mapped Channels: **\`${store.channels.size}\` Channels**\n\n` +
          (actionText ? `> 💡 **Status:** ${actionText}\n\n` : '') +
          `*Click the button below to automatically create and bind all categories & channels!*`,
        requestedBy: author,
        clientUser
      });
    }

    function buildButtons() {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('advlog_deploy_all')
            .setLabel('🚀 1-Click Deploy All Categories & Channels')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('advlog_toggle')
            .setLabel(store.enabled ? '🔒 Disable Logging' : '🔓 Enable Logging')
            .setStyle(store.enabled ? ButtonStyle.Danger : ButtonStyle.Primary)
        )
      ];
    }

    const setupMsg = await message.channel.send({
      embeds: [buildDashboardEmbed()],
      components: buildButtons()
    });

    const collector = setupMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Only the administrator can use these buttons.', ephemeral: true });
      }

      await interaction.deferUpdate();

      let actionStatus = '';

      if (interaction.customId === 'advlog_deploy_all') {
        const categoryStructure = [
          {
            name: '❄️ · Security Logs ? .☘️ ·',
            channels: [
              { key: 'modlogs', name: 'modlogs' },
              { key: 'wicklogs', name: 'wick-logs' },
              { key: 'antinuke', name: 'bot-antinuke-logs' },
              { key: 'modlimits', name: 'olympus-limit-logs' },
              { key: 'automod', name: 'olympus-automod' }
            ]
          },
          {
            name: '❄️ · Server Logs ? .☘️ ·',
            channels: [
              { key: 'server', name: 'server-logs' },
              { key: 'messages', name: 'msgs-log' },
              { key: 'invites', name: 'invites-log' },
              { key: 'channels', name: 'channel-logs' },
              { key: 'moderation', name: 'moderation-logs' },
              { key: 'voice', name: 'vc-logs' },
              { key: 'joinleave', name: 'join-leave-logs' },
              { key: 'general', name: 'general-logs' },
              { key: 'roles', name: 'role-logs' },
              { key: 'members', name: 'member-logs' },
              { key: 'webhooks', name: 'webhook-logs' },
              { key: 'banunban', name: 'ban-unban-logs' }
            ]
          },
          {
            name: '♡. Emergency Logs ♡',
            channels: [
              { key: 'antiraid', name: 'anti-raid-logs' },
              { key: 'botlogging', name: 'bot-logging' },
              { key: 'safety', name: 'safety-logs' }
            ]
          },
          {
            name: '♡. Ticket Logs ♡',
            channels: [
              { key: 'ticketlogs', name: 'ticket-logs' },
              { key: 'transcripts', name: 'ticket-transcripts' }
            ]
          }
        ];

        let createdCount = 0;

        for (const catDef of categoryStructure) {
          let categoryChan = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === catDef.name);
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

          for (const chDef of catDef.channels) {
            let textChan = guild.channels.cache.find(c => c.name === chDef.name);
            if (!textChan) {
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
              store.channels.set(chDef.key, textChan.id);
            }
          }
        }

        store.enabled = true;
        actionStatus = `Successfully deployed ${createdCount} new channels across 4 logging categories! All events are live routed.`;
      }

      else if (interaction.customId === 'advlog_toggle') {
        store.enabled = !store.enabled;
        actionStatus = store.enabled ? 'Logging enabled.' : 'Logging disabled.';
      }

      await setupMsg.edit({ embeds: [buildDashboardEmbed(actionStatus)], components: buildButtons() });
    });
  }
};
