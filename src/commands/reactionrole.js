const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// In-memory Reaction Role storage (persisted per guild/message)
const reactionRoles = new Map();

module.exports = {
  name: 'reactionrole',
  description: 'Reaction Role System: add, remove, list, reset',
  aliases: ['rr', 'reactionroles'],

  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const author = message.author;
    const guildId = message.guild.id;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    let guildRR = reactionRoles.get(guildId) || [];

    // .rr add <messageId> <emoji> <@role>
    if (sub === 'add') {
      const msgId = args[1];
      const emoji = args[2];
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[3]);

      if (!msgId || !emoji || !role) {
        return message.reply(`${emojis.WARNING} Usage: \`.rr add <messageId> <emoji> <@role>\``);
      }

      try {
        const targetMsg = await message.channel.messages.fetch(msgId);
        await targetMsg.react(emoji);

        guildRR.push({
          messageId: msgId,
          channelId: message.channel.id,
          emoji: emoji,
          roleId: role.id
        });
        reactionRoles.set(guildId, guildRR);

        const embed = createStyledEmbed({
          title: `🎭 Reaction Role Added`,
          description: `Successfully set up reaction role!\n\n` +
            `**Message ID:** \`${msgId}\`\n` +
            `**Emoji:** ${emoji}\n` +
            `**Role:** <@&${role.id}>`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } catch (err) {
        return message.reply(`${emojis.WARNING} Could not find message with ID \`${msgId}\` in this channel or add emoji reaction.`);
      }
    }

    // .rr remove <messageId> <emoji>
    if (sub === 'remove') {
      const msgId = args[1];
      const emoji = args[2];

      if (!msgId || !emoji) {
        return message.reply(`${emojis.WARNING} Usage: \`.rr remove <messageId> <emoji>\``);
      }

      const initialLen = guildRR.length;
      guildRR = guildRR.filter(r => !(r.messageId === msgId && r.emoji === emoji));
      reactionRoles.set(guildId, guildRR);

      if (guildRR.length === initialLen) {
        return message.reply(`${emojis.WARNING} No reaction role found for Message ID \`${msgId}\` with emoji ${emoji}.`);
      }

      const embed = createStyledEmbed({
        title: `🎭 Reaction Role Removed`,
        description: `Removed reaction role binding for emoji ${emoji} on message \`${msgId}\`.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .rr list
    if (sub === 'list') {
      if (guildRR.length === 0) {
        return message.reply(`${emojis.WARNING} No active reaction roles configured on this server.`);
      }

      const lines = guildRR.map((r, i) =>
        `\`${i + 1}.\` **Msg:** \`${r.messageId}\` | **Emoji:** ${r.emoji} ➔ **Role:** <@&${r.roleId}>`
      );

      const embed = createStyledEmbed({
        title: `🎭 Active Reaction Roles`,
        description: lines.join('\n'),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .rr reset
    if (sub === 'reset') {
      reactionRoles.delete(guildId);
      const embed = createStyledEmbed({
        title: `🎭 Reaction Roles Reset`,
        description: `Cleared all reaction role configurations for this server.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default RR Help
    const embed = createStyledEmbed({
      title: `🎭 Reaction Role Commands`,
      description:
        `\`.rr add <msgID> <emoji> <@role>\` — Add reaction role to message\n` +
        `\`.rr remove <msgID> <emoji>\` — Remove reaction role from message\n` +
        `\`.rr list\` — View all active reaction roles\n` +
        `\`.rr reset\` — Clear all reaction roles on server`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
