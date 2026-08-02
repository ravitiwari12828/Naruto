const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');

// In-memory Reaction Role storage (persisted per guild/message)
const reactionRoles = new Map();

function resolveEmoji(rawEmoji, client) {
  if (!rawEmoji) return rawEmoji;

  // 1. If it's already a full Discord custom emoji <a:name:id> or <:name:id>, return as is
  if (/<a?:[a-zA-Z0-9_]+:\d+>/.test(rawEmoji)) {
    return rawEmoji;
  }

  // 2. Clean up colon wrappers e.g. ":Radha_CROWN:" -> "Radha_CROWN"
  const cleanName = rawEmoji.replace(/^:|:$/g, '').trim();

  // 3. Search bot's global emoji cache across all servers the bot is in!
  if (client && client.emojis && client.emojis.cache) {
    const found = client.emojis.cache.find(e =>
      e.name.toLowerCase() === cleanName.toLowerCase() ||
      e.id === cleanName
    );
    if (found) {
      return found.toString(); // Returns <a:name:id> or <:name:id>
    }
  }

  // 4. Check emojis.js dictionary
  const dictKey = cleanName.toLowerCase();
  if (emojis[dictKey]) {
    return typeof emojis[dictKey] === 'string' ? emojis[dictKey] : rawEmoji;
  }

  return rawEmoji;
}

function parsePairs(args, client) {
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
    const rawEmojiToken = tokens[i];
    const roleToken = tokens[i + 1];
    if (rawEmojiToken && roleToken) {
      const roleIdMatch = roleToken.match(/\d+/);
      if (roleIdMatch) {
        const resolved = resolveEmoji(rawEmojiToken, client);
        pairs.push({
          emoji: resolved,
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
  aliases: ['rr'],
  reactionRoles,
  resolveEmoji,

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
    if (['create', 'panel'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} You need **Manage Roles** permission to setup reaction roles!`);
      }

      const restArgs = args.slice(1);
      if (restArgs.length < 2) {
        return message.reply(
          `${emojis.WARNING} **Usage:** \`.rr create <emoji1> <@role1> [emoji2] [@role2] ...\`\n` +
          `**Example:** \`.rr create :Radha_CROWN: @ANBU Staff\`\n` +
          `**With Custom Title:** \`.rr create "BOOSTER ROLE" :Radha_CROWN: @ANBU Staff\``
        );
      }

      const { title, pairs } = parsePairs(restArgs, message.client);

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

    // .rr add [messageId] <emoji> <@role>  OR  .rr add <emoji> <@role>
    if (sub === 'add') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} You need **Manage Roles** permission to add reaction roles!`);
      }

      let msgId = null;
      let rawEmoji = null;
      let role = message.mentions.roles.first();

      if (/^\d{17,20}$/.test(args[1])) {
        msgId = args[1];
        rawEmoji = args[2];
        role = role || message.guild.roles.cache.get(args[3]);
      } else {
        rawEmoji = args[1];
        role = role || message.guild.roles.cache.get(args[2]);
        // Auto-detect last reaction role message in current channel or guild
        const lastRR = [...guildRR].reverse().find(r => r.channelId === message.channel.id) || guildRR[guildRR.length - 1];
        if (lastRR) msgId = lastRR.messageId;
      }

      if (!msgId || !rawEmoji || !role) {
        return message.reply(`${emojis.WARNING} **Usage:** \`.rr add <emoji> <@role>\` or \`.rr add <messageId> <emoji> <@role>\``);
      }

      const emoji = resolveEmoji(rawEmoji, message.client);

      try {
        const targetChanId = guildRR.find(r => r.messageId === msgId)?.channelId || message.channel.id;
        const targetChan = message.guild.channels.cache.get(targetChanId) || message.channel;
        const targetMsg = await targetChan.messages.fetch(msgId);
        await targetMsg.react(emoji);

        guildRR.push({
          messageId: msgId,
          channelId: targetChan.id,
          emoji: emoji,
          roleId: role.id
        });
        reactionRoles.set(guildId, guildRR);

        // If target message has embed, update description cleanly
        if (targetMsg.author.id === message.client.user.id && targetMsg.embeds.length > 0) {
          const oldEmbed = targetMsg.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed);
          const currentDesc = oldEmbed.description || '';
          newEmbed.setDescription(currentDesc + (currentDesc ? '\n' : '') + `${emoji} - <@&${role.id}>`);
          await targetMsg.edit({ embeds: [newEmbed] }).catch(() => {});
        }

        message.delete().catch(() => {});
        const confirmMsg = await message.channel.send(`${emojis.SUCCESS} Added **${emoji}** ➔ <@&${role.id}> to panel!`);
        setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);
        return;
      } catch (err) {
        return message.reply(`${emojis.WARNING} Could not find message with ID \`${msgId}\` or add emoji reaction: ${err.message}`);
      }
    }

    // .rr remove [messageId] <emoji/@role>  OR  .rr remove <emoji/@role>
    if (sub === 'remove') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} You need **Manage Roles** permission to remove reaction roles!`);
      }

      let msgId = null;
      let rawTargetInput = null;

      if (/^\d{17,20}$/.test(args[1])) {
        msgId = args[1];
        rawTargetInput = args[2];
      } else {
        rawTargetInput = args[1];
        // Auto-detect last reaction role message in current channel or guild
        const lastRR = [...guildRR].reverse().find(r => r.channelId === message.channel.id) || guildRR[guildRR.length - 1];
        if (lastRR) msgId = lastRR.messageId;
      }

      if (!rawTargetInput) {
        return message.reply(`${emojis.WARNING} **Usage:** \`.rr remove <emoji/@role>\` or \`.rr remove <messageId> <emoji/@role>\``);
      }

      const resolvedTarget = resolveEmoji(rawTargetInput, message.client);
      const roleMatch = rawTargetInput.match(/\d+/);
      const roleId = roleMatch ? roleMatch[0] : null;

      const toRemove = guildRR.filter(r => {
        if (msgId && r.messageId !== msgId) return false;
        return r.emoji === resolvedTarget || r.emoji === rawTargetInput || (roleId && r.roleId === roleId);
      });

      if (toRemove.length === 0) {
        return message.reply(`${emojis.WARNING} No matching reaction role found for \`${rawTargetInput}\`.`);
      }

      // Filter out removed bindings
      guildRR = guildRR.filter(r => !toRemove.includes(r));
      reactionRoles.set(guildId, guildRR);

      // Clean up reactions & embed descriptions on target messages
      for (const item of toRemove) {
        try {
          const targetChan = message.guild.channels.cache.get(item.channelId);
          if (targetChan) {
            const targetMsg = await targetChan.messages.fetch(item.messageId).catch(() => null);
            if (targetMsg) {
              const reaction = targetMsg.reactions.cache.find(r => r.emoji.name === item.emoji || r.emoji.toString() === item.emoji || (r.emoji.id && item.emoji.includes(r.emoji.id)));
              if (reaction) await reaction.remove().catch(() => {});

              if (targetMsg.author.id === message.client.user.id && targetMsg.embeds.length > 0) {
                const oldEmbed = targetMsg.embeds[0];
                const lines = (oldEmbed.description || '')
                  .split('\n')
                  .filter(line => !line.includes(item.emoji) && (!item.roleId || !line.includes(item.roleId)));
                const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(lines.join('\n'));
                await targetMsg.edit({ embeds: [newEmbed] }).catch(() => {});
              }
            }
          }
        } catch (e) {}
      }

      message.delete().catch(() => {});
      const confirmMsg = await message.channel.send(`${emojis.SUCCESS} Successfully removed **${toRemove.length}** reaction role(s)!`);
      setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);
      return;
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

    // Default RR Panel & Setup Help with 28-char device-aligned Box UI
    const box = createDynamicBox('REACTION ROLE COMMANDS', [
      'create',
      'add',
      'remove',
      'list',
      'reset'
    ]);

    const embed = createStyledEmbed({
      title: `${emojis.REACTIONROLES || '🎭'} Reaction Role Commands`,
      description:
        `\`\`\`\n${box}\`\`\`\n` +
        `**Quick Usage:**\n` +
        `• \`.rr create :Radha_CROWN: @ANBU Staff\` — Create panel (supports external/custom emojis!)\n` +
        `• \`.rr add :custom_emoji: @Role\` — Add custom emoji role to panel\n` +
        `• \`.rr remove :custom_emoji:\` — Remove role from panel`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
