const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
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

// 1. ChatGPT DALL-E 3 (High-Definition OpenAI API)
async function fetchDallE3Image(prompt, apiKey) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    }),
    signal: AbortSignal.timeout(25000)
  });

  const json = await res.json();
  if (json.data && json.data[0] && json.data[0].url) {
    const imgRes = await fetch(json.data[0].url, { signal: AbortSignal.timeout(15000) });
    return Buffer.from(await imgRes.arrayBuffer());
  }
  if (json.error) {
    throw new Error(json.error.message || 'DALL-E 3 API Error');
  }
  throw new Error('Invalid response from DALL-E 3 API');
}


// 1.5. Google Gemini Imagen 3 (Ultra-HD Google AI Engine)
async function fetchGeminiImagen3(prompt, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' + apiKey;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        outputOptions: { mimeType: 'image/jpeg' }
      }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Gemini Imagen 3 HTTP ' + res.status);
  }

  const json = await res.json();
  if (json.predictions && json.predictions[0] && json.predictions[0].bytesBase64Encoded) {
    return Buffer.from(json.predictions[0].bytesBase64Encoded, 'base64');
  }
  throw new Error('Invalid response from Gemini Imagen 3 API');
}

// 2. Pollinations Fast Engine (Zero-Auth ~1-2s HD Image)
async function fetchPollinationsImage(prompt, timeoutMs = 8000) {
  const encoded = encodeURIComponent(prompt);
  const endpoints = [
    `https://image.pollinations.ai/prompt/${encoded}?nologo=true`,
    `https://pollinations.ai/p/${encoded}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf && buf.length > 5000) return buf;
      }
    } catch (e) {}
  }
  return null;
}

// 3. AI Horde (Free Distributed Stable Diffusion Cluster - 100% High-Availability Fallback)
async function fetchHordeImage(prompt, timeoutMs = 25000) {
  const submitRes = await fetch('https://aihorde.net/api/v2/generate/async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': '0000000000',
      'Client-Agent': 'NarutoBot:1.0:discord'
    },
    body: JSON.stringify({
      prompt: prompt + ', masterpiece, highly detailed, 8k resolution, cinematic lighting, sharp focus, digital art ### ugly, deformed, bad anatomy, bad eyes, disfigured, blurry, low quality, distorted, extra limbs, watermark, text',
      params: {
        steps: 25,
        n: 1,
        sampler_name: 'k_euler_a',
        width: 512,
        height: 512,
        cfg_scale: 7.5
      }
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!submitRes.ok) throw new Error('AI Horde submit failed');
  const submitData = await submitRes.json();
  const id = submitData.id;
  if (!id) throw new Error('No job ID returned from AI Horde');

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 1500));
    const checkRes = await fetch('https://aihorde.net/api/v2/generate/check/' + id, { signal: AbortSignal.timeout(5000) });
    if (!checkRes.ok) continue;
    const checkData = await checkRes.json();
    if (checkData.done) {
      const statusRes = await fetch('https://aihorde.net/api/v2/generate/status/' + id, { signal: AbortSignal.timeout(8000) });
      const statusData = await statusRes.json();
      if (statusData.generations && statusData.generations[0]) {
        const imgUrl = statusData.generations[0].img;
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
        return Buffer.from(await imgRes.arrayBuffer());
      }
    }
  }
  throw new Error('AI Horde generation timed out');
}

module.exports = {
  name: 'imagine',
  description: 'Generate high-definition AI art & realistic scenes (Free: 1 image/24h, Premium: 3 images/24h)',
  aliases: ['image', 'draw', 'aiimage', 'generate', 'art'],
  imageLimitsStore,
  checkImageLimit,
  recordImageUse,

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;
    const client = message.client;
    const clientUser = client.user;

    const promptText = args.join(' ').trim();

    // Strict NSFW / Explicit Content Guardrail (Discord TOS & Safety Policy Enforcement)
    const nsfwRegex = /\b(naked|nude|nudity|boobs|boob|vagina|vaginas|penis|dick|pussy|sex|sexual|sexually|porn|porno|pornographic|erotic|nsfw|hentai|strip|topless|bottomless|genitals|genital|clitoris|anus|nipple|nipples|orgasm|masturbate|intercourse|explicit|uncensored|vagina)\b/i;
    if (nsfwRegex.test(promptText)) {
      const nsfwEmbed = createStyledEmbed({
        title: `<a:wrong_animated:1537179702928875631> NSFW / Explicit Content Blocked`,
        subtitle: `Safety Policy & Discord TOS Enforcement`,
        description:
          `**Your prompt was blocked by the AI Safety Guardrail!**\n\n` +
          `• **Reason:** Detected explicit NSFW / adult keywords.\n` +
          `• **Policy:** Generation of explicit nudity, pornographic composition, or sexual content is **strictly prohibited** for all users (including Premium Users and Bot Owners) to ensure full compliance with Discord TOS.\n\n` +
          `*Please refine your prompt to adhere to community safety guidelines.*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [nsfwEmbed] });
    }

    const limitCheck = checkImageLimit(author.id, guild?.id, client, author);

    if (!promptText) {
      const embed = createStyledEmbed({
        title: `${emojis.PRIORITY || '<a:paint_animated:1537177457403363389>'} AI Image Generation Engine`,
        description:
          `Generate high-definition AI artwork & realistic scenes directly from a text prompt!\n\n` +
          `**Usage:** \`.imagine <your detailed prompt>\`\n` +
          `**Example:** \`.imagine A woman sitting by a window holding a cup with a cat on her lap\`\n\n` +
          `**• Generation Quotas (24-Hour Window):**\n` +
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
      let imageBuffer = null;
      let usedEngine = 'Pollinations Flux';

            // 1. Try Google Gemini Imagen 3 if API Key is configured
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          imageBuffer = await fetchGeminiImagen3(promptText, geminiKey);
          if (imageBuffer) usedEngine = 'Google Gemini (Imagen 3 HD)';
        } catch (gErr) {
          console.error('[Gemini Imagen 3 Fallback]:', gErr.message);
        }
      }

      // 1.5. Try ChatGPT DALL-E if API Key is configured
      const openAiKey = process.env.OPENAI_API_KEY;
      if (openAiKey) {
        try {
          imageBuffer = await fetchDallE3Image(promptText, openAiKey);
          if (imageBuffer) usedEngine = 'ChatGPT DALL-E 3 HD';
        } catch (dalleErr) {
          console.error('[DALL-E 3 Fallback]:', dalleErr.message);
        }
      }

      // 2. Try Pollinations Fast Engine (~1-2s)
      if (!imageBuffer) {
        try {
          imageBuffer = await fetchPollinationsImage(promptText, 7000);
          if (imageBuffer) usedEngine = 'Pollinations AI';
        } catch (polyErr) {
          console.error('[Pollinations Fallback]:', polyErr.message);
        }
      }

      // 3. Fallback to AI Horde Distributed Cluster (100% Reliable & Free)
      if (!imageBuffer) {
        try {
          imageBuffer = await fetchHordeImage(promptText, 25000);
          if (imageBuffer) usedEngine = 'Stable Diffusion (AI Horde)';
        } catch (hordeErr) {
          console.error('[AI Horde Fallback]:', hordeErr.message);
        }
      }

      if (!imageBuffer) {
        throw new Error('All image rendering models are currently busy. Please try again in a few moments.');
      }

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'ai_artwork.png' });

      // Record rate limit timestamp AFTER successful generation
      recordImageUse(author.id);
      const newUsed = limitCheck.used + 1;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${emojis.SPARKLES || '<a:paint_animated:1537177457403363389>'} AI Image Generation`)
        .setDescription(
          '**Prompt:**\n```\n' + promptText + '\n```\n' +
          `• **Generated For:** <@${author.id}>\n` +
          `• **Engine:** \`${usedEngine}\`\n` +
          `• **Quota:** \`${limitCheck.isOwner ? 'Unlimited ∞' : newUsed + ' / ' + limitCheck.maxAllowed + ' used'}\` ${limitCheck.isOwner ? '<a:crown_animated:1537177361093500968> (Bot Owner)' : (limitCheck.isPremium ? '<a:dimond_animated:1537177370719551498> (Premium)' : '')}`
        )
        .setImage('attachment://ai_artwork.png')
        .setFooter({
          text: `Naruto Imagine Engine • ${author.tag}`,
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
