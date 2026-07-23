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
  description: 'Deploy clean multi-category server audit logging channels (Security Logs, Server Audit Logs, Ticket & ModMail Logs)',
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
        title: `📜 Server Audit & Event Logging Suite`,
        subtitle: `${emojis.SHIELD} Clean & Dedicated Event Routing`,
        description:
          `Deploy organized logging categories and channels for complete server activity tracking.\n\n` +
          `**Configured Logging Categories:**\n` +
          `• 🛡️ **Security & Moderation**: \`mod-logs\`, \`antinuke-logs\`, \`automod-logs\`\n` +
          `• 📁 **Server Audit Logs**: \`server-logs\`, \`message-logs\`, \`channel-logs\`, \`role-logs\`, \`member-logs\`, \`voice-logs\`, \`join-leave-logs\`\n` +
          `• 🎟️ **Ticket & ModMail Logs**: \`ticket-logs\`, \`ticket-transcripts\`, \`modmail-logs\`, \`modmail-transcripts\`\n\n` +
          `• Active Mapped Channels: **\`${store.channels.size}\` Channels**\n\n` +
          (actionText ? `> 💡 **Status:** ${actionText}\n\n` : '') +
          `*Click the button below to automatically create and bind all audit categories & channels!*`,
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
            name: '🛡️ · Security Logs ·',
            channels: [
              { key: 'modlogs', name: 'mod-logs' },
              { key: 'antinuke', name: 'antinuke-logs' },
              { key: 'automod', name: 'automod-logs' }
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
        actionStatus = `Successfully deployed ${createdCount} new channels across 3 audit logging categories! All server events are live routed.`;
      }

      else if (interaction.customId === 'advlog_toggle') {
        store.enabled = !store.enabled;
        actionStatus = store.enabled ? 'Logging enabled.' : 'Logging disabled.';
      }

      await setupMsg.edit({ embeds: [buildDashboardEmbed(actionStatus)], components: buildButtons() });
    });
  }
};
