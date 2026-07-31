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
const { findExistingLogChannel } = require('./logsetup');
const db = require('../database/db');

module.exports = {
  name: 'advlogsetup',
  description: 'Deploy multi-category server audit logging channels (automatically reuses existing server channels)',
  aliases: ['logmodule', 'createlogcategory', 'logssetup', 'advlogs', 'logsetupadvlog', 'advlogsetuplog'],

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
        title: `${emojis.SCROLL || '📜'} Server Audit & Event Logging Suite`,
        subtitle: `${emojis.SHIELD || '🛡️'} Clean & Dedicated Event Routing`,
        description:
          `**${emojis.SHIELD || '🛡️'} Security Logs Category**\n` +
          `\`\`\`\n` +
          `noprefix-audit       ✓\n` +
          `security-defense     ✓\n` +
          `naruto-logs          ✓\n` +
          `naruto-automod-logs  ✓\n` +
          `naruto-emoji-logs    ✓\n` +
          `naruto-mod-cases     ✓\n` +
          `naruto-security-logs ✓\n` +
          `naruto-mod-logs      ✓\n` +
          `\`\`\`\n\n` +
          `**${emojis.TOOLS || '⚙️'} Server Audit Logs Category**\n` +
          `\`\`\`\n` +
          `server-logs      ✓\n` +
          `message-logs     ✓\n` +
          `channel-logs     ✓\n` +
          `role-logs        ✓\n` +
          `member-logs      ✓\n` +
          `voice-logs       ✓\n` +
          `join-leave-logs  ✓\n` +
          `\`\`\`\n\n` +
          `**${emojis.TICKETS || '🎟️'} Ticket & ModMail Logs Category**\n` +
          `\`\`\`\n` +
          `ticket-logs         ✓\n` +
          `ticket-transcripts  ✓\n` +
          `modmail-logs        ✓\n` +
          `modmail-transcripts ✓\n` +
          `\`\`\`\n\n` +
          `Active Mapped: \`${store.channels.size}\` channels\n` +
          (actionText ? `\n> ${emojis.SUCCESS || '✅'} **Status:** ${actionText}\n` : '') +
          `\n*Existing server log channels will be automatically re-used to prevent duplicate channels!*`,
        requestedBy: author,
        clientUser
      });
    }

    function buildButtons() {
      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('advlog_deploy_all')
            .setLabel('🚀 1-Click Deploy & Map All Categories')
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
        return interaction.reply({ content: `${emojis.ERROR || '❌'} Only the administrator can use these buttons.`, ephemeral: true });
      }

      await interaction.deferUpdate();

      let actionStatus = '';

      if (interaction.customId === 'advlog_deploy_all') {
        const categoryStructure = [
          {
            name: '🛡️ · Security Logs ·',
            channels: [
              { key: 'noprefix', name: 'noprefix-audit' },
              { key: 'securitydef', name: 'security-defense' },
              { key: 'narutologs', name: 'naruto-logs' },
              { key: 'automod', name: 'naruto-automod-logs' },
              { key: 'emojis', name: 'naruto-emoji-logs' },
              { key: 'modcases', name: 'naruto-mod-cases' },
              { key: 'antinuke', name: 'naruto-security-logs' },
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
              store.channels.set(chDef.key, textChan.id);
              db.saveLogChannel(guild.id, chDef.key, textChan.id);
            }
          }
        }

        store.enabled = true;
        actionStatus = `Logging channels mapped into DB! (${reusedCount} existing channels re-used, ${createdCount} new created)`;
      }

      else if (interaction.customId === 'advlog_toggle') {
        store.enabled = !store.enabled;
        actionStatus = store.enabled ? 'Logging enabled.' : 'Logging disabled.';
      }

      await setupMsg.edit({ embeds: [buildDashboardEmbed(actionStatus)], components: buildButtons() });
    });
  }
};
