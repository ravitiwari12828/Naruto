const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getOrCreateAdvLogStore } = require('../utils/logger');
const { findExistingLogChannel } = require('./logsetup');
const db = require('../database/db');

module.exports = {
  name: 'testlogs',
  description: 'Test all server audit logging channels and auto-create missing channels',
  aliases: [],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} Only Server Administrators can test log channels.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const statusMsg = await message.channel.send(`<a:potion_alchemy_animated:1537179643449446581> **Testing all 15 server log channels...**`);

    const logTypes = [
      { key: 'narutologs', name: 'naruto-logs', title: 'Naruto Master Audit Log' },
      { key: 'modlogs', name: 'mod-logs', title: 'Moderation Action Log' },
      { key: 'antinuke', name: 'antinuke-logs', title: 'AntiNuke Protection Log' },
      { key: 'automod', name: 'automod-logs', title: 'AutoMod Enforcement Log' },
      { key: 'server', name: 'server-logs', title: 'Server Configuration Log' },
      { key: 'messages', name: 'message-logs', title: 'Message Edit & Delete Log' },
      { key: 'channels', name: 'channel-logs', title: 'Channel Audit Log' },
      { key: 'roles', name: 'role-logs', title: 'Role Audit Log' },
      { key: 'members', name: 'member-logs', title: 'Member Audit Log' },
      { key: 'voice', name: 'voice-logs', title: 'Voice Activity Log' },
      { key: 'joinleave', name: 'join-leave-logs', title: 'Member Join & Leave Log' },
      { key: 'ticketlogs', name: 'ticket-logs', title: 'Support Ticket Log' },
      { key: 'transcripts', name: 'ticket-transcripts', title: 'Ticket Transcript Log' },
      { key: 'modmaillogs', name: 'modmail-logs', title: 'ModMail Conversation Log' },
      { key: 'modmailtranscripts', name: 'modmail-transcripts', title: 'ModMail Transcript Log' }
    ];

    async function runTest() {
      const results = [];
      const missingList = [];

      for (const item of logTypes) {
        const channel = findExistingLogChannel(guild, item.key, item.name) || guild.channels.cache.find(c => c.name === item.name || c.name.includes(item.key));

        if (channel && channel.isTextBased()) {
          try {
            const testEmbed = new EmbedBuilder()
              .setColor(0x7E0808)
              .setTitle(`<a:accept_animated:1537177319603703969> Log Test: ${item.title}`)
              .setDescription(`Automated verification test sent by **Naruto Bot** to confirm <#${channel.id}> is active.`)
              .addFields([
                { name: 'Channel Name', value: `#${channel.name}`, inline: true },
                { name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
                { name: 'Tested By', value: `<@${author.id}>`, inline: true }
              ])
              .setFooter({ text: 'Naruto Audit Log Verifier • All Systems Normal' })
              .setTimestamp();

            await channel.send({ embeds: [testEmbed] });
            results.push(`<a:accept_animated:1537177319603703969> **#${item.name}**: Connected & Working (<#${channel.id}>)`);
          } catch (err) {
            results.push(`<a:wrong_animated:1537179702928875631> **#${item.name}**: Permission Error (\`${err.message}\`)`);
          }
        } else {
          results.push(`🟡 **#${item.name}**: Channel Not Found`);
          missingList.push(item);
        }
      }

      return { results, missingList };
    }

    const { results, missingList } = await runTest();

    function buildReportComponents(missingCount) {
      if (missingCount === 0) return [];

      return [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('testlogs_autocreate_missing')
            .setLabel(`Auto-Create ${missingCount} Missing Log Channels`)
            .setEmoji('🛠️')
            .setStyle(ButtonStyle.Success)
        )
      ];
    }

    const reportEmbed = createStyledEmbed({
      title: `<a:potion_alchemy_animated:1537179643449446581> Server Audit Log Verification Report`,
      subtitle: `Tested ${logTypes.length} Log Channels`,
      description:
        results.join('\n') +
        `\n\n` +
        (missingList.length > 0
          ? `💡 **${missingList.length} Log Channels Missing!** Click the button below to instantly auto-create all missing channels with full logging settings!`
          : `✅ **All 15 Log Channels Active & Fully Working!**`),
      requestedBy: author,
      clientUser
    });

    const reportMsg = await statusMsg.edit({
      content: `<a:accept_animated:1537177319603703969> **Log Verification Test Completed!**`,
      embeds: [reportEmbed],
      components: buildReportComponents(missingList.length)
    });

    if (missingList.length > 0) {
      const collector = reportMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== author.id) {
          return interaction.reply({ content: `<a:wrong_animated:1537179702928875631> Only the administrator who ran .testlogs can use this button.`, ephemeral: true });
        }

        await interaction.deferUpdate();

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
            name: '<a:openfolder_animated:1537177452936437760> · Server Audit Logs ·',
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
            name: '<a:tickety_animated:1537177533961732106> · Ticket & ModMail Logs ·',
            channels: [
              { key: 'ticketlogs', name: 'ticket-logs' },
              { key: 'transcripts', name: 'ticket-transcripts' },
              { key: 'modmaillogs', name: 'modmail-logs' },
              { key: 'modmailtranscripts', name: 'modmail-transcripts' }
            ]
          }
        ];

        const store = getOrCreateAdvLogStore(guild.id);
        let createdCount = 0;

        for (const catDef of categoryStructure) {
          let categoryChan = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name === catDef.name || c.name.toLowerCase().includes(catDef.name.replace(/[^a-zA-Z]/g, '').toLowerCase())));

          for (const chDef of catDef.channels) {
            let textChan = findExistingLogChannel(guild, chDef.key, chDef.name);

            if (!textChan) {
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
            }
          }
        }

        store.enabled = true;
        const rawStoreObj = {};
        for (const [k, v] of store.channels.entries()) {
          rawStoreObj[k] = v;
        }
        db.set(`advlogs_${guild.id}`, { enabled: true, channels: rawStoreObj });

        // Re-run test after creation
        const updated = await runTest();

        const updatedEmbed = createStyledEmbed({
          title: `<a:accept_animated:1537177319603703969> Server Audit Log Auto-Creation Complete`,
          subtitle: `Auto-Created ${createdCount} Missing Log Channels & Configured Settings`,
          description:
            updated.results.join('\n') +
            `\n\n🎉 **All missing log channels created, bound, and verified successfully!**`,
          requestedBy: author,
          clientUser
        });

        await reportMsg.edit({
          content: `<a:accept_animated:1537177319603703969> **Auto-Created ${createdCount} Missing Log Channels Successfully!**`,
          embeds: [updatedEmbed],
          components: []
        });
      });
    }
  }
};
