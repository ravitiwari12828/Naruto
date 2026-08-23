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
  aliases: ['advlogs', 'advlog', 'logs', 'logsetup', 'logssetup', 'auditlogs'],

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
        title: `${emojis.SCROLL || '<a:scroll_animated:1537179663791693844>'} Server Audit & Event Logging Suite`,
        subtitle: `${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} Clean & Dedicated Event Routing`,
        description:
          `**${emojis.SHIELD || '<a:security_animated:1537177499862171741>'} Security Logs Category**\n` +
          `\`\`\`\n` +
          `naruto-logs          ✓\n` +
          `naruto-automod-logs  ✓\n` +
          `naruto-emoji-logs    ✓\n` +
          `naruto-mod-cases     ✓\n` +
          `naruto-security-logs ✓\n` +
          `naruto-limit-logs    ✓\n` +
          `naruto-mod-logs      ✓\n` +
          `\`\`\`\n\n` +
          `**${emojis.TOOLS || '<a:settings_animated:1537177506170404905>'} Full Server Audit Categories (18/18)**\n` +
          `\`\`\`\n` +
          `application-logs ✓   channel-logs    ✓\n` +
          `automod-logs     ✓   emoji-logs      ✓\n` +
          `event-logs       ✓   invite-logs     ✓\n` +
          `message-logs     ✓   poll-logs       ✓\n` +
          `role-logs        ✓   stage-logs      ✓\n` +
          `server-logs      ✓   sticker-logs    ✓\n` +
          `soundboard-logs  ✓   thread-logs     ✓\n` +
          `user-logs        ✓   voice-logs      ✓\n` +
          `webhook-logs     ✓   mod-logs        ✓\n` +
          `\`\`\`\n\n` +
          `**${emojis.TICKETS || '<a:tickety_animated:1537177533961732106>'} Ticket & ModMail Logs Category**\n` +
          `\`\`\`\n` +
          `ticket-logs         ✓\n` +
          `ticket-transcripts  ✓\n` +
          `modmail-logs        ✓\n` +
          `modmail-transcripts ✓\n` +
          `\`\`\`\n\n` +
          `Active Mapped: \`${store.channels.size}\` channels\n` +
          (actionText ? `\n> ${emojis.SUCCESS || '<a:accept_animated:1537177319603703969>'} **Status:** ${actionText}\n` : '') +
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
            .setLabel('1-Click Deploy & Map All Categories')
            .setEmoji(emojis.OBJ_ANALYTICS)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('advlog_toggle')
            .setLabel(store.enabled ? 'Disable Logging' : 'Enable Logging')
            .setEmoji(store.enabled ? emojis.OBJ_LOCK : emojis.OBJ_UNLOCK)
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
        return interaction.reply({ content: `${emojis.ERROR || '<a:wrong_animated:1537179702928875631>'} Only the administrator can use these buttons.`, flags: 64, ephemeral: true });
      }

      await interaction.deferUpdate();

      let actionStatus = '';

      if (interaction.customId === 'advlog_deploy_all') {
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
            name: '📁 · Server Audit Logs (Part 1) ·',
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
            name: '📁 · Server Audit Logs (Part 2) ·',
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
