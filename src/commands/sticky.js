const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global In-Memory Sticky Notes Map (channelId -> { text, lastMsgId })
const stickyNotes = new Map();

module.exports = {
  name: 'stickynote',
  description: 'Sticky Note Commands: stickynote set, stickynote remove, stickynote list',
  aliases: ['sticky', 'stickynotes'],
  stickyNotesStore: stickyNotes,

  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const author = message.author;
    const channelId = message.channel.id;
    const guildId = message.guild.id;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .sticky set <content>
    if (sub === 'set' || sub === 'add') {
      const content = args.slice(1).join(' ');
      if (!content) {
        return message.reply(`${emojis.WARNING} Usage: \`.sticky set <your sticky message text>\``);
      }

      // Delete existing sticky if present
      const existing = stickyNotes.get(channelId);
      if (existing && existing.lastMsgId) {
        message.channel.messages.fetch(existing.lastMsgId).then(m => m.delete()).catch(() => {});
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

      return message.reply(`${emojis.SUCCESS} Sticky note set for this channel!`);
    }

    // .sticky remove / delete
    if (['remove', 'delete', 'clear'].includes(sub)) {
      const existing = stickyNotes.get(channelId);
      if (!existing) {
        return message.reply(`${emojis.WARNING} No sticky note active in this channel.`);
      }

      if (existing.lastMsgId) {
        message.channel.messages.fetch(existing.lastMsgId).then(m => m.delete()).catch(() => {});
      }
      stickyNotes.delete(channelId);

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
        return message.reply(`${emojis.WARNING} No active sticky notes on this server.`);
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
