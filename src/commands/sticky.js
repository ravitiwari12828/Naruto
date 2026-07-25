const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

// Global In-Memory Sticky Notes Map (channelId -> { guildId, channelId, text, lastMsgId, authorId })
const stickyNotes = new Map();

module.exports = {
  name: 'stickynote',
  description: 'Sticky Note Commands: stickynote set, stickynote remove, stickynote list, unsticky',
  aliases: ['sticky', 'stickynotes', 'unsticky', 'unstickynote', 'removesticky', 'delsticky'],
  stickyNotesStore: stickyNotes,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (['unsticky', 'unstickynote', 'removesticky', 'delsticky'].includes(invoked)) {
      sub = 'remove';
    }

    const author = message.author;
    const channelId = message.channel.id;
    const guildId = message.guild.id;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .sticky set <content>
    if (sub === 'set' || sub === 'add' || sub === 'create') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply(`${emojis.DISABLED || '❌'} You need **Manage Messages** permission to set sticky notes.`);
      }

      const content = args[0]?.toLowerCase() === 'set' || args[0]?.toLowerCase() === 'add' ? args.slice(1).join(' ') : args.join(' ');
      if (!content) {
        return message.reply(`📌 Usage: \`.sticky set <your sticky message text>\``);
      }

      const existing = stickyNotes.get(channelId);
      if (existing && existing.lastMsgId) {
        message.channel.messages.fetch(existing.lastMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
      }

      const embed = createStyledEmbed({
        title: `📌 Sticky Note`,
        description: content,
        requestedBy: author,
        clientUser,
        footerText: `Sticky Message • Stays at the bottom of this channel`
      });

      const sent = await message.channel.send({ embeds: [embed] });
      stickyNotes.set(channelId, {
        guildId,
        channelId,
        text: content,
        lastMsgId: sent.id,
        authorId: author.id
      });

      return message.reply(`✅ Sticky note active for <#${channelId}>!`);
    }

    // .sticky remove / delete / off / .unsticky
    if (['remove', 'delete', 'clear', 'off', 'disable', 'reset'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply(`${emojis.DISABLED || '❌'} You need **Manage Messages** permission to remove sticky notes.`);
      }

      const existing = stickyNotes.get(channelId);
      if (!existing) {
        return message.reply(`⚠️ No sticky note active in <#${channelId}>.`);
      }

      // Delete sticky data FIRST to prevent race condition
      stickyNotes.delete(channelId);

      if (existing.lastMsgId) {
        message.channel.messages.fetch(existing.lastMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
      }

      const embed = createStyledEmbed({
        title: `📌 Sticky Note Removed`,
        description: `Sticky note removed from <#${channelId}>.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .sticky list
    if (sub === 'list') {
      const guildStickyEntries = Array.from(stickyNotes.values()).filter(s => s.guildId === guildId);

      if (guildStickyEntries.length === 0) {
        return message.reply(`⚠️ No active sticky notes on this server.`);
      }

      const lines = guildStickyEntries.map((s, i) =>
        `\`${i + 1}.\` <#${s.channelId}> — *"${s.text.length > 30 ? s.text.slice(0, 30) + '...' : s.text}"* (By <@${s.authorId}>)`
      );

      const embed = createStyledEmbed({
        title: `📌 Active Sticky Notes`,
        description: lines.join('\n'),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Sticky Help
    const embed = createStyledEmbed({
      title: `📌 Sticky Note Commands`,
      description:
        `\`.sticky set <text>\` — Set a sticky message in current channel\n` +
        `\`.sticky remove\` — Remove sticky note from current channel\n` +
        `\`.sticky list\` — List all active sticky notes in server`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};

