const { EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Welcome, DM & Boost Config store
const welcomeConfigs = new Map();

// Mimu-Style Editable Presets Directory
const WELCOME_PRESETS = {
  aesthetic: {
    title: '🌸 Welcome to {server_name}',
    headerText: '୨୧ ─── ∘°❉°∘ ─── ୨୧',
    description: 'Welcome {user} to **{server_name}**! 🌸\nWe are so happy to have you here!\n\n┈➤ **Quick Links:**\n• Check out our <#rules>\n• Pick your <#roles>\n• Chat with us in <#general>\n\nMember Count: **#{membercount}** 🎀\n୨୧ ─── ∘°❉°∘ ─── ୨୧',
    color: '#FFD1DC',
    useAvatarThumbnail: true,
    footer: 'Member #{membercount} • {server_name}'
  },
  galaxy: {
    title: '✨ Welcome to {server_name}',
    headerText: '🌙 ─── ✧ * :･ﾟ✧ ─── 🌙',
    description: 'Welcome {user} to **{server_name}**! ✨\nYou have crossed the starlight horizon.\n\n⭐ **Constellation Access:**\n✦ Protocols • <#rules>\n✦ Star Roles • <#roles>\n✦ Galaxy Lounge • <#lounge>\n\nStarlight Member: **#{membercount}** 🌌',
    color: '#4B0082',
    useAvatarThumbnail: true,
    footer: 'Starlight Member #{membercount} • {server_name}'
  },
  cafe: {
    title: '🧸 Welcome to {server_name}',
    headerText: '🍵 ─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ─── 🍵',
    description: 'Welcome {user} to **{server_name}**! 🧸\nGrab a warm cup of boba and take a seat!\n\n🥞 **Menu & Links:**\n• Cafe Rules: <#rules>\n• Special Roles: <#roles>\n• Chat Table: <#chat>\n\nCustomer **#{membercount}** 🍰',
    color: '#A8C3A0',
    useAvatarThumbnail: true,
    footer: 'Customer #{membercount} • {server_name}'
  },
  gothic: {
    title: '🖤 Welcome to {server_name}',
    headerText: '🖤 ─── 𖤍 ─── 🖤',
    description: 'Welcome {user} to **{server_name}**.\nYou have entered the dark sanctuary.\n\n🦇 **Crypt Rules:**\n> Read the law in <#rules>\n> Select your coven in <#roles>\n\nSoul **#{membercount}** 🥀',
    color: '#800020',
    useAvatarThumbnail: true,
    footer: 'Soul #{membercount} • {server_name}'
  },
  shinobi: {
    title: '🍥 Welcome to Konoha Village',
    headerText: '🍥 **WELCOME TO THE HIDDEN LEAF VILLAGE** 🍥',
    description: 'Greetings {user}! You have arrived in **{server_name}**.\n\n> *"A shinobi is one who endures."*\n\n🌀 **Shinobi Protocol:**\n1. Read the village rules in <#rules>\n2. Collect your Ninja Roles in <#roles>\n3. Join the Ninja Lounge in <#lounge>\n\nYou are Shinobi **#{membercount}** of Konoha! 🍃',
    color: '#7E0808',
    useAvatarThumbnail: true,
    footer: 'Shinobi #{membercount} • {server_name}'
  },
  cyberpunk: {
    title: '⚡ Welcome to the Matrix',
    headerText: '⚡ **SYSTEM INTRUSION DETECTED** ⚡',
    description: 'Welcome {user} to the **{server_name}** Matrix!\n\n🌐 **Access Terminals:**\n[01] <#rules> • Protocol Directives\n[02] <#roles> • Cyber Identity Setup\n[03] <#chat> • Main Network Stream\n\nNetwork Node: **#{membercount}** 💾',
    color: '#00FFFF',
    useAvatarThumbnail: true,
    footer: 'Node #{membercount} • {server_name}'
  },
  minimal: {
    title: 'Welcome',
    headerText: '',
    description: 'Welcome **{username}** to {server_name}.\n\n> Read the guidelines in <#rules> and feel free to introduce yourself in <#chat>.\n\nMember **#{membercount}**',
    color: '#2B2D31',
    useAvatarThumbnail: true,
    footer: 'Member #{membercount}'
  }
};

function getOrCreateWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: true,
      channelId: null,
      style: 'shinobi',
      useEmbed: true,
      headerText: WELCOME_PRESETS.shinobi.headerText,
      title: WELCOME_PRESETS.shinobi.title,
      description: WELCOME_PRESETS.shinobi.description,
      color: WELCOME_PRESETS.shinobi.color,
      footer: WELCOME_PRESETS.shinobi.footer,
      imageUrl: null,
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

  return text
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{username}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{server_name}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());
}

function buildWelcomeCard(config, member) {
  const guild = member.guild;
  const user = member.user;

  const headerText = parsePlaceholders(config.headerText, member);
  const description = parsePlaceholders(config.description, member);
  const title = parsePlaceholders(config.title, member);
  const footer = parsePlaceholders(config.footer, member);

  if (!config.useEmbed) {
    return { content: `${headerText}\n\n${description}` };
  }

  const embedColor = parseInt(config.color?.replace('#', '') || '7E0808', 16);

  const embed = new EmbedBuilder()
    .setColor(isNaN(embedColor) ? 0x7E0808 : embedColor)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle(title || `Welcome to ${guild.name}`)
    .setDescription(description)
    .setFooter({
      text: `${footer} • ${new Date().toLocaleDateString()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    });

  if (config.imageUrl) {
    embed.setImage(config.imageUrl);
  } else if (config.useAvatarThumbnail) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));
  }

  return { content: headerText || undefined, embeds: [embed] };
}

function buildWelcomeConfigPanel(config, guild, author, clientUser) {
  const chanName = config.channelId ? `#${guild.channels.cache.get(config.channelId)?.name || config.channelId}` : 'Not set';
  const imgStr = config.imageUrl ? 'Custom URL' : (config.useAvatarThumbnail ? 'Avatar' : 'None');

  const boxMain = [
    '╭──────────────────────────╮',
    '│   WELCOME SYSTEM HUB     │',
    '├──────────────────────────┤',
    '│ Status     : ' + (config.enabled ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '│ Channel    : ' + chanName.slice(0, 12).padEnd(12, ' '),
    '│ Preset     : ' + (config.style || 'custom').slice(0, 12).padEnd(12, ' '),
    '│ Color Code : ' + (config.color || '#7E0808').slice(0, 12).padEnd(12, ' '),
    '│ Card Image : ' + imgStr.slice(0, 12).padEnd(12, ' '),
    '│ Join DM    : ' + (config.joinDmEnabled ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '│ Leave DM   : ' + (config.leaveDmEnabled ? 'ENABLED [OK]' : 'DISABLED[X]'),
    '╰──────────────────────────╯'
  ];

  const description =
    `Welcome **${author.username}**! Below is your server **Welcome & Greetings Configuration**.\n\n` +
    '```\n' + boxMain.join('\n') + '\n```\n\n' +
    `**📝 Editable Markdown Commands**\n` +
    `• \`.welcome preset <aesthetic/galaxy/cafe/gothic/shinobi/cyberpunk/minimal>\`\n` +
    `• \`.welcome description <editable markdown text>\`\n` +
    `• \`.welcome title <editable title>\`\n` +
    `• \`.welcome color <#hexCode>\`\n` +
    `• \`.welcome footer <editable footer>\`\n` +
    `• \`.welcome header <header text outside embed>\`\n\n` +
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
  description: 'Customizable Mimu-Style Welcome Embeds, Presets, Join DMs & Boost Messages',
  aliases: [
    'welcomesetup', 'welcomereset', 'welcometest', 'welcomepreview',
    'joindm', 'leavedm', 'boostmsg', 'welcomeconfig', 'welcomepreset'
  ],
  welcomeConfigs,
  WELCOME_PRESETS,
  getOrCreateWelcomeConfig,
  buildWelcomeCard,
  parsePlaceholders,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'welcomesetup') sub = 'setup';
    if (invoked === 'welcomereset') sub = 'reset';
    if (invoked === 'welcometest' || invoked === 'welcomepreview') sub = 'test';
    if (invoked === 'welcomepreset') sub = 'preset';
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
          `• \`aesthetic\` - Soft Pink & Pastel Theme 🌸\n` +
          `• \`galaxy\` - Cosmic Starry Horizon Theme ✨\n` +
          `• \`cafe\` - Cozy Boba & Matcha Theme 🧸\n` +
          `• \`gothic\` - Dark Sanctuary Theme 🖤\n` +
          `• \`shinobi\` - Naruto Leaf Village Theme 🍥\n` +
          `• \`cyberpunk\` - Neon Matrix Theme ⚡\n` +
          `• \`minimal\` - Clean Monochrome Theme 🌿\n\n` +
          `Usage: \`.welcome preset aesthetic\``
        );
      }

      const preset = WELCOME_PRESETS[theme];
      config.style = theme;
      config.title = preset.title;
      config.headerText = preset.headerText;
      config.description = preset.description;
      config.color = preset.color;
      config.footer = preset.footer;
      welcomeConfigs.set(guild.id, config);

      return message.reply(`${emojis.SUCCESS} **Applied Welcome Preset**: \`${theme.toUpperCase()}\`!\nType \`.welcometest\` to preview the card in action!`);
    }

    // 2. EDIT DESCRIPTION BODY (.welcome description <text>)
    if (sub === 'description' || sub === 'desc' || sub === 'body') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.welcome description <your editable markdown text>\`\nPlaceholders: \`{user}\`, \`{username}\`, \`{server_name}\`, \`{membercount}\``);
      }
      config.description = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Description Updated**:\n>>> ${parsePlaceholders(text, message.member)}`);
    }

    // 3. EDIT EMBED TITLE (.welcome title <text>)
    if (sub === 'title') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.welcome title <your title text>\``);
      }
      config.title = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Title Updated**: \`${parsePlaceholders(text, message.member)}\``);
    }

    // 4. EDIT EMBED COLOR (.welcome color <#hex>)
    if (sub === 'color' || sub === 'hex') {
      const hex = args[1];
      if (!hex || !hex.match(/^#?[0-9a-fA-F]{6}$/)) {
        return message.reply(`ℹ️ Usage: \`.welcome color #FFD1DC\` or \`#7E0808\` or \`#00FFFF\``);
      }
      config.color = hex.startsWith('#') ? hex : '#' + hex;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Embed Color Code Updated**: \`${config.color}\``);
    }

    // 5. EDIT FOOTER (.welcome footer <text>)
    if (sub === 'footer') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.welcome footer <your footer text>\``);
      }
      config.footer = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Footer Updated**: \`${parsePlaceholders(text, message.member)}\``);
    }

    // 6. EDIT HEADER OUTSIDE EMBED (.welcome header <text>)
    if (sub === 'header') {
      const text = args.slice(1).join(' ');
      config.headerText = text;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} **Welcome Outer Header Updated**: \`${parsePlaceholders(text, message.member)}\``);
    }

    // 7. SETUP / BIND CHANNEL (.welcome setup <#channel>)
    if (sub === 'setup' || sub === 'set' || sub === 'channel') {
      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;
      config.channelId = chan.id;
      config.enabled = true;

      welcomeConfigs.set(guild.id, config);

      const panelEmbed = buildWelcomeConfigPanel(config, guild, author, clientUser);
      return message.channel.send({ embeds: [panelEmbed] });
    }

    // 8. TEST & PREVIEW (.welcometest)
    if (sub === 'test' || sub === 'preview') {
      const card = buildWelcomeCard(config, message.member);
      return message.channel.send(card);
    }

    // 9. RESET (.welcomereset)
    if (sub === 'reset') {
      welcomeConfigs.delete(guild.id);
      return message.reply(`${emojis.SUCCESS} **Welcome Configuration Reset** to default Shinobi theme.`);
    }

    // Default Dashboard
    const panelEmbed = buildWelcomeConfigPanel(config, guild, author, clientUser);
    return message.channel.send({ embeds: [panelEmbed] });
  }
};
