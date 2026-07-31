const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https = require('https');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global 24-Hour Image Generation Rate Limits Store (userId -> resetAt timestamp)
const imageLimitsStore = new Map();

function checkImageLimit(userId) {
  const now = Date.now();
  const resetAt = imageLimitsStore.get(userId);

  if (resetAt && now < resetAt) {
    return {
      allowed: false,
      resetAt
    };
  }

  return { allowed: true };
}

function recordImageUse(userId) {
  const now = Date.now();
  const resetAt = now + (24 * 60 * 60 * 1000); // 24 Hours
  imageLimitsStore.set(userId, resetAt);
}

function fetchImageBuffer(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image (HTTP ${res.statusCode})`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', err => reject(err));
    }).on('error', err => reject(err));
  });
}

module.exports = {
  name: 'imagine',
  description: 'Generate high-quality AI art & realistic anime scenes from a text prompt (1 image per 24 hours per user)',
  aliases: [],
  imageLimitsStore,
  checkImageLimit,
  recordImageUse,

  async execute(message, args) {
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const promptText = args.join(' ').trim();
    if (!promptText) {
      const embed = createStyledEmbed({
        title: `${emojis.PRIORITY || '🎨'} AI Image Generation Engine`,
        description:
          `Generate high-quality AI artwork & realistic scenes directly from a text prompt!\n\n` +
          `**Usage:** \`.imagine <your detailed prompt>\`\n` +
          `**Example:** \`.imagine A desaturated anime screencap of a woman sitting by a window holding a cup with a cat on her lap\`\n\n` +
          `*⏰ Limit: **1 Image per user every 24 Hours**.*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Check 24-Hour Limit per user
    const limitCheck = checkImageLimit(author.id);
    if (!limitCheck.allowed) {
      const resetUnix = Math.floor(limitCheck.resetAt / 1000);
      return message.reply(
        `${emojis.WARNING || '⏳'} **24-Hour Limit Reached!**\n` +
        `You have already generated an AI image in the last 24 hours.\n` +
        `• **Next Available Generation:** <t:${resetUnix}:R> (<t:${resetUnix}:f>)`
      );
    }

    const initialMsg = await message.reply(
      `${emojis.LOADING || '🎨'} **Generating AI Image...** *(Rendering high-resolution artwork, please wait...)*`
    );

    try {
      const seed = Math.floor(Math.random() * 999999) + 1;
      const encodedPrompt = encodeURIComponent(promptText);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

      const imageBuffer = await fetchImageBuffer(imageUrl);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'ai_artwork.png' });

      // Record rate limit after successful generation
      recordImageUse(author.id);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${emojis.SPARKLES || '🎨'} AI Image Generation`)
        .setDescription(
          `**Prompt:**\n\`\`\`\n${promptText}\n\`\`\`\n` +
          `• **Generated For:** <@${author.id}>\n` +
          `• **Model / Seed:** \`Pollinations AI • #${seed}\`\n` +
          `• **Quota:** \`1 / 1 used (Resets in 24 Hours)\``
        )
        .setImage('attachment://ai_artwork.png')
        .setFooter({
          text: `Naruto AI Imagine System • ${author.tag}`,
          iconURL: author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await initialMsg.delete().catch(() => {});
      return message.channel.send({
        content: `🎨 **Here is your generated AI artwork, <@${author.id}>!**`,
        embeds: [embed],
        files: [attachment]
      });
    } catch (err) {
      console.error('[Image Gen Error]:', err);
      return initialMsg.edit(`${emojis.WARNING || '⚠️'} Could not generate AI image: \`${err.message || 'Rendering Timeout'}\`. Please try again later!`);
    }
  }
};
