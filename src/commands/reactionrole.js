const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

// Reaction Role storage (Backed by DB)
const reactionRoles = new Map();
const _origRRSet = reactionRoles.set.bind(reactionRoles);
const _origRRDelete = reactionRoles.delete.bind(reactionRoles);

reactionRoles.set = (guildId, val) => {
  _origRRSet(guildId, val);
  db.setGuildEntry('reactionRoles', guildId, val);
  return reactionRoles;
};

reactionRoles.delete = (guildId) => {
  const res = _origRRDelete(guildId);
  db.deleteGuildEntry('reactionRoles', guildId);
  return res;
};

function hydrateReactionRoles() {
  const saved = db.getSection('reactionRoles', {});
  reactionRoles.clear();
  for (const [gId, list] of Object.entries(saved)) {
    if (Array.isArray(list)) {
      _origRRSet(gId, list);
    }
  }
}

hydrateReactionRoles();
db.onCloudRestore(hydrateReactionRoles);

/**
 * Robust Emoji Resolver for Unicode & Custom Discord Emojis
 */
function resolveEmoji(rawEmoji, guild = null, client = null) {
  if (!rawEmoji) return null;
  const str = rawEmoji.trim();

  // 1. Full Discord custom emoji format: <:name:id> or <a:name:id>
  const customMatch = str.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (customMatch) {
    return {
      display: str,
      reactionTarget: customMatch[3], // Custom emoji ID for message.react()
      id: customMatch[3],
      name: customMatch[2],
      animated: !!customMatch[1]
    };
  }

  // 2. Colon name or raw ID e.g. :Radha_CROWN: or Radha_CROWN or 123456789012345678
  const cleanName = str.replace(/^:|:$/g, '').trim();

  // Search in current guild emojis first
  if (guild && guild.emojis && guild.emojis.cache) {
    const foundGuild = guild.emojis.cache.find(e =>
      e.name.toLowerCase() === cleanName.toLowerCase() || e.id === cleanName
    );
    if (foundGuild) {
      return {
        display: foundGuild.toString(),
        reactionTarget: foundGuild.id,
        id: foundGuild.id,
        name: foundGuild.name,
        animated: foundGuild.animated
      };
    }
  }

  // Search across client's global emoji cache (all servers the bot is in)
  if (client && client.emojis && client.emojis.cache) {
    const foundClient = client.emojis.cache.find(e =>
      e.name.toLowerCase() === cleanName.toLowerCase() || e.id === cleanName
    );
    if (foundClient) {
      return {
        display: foundClient.toString(),
        reactionTarget: foundClient.id,
        id: foundClient.id,
        name: foundClient.name,
        animated: foundClient.animated
      };
    }
  }

  // 3. Otherwise standard unicode emoji (e.g. 🍵, 👍, 🔥, ❤️, etc.)
  return {
    display: str,
    reactionTarget: str,
    id: null,
    name: str,
    animated: false
  };
}

/**
 * Parses user input for reaction role panels (Supports custom title, banner image, & multi-pair definitions)
 */
function parsePairs(rawContent, guild = null, client = null, attachments = []) {
  let title = 'React to this message to assign yourself roles';
  let imageUrl = null;

  // Check attachments for image
  if (attachments && attachments.size > 0) {
    const firstImg = attachments.find(a => a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.url));
    if (firstImg) imageUrl = firstImg.url;
  } else if (Array.isArray(attachments) && attachments.length > 0) {
    const firstImg = attachments.find(a => a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.url));
    if (firstImg) imageUrl = firstImg.url;
  }

  let text = rawContent;

  // Extract banner: ... or image: ...
  const imgMatch = text.match(/(?:image|banner):\s*(https?:\/\/[^\s]+)/i);
  if (imgMatch) {
    imageUrl = imgMatch[1];
    text = text.replace(imgMatch[0], ' ');
  }

  // Extract title: "..." or "..."
  const titleMatch = text.match(/(?:title:\s*)?["']([^"']+)["']/i);
  if (titleMatch) {
    title = titleMatch[1];
    text = text.replace(titleMatch[0], ' ');
  }

  // Tokenize and pair up emojis and roles
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pairs = [];

  for (const line of lines) {
    const match = line.match(/(<a?:[a-zA-Z0-9_]+:\d+>|[^\s]+)\s+(?:-+\s*)?(?:<@&(\d+)>|(\d{17,20}))/);
    if (match) {
      const rawEmoji = match[1];
      const roleId = match[2] || match[3];
      const resolved = resolveEmoji(rawEmoji, guild, client);
      if (resolved && roleId) {
        pairs.push({
          display: resolved.display,
          reactionTarget: resolved.reactionTarget,
          emojiId: resolved.id,
          emojiName: resolved.name,
          roleId: roleId
        });
      }
    }
  }

  // Fallback: If no lines matched, try global whitespace token regex
  if (pairs.length === 0) {
    const pairRegex = /(<a?:[a-zA-Z0-9_]+:\d+>|[^\s]+)\s+(?:-+\s*)?(?:<@&(\d+)>|(\d{17,20}))/g;
    let m;
    while ((m = pairRegex.exec(text)) !== null) {
      const rawEmoji = m[1];
      const roleId = m[2] || m[3];
      const resolved = resolveEmoji(rawEmoji, guild, client);
      if (resolved && roleId) {
        pairs.push({
          display: resolved.display,
          reactionTarget: resolved.reactionTarget,
          emojiId: resolved.id,
          emojiName: resolved.name,
          roleId: roleId
        });
      }
    }
  }

  return { title, imageUrl, pairs };
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
    const guild = message.guild;
    const guildId = guild.id;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    let guildRR = reactionRoles.get(guildId) || [];

    // .rr create [title: "Title"] [image: URL] <emoji1> <@role1> [emoji2] <@role2> ...
    if (['create', 'panel'].includes(sub)) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING || '⚠️'} You need **Manage Roles** permission to setup reaction roles!`);
      }

      // Check bot hierarchy upfront
      const botMember = guild.members.me || await guild.members.fetch(message.client.user.id).catch(() => null);
      if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Manage Roles** permission to assign reaction roles!`);
      }

      // Get everything after '.rr create'
      const rawInput = message.content.replace(/^[^\s]+\s+[^\s]+\s*/, '');
      if (!rawInput || rawInput.trim().length === 0) {
        return message.reply(
          `**Usage:**\n` +
          `• \`.rr create <emoji> <@role>\`\n` +
          `• \`.rr create "React Here To Assign Yourself Colour Roles" <emoji1> <@role1> <emoji2> <@role2>\`\n` +
          `• With Banner: \`.rr create "Colour Roles" image: https://... <emoji> <@role>\`\n\n` +
          `*Tip: You can define multiple lines with different emojis and roles!*`
        );
      }

      const { title, imageUrl, pairs } = parsePairs(rawInput, guild, message.client, message.attachments);

      if (pairs.length === 0) {
        return message.reply(`${emojis.WARNING || '⚠️'} No valid emoji + role pairs found! Please specify an emoji and mention a role (\`<emoji> <@role>\`).`);
      }

      // Validate each role in guild
      for (const p of pairs) {
        const rObj = guild.roles.cache.get(p.roleId);
        if (rObj && botMember.roles.highest.position <= rObj.position) {
          return message.reply(`${emojis.WARNING || '⚠️'} Role **${rObj.name}** is positioned higher than my highest role! Please drag my bot role above **${rObj.name}** in Server Settings > Roles.`);
        }
      }

      // Format description matching exact Khwaab style
      const descriptionLines = pairs.map(p => `${p.display} - <@&${p.roleId}>`);

      const panelEmbed = new EmbedBuilder()
        .setColor(0x2F3136)
        .setTitle(title)
        .setDescription(descriptionLines.join('\n'));

      if (imageUrl) {
        panelEmbed.setImage(imageUrl);
      }

      message.delete().catch(() => {});

      const panelMsg = await message.channel.send({ embeds: [panelEmbed] });

      // Add reactions to the message & register bindings
      for (const pair of pairs) {
        try {
          await panelMsg.react(pair.reactionTarget);
          guildRR.push({
            messageId: panelMsg.id,
            channelId: message.channel.id,
            emoji: pair.display,
            emojiId: pair.emojiId,
            emojiName: pair.emojiName,
            reactionTarget: pair.reactionTarget,
            roleId: pair.roleId
          });
        } catch (err) {
          console.error('[RR Create React Error]:', err.message);
        }
      }

      reactionRoles.set(guildId, guildRR);
      return;
    }

    // .rr add [messageId] <emoji> <@role>  OR  .rr add <emoji> <@role>
    if (sub === 'add') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING || '⚠️'} You need **Manage Roles** permission to add reaction roles!`);
      }

      let msgId = null;
      let rawEmoji = null;
      let role = message.mentions.roles.first();

      if (/^\d{17,20}$/.test(args[1])) {
        msgId = args[1];
        rawEmoji = args[2];
        role = role || guild.roles.cache.get(args[3]);
      } else {
        rawEmoji = args[1];
        role = role || guild.roles.cache.get(args[2]);
        const lastRR = [...guildRR].reverse().find(r => r.channelId === message.channel.id) || guildRR[guildRR.length - 1];
        if (lastRR) msgId = lastRR.messageId;
      }

      if (!msgId || !rawEmoji || !role) {
        return message.reply(`${emojis.WARNING || '⚠️'} **Usage:** \`.rr add <emoji> <@role>\` or \`.rr add <messageId> <emoji> <@role>\``);
      }

      const resolved = resolveEmoji(rawEmoji, guild, message.client);
      if (!resolved) {
        return message.reply(`${emojis.WARNING || '⚠️'} Could not resolve emoji \`${rawEmoji}\`!`);
      }

      try {
        const targetChanId = guildRR.find(r => r.messageId === msgId)?.channelId || message.channel.id;
        const targetChan = guild.channels.cache.get(targetChanId) || message.channel;
        const targetMsg = await targetChan.messages.fetch(msgId);
        await targetMsg.react(resolved.reactionTarget);

        guildRR.push({
          messageId: msgId,
          channelId: targetChan.id,
          emoji: resolved.display,
          emojiId: resolved.id,
          emojiName: resolved.name,
          reactionTarget: resolved.reactionTarget,
          roleId: role.id
        });
        reactionRoles.set(guildId, guildRR);

        if (targetMsg.author.id === message.client.user.id && targetMsg.embeds.length > 0) {
          const oldEmbed = targetMsg.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed);
          const currentDesc = oldEmbed.description || '';
          newEmbed.setDescription(currentDesc + (currentDesc ? '\n' : '') + `${resolved.display} - <@&${role.id}>`);
          await targetMsg.edit({ embeds: [newEmbed] }).catch(() => {});
        }

        message.delete().catch(() => {});
        const confirmMsg = await message.channel.send(`${emojis.SUCCESS || '✅'} Added **${resolved.display}** ➔ <@&${role.id}> to panel!`);
        setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);
        return;
      } catch (err) {
        return message.reply(`${emojis.WARNING || '⚠️'} Could not find message with ID \`${msgId}\` or add emoji reaction: ${err.message}`);
      }
    }

    // .rr remove [messageId] <emoji/@role>  OR  .rr remove <emoji/@role>
    if (sub === 'remove') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING || '⚠️'} You need **Manage Roles** permission to remove reaction roles!`);
      }

      let msgId = null;
      let rawTargetInput = null;

      if (/^\d{17,20}$/.test(args[1])) {
        msgId = args[1];
        rawTargetInput = args[2];
      } else {
        rawTargetInput = args[1];
        const lastRR = [...guildRR].reverse().find(r => r.channelId === message.channel.id) || guildRR[guildRR.length - 1];
        if (lastRR) msgId = lastRR.messageId;
      }

      if (!rawTargetInput) {
        return message.reply(`${emojis.WARNING || '⚠️'} **Usage:** \`.rr remove <emoji/@role>\` or \`.rr remove <messageId> <emoji/@role>\``);
      }

      const resolved = resolveEmoji(rawTargetInput, guild, message.client);
      const roleMatch = rawTargetInput.match(/\d+/);
      const roleId = roleMatch ? roleMatch[0] : null;

      const toRemove = guildRR.filter(r => {
        if (msgId && r.messageId !== msgId) return false;
        return (
          (resolved && (r.emoji === resolved.display || r.emojiId === resolved.id || r.emojiName === resolved.name)) ||
          r.emoji === rawTargetInput ||
          (roleId && r.roleId === roleId)
        );
      });

      if (toRemove.length === 0) {
        return message.reply(`${emojis.WARNING || '⚠️'} No matching reaction role found for \`${rawTargetInput}\`.`);
      }

      guildRR = guildRR.filter(r => !toRemove.includes(r));
      reactionRoles.set(guildId, guildRR);

      for (const item of toRemove) {
        try {
          const targetChan = guild.channels.cache.get(item.channelId);
          if (targetChan) {
            const targetMsg = await targetChan.messages.fetch(item.messageId).catch(() => null);
            if (targetMsg) {
              const reaction = targetMsg.reactions.cache.find(r =>
                r.emoji.name === item.emojiName ||
                r.emoji.id === item.emojiId ||
                r.emoji.toString() === item.emoji
              );
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
      const confirmMsg = await message.channel.send(`${emojis.SUCCESS || '✅'} Successfully removed **${toRemove.length}** reaction role(s)!`);
      setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);
      return;
    }

    // .rr list
    if (sub === 'list') {
      if (guildRR.length === 0) {
        return message.reply(`${emojis.WARNING || '⚠️'} No active reaction roles configured on this server.`);
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

    // Default RR Panel & Setup Help
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
        `• \`.rr create :custom_emoji: @Role\` — Create panel (supports server emojis!)\n` +
        `• \`.rr create "Colour Roles" image: https://... <emoji1> <@role1> <emoji2> <@role2>\`\n` +
        `• \`.rr add :emoji: @Role\` — Add emoji role to existing panel\n` +
        `• \`.rr remove :emoji:\` — Remove role from panel\n` +
        `• \`.rr list\` — View configured reaction roles\n` +
        `• \`.rr reset\` — Clear all reaction roles`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
