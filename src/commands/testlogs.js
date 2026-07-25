const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { dispatchLog, getOrCreateAdvLogStore } = require('../utils/logger');

module.exports = {
  name: 'testlogs',
  description: 'Test all server audit logging channels by sending sample test log embeds',
  aliases: ['checklogs', 'testlogchannels', 'logcheck'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Server Administrators can test log channels.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const statusMsg = await message.channel.send(`🧪 **Testing all 15 server log channels...**`);

    const logTypes = [
      { key: 'narutologs', name: 'naruto-logs', title: '🌀 Naruto Master Audit Log' },
      { key: 'modlogs', name: 'mod-logs', title: '🔨 Moderation Action Log' },
      { key: 'antinuke', name: 'antinuke-logs', title: '🛡️ AntiNuke Protection Log' },
      { key: 'automod', name: 'automod-logs', title: '🤖 AutoMod Enforcement Log' },
      { key: 'server', name: 'server-logs', title: '📁 Server Configuration Log' },
      { key: 'messages', name: 'message-logs', title: '💬 Message Edit & Delete Log' },
      { key: 'channels', name: 'channel-logs', title: '📁 Channel Audit Log' },
      { key: 'roles', name: 'role-logs', title: '👑 Role Audit Log' },
      { key: 'members', name: 'member-logs', title: '👤 Member Audit Log' },
      { key: 'voice', name: 'voice-logs', title: '🔊 Voice Activity Log' },
      { key: 'joinleave', name: 'join-leave-logs', title: '🚪 Member Join & Leave Log' },
      { key: 'ticketlogs', name: 'ticket-logs', title: '🎟️ Support Ticket Log' },
      { key: 'transcripts', name: 'ticket-transcripts', title: '📜 Ticket Transcript Log' },
      { key: 'modmaillogs', name: 'modmail-logs', title: '📫 ModMail Conversation Log' },
      { key: 'modmailtranscripts', name: 'modmail-transcripts', title: '📜 ModMail Transcript Log' }
    ];

    const results = [];

    for (const item of logTypes) {
      // Find channel by exact name or mapped key
      const channel = guild.channels.cache.find(c => c.name === item.name || c.name.includes(item.key));

      if (channel && channel.isTextBased()) {
        try {
          const testEmbed = new EmbedBuilder()
            .setColor(0x7E0808)
            .setTitle(`✅ Log Test: ${item.title}`)
            .setDescription(`This is an automated verification test sent by **Naruto Bot** to confirm that <#${channel.id}> is active and receiving logs correctly.`)
            .addFields([
              { name: 'Channel Name', value: `#${channel.name}`, inline: true },
              { name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
              { name: 'Tested By', value: `<@${author.id}>`, inline: true }
            ])
            .setFooter({ text: 'Naruto Audit Log Verifier • All Systems Normal' })
            .setTimestamp();

          await channel.send({ embeds: [testEmbed] });
          results.push(`🟢 **#${item.name}**: Connected & Working (<#${channel.id}>)`);
        } catch (err) {
          results.push(`🔴 **#${item.name}**: Permission Error (\`${err.message}\`)`);
        }
      } else {
        results.push(`🟡 **#${item.name}**: Channel Not Found`);
      }
    }

    const reportEmbed = createStyledEmbed({
      title: `🧪 Server Audit Log Verification Report`,
      subtitle: `Tested ${logTypes.length} Log Channels`,
      description: results.join('\n') + `\n\n💡 *Tip: If any channel is missing, run \`.advlogsetup\` to auto-create and bind all log channels!*`,
      requestedBy: author,
      clientUser
    });

    return statusMsg.edit({ content: `✅ **Log Verification Test Completed!**`, embeds: [reportEmbed] });
  }
};
