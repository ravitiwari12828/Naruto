const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
  parseEmoji
} = require('discord.js');
const emojis = require('../utils/emojis');

// Max Emoji / Sticker Limits per Guild Boost Tier
const EMOJI_LIMITS = { 0: 50, 1: 100, 2: 150, 3: 250 };
const STICKER_LIMITS = { 0: 5, 1: 15, 2: 30, 3: 60 };

function extractMediaFromMessage(message, args) {
  let targetUrl = null;
  let targetName = 'stolen_emoji';
  let isAnimated = false;

  // 1. Check referenced / replied message
  if (message.reference && message.reference.messageId) {
    const refMsg = message.channel.messages.cache.get(message.reference.messageId);
    if (refMsg) {
      // Check refMsg stickers
      if (refMsg.stickers && refMsg.stickers.size > 0) {
        const sticker = refMsg.stickers.first();
        targetUrl = sticker.url;
        targetName = sticker.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'stolen_sticker';
        return { url: targetUrl, name: targetName, isAnimated: sticker.format === 3 };
      }

      // Check refMsg custom emojis in content
      const customEmojiMatch = refMsg.content.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
      if (customEmojiMatch) {
        isAnimated = refMsg.content.includes(`<a:${customEmojiMatch[1]}:${customEmojiMatch[2]}>`);
        const ext = isAnimated ? 'gif' : 'png';
        targetUrl = `https://cdn.discordapp.com/emojis/${customEmojiMatch[2]}.${ext}?v=1`;
        targetName = customEmojiMatch[1];
        return { url: targetUrl, name: targetName, isAnimated };
      }

      // Check refMsg attachments
      if (refMsg.attachments && refMsg.attachments.size > 0) {
        const att = refMsg.attachments.first();
        targetUrl = att.url;
        targetName = att.name ? att.name.split('.')[0] : 'stolen_image';
        return { url: targetUrl, name: targetName, isAnimated: att.name?.endsWith('.gif') || false };
      }
    }
  }

  // 2. Check command arguments for custom emoji markup <a:name:id> or <:name:id>
  if (args.length > 0) {
    const rawArg = args[0];
    const customEmojiMatch = rawArg.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
    if (customEmojiMatch) {
      isAnimated = rawArg.startsWith('<a:');
      const ext = isAnimated ? 'gif' : 'png';
      targetUrl = `https://cdn.discordapp.com/emojis/${customEmojiMatch[2]}.${ext}?v=1`;
      targetName = args[1] || customEmojiMatch[1];
      return { url: targetUrl, name: targetName, isAnimated };
    }

    // Direct Image URL
    if (rawArg.startsWith('http://') || rawArg.startsWith('https://')) {
      targetUrl = rawArg;
      targetName = args[1] || 'stolen_media';
      return { url: targetUrl, name: targetName, isAnimated: rawArg.includes('.gif') };
    }
  }

  // 3. Check current message attachments
  if (message.attachments && message.attachments.size > 0) {
    const att = message.attachments.first();
    targetUrl = att.url;
    targetName = args[0] || (att.name ? att.name.split('.')[0] : 'stolen_image');
    return { url: targetUrl, name: targetName, isAnimated: att.name?.endsWith('.gif') || false };
  }

  return null;
}

module.exports = {
  name: 'steal',
  description: 'Steal emojis or stickers from messages/replies and add them to your server',
  aliases: ['stealemoji', 'stealsticker', 'addemoji', 'addsticker'],
  usage: '.steal [reply to message OR paste emoji/image URL]',

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    // Permissions Guard: Manage Guild Expressions / Manage Emojis / Admin / Server Owner
    const hasPerm = message.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                    message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers) ||
                    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                    guild.ownerId === author.id;

    if (!hasPerm) {
      return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} You need **Manage Emojis & Stickers** permission to steal emojis.`);
    }

    const media = extractMediaFromMessage(message, args);

    if (!media || !media.url) {
      return message.reply(
        `${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} **Usage:** Reply to a message with an emoji/sticker or type \`.steal <emoji>\` to steal it!`
      );
    }

    const previewEmbed = new EmbedBuilder()
      .setColor(0x2F3136)
      .setTitle('Choose what to steal:')
      .setImage(media.url);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`steal_emoji_${message.id}`)
        .setLabel('Steal as Emoji')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`steal_sticker_${message.id}`)
        .setLabel('Steal as Sticker')
        .setStyle(ButtonStyle.Success)
    );

    const panelMsg = await message.channel.send({
      embeds: [previewEmbed],
      components: [actionRow]
    });

    const collector = panelMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: 'Only the command requester can choose what to steal.', flags: 64, ephemeral: true });
      }

      await interaction.deferUpdate();

      const boostTier = guild.premiumTier || 0;

      // ─────────────────────────────────────────────────────────
      // STEAL AS EMOJI
      // ─────────────────────────────────────────────────────────
      if (interaction.customId === `steal_emoji_${message.id}`) {
        const currentEmojis = await guild.emojis.fetch();
        const animatedCount = currentEmojis.filter(e => e.animated).size;
        const staticCount = currentEmojis.filter(e => !e.animated).size;

        const limit = EMOJI_LIMITS[boostTier] || 50;
        const currentCount = media.isAnimated ? animatedCount : staticCount;

        if (currentCount >= limit) {
          const limitEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('Steal')
            .setDescription(
              `You've Reached Your Server's Emoji Limit For The Current Boost Level.\n\n` +
              `To Add This Emoji, Please Delete **1** Existing Emoji(s) First.`
            );
          return panelMsg.edit({ embeds: [limitEmbed], components: [] });
        }

        try {
          const cleanName = media.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32) || 'stolen_emoji';
          const createdEmoji = await guild.emojis.create({ attachment: media.url, name: cleanName });

          const successEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('<a:accept_animated:1537177319603703969> Emoji Added Successfully!')
            .setDescription(`Successfully added ${createdEmoji} as **:${createdEmoji.name}:** to **${guild.name}**!`)
            .setFooter({ text: `Slots: ${currentCount + 1}/${limit}` });

          await panelMsg.edit({ embeds: [successEmbed], components: [] });
        } catch (err) {
          const errEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('Steal Error')
            .setDescription(`Failed to add emoji: \`${err.message}\``);
          await panelMsg.edit({ embeds: [errEmbed], components: [] });
        }
      }

      // ─────────────────────────────────────────────────────────
      // STEAL AS STICKER
      // ─────────────────────────────────────────────────────────
      if (interaction.customId === `steal_sticker_${message.id}`) {
        const currentStickers = await guild.stickers.fetch();
        const limit = STICKER_LIMITS[boostTier] || 5;

        if (currentStickers.size >= limit) {
          const limitEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('Steal')
            .setDescription(
              `You've Reached Your Server's Sticker Limit For The Current Boost Level.\n\n` +
              `To Add This Sticker, Please Delete **1** Existing Sticker(s) First.`
            );
          return panelMsg.edit({ embeds: [limitEmbed], components: [] });
        }

        try {
          const cleanName = media.name.replace(/[^a-zA-Z0-9_]/g, ' ').substring(0, 30) || 'Stolen Sticker';
          const createdSticker = await guild.stickers.create({
            file: media.url,
            name: cleanName,
            tags: 'naruto, stolen'
          });

          const successEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('<a:accept_animated:1537177319603703969> Sticker Added Successfully!')
            .setDescription(`Successfully added sticker **"${createdSticker.name}"** to **${guild.name}**!`)
            .setFooter({ text: `Sticker Slots: ${currentStickers.size + 1}/${limit}` });

          await panelMsg.edit({ embeds: [successEmbed], components: [] });
        } catch (err) {
          const errEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('Steal Error')
            .setDescription(`Failed to add sticker: \`${err.message}\` (Note: Discord only accepts PNG/APNG under 512KB for stickers)`);
          await panelMsg.edit({ embeds: [errEmbed], components: [] });
        }
      }

      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        panelMsg.edit({ components: [] }).catch(() => {});
      }
    });
  }
};
