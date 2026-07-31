const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https = require('https');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { isUserPremium, isGuildPremium } = require('./premium');
const { isBotOwner } = require('../utils/owners');

// Global 24-Hour Rolling Timestamps Store: userId -> Array of timestamps (in ms)
const imageLimitsStore = new Map();

function checkImageLimit(userId, guildId, client, user) {
  const isPrem = isUserPremium(userId) || (guildId ? isGuildPremium(guildId) : false) || (user && client ? isBotOwner(user, client) : false);
  const maxAllowed = isPrem ? 3 : 1;

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
      isPremium: isPrem
    };
  }

  return {
    allowed: true,
    maxAllowed,
    used: timestamps.length,
    isPremium: isPrem
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

    // Check limit before prompt check to inform user of their tier & quota
    const limitCheck = checkImageLimit(author.id, guild?.id, client, author);

    if (!promptText) {
      const embed = createStyledEmbed({
        title: `${emojis.PRIORITY || '🎨'} AI Image Generation Engine`,
        description:
          `Generate high-definition AI artwork & realistic scenes directly from a text prompt!\n\n` +
          `**Usage:** \`.imagine <your detailed prompt>\`\n` +
          `**Example:** \`.imagine A woman sitting by a window holding a cup with a cat on her lap\`\n\n` +
          `**⏰ Generation Quotas (24-Hour Window):**\n` +
          `• **Free Tier:** \`1 Image / 24 Hours\`\n` +
          `• **Premium Tier:** \`3 Images / 24 Hours\` ${emojis.AN_STAR || '⭐'}\n\n` +
          `*Your Current Status: **${limitCheck.isPremium ? '💎 Premium User (3 Max)' : 'Free User (1 Max)'}** (${limitCheck.used}/${limitCheck.maxAllowed} used)*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Enforce 24-Hour Limit
    if (!limitCheck.allowed) {
      const resetUnix = Math.floor(limitCheck.resetAt / 1000);
      const tierText = limitCheck.isPremium ? '💎 **Premium Tier (3 Images Max)**' : '⭐ **Free Tier (1 Image Max)**';
      const upgradeNotice = !limitCheck.isPremium ? '\n\n💡 *Tip: Upgrade to **Premium** to unlock **3 Image Generations per 24 hours**!*' : '';

      return message.reply(
        `${emojis.WARNING || '⏳'} **24-Hour Limit Reached!** (${limitCheck.used}/${limitCheck.maxAllowed} used)\n` +
        `You have reached your 24-hour AI image generation limit.\n\n` +
        `• **Tier:** ${tierText}\n` +
        `• **Next Available Generation:** <t:${resetUnix}:R> (<t:${resetUnix}:f>)${upgradeNotice}`
      );
    }

    const initialMsg = await message.reply(
      `${emojis.LOADING || '🎨'} **Rendering High-Definition AI Artwork...** *(Please wait...)*`
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
        .setTitle(`${emojis.SPARKLES || '🎨'} AI Image Generation`)
        .setDescription(
          `**Prompt:**\n\`\`\`\n${promptText}\n\`\`\`\n` +
          `• **Generated For:** <@${author.id}>\n` +
          `• **Quota:** \`${newUsed} / ${limitCheck.maxAllowed} used in 24 Hours\` ${limitCheck.isPremium ? '💎 (Premium)' : ''}`
        )
        .setImage('attachment://ai_artwork.png')
        .setFooter({
          text: `Naruto Imagine System • ${author.tag}`,
          iconURL: author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await initialMsg.delete().catch(() => {});
      return message.channel.send({
        content: `🎨 **Here is your AI artwork, <@${author.id}>!**`,
        embeds: [embed],
        files: [attachment]
      });
    } catch (err) {
      console.error('[Image Gen Error]:', err);
      return initialMsg.edit(`${emojis.WARNING || '⚠️'} Could not generate AI image: \`${err.message || 'Rendering Timeout'}\`. Please try again later!`);
    }
  }
};
