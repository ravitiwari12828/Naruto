const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { createDynamicBox } = require('../utils/boxBuilder');

// Global Stores
const welcomeConfigs = new Map();

const WELCOME_PRESETS = {
  gothic: {
    name: 'Gothic Dark Sanctuary',
    style: 'gothic',
    color: '#800020',
    title: '{gothic:Welcome to the Castle}',
    description: '🖤 Greetings {user}! You have entered {gothic:{server_name}}.\n\n🕯️ Member Count: #{membercount}\n⚜️ Please read rules and enjoy your stay!',
    font: 'gothic',
    banner: 'https://cdn.discordapp.com/attachments/1111111111111111111/1234567890/gothic_banner.gif'
  },
  aesthetic: {
    name: 'Soft Aesthetic Pink',
    style: 'aesthetic',
    color: '#FFD1DC',
    title: '{script:Welcome to {server_name}}',
    description: '🌸 Welcome {user} ♡\n\n✨ We are so happy to have you here!\n🍰 Total Sweethearts: #{membercount}',
    font: 'script',
    banner: 'https://cdn.discordapp.com/attachments/1111111111111111111/1234567890/aesthetic_banner.gif'
  },
  galaxy: {
    name: 'Cosmic Galaxy Horizon',
    style: 'galaxy',
    color: '#00FFFF',
    title: '✨ {smallcaps:WELCOME TO THE COSMOS}',
    description: '🌌 Welcome space traveler {user}!\n\n🛸 Starship: {server_name}\n🪐 Crew Members: #{membercount}',
    font: 'smallcaps',
    banner: 'https://cdn.discordapp.com/attachments/1111111111111111111/1234567890/galaxy_banner.gif'
  },
  cafe: {
    name: 'Cozy Boba Cafe',
    style: 'cafe',
    color: '#D2B48C',
    title: '☕ {script:Cozy Boba Cafe}',
    description: '🧸 Warm welcome {user}!\n\n🧋 Take a seat in {server_name}\n🍩 Total Customers: #{membercount}',
    font: 'script',
    banner: 'https://cdn.discordapp.com/attachments/1111111111111111111/1234567890/cafe_banner.gif'
  },
  shinobi: {
    name: 'Naruto Hidden Leaf Village',
    style: 'shinobi',
    color: '#FF7A00',
    title: '🍥 {gothic:Welcome Shinobi}',
    description: '🍃 Believe it! Welcome {user} to {gothic:{server_name}}!\n\n⚔️ Village Ninja Count: #{membercount}',
    font: 'gothic',
    banner: 'https://cdn.discordapp.com/attachments/1111111111111111111/1234567890/shinobi_banner.gif'
  },
  cyberpunk: {
    name: 'Cyberpunk Neon Matrix',
    style: 'cyberpunk',
    color: '#00FFBB',
    title: '⚡ {smallcaps:CYBERNETIC ACCESS GRANTED}',
    description: '👾 User connected: {user}\n\n🌐 Net Grid: {server_name}\n💾 Node Connections: #{membercount}',
    font: 'smallcaps',
    banner: 'https://cdn.discordapp.com/attachments/1111111111111111111/1234567890/cyberpunk_banner.gif'
  },
  minimal: {
    name: 'Clean Minimalist Monochrome',
    style: 'minimal',
    color: '#FFFFFF',
    title: 'Welcome',
    description: 'Welcome {user} to {server_name}.\n\nMember count: #{membercount}',
    font: 'plain',
    banner: null
  }
};

const PRESET_BANNERS = {
  gothic: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
  aesthetic: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop',
  galaxy: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1000&auto=format&fit=crop',
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000&auto=format&fit=crop',
  shinobi: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1000&auto=format&fit=crop',
  cyberpunk: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
  minimal: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop'
};

const FANCY_FONTS = {
  gothic: (str) => str.replace(/[a-zA-Z]/g, c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D504 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D51E + code - 97);
    return c;
  }),
  smallcaps: (str) => {
    const scMap = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
    return str.toLowerCase().split('').map(c => scMap[c] || c).join('');
  },
  script: (str) => str.replace(/[a-zA-Z]/g, c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D4D0 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D4EA + code - 97);
    return c;
  })
};

function getOrCreateWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: false,
      channelId: null,
      boostChannelId: null,
      boostEnabled: true,
      joinDmEnabled: true,
      leaveDmEnabled: true,
      cardType: 'embed', // 'embed' or 'canvas'
      style: 'gothic',
      color: '#800020',
      title: '{gothic:Welcome to the Castle}',
      description: '🖤 Greetings {user}! You have entered {gothic:{server_name}}.\n\n🕯️ Member Count: #{membercount}\n⚜️ Please read rules and enjoy your stay!',
      footer: 'Welcome to our Server',
      headerText: '🛡️ MEMBER COUNT: #{membercount}',
      imageUrl: PRESET_BANNERS.gothic,
      joinDmText: '🌸 Welcome to **{server_name}**, {user}! Enjoy your stay!',
      leaveDmText: '📤 Goodbye {user}, we hope to see you back in **{server_name}** soon!',
      boostText: '🚀 **{user}** boosted **{server_name}**!'
    });
  }
  return welcomeConfigs.get(guildId);
}

function parsePlaceholders(str, member) {
  if (!str) return '';
  const user = member?.user || member;
  const guild = member?.guild || { name: 'Server', memberCount: 1 };

  let out = str
    .replace(/{user}/g, `<@${user.id || '0'}>`)
    .replace(/{username}/g, user.username || 'User')
    .replace(/{server_name}/g, guild.name || 'Server')
    .replace(/{membercount}/g, (guild.memberCount || 1).toString());

  // Parse inline font tags
  out = out.replace(/{gothic:(.*?)}/gi, (_, txt) => FANCY_FONTS.gothic(txt));
  out = out.replace(/{smallcaps:(.*?)}/gi, (_, txt) => FANCY_FONTS.smallcaps(txt));
  out = out.replace(/{script:(.*?)}/gi, (_, txt) => FANCY_FONTS.script(txt));

  return out;
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

async function generateCanvasWelcomeCard(config, member) {
  try {
    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    const canvas = createCanvas(1024, 450);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = config.color || '#111214';
    ctx.fillRect(0, 0, 1024, 450);

    // Banner image if configured
    const bgUrl = config.imageUrl || PRESET_BANNERS[config.style] || PRESET_BANNERS.gothic;
    if (bgUrl) {
      try {
        const bgImg = await loadImage(bgUrl);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(bgImg, 0, 0, 1024, 450);
        ctx.globalAlpha = 1.0;
      } catch (e) {}
    }

    // Avatar Circle
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(512, 160, 90, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, 422, 70, 180, 180);
      ctx.restore();

      // Avatar Border
      ctx.beginPath();
      ctx.arc(512, 160, 92, 0, Math.PI * 2, true);
      ctx.lineWidth = 6;
      ctx.strokeStyle = config.color || '#00FFBB';
      ctx.stroke();
    } catch (e) {}

    // Text Overlay
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`WELCOME ${member.user.username.toUpperCase()}`, 512, 320);

    ctx.fillStyle = '#00FFBB';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`MEMBER #${member.guild?.memberCount || 1}`, 512, 370);

    return canvas.toBuffer('image/png');
  } catch (err) {
    return null;
  }
}

async function buildWelcomeCard(config, member) {
  const user = member.user;
  const guild = member.guild;

  const headerText = parsePlaceholders(config.headerText, member);
  const title = parsePlaceholders(config.title, member);
  const description = parsePlaceholders(config.description, member);
  const footer = parsePlaceholders(config.footer, member);
  const bannerImage = config.imageUrl || PRESET_BANNERS[config.style] || null;

  // Try Canvas Render Mode if set
  if (config.cardType === 'canvas') {
    const buffer = await generateCanvasWelcomeCard(config, member);
    if (buffer) {
      const { AttachmentBuilder } = require('discord.js');
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome-card.png' });
      return { content: headerText || undefined, files: [attachment] };
    }
  }

  // Fallback to Rich Embed Banner
  const hexColor = (config.color && config.color.match(/^#?[0-9a-fA-F]{6}$/)) ? parseInt(config.color.replace('#', ''), 16) : 0x800020;

  const embed = new EmbedBuilder()
    .setColor(hexColor)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle(title || `Welcome to ${guild.name}`)
    .setDescription(description)
    .setFooter({
      text: `${footer} • ${new Date().toLocaleDateString()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    });

  if (config.useAvatarThumbnail !== false) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));
  }

  if (bannerImage) {
    embed.setImage(bannerImage);
  }

  return { content: headerText || undefined, embeds: [embed] };
}

function buildWelcomeConfigPanel(config, guild, author, clientUser) {
  const chanMention = config.channelId ? `<#${config.channelId}>` : 'Not Set';
  const boostChanMention = config.boostChannelId ? `<#${config.boostChannelId}>` : 'Not Set';

  const statusBox = createDynamicBox('SYSTEM STATUS', [
    `status   : ${config.enabled ? 'ACTIVE' : 'DISABLED'}`,
    `channel  : ${config.channelId ? '#' + (guild?.channels?.cache?.get(config.channelId)?.name || 'channel') : 'Not Set'}`,
    `render   : ${config.cardType === 'canvas' ? 'Graphic Canvas' : 'Rich Embed'}`,
    `preset   : ${(config.style || 'gothic').toUpperCase()}`,
    `color    : ${config.color || '#800020'}`,
    `joindm   : ${config.joinDmEnabled ? 'Enabled' : 'Disabled'}`,
    `leavedm  : ${config.leaveDmEnabled ? 'Enabled' : 'Disabled'}`,
    `boost    : ${config.boostEnabled !== false ? 'Enabled' : 'Disabled'}`
  ]);

  const cmdBox = createDynamicBox('CONFIG COMMANDS', [
    'welcome setup <#chan> : Bind welcome',
    'welcome preset <theme>: Apply theme',
    'welcome card <mode>   : Toggle mode',
    'welcome description   : Edit text',
    'welcometest           : Preview card',
    'boostmsg <#chan>      : Boost config',
    'joindm <on/off/text>  : Join DM config',
    'leavedm <on/off/text> : Leave DM config'
  ]);

  const gearEmoji = emojis.GEAR || '<a:an_bot:1530948362784870510>';
  const configEmoji = emojis.AUTORESPOND || '<a:autoresponder:1530942573705822409>';
  const boostEmoji = emojis.BOOST || '<a:BOOST:1532470412217159790>';

  const description =
    `Welcome **${author.username}**! Below is your server **Welcome System Hub & Greetings Config**.\n\n` +
    `${gearEmoji} **System Status & Settings**\n` +
    '```\n' + statusBox + '\n```\n\n' +
    `${configEmoji} **Configuration & Font Commands**\n` +
    '```\n' + cmdBox + '\n```\n\n' +
    `${boostEmoji} **Server Boost Announcement:** Bound to ${boostChanMention} (Use \`.boostmsg test\` to preview)\n\n` +
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
  buildWelcomeConfigPanel,
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

    // BOOSTMSG COMMAND (.boostmsg <#channel> [custom text] / .boostmsg enable/disable / .boostmsg test)
    if (sub === 'boostmsg') {
      const firstArg = args[1]?.toLowerCase();

      if (firstArg === 'enable' || firstArg === 'on') {
        config.boostEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Server Boost Announcements Enabled**!`);
      }

      if (firstArg === 'disable' || firstArg === 'off') {
        config.boostEnabled = false;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.DISABLED} **Server Boost Announcements Disabled**.`);
      }

      if (firstArg === 'test' || firstArg === 'preview') {
        const boostEmbed = buildBoosterEmbed(message.member);
        return message.channel.send({ content: `<@${author.id}>`, embeds: [boostEmbed] });
      }

      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
      if (chan) {
        config.boostChannelId = chan.id;
        config.boostEnabled = true;
        const customTxt = args.slice(2).join(' ');
        if (customTxt) config.boostText = customTxt;

        welcomeConfigs.set(guild.id, config);

        const boostEmbed = buildBoosterEmbed(message.member);
        await chan.send({ content: `${emojis.SUCCESS} **Boost Announcements Bound to <#${chan.id}>**! Preview below:`, embeds: [boostEmbed] }).catch(() => {});
        return message.reply(`${emojis.SUCCESS} Server Boost announcements bound to <#${chan.id}>!`);
      }

      const currentChan = config.boostChannelId ? `<#${config.boostChannelId}>` : 'Not set';
      return message.reply(
        `${emojis.BOOST || '🚀'} **Server Boost Announcement Manager**\n` +
        `• **Status:** ${config.boostEnabled !== false ? `${emojis.SUCCESS} Active` : `${emojis.DISABLED} Disabled`}\n` +
        `• **Boost Channel:** ${currentChan}\n\n` +
        `**Usage:**\n` +
        `• \`.boostmsg <#channel>\` — Bind boost announcement channel\n` +
        `• \`.boostmsg test\` — Send live test booster embed with animated diamond gem!\n` +
        `• \`.boostmsg enable / disable\` — Toggle boost announcements`
      );
    }

    // JOINDM COMMAND (.joindm enable/disable/text)
    if (sub === 'joindm') {
      const firstArg = args[1]?.toLowerCase();
      if (firstArg === 'enable' || firstArg === 'on') {
        config.joinDmEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Join DM Notifications Enabled**!`);
      }
      if (firstArg === 'disable' || firstArg === 'off') {
        config.joinDmEnabled = false;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.DISABLED} **Join DM Notifications Disabled**.`);
      }
      const customTxt = args.slice(1).join(' ');
      if (customTxt) {
        config.joinDmText = customTxt;
        config.joinDmEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Join DM Message Saved**: \`${parsePlaceholders(customTxt, message.member)}\``);
      }
      return message.reply(`ℹ️ Usage: \`.joindm <enable/disable/text>\``);
    }

    // LEAVEDM COMMAND (.leavedm enable/disable/text)
    if (sub === 'leavedm') {
      const firstArg = args[1]?.toLowerCase();
      if (firstArg === 'enable' || firstArg === 'on') {
        config.leaveDmEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Leave DM Notifications Enabled**!`);
      }
      if (firstArg === 'disable' || firstArg === 'off') {
        config.leaveDmEnabled = false;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.DISABLED} **Leave DM Notifications Disabled**.`);
      }
      const customTxt = args.slice(1).join(' ');
      if (customTxt) {
        config.leaveDmText = customTxt;
        config.leaveDmEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Leave DM Message Saved**: \`${parsePlaceholders(customTxt, message.member)}\``);
      }
      return message.reply(`ℹ️ Usage: \`.leavedm <enable/disable/text>\``);
    }

    // 1. PRESET SELECTOR (.welcome preset <theme>)
    if (sub === 'preset') {
      const theme = args[1]?.toLowerCase();
      if (theme && WELCOME_PRESETS[theme]) {
        const p = WELCOME_PRESETS[theme];
        config.style = p.style;
        config.color = p.color;
        config.title = p.title;
        config.description = p.description;
        config.imageUrl = p.banner || PRESET_BANNERS[p.style] || null;

        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Applied Welcome Theme Preset**: \`${p.name}\`! Type \`.welcometest\` to preview.`);
      }

      const presetBox = createDynamicBox('WELCOME PRESETS', [
        'gothic   : Dark Sanctuary',
        'aesthetic: Soft Pink Pastel',
        'galaxy   : Cosmic Starry',
        'cafe     : Cozy Boba Matcha',
        'shinobi  : Leaf Village',
        'cyberpunk: Neon Matrix',
        'minimal  : Clean Monochrome'
      ]);

      return message.reply(
        `🎨 **Available Welcome Theme Presets:**\n` +
        '```\n' + presetBox + '\n```\n' +
        `Usage: \`.welcome preset gothic\` or \`.welcome preset shinobi\``
      );
    }

    // 2. TOGGLE CARD MODE (.welcome card <canvas/embed>)
    if (sub === 'card' || sub === 'mode') {
      const mode = args[1]?.toLowerCase();
      if (mode === 'canvas' || mode === 'graphic') {
        config.cardType = 'canvas';
        welcomeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} **Card Render Mode Set to**: \`Graphic Canvas Card\`! Type \`.welcometest\` to preview.`);
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
