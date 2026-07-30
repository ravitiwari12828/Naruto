const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Welcome, DM & Boost Config store
const welcomeConfigs = new Map();

// Fancy Unicode Font Engines
const FANCY_FONTS = {
  gothic: (str) => {
    const frakturCaps = [0x1D504, 0x1D505, 0x212D, 0x1D507, 0x1D508, 0x1D509, 0x1D50A, 0x210C, 0x2111, 0x1D50D, 0x1D50E, 0x1D50F, 0x1D510, 0x1D511, 0x1D512, 0x1D513, 0x1D514, 0x211C, 0x1D516, 0x1D517, 0x1D518, 0x1D519, 0x1D51A, 0x1D51B, 0x1D51C, 0x2128];
    const frakturLower = [0x1D51E, 0x1D51F, 0x1D520, 0x1D521, 0x1D522, 0x1D523, 0x1D524, 0x1D525, 0x1D526, 0x1D527, 0x1D528, 0x1D529, 0x1D52A, 0x1D52B, 0x1D52C, 0x1D52D, 0x1D52E, 0x1D52F, 0x1D530, 0x1D531, 0x1D532, 0x1D533, 0x1D534, 0x1D535, 0x1D536, 0x1D537];
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(frakturCaps[code - 65]);
      if (code >= 97 && code <= 122) return String.fromCodePoint(frakturLower[code - 97]);
      return char;
    }).join('');
  },
  smallcaps: (str) => {
    const normal = 'abcdefghijklmnopqrstuvwxyz';
    const sc = 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ';
    return str.split('').map(c => {
      const idx = normal.indexOf(c.toLowerCase());
      return idx !== -1 ? sc[idx] : c;
    }).join('');
  },
  script: (str) => {
    const caps = [0x1D49C, 0x212C, 0x1D49E, 0x1D49F, 0x2130, 0x2131, 0x1D4A2, 0x210B, 0x2110, 0x1D4A5, 0x1D4A6, 0x1D4A7, 0x1D4A8, 0x1D4A9, 0x1D4AA, 0x1D4AB, 0x1D4AC, 0x211B, 0x1D4AE, 0x1D4AF, 0x1D4B0, 0x1D4B1, 0x1D4B2, 0x1D4B3, 0x1D4B4, 0x1D4B5];
    const lower = [0x1D4B6, 0x1D4B7, 0x1D4B8, 0x1D4B9, 0x2146, 0x1D4BB, 0x1D4BC, 0x1D4BD, 0x1D4BE, 0x1D4BF, 0x1D4C0, 0x1D4C1, 0x1D4C2, 0x1D4C3, 0x1D4C4, 0x1D4C5, 0x1D4C6, 0x1D4C7, 0x1D4C8, 0x1D4C9, 0x1D4CA, 0x1D4CB, 0x1D4CC, 0x1D4CD, 0x1D4CE, 0x1D4CF];
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(caps[code - 65]);
      if (code >= 97 && code <= 122) return String.fromCodePoint(lower[code - 97]);
      return char;
    }).join('');
  }
};

// High-Resolution Live Banner Image URLs for Presets
const PRESET_BANNERS = {
  gothic: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80',
  aesthetic: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
  galaxy: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
  cafe: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
  shinobi: 'https://images.unsplash.com/photo-1528164344705-47542687990d?w=1200&auto=format&fit=crop&q=80',
  cyberpunk: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
  minimal: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80'
};

// Mimu-Style Presets Directory (With Gothic Fonts, Stylish Bullet Points & Emojis)
const WELCOME_PRESETS = {
  gothic: {
    title: '𝔚𝔢𝔩𝔠𝔬𝔪𝔢 𝔱𝔬 𝔱𝔥𝔢 ℭ𝔞𝔰𝔱𝔩𝔢',
    headerText: '🦇 ─── 𖤍 ─── 🦇',
    description: '🛡️ **ᴍᴇᴍʙᴇʀ ᴄᴏᴜɴᴛ: #{membercount}**\n\nGreetings, dark traveler {user}. You have entered the hallowed halls of **{server_name}**.\nMay the shadows welcome you.\n\n🦇 Join us in <#lore> and <#general> to mingle with the night\'s children.\n🦇 Please read <#rules>.\n\nSoul **#{membercount}** 🥀',
    color: '#800020',
    imageUrl: PRESET_BANNERS.gothic,
    useAvatarThumbnail: true,
    footer: 'Soul #{membercount} • {server_name}'
  },
  aesthetic: {
    title: '🌸 𝒲ℯ𝓁𝒸⯀𝓂ℯ 𝓉⯀ {server_name}',
    headerText: '୨୧ ─── ∘°❉°∘ ─── ୨୧',
    description: '🌸 **ᴍᴇᴍʙᴇʀ ᴄᴏᴜɴᴛ: #{membercount}**\n\nWelcome {user} to **{server_name}**! 🎀\nWe are so happy to have you here!\n\n┈➤ **ǫᴜɪᴄᴋ ʟɪɴᴋs:**\n• Check out our <#rules>\n• Pick your <#roles>\n• Chat with us in <#general>\n\nMember Count: **#{membercount}** 🌸\n୨୧ ─── ∘°❉°∘ ─── ୨୧',
    color: '#FFD1DC',
    imageUrl: PRESET_BANNERS.aesthetic,
    useAvatarThumbnail: true,
    footer: 'Member #{membercount} • {server_name}'
  },
  galaxy: {
    title: '✨ 𝔚𝔢𝔩𝔠𝔬𝔪𝔢 𝔱𝔬 {server_name}',
    headerText: '🌙 ─── ✧ * :･ﾟ✧ ─── 🌙',
    description: '🌌 **sᴛᴀʀʟɪɢʜᴛ ɴᴏᴅᴇ: #{membercount}**\n\nWelcome {user} to **{server_name}**! ✨\nYou have crossed the starlight horizon.\n\n⭐ **ᴄᴏɴsᴛᴇʟʟᴀᴛɪᴏɴ ᴀᴄᴄᴇss:**\n✦ Protocols • <#rules>\n✦ Star Roles • <#roles>\n✦ Galaxy Lounge • <#lounge>\n\nStarlight Member: **#{membercount}** 🌌',
    color: '#4B0082',
    imageUrl: PRESET_BANNERS.galaxy,
    useAvatarThumbnail: true,
    footer: 'Starlight Member #{membercount} • {server_name}'
  },
  cafe: {
    title: '🧸 𝒲ℯ𝓁𝒸⯀𝓂ℯ 𝓉⯀ {server_name}',
    headerText: '🍵 ─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ─── 🍵',
    description: '🍵 **ᴄᴜsᴛᴏᴍᴇʀ ɴᴜᴍʙᴇʀ: #{membercount}**\n\nWelcome {user} to **{server_name}**! 🧸\nGrab a warm cup of boba and take a seat!\n\n🥞 **ᴍᴇɴᴜ & ʟɪɴᴋs:**\n• Cafe Rules: <#rules>\n• Special Roles: <#roles>\n• Chat Table: <#chat>\n\nCustomer **#{membercount}** 🍰',
    color: '#A8C3A0',
    imageUrl: PRESET_BANNERS.cafe,
    useAvatarThumbnail: true,
    footer: 'Customer #{membercount} • {server_name}'
  },
  shinobi: {
    title: '🍥 𝔚𝔢𝔩𝔠𝔬𝔪𝔢 𝔱𝔬 𝔎𝔬𝔫𝔬𝔥𝔞 𝔙𝔦𝔩𝔩𝔞𝔤𝔢',
    headerText: '🍥 **WELCOME TO THE HIDDEN LEAF VILLAGE** 🍥',
    description: '🍃 **sʜɪɴᴏʙɪ ʀᴀɴᴋ: #{membercount}**\n\nGreetings {user}! You have arrived in **{server_name}**.\n\n> *"A shinobi is one who endures."*\n\n🌀 **sʜɪɴᴏʙɪ ᴘʀᴏᴛᴏᴄᴏʟ:**\n1. Read the village rules in <#rules>\n2. Collect your Ninja Roles in <#roles>\n3. Join the Ninja Lounge in <#lounge>\n\nYou are Shinobi **#{membercount}** of Konoha! 🍃',
    color: '#7E0808',
    imageUrl: PRESET_BANNERS.shinobi,
    useAvatarThumbnail: true,
    footer: 'Shinobi #{membercount} • {server_name}'
  },
  cyberpunk: {
    title: '⚡ 𝔚𝔢𝔩𝔠𝔬𝔪𝔢 𝔱𝔬 𝔱𝔥𝔢 𝔍𝔞𝔱𝔯𝔦𝔡',
    headerText: '⚡ **SYSTEM INTRUSION DETECTED** ⚡',
    description: '💾 **ɴᴇᴛᴡᴏʀᴋ ɴᴏᴅᴇ: #{membercount}**\n\nWelcome {user} to the **{server_name}** Matrix!\n\n🌐 **ᴀᴄᴄᴇss ᴛᴇʀᴍɪɴᴀʟs:**\n[01] <#rules> • Protocol Directives\n[02] <#roles> • Cyber Identity Setup\n[03] <#chat> • Main Network Stream\n\nNetwork Node: **#{membercount}** 💾',
    color: '#00FFFF',
    imageUrl: PRESET_BANNERS.cyberpunk,
    useAvatarThumbnail: true,
    footer: 'Node #{membercount} • {server_name}'
  },
  minimal: {
    title: 'ᴡᴇʟᴄᴏᴍᴇ',
    headerText: '',
    description: 'Welcome **{username}** to {server_name}.\n\n> Read the guidelines in <#rules> and feel free to introduce yourself in <#chat>.\n\nMember **#{membercount}**',
    color: '#2B2D31',
    imageUrl: PRESET_BANNERS.minimal,
    useAvatarThumbnail: true,
    footer: 'Member #{membercount}'
  }
};

function getOrCreateWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: true,
      channelId: null,
      style: 'gothic',
      cardType: 'embed',
      useEmbed: true,
      headerText: WELCOME_PRESETS.gothic.headerText,
      title: WELCOME_PRESETS.gothic.title,
      description: WELCOME_PRESETS.gothic.description,
      color: WELCOME_PRESETS.gothic.color,
      footer: WELCOME_PRESETS.gothic.footer,
      imageUrl: PRESET_BANNERS.gothic,
      useAvatarThumbnail: true,

      // Join DM Config
      joinDmEnabled: true,
      joinDmText: 'Welcome to **{server_name}**, {user}! 🍥 Make sure to check out our rules and enjoy your stay!',

      // Leave DM Config
      leaveDmEnabled: true,
      leaveDmText: 'Goodbye {user}! We hope to see you back in **{server_name}** soon.',

      // Boost Msg Config
      boostEnabled: true,
      boostChannelId: null,
      boostText: '🚀 **SERVER BOOST!** {user} just boosted **{server_name}**! Thank you for supporting the village! ✨'
    });
  }
  return welcomeConfigs.get(guildId);
}

function parsePlaceholders(text, member) {
  if (!text) return '';
  const guild = member.guild;
  const user = member.user;

  let result = text
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{username}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{server_name}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());

  // Dynamic Font Transform Tags: {gothic:text}, {smallcaps:text}, {script:text}
  result = result.replace(/{gothic:([^}]+)}/g, (_, str) => FANCY_FONTS.gothic(str));
  result = result.replace(/{smallcaps:([^}]+)}/g, (_, str) => FANCY_FONTS.smallcaps(str));
  result = result.replace(/{script:([^}]+)}/g, (_, str) => FANCY_FONTS.script(str));

  return result;
}

// Custom Graphic Composite Canvas Card Generator
async function generateCanvasWelcomeCard(config, member) {
  const guild = member.guild;
  const user = member.user;

  const canvas = createCanvas(900, 450);
  const ctx = canvas.getContext('2d');

  // Background Theme Image or Gradient
  const bannerUrl = config.imageUrl || PRESET_BANNERS[config.style || 'gothic'] || PRESET_BANNERS.gothic;
  try {
    const bgImg = await loadImage(bannerUrl);
    ctx.drawImage(bgImg, 0, 0, 900, 450);

    // Dark overlay for text readability
    ctx.fillStyle = 'rgba(10, 10, 15, 0.70)';
    ctx.fillRect(0, 0, 900, 450);
  } catch(e) {
    const grad = ctx.createLinearGradient(0, 0, 900, 450);
    grad.addColorStop(0, '#0d0d12');
    grad.addColorStop(1, '#1b080d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 450);
  }

  // Border Frame
  const borderColor = config.color || '#800020';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 880, 430);

  // Avatar Image
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatar = await loadImage(avatarUrl);

    ctx.save();
    ctx.beginPath();
    ctx.arc(450, 120, 60, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 390, 60, 120, 120);
    ctx.restore();

    // Avatar ring border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(450, 120, 60, 0, Math.PI * 2, true);
    ctx.stroke();
  } catch(e) {}

  // Welcome Title in Gothic Fancy Font
  const titleText = FANCY_FONTS.gothic('Welcome to the Castle');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleText, 450, 230);

  // Member Greeting
  ctx.fillStyle = '#ff4d6d';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Greetings, dark traveler @${user.username}`, 450, 275);

  // Member Count Badge Pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(330, 315, 240, 45, 22);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`🛡️ Member Count: ${guild.memberCount}`, 450, 344);

  const buffer = await canvas.encode('png');
  return new AttachmentBuilder(buffer, { name: 'welcome-card.png' });
}

async function buildWelcomeCard(config, member) {
  const guild = member.guild;
  const user = member.user;

  const headerText = parsePlaceholders(config.headerText, member);
  const description = parsePlaceholders(config.description, member);
  const title = parsePlaceholders(config.title, member);
  const footer = parsePlaceholders(config.footer, member);

  // Always resolve valid banner image
  const bannerImage = config.imageUrl || PRESET_BANNERS[config.style || 'gothic'] || PRESET_BANNERS.gothic;

  if (config.cardType === 'canvas') {
    try {
      const attachment = await generateCanvasWelcomeCard(config, member);
      return { content: headerText || undefined, files: [attachment] };
    } catch(e) {}
  }

  if (!config.useEmbed) {
    return { content: `${headerText}\n\n${description}` };
  }

  const embedColor = parseInt(config.color?.replace('#', '') || '800020', 16);

  const embed = new EmbedBuilder()
    .setColor(isNaN(embedColor) ? 0x800020 : embedColor)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle(title || `Welcome to ${guild.name}`)
    .setDescription(description)
    .setFooter({
      text: `${footer} • ${new Date().toLocaleDateString()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    });

  // User Avatar Thumbnail
  if (config.useAvatarThumbnail !== false) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));
  }

  // Large Header Banner Picture
  if (bannerImage) {
    embed.setImage(bannerImage);
  }

  return { content: headerText || undefined, embeds: [embed] };
}

function buildWelcomeConfigPanel(config, guild, author, clientUser) {
  const chanMention = config.channelId ? `<#${config.channelId}>` : '*Not set (Use `.welcome setup <#channel>`)*';
  const imgStr = config.imageUrl ? '`High-Res Banner Set`' : '`Preset Default Banner`';
  const cardTypeStr = config.cardType === 'canvas' ? '`Canvas Graphic Card`' : '`Rich Embed Banner`';

  const description =
    `Welcome **${author.username}**! Below is your server **Welcome System Hub & Greetings Config**.\n\n` +
    `**⚙️ System Status & Settings:**\n` +
    `• **Module Status:** ${config.enabled ? `${emojis.SUCCESS} **ACTIVE**` : `${emojis.DISABLED} **DISABLED**`}\n` +
    `• **Welcome Channel:** ${chanMention}\n` +
    `• **Card Render Mode:** ${cardTypeStr}\n` +
    `• **Active Preset:** \`${(config.style || 'gothic').toUpperCase()}\`\n` +
    `• **Embed Color:** \`${config.color || '#800020'}\`\n` +
    `• **Banner Picture:** ${imgStr}\n` +
    `• **Join DM Notification:** ${config.joinDmEnabled ? `${emojis.SUCCESS} Enabled` : `${emojis.DISABLED} Disabled`}\n` +
    `• **Leave DM Notification:** ${config.leaveDmEnabled ? `${emojis.SUCCESS} Enabled` : `${emojis.DISABLED} Disabled`}\n\n` +
    `**📝 Configuration & Font Commands:**\n` +
    `• \`.welcome preset <gothic/aesthetic/galaxy/cafe/shinobi/cyberpunk/minimal>\` — Apply preset\n` +
    `• \`.welcome card <canvas/embed>\` — Toggle Graphic Canvas Card vs Rich Embed\n` +
    `• \`.welcome font <gothic/smallcaps/script> <text>\` — Convert text to fancy fonts\n` +
    `• \`.welcome setup <#channel>\` — Bind welcome channel\n` +
    `• \`.welcome description <text>\` — Edit description text\n` +
    `• \`.welcometest\` — Preview live card with thumbnail & banner!\n\n` +
    `**🔤 Font Tags Supported:** \`{gothic:Text}\`, \`{smallcaps:Text}\`, \`{script:Text}\`\n\n` +
    `**💬 Active Description Body:**\n` +
    `>>> ${config.description}`;

  const embed = createStyledEmbed({
    title: `👋 Welcome System Dashboard`,
    subtitle: `${guild.name} Greetings Configuration`,
    description,
    requestedBy: author,
    clientUser
  });

  return embed;
}

/**
 * Builds Server Boost Announcement Embed matching requested UI spec with BIG animated booster emoji thumbnail on right side.
 */
function buildBoosterEmbed(member) {
  const user = member.user;
  const guild = member.guild;
  const boostCount = guild.premiumSubscriptionCount || 1;

  const embed = new EmbedBuilder()
    .setColor(0xF47FFF) // Official Discord Server Boost Pink Color
    .setTitle(`${user.username} boosted!`)
    .setDescription(`Thanks for boosting the server, <@${user.id}>!`)
    .setThumbnail('https://cdn.discordapp.com/emojis/1532470412217159790.gif')
    .setFooter({ text: `We're now at ${boostCount} boost${boostCount === 1 ? '' : 's'}!` });

  return embed;
}

module.exports = {
  name: 'welcome',
  description: 'Customizable Mimu-Style Welcome Embeds with Gothic Fonts, Stylish Bullets & Canvas Cards',
  aliases: [
    'welcomesetup', 'welcomereset', 'welcometest', 'welcomepreview',
    'joindm', 'leavedm', 'boostmsg', 'welcomeconfig', 'welcomepreset', 'welcomecard', 'welcomefont'
  ],
  welcomeConfigs,
  WELCOME_PRESETS,
  PRESET_BANNERS,
  FANCY_FONTS,
  getOrCreateWelcomeConfig,
  buildWelcomeCard,
  generateCanvasWelcomeCard,
  buildBoosterEmbed,
  parsePlaceholders,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'welcomesetup') sub = 'setup';
    if (invoked === 'welcomereset') sub = 'reset';
    if (invoked === 'welcometest' || invoked === 'welcomepreview') sub = 'test';
    if (invoked === 'welcomepreset') sub = 'preset';
    if (invoked === 'welcomecard') sub = 'card';
    if (invoked === 'welcomefont') sub = 'font';
    if (invoked === 'joindm') sub = 'joindm';
    if (invoked === 'leavedm') sub = 'leavedm';
    if (invoked === 'boostmsg') sub = 'boostmsg';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateWelcomeConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. PRESET SELECTOR (.welcome preset <theme>)
    if (sub === 'preset') {
      const theme = args[1]?.toLowerCase();
      if (!theme || !WELCOME_PRESETS[theme]) {
        return message.reply(
          `🎨 **Available Welcome Presets**:\n` +
          `• \`gothic\` - Dark Sanctuary Theme 🖤 (Gothic Font: 𝔚𝔢𝔩𝔠𝔬𝔪𝔢 𝔱𝔬 𝔱𝔥𝔢 ℭ𝔞𝔰𝔱𝔩𝔢)\n` +
          `• \`aesthetic\` - Soft Pink & Pastel Theme 🌸 (Script Font: 𝒲ℯ𝓁𝒸⯀𝓂ℯ)\n` +
          `• \`galaxy\` - Cosmic Starry Horizon Theme ✨\n` +
          `• \`cafe\` - Cozy Boba & Matcha Theme 🧸\n` +
          `• \`shinobi\` - Naruto Leaf Village Theme 🍥\n` +
          `• \`cyberpunk\` - Neon Matrix Theme ⚡\n` +
          `• \`minimal\` - Clean Monochrome Theme 🌿\n\n` +
          `Usage: \`.welcome preset gothic\``
        );
      }

      const preset = WELCOME_PRESETS[theme];
      config.style = theme;
      config.title = preset.title;
      config.headerText = preset.headerText;
      config.description = preset.description;
      config.color = preset.color;
      config.imageUrl = preset.imageUrl || PRESET_BANNERS[theme];
      config.useAvatarThumbnail = true;
      config.footer = preset.footer;
      welcomeConfigs.set(guild.id, config);

      return message.reply(`${emojis.SUCCESS} **Applied Welcome Preset**: \`${theme.toUpperCase()}\` with Fancy Gothic Font & Emojis!\nType \`.welcometest\` to preview the card!`);
    }

    // 2. FANCY FONT CONVERTER TOOL (.welcome font <gothic/smallcaps/script> <text>)
    if (sub === 'font') {
      const style = args[1]?.toLowerCase();
      const text = args.slice(2).join(' ');

      if (!style || !FANCY_FONTS[style] || !text) {
        return message.reply(`ℹ️ Usage: \`.welcome font <gothic / smallcaps / script> <your text>\`\nExample: \`.welcome font gothic Welcome to the Castle\``);
      }

      const converted = FANCY_FONTS[style](text);
      return message.reply(`✨ **Converted Text**: \`${converted}\`\n\nCopy & paste this into your \`.welcome title\` or \`.welcome description\`!`);
    }

    // 3. TOGGLE CARD MODE (.welcome card canvas/embed)
    if (sub === 'card' || sub === 'mode') {
      const mode = args[1]?.toLowerCase();
      if (mode === 'canvas' || mode === 'graphic' || mode === 'image') {
        config.cardType = 'canvas';
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Card Render Mode Set to**: \`Canvas Graphic Card\`! Type \`.welcometest\` to preview.`);
      }
      if (mode === 'embed' || mode === 'rich') {
        config.cardType = 'embed';
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Card Render Mode Set to**: \`Rich Embed Banner\`! Type \`.welcometest\` to preview.`);
      }
      return message.reply(`ℹ️ Usage: \`.welcome card <canvas / embed>\``);
    }

    // 4. EDIT BANNER IMAGE (.welcome image <url>)
    if (sub === 'image' || sub === 'banner' || sub === 'img') {
      const url = args[1];
      if (!url || !url.match(/^https?:\/\/.+/i)) {
        return message.reply(`ℹ️ Usage: \`.welcome image <https://direct-image-url.jpg>\``);
      }
      config.imageUrl = url;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Banner Image Updated**! Type \`.welcometest\` to preview.`);
    }

    // 5. EDIT DESCRIPTION BODY (.welcome description <text>)
    if (sub === 'description' || sub === 'desc' || sub === 'body') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.welcome description <your editable markdown text>\`\nPlaceholders: \`{user}\`, \`{username}\`, \`{server_name}\`, \`{membercount}\`, \`{gothic:Text}\`, \`{smallcaps:Text}\`, \`{script:Text}\``);
      }
      config.description = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Description Updated**:\n>>> ${parsePlaceholders(text, message.member)}`);
    }

    // 6. EDIT EMBED TITLE (.welcome title <text>)
    if (sub === 'title') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.welcome title <your title text>\``);
      }
      config.title = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Title Updated**: \`${parsePlaceholders(text, message.member)}\``);
    }

    // 7. EDIT EMBED COLOR (.welcome color <#hex>)
    if (sub === 'color' || sub === 'hex') {
      const hex = args[1];
      if (!hex || !hex.match(/^#?[0-9a-fA-F]{6}$/)) {
        return message.reply(`ℹ️ Usage: \`.welcome color #800020\` or \`#FFD1DC\` or \`#00FFFF\``);
      }
      config.color = hex.startsWith('#') ? hex : '#' + hex;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Embed Color Code Updated**: \`${config.color}\``);
    }

    // 8. EDIT FOOTER (.welcome footer <text>)
    if (sub === 'footer') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.welcome footer <your footer text>\``);
      }
      config.footer = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Footer Updated**: \`${parsePlaceholders(text, message.member)}\``);
    }

    // 9. EDIT HEADER OUTSIDE EMBED (.welcome header <text>)
    if (sub === 'header') {
      const text = args.slice(1).join(' ');
      config.headerText = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Outer Header Updated**: \`${parsePlaceholders(text, message.member)}\``);
    }

    // 10. SETUP / BIND CHANNEL (.welcome setup <#channel>)
    if (sub === 'setup' || sub === 'set' || sub === 'channel') {
      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;
      config.channelId = chan.id;
      config.enabled = true;

      welcomeConfigs.set(guild.id, config);

      const panelEmbed = buildWelcomeConfigPanel(config, guild, author, clientUser);
      return message.channel.send({ embeds: [panelEmbed] });
    }

    // 11. TEST & PREVIEW (.welcometest)
    if (sub === 'test' || sub === 'preview') {
      const card = await buildWelcomeCard(config, message.member);
      return message.channel.send(card);
    }

    // 12. RESET (.welcomereset)
    if (sub === 'reset') {
      welcomeConfigs.delete(guild.id);
      return message.reply(`${emojis.SUCCESS} **Welcome Configuration Reset** to default Gothic theme.`);
    }

    // Default Dashboard
    const panelEmbed = buildWelcomeConfigPanel(config, guild, author, clientUser);
    return message.channel.send({ embeds: [panelEmbed] });
  }
};
