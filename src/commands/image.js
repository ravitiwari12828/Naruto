const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https = require('https');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { isUserPremium, isGuildPremium } = require('./premium');
const { isBotOwner } = require('../utils/owners');

// Global 24-Hour Rolling Timestamps Store: userId -> Array of timestamps (in ms)
const imageLimitsStore = new Map();

function checkImageLimit(userId, guildId, client, user) {
  const isOwner = (user && client ? isBotOwner(user, client) : false) || (userId ? isBotOwner({ id: userId }, client) : false);
  if (isOwner) {
    return {
      allowed: true,
      maxAllowed: '∞ Unlimited',
      used: 0,
      isPremium: true,
      isOwner: true
    };
  }

  const isPrem = isUserPremium(userId) || (guildId ? isGuildPremium(guildId) : false);
  const maxAllowed = isPrem ? 50 : 1;

  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 Hours

  let timestamps = imageLimitsStore.get(userId) || [];
  timestamps = timestamps.filter(ts => now - ts < windowMs);
  imageLimitsStore.set(userId, timestamps);

  if (timestamps.length >= maxAllowed) {
    const oldestTs = timestamps[0];
    const resetAt = oldestTs + windowMs;
    return {
      allowed: false,
      maxAllowed,
      used: timestamps.length,
      resetAt,
      isPremium: isPrem,
      isOwner: false
    };
  }

  return {
    allowed: true,
    maxAllowed,
    used: timestamps.length,
    isPremium: isPrem,
    isOwner: false
  };
}

function recordImageUse(userId) {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  let timestamps = imageLimitsStore.get(userId) || [];
  timestamps = timestamps.filter(ts => now - ts < windowMs);
  timestamps.push(now);
  imageLimitsStore.set(userId, timestamps);
}

function fetchImageBuffer(imageUrl, timeoutMs = 75000) {
  return new Promise((resolve, reject) => {
    const req = https.get(imageUrl, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image (HTTP ${res.statusCode})`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', err => reject(err));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Rendering Timeout'));
    });

    req.on('error', err => reject(err));
  });
}

module.exports = {
  name: 'imagine',
  description: 'Generate high-definition AI art & realistic anime scenes (Free: 1 image/24h, Premium: 3 images/24h)',
  aliases: [],
  imageLimitsStore,
  checkImageLimit,
  recordImageUse,

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;
    const client = message.client;

    let clientUser = client.user;
    try {
      clientUser = await client.users.fetch(client.user.id, { force: true });
    } catch (e) {}

    const promptText = args.join(' ').trim();

    // Strict NSFW / Explicit Content Guardrail (Discord TOS & Safety Policy Enforcement)
    const nsfwRegex = /\b(naked|nude|nudity|boobs|boob|vagina|vaginas|penis|dick|pussy|sex|sexual|sexually|porn|porno|pornographic|erotic|nsfw|hentai|strip|topless|bottomless|genitals|genital|clitoris|anus|nipple|nipples|orgasm|masturbate|intercourse|explicit|uncensored|vagina)\b/i;
    if (nsfwRegex.test(promptText)) {
      const nsfwEmbed = createStyledEmbed({
        title: `<a:wrong_animated:1537179702928875631> NSFW / Explicit Content Blocked`,
        subtitle: `Safety Policy & Discord TOS Enforcement`,
        description:
          `**Your prompt was blocked by the AI Safety Guardrail!**

` +
          `• **Reason:** Detected explicit NSFW / adult keywords.
` +
          `• **Policy:** Generation of explicit nudity, pornographic composition, or sexual content is **strictly prohibited** for all users (including Premium Users and Bot Owners) to ensure full compliance with Discord TOS.

` +
          `*Please refine your prompt to adhere to community safety guidelines.*`,
        requestedBy: author,
        clientUser
      });
      return message.reply({ embeds: [nsfwEmbed] });
    }

    // Check limit before prompt check to inform user of their tier & quota
    const limitCheck = checkImageLimit(author.id, guild?.id, client, author);

    if (!promptText) {
      const embed = createStyledEmbed({
        title: `${emojis.PRIORITY || '<a:paint_animated:1537177457403363389>'} AI Image Generation Engine`,
        description:
          `Generate high-definition AI artwork & realistic scenes directly from a text prompt!\n\n` +
          `**Usage:** \`.imagine <your detailed prompt>\`\n` +
          `**Example:** \`.imagine A woman sitting by a window holding a cup with a cat on her lap\`\n\n` +
          `**⏰ Generation Quotas (24-Hour Window):**\n` +
          `• **Free Tier:** \`1 Image / 24 Hours\`\n` +
          `• **Premium Tier:** \`3 Images / 24 Hours\` ${emojis.AN_STAR || '<a:rank_animated:1537179656090943538>'}\n\n` +
          `*Your Current Status: **${limitCheck.isPremium ? '<a:dimond_animated:1537177370719551498> Premium User (3 Max)' : 'Free User (1 Max)'}** (${limitCheck.used}/${limitCheck.maxAllowed} used)*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Enforce 24-Hour Limit
    if (!limitCheck.allowed) {
      const resetUnix = Math.floor(limitCheck.resetAt / 1000);
      const tierText = limitCheck.isPremium ? '<a:dimond_animated:1537177370719551498> **Premium Tier (3 Images Max)**' : '<a:rank_animated:1537179656090943538> **Free Tier (1 Image Max)**';
      const upgradeNotice = !limitCheck.isPremium ? '\n\n💡 *Tip: Upgrade to **Premium** to unlock **3 Image Generations per 24 hours**!*' : '';

      return message.reply(
        `${emojis.WARNING || '<a:hourglass_animated:1537179590982631575>'} **24-Hour Limit Reached!** (${limitCheck.used}/${limitCheck.maxAllowed} used)\n` +
        `You have reached your 24-hour AI image generation limit.\n\n` +
        `• **Tier:** ${tierText}\n` +
        `• **Next Available Generation:** <t:${resetUnix}:R> (<t:${resetUnix}:f>)${upgradeNotice}`
      );
    }

    const initialMsg = await message.reply(
      `${emojis.LOADING || '<a:paint_animated:1537177457403363389>'} **Rendering High-Definition AI Artwork...** *(Please wait...)*`
    );

    try {
      const seed = Math.floor(Math.random() * 999999) + 1;

      // Anatomical Precision & High-Detail Quality Modifiers
      const qualityModifiers = ', masterpiece, best quality, highly detailed, perfect anatomy, correct hands and feet, 5 fingers per hand, natural limbs, ultra-sharp focus, cinematic lighting, vivid colors, 8k resolution';
      const enhancedPromptText = promptText.includes('masterpiece') ? promptText : (promptText + qualityModifiers);

      const encodedPrompt = encodeURIComponent(enhancedPromptText);

      // Model pipeline: flux-realism -> flux -> turbo
      const modelsToTry = ['flux-realism', 'flux', 'turbo'];
      let imageBuffer = null;

      for (const model of modelsToTry) {
        try {
          const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&model=${model}&seed=${seed}`;
          imageBuffer = await fetchImageBuffer(url, 45000);
          if (imageBuffer && imageBuffer.length > 5000) break;
        } catch (e) {}
      }

      if (!imageBuffer) {
        throw new Error('All image rendering models timed out.');
      }

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'ai_artwork.png' });

      // Record rate limit timestamp AFTER successful generation
      recordImageUse(author.id);
      const newUsed = limitCheck.used + 1;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${emojis.SPARKLES || '<a:paint_animated:1537177457403363389>'} AI Image Generation`)
        .setDescription(
          `**Prompt:**\n\`\`\`\n${promptText}\n\`\`\`\n` +
          `• **Generated For:** <@${author.id}>\n` +
          `• **Quota:** \`${limitCheck.isOwner ? 'Unlimited ∞' : newUsed + ' / ' + limitCheck.maxAllowed + ' used'}\` ${limitCheck.isOwner ? '<a:crown_animated:1537177361093500968> (Bot Owner)' : (limitCheck.isPremium ? '<a:dimond_animated:1537177370719551498> (Premium)' : '')}`
        )
        .setImage('attachment://ai_artwork.png')
        .setFooter({
          text: `Naruto Imagine System • ${author.tag}`,
          iconURL: author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await initialMsg.delete().catch(() => {});
      return message.channel.send({
        content: `<a:paint_animated:1537177457403363389> **Here is your AI artwork, <@${author.id}>!**`,
        embeds: [embed],
        files: [attachment]
      });
    } catch (err) {
      console.error('[Image Gen Error]:', err);
      return initialMsg.edit(`${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} Could not generate AI image: \`${err.message || 'Rendering Timeout'}\`. Please try again later!`);
    }
  }
};
