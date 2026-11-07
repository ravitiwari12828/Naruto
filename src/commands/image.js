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

// 1.2. Hugging Face Inference API (FLUX.1-schnell / SDXL)
async function fetchHuggingFaceImage(prompt, apiKey) {
  const models = [
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/stable-diffusion-xl-base-1.0'
  ];
  for (const model of models) {
    try {
      const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(25000)
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('image')) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf && buf.length > 5000) {
            const label = model.includes('FLUX') ? 'Hugging Face (FLUX.1 Schnell HD)' : 'Hugging Face (SDXL)';
            return { buffer: buf, engine: label };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

// 1.5. Google Gemini Imagen 3 (Ultra-HD Google AI Engine)
async function fetchGeminiImagen3(prompt, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' + apiKey.trim();
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

// 2. Pollinations Fast Engine (Zero-Auth ~1-2s HD Image with Multi-Model Failover)
async function fetchPollinationsImage(prompt, timeoutMs = 15000) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 9999999);
  const models = [
    { name: 'flux', label: 'Pollinations (FLUX Engine)' },
    { name: 'turbo', label: 'Pollinations (Turbo HD)' },
    { name: 'flux-realism', label: 'Pollinations (Photorealism)' },
    { name: 'sana', label: 'Pollinations (Sana HD)' }
  ];

  for (const m of models) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encoded}?model=${m.name}&seed=${seed}&nologo=true&enhance=true`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/jpeg,image/png,image/*,*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('image')) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf && buf.length > 5000) {
            return { buffer: buf, engine: m.label };
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

// 3. AI Horde (Free Distributed Stable Diffusion Cluster - 100% High-Availability Fallback)
async function fetchHordeImage(prompt, timeoutMs = 30000) {
  const submitRes = await fetch('https://aihorde.net/api/v2/generate/async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.AI_HORDE_API_KEY || '0000000000',
      'Client-Agent': 'NarutoBot:1.0:discord'
    },
    body: JSON.stringify({
      prompt: `${prompt}, masterpiece, award winning photography, 8k resolution, highly detailed, photorealistic, cinematic lighting ### text, watermark, bad anatomy, deformed, mutated, extra fingers, blurry, ugly, disfigured, low quality, bad hands, distorted, logo`,
      params: {
        steps: 25,
        n: 1,
        sampler_name: 'k_euler_a',
        width: 512,
        height: 512,
        cfg_scale: 7.0,
        post_processing: ['GFPGAN'],
        karras: true
      },
      models: [
        'ICBINP - I Can\'t Believe It\'s Not Photography',
        'AlbedoBase XL (SDXL)',
        'Deliberate',
        'stable_diffusion'
      ]
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
        title: `❌ NSFW / Explicit Content Blocked`,
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
        title: `${emojis.PRIORITY || '🎨'} AI Image Generation Engine`,
        description:
          `Generate high-definition AI artwork & realistic scenes directly from a text prompt!\n\n` +
          `**Usage:** \`.imagine <your detailed prompt>\`\n` +
          `**Example:** \`.imagine A woman sitting by a window holding a cup with a cat on her lap\`\n\n` +
          `**• Generation Quotas (24-Hour Window):**\n` +
          `• **Free Tier:** \`1 Image / 24 Hours\`\n` +
          `• **Premium Tier:** \`3 Images / 24 Hours\` ${emojis.AN_STAR || '🏆'}\n\n` +
          `*Your Current Status: **${limitCheck.isPremium ? '💎 Premium User (3 Max)' : 'Free User (1 Max)'}** (${limitCheck.used}/${limitCheck.maxAllowed} used)*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Enforce 24-Hour Limit
    if (!limitCheck.allowed) {
      const resetUnix = Math.floor(limitCheck.resetAt / 1000);
      const tierText = limitCheck.isPremium ? '💎 **Premium Tier (3 Images Max)**' : '🏆 **Free Tier (1 Image Max)**';
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
      let imageBuffer = null;
      let usedEngine = 'Pollinations FLUX HD';

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

      // 1.2. Try Hugging Face FLUX.1 Schnell if API Key is configured
      const hfKey = process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN;
      if (!imageBuffer && hfKey) {
        try {
          const hfResult = await fetchHuggingFaceImage(promptText, hfKey);
          if (hfResult && hfResult.buffer) {
            imageBuffer = hfResult.buffer;
            usedEngine = hfResult.engine || 'Hugging Face FLUX.1';
          }
        } catch (hfErr) {
          console.error('[Hugging Face Fallback]:', hfErr.message);
        }
      }

      // 1.5. Try ChatGPT DALL-E if API Key is configured
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!imageBuffer && openAiKey) {
        try {
          imageBuffer = await fetchDallE3Image(promptText, openAiKey);
          if (imageBuffer) usedEngine = 'ChatGPT DALL-E 3 HD';
        } catch (dalleErr) {
          console.error('[DALL-E 3 Fallback]:', dalleErr.message);
        }
      }

      // 2. Try Pollinations Multi-Engine Fast (~1-3s HD, FLUX/Turbo/Realism)
      if (!imageBuffer) {
        try {
          const polyRes = await fetchPollinationsImage(promptText, 15000);
          if (polyRes && polyRes.buffer) {
            imageBuffer = polyRes.buffer;
            usedEngine = polyRes.engine;
          }
        } catch (polyErr) {
          console.error('[Pollinations Fallback]:', polyErr.message);
        }
      }

      // 3. Fallback to AI Horde High-Quality SDXL Cluster (100% Reliable & Free)
      if (!imageBuffer) {
        try {
          imageBuffer = await fetchHordeImage(promptText, 30000);
          if (imageBuffer) usedEngine = 'Stable Diffusion XL (AI Horde)';
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
        .setTitle(`${emojis.SPARKLES || '🎨'} AI Image Generation`)
        .setDescription(
          '**Prompt:**\n```\n' + promptText + '\n```\n' +
          `• **Generated For:** <@${author.id}>\n` +
          `• **Engine:** \`${usedEngine}\`\n` +
          `• **Quota:** \`${limitCheck.isOwner ? 'Unlimited ∞' : newUsed + ' / ' + limitCheck.maxAllowed + ' used'}\` ${limitCheck.isOwner ? '👑 (Bot Owner)' : (limitCheck.isPremium ? '💎 (Premium)' : '')}`
        )
        .setImage('attachment://ai_artwork.png')
        .setFooter({
          text: `Naruto Imagine Engine • ${author.tag}`,
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
      return initialMsg.edit(`${emojis.WARNING || '❌'} Could not generate AI image: \`${err.message || 'Rendering Timeout'}\`. Please try again later!`);
    }
  }
};
