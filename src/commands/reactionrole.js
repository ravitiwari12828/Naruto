const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// In-memory Reaction Role storage (persisted per guild/message)
const reactionRoles = new Map();

function parsePairs(args) {
  const pairs = [];
  let title = 'React to this message to assign yourself roles';

  let rawStr = args.join(' ');

  // Check if title is specified via title: "..." or "..."
  const titleMatch = rawStr.match(/^(?:title:\s*)?["']([^"']+)["']/i);
  if (titleMatch) {
    title = titleMatch[1];
    rawStr = rawStr.replace(titleMatch[0], '').trim();
  }

  // Split remaining string by tokens
  const tokens = rawStr.split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i += 2) {
    const emoji = tokens[i];
    const roleToken = tokens[i + 1];
    if (emoji && roleToken) {
      const roleIdMatch = roleToken.match(/\d+/);
      if (roleIdMatch) {
        pairs.push({
          emoji,
          roleId: roleIdMatch[0]
        });
      }
    }
  }

  return { title, pairs };
}

module.exports = {
  name: 'reactionrole',
  description: 'Reaction Role System: create, add, remove, list, reset',
  aliases: ['rr', 'reactionroles', 'reactionrole'],
  reactionRoles,

  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const author = message.author;
    const guildId = message.guild.id;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    let guildRR = reactionRoles.get(guildId) || [];

    // .rr create [title: "Title"] <emoji1> <@role1> [emoji2] [@role2] ...
    // .rr setup ...
    if (['create', 'setup', 'embed', 'panel'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} You need **Manage Roles** permission to setup reaction roles!`);
      }

      const restArgs = args.slice(1);
      if (restArgs.length < 2) {
        return message.reply(
          `${emojis.WARNING} **Usage:** \`.rr create <emoji1> <@role1> [emoji2] [@role2] ...\`\n` +
          `**Example:** \`.rr create 🐱 @Male 🐷 @Female\`\n` +
          `**With Custom Title:** \`.rr create "Gender Roles" 🐱 @Male 🐷 @Female\``
        );
      }

      const { title, pairs } = parsePairs(restArgs);

      if (pairs.length === 0) {
        return message.reply(`${emojis.WARNING} No valid emoji + role pairs found! Please mention valid roles.`);
      }

      // Exact Clean Sapphire-Style Embed Format
      const descriptionLines = pairs.map(p => `${p.emoji} - <@&${p.roleId}>`);

      const panelEmbed = new EmbedBuilder()
        .setColor(0x2F3136)
        .setTitle(title)
        .setDescription(descriptionLines.join('\n'));

      message.delete().catch(() => {});

      const panelMsg = await message.channel.send({ embeds: [panelEmbed] });

      // Add reactions to the message & register bindings
      for (const pair of pairs) {
        try {
          await panelMsg.react(pair.emoji);
          guildRR.push({
            messageId: panelMsg.id,
            channelId: message.channel.id,
            emoji: pair.emoji,
            roleId: pair.roleId
          });
        } catch (err) {
          console.error('[RR Create Error]', err.message);
        }
      }

      reactionRoles.set(guildId, guildRR);
      return;
    }

    // .rr add <messageId> <emoji> <@role>
    if (sub === 'add') {
      const msgId = args[1];
      const emoji = args[2];
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[3]);

      if (!msgId || !emoji || !role) {
        return message.reply({ content: `${emojis.WARNING} Usage: \`.rr add <messageId> <emoji> <@role>\``, allowedMentions: { parse: [], repliedUser: false } });
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
        `\`.rr create <emoji1> <@role1> <emoji2> <@role2>\` — Create clean reaction role panel\n` +
        `\`.rr create "Title" <emoji1> <@role1>\` — Create panel with custom title\n` +
        `\`.rr add <msgID> <emoji> <@role>\` — Add reaction role to existing message\n` +
        `\`.rr remove <msgID> <emoji>\` — Remove reaction role from message\n` +
        `\`.rr list\` — View all active reaction roles\n` +
        `\`.rr reset\` — Clear all reaction roles on server`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
