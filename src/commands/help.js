const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// ─────────────────────────────────────────
// Category definitions — label, value, emoji, description, commands list
// ─────────────────────────────────────────
const CATEGORIES = [
  {
    label: 'Tickets',
    value: 'ticket',
    description: 'Support ticket system: setup, category, claim, close, transcript',
    emojiObj: emojis.OBJ_TICKETS,
    heading: `${emojis.TICKETS} Support Ticket Commands`,
    commands: [
      'ticket setup', 'category_add', 'category_edit',
      'category_remove', 'category_toggle', 'category_list',
      'panel_deploy', 'claim', 'close',
      'reopen', 'add_member', 'remove_member',
      'info', 'transcript', 'ticket setup (Wizard)'
    ]
  },
  {
    label: 'Voice',
    value: 'voice',
    description: 'Voice admin: vcdeafen, vckick, vclist, vcmoveall, vcmute, vcpull',
    emojiObj: emojis.OBJ_VOICE,
    heading: `${emojis.VOICE} Voice Commands`,
    commands: [
      'vcdeafen', 'vckick', 'vckickall', 'vclist',
      'vcmoveall', 'vcmute', 'vcmuteall', 'vcpull',
      'vcpullall', 'vcundeafen', 'vcunmute', 'vcunmuteall'
    ]
  },
  {
    label: 'Premium',
    value: 'premium',
    description: 'botcustomize, premiumguild, temp voice setup & status',
    emojiObj: emojis.OBJ_PREMIUM,
    heading: `${emojis.PREMIUM} Premium Commands`,
    commands: [
      'botcustomize', 'premiumguild', 'vctemp setup',
      'vctemp disable', 'vctemp status'
    ]
  },
  {
    label: 'Levels',
    value: 'level',
    description: 'level rank, leaderboard, setup, disable, status, refresh',
    emojiObj: emojis.OBJ_LEVEL,
    heading: `${emojis.LEVEL} Level Commands`,
    commands: [
      'level rank', 'level leaderboard', 'level setup',
      'level disable', 'level status', '/level rank',
      '/level leaderboard', '/level setup', '/level disable',
      '/level status', '/leaderboard setup', '/leaderboard refresh'
    ]
  },
  {
    label: 'Music',
    value: 'music',
    description: 'Lavalink music player: play, pause, queue, search, filter, lyrics',
    emojiObj: emojis.OBJ_MUSIC,
    heading: `${emojis.MUSIC} Music Commands`,
    commands: [
      'autoplay', 'clear', 'filter', 'forceskip', 'grab',
      'join', 'leave', 'loop', 'lyrics', 'nowplaying',
      'pause', 'play', 'queue', 'remove', 'resume',
      'search', 'seek', 'shuffle', 'skip', 'skipto',
      'stop', 'volume'
    ]
  },
  {
    label: 'Fun',
    value: 'fun',
    description: 'Naruto-themed fun: truth, dare, vibecheck, rizzmeter & more',
    emojiObj: emojis.OBJ_FUN,
    heading: `${emojis.FUN} Fun Commands`,
    commands: [
      '8ball', 'truth', 'dare', 'wyr',
      'pickup', 'fortune', 'vibecheck', 'mood',
      'smartrate', 'rizzmeter', 'shipname',
      'poke', 'bonk', 'cuddle',
      'highfive', 'wave',
      'wanted', 'wasted',
      'powerlevel', 'coolrate'
    ]
  },
  {
    label: 'Giveaway',
    value: 'giveaway',
    description: 'Host and manage server giveaways',
    emojiObj: emojis.OBJ_GIVEAWAY,
    heading: `${emojis.GIVEAWAY} Giveaway Commands`,
    commands: [
      'giveaway create',
      'giveaway end',
      'giveaway reroll',
      'giveaway list'
    ]
  },
  {
    label: 'Utility',
    value: 'info',
    description: 'activity, afk, advlogsetup, logsetup, serverbanner, snipe',
    emojiObj: emojis.OBJ_INFO,
    heading: `${emojis.STATS_NEW} Utility Commands`,
    commands: [
      'activity', 'afk', 'avatar', 'advlogsetup',
      'logsetup', 'roleinfo', 'serverbanner',
      'servericon', 'serverinfo', 'snipe', 'userinfo'
    ]
  },
  {
    label: 'Moderation',
    value: 'mod',
    description: 'Ban, kick, mute, purge, nuke, roles & more',
    emojiObj: emojis.OBJ_MOD,
    heading: `${emojis.MOD} Moderation Commands`,
    commands: [
      'ban', 'hackban',
      'kick',
      'mute', 'unmute',
      'unban', 'unbanall',
      'purge', 'purgebots',
      'nuke', 'role',
      'rolemenu', 'list', 'warn'
    ]
  },
  {
    label: 'Naruto RPG',
    value: 'ninja',
    description: 'Jutsu, Chakra, Quests, Leaderboards & Shinobi Profile',
    emojiObj: { name: '🍥' },
    heading: '🍥 Naruto RPG Commands',
    commands: [
      'ninja profile',
      'ninja jutsu',
      'ninja chakra',
      'ninja quest',
      'ninja lb level',
      'ninja lb ryo',
      'ninja lb xp'
    ]
  },
  {
    label: 'Activity & Stats',
    value: 'activity',
    description: 'Track chat, voice, level XP & invites',
    emojiObj: emojis.OBJ_ZAP || { name: '⚡' },
    heading: `${emojis.ZAP} Activity & Stats`,
    commands: [
      'activity server', 'activity chat',
      'activity voice', 'activity invites'
    ]
  },
  {
    label: 'Channel Moderation',
    value: 'channel',
    description: 'Lock, unlock, hide and mass lockdown channels',
    emojiObj: emojis.OBJ_TOOLS || { name: '🔧' },
    heading: `${emojis.TOOLS} Channel Moderation`,
    commands: [
      'lock', 'unlock',
      'hide', 'unhide',
      'lockall', 'unlockall',
      'hideall', 'unhideall'
    ]
  },
  {
    label: 'Automations & Autorole',
    value: 'autorole',
    description: 'Auto-role rules & massrole assignment',
    emojiObj: emojis.OBJ_GEAR || { name: '⚙️' },
    heading: `${emojis.GEAR} Automations & Autorole`,
    commands: [
      'autorole config', 'massrole add',
      'massrole remove', 'automation'
    ]
  },
  {
    label: 'Autoresponder & React',
    value: 'autoresponder',
    description: 'Custom trigger replies & auto-reactions',
    emojiObj: emojis.OBJ_AUTORESPOND || { name: '💬' },
    heading: `${emojis.AUTORESPOND} Autoresponder & React`,
    commands: [
      'autoresponder config',
      'ar add',
      'ar remove',
      'autoreact config'
    ]
  },
  {
    label: 'AutoMod & AntiBot',
    value: 'automod',
    description: 'Security filters & bot join whitelist',
    emojiObj: emojis.OBJ_SHIELD || { name: '🛡️' },
    heading: `${emojis.SHIELD} AutoMod & AntiBot`,
    commands: [
      'automod config', 'antibot config',
      'moderation', 'filter'
    ]
  },
  {
    label: 'Priority AI',
    value: 'priority',
    description: 'AI text answers & coding assistant',
    emojiObj: emojis.OBJ_PRIORITY || { name: '🤖' },
    heading: `${emojis.PRIORITY} Priority AI Assistant`,
    commands: [
      'priority',
      'ai',
      'ask',
      'code'
    ]
  },
  {
    label: 'Reaction Roles',
    value: 'reactionrole',
    description: 'Reaction role binding: add, remove, list, reset',
    emojiObj: emojis.OBJ_REACTIONROLES,
    heading: `${emojis.REACTIONROLES} Reaction Role Commands`,
    commands: [
      'reactionrole add',
      'reactionrole remove',
      'reactionrole list',
      'reactionrole reset'
    ]
  },
  {
    label: 'Sticky Notes',
    value: 'stickynote',
    description: 'Auto-reposting sticky notes in channels',
    emojiObj: emojis.OBJ_STICKY,
    heading: `${emojis.STICKY} Sticky Commands`,
    commands: [
      'stickynote set',
      'stickynote remove',
      'stickynote list'
    ]
  },
  {
    label: 'Profile & Avatars',
    value: 'profile',
    description: 'Custom bio, anime PFPs, banners & matching couples',
    emojiObj: emojis.OBJ_PROFILE,
    heading: `${emojis.PROFILE} Profile Commands`,
    commands: [
      'animes', 'banners', 'bioreset',
      'bioset', 'bioshow', 'boys',
      'couples', 'girls'
    ]
  },
  {
    label: 'Special Roles',
    value: 'roles',
    description: 'Friend, girl, guest, official, vip, invcrole & autonick',
    emojiObj: emojis.OBJ_ROLES,
    heading: `${emojis.ROLES} Role Commands`,
    commands: [
      'autonick', 'friend', 'girl',
      'guest', 'invcrole', 'official',
      'rolesetup', 'vip'
    ]
  },
  {
    label: 'Welcome',
    value: 'welcome',
    description: 'welcome, welcomechannel, welcomemessage, welcomereset, welcometest',
    emojiObj: emojis.OBJ_WELCOME,
    heading: `${emojis.WELCOME} Welcome Commands`,
    commands: [
      '/welcome', 'welcome', 'welcomechannel',
      'welcomemessage', 'welcomereset', 'welcometest'
    ]
  },
  {
    label: 'Voicemaster',
    value: 'voicemaster',
    description: 'vctemp setup, vctemp disable, vctemp status, tempvc',
    emojiObj: emojis.OBJ_VOICE,
    heading: `${emojis.VOICE} Voicemaster Commands`,
    commands: [
      'vctemp setup', 'vctemp disable',
      'vctemp status', 'tempvc'
    ]
  },
  {
    label: 'AntiNuke',
    value: 'antinuke',
    description: 'AntiNuke, PanicMode, 15-Day Quarantine Probation & 21 Security Filters',
    emojiObj: emojis.OBJ_ANTINUKE,
    heading: `${emojis.ANTINUKE} Antinuke`,
    isAntinukeSuite: true,
    commands: [
      '.securesetup', '.quarantine (15-Day Guard)',
      '.antinuke', '.antinuke enable', '.antinuke disable',
      '.whitelist', '.extraowner', '.bypassrole'
    ]
  }
];

function buildMainEmbed(message, botUser, botAvatar, devPortalBanner) {
  const totalCommands = message.client.commands && message.client.commands.size > 0 ? message.client.commands.size : 187;

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setAuthor({ name: '🍥 Naruto Help Panel', iconURL: botAvatar })
    .setThumbnail(botAvatar)
    .setDescription(
      `A feature-packed All-In-One Discord bot built with a **Naruto Shinobi** theme!\n\n` +
      `\`\`\`\n` +
      `Server Prefix  :  .\n` +
      `Total Commands :  ${totalCommands}+\n` +
      `Active Modules :  ${CATEGORIES.length}\n` +
      `\`\`\`\n\n` +
      `**📦 All Modules**\n` +
      CATEGORIES.map(cat => {
        let emojiStr = '✨';
        if (typeof cat.emojiObj === 'string') {
          emojiStr = cat.emojiObj;
        } else if (cat.emojiObj && cat.emojiObj.id) {
          emojiStr = `<:${cat.emojiObj.name}:${cat.emojiObj.id}>`;
        } else if (cat.emojiObj && cat.emojiObj.name) {
          emojiStr = cat.emojiObj.name;
        }
        return `${emojiStr} » **${cat.label}**`;
      }).join('\n') +
      `\n\n**Links**\n` +
      `[Invite Bot](https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands) | [Support Server](https://discord.gg/) | [Vote](https://top.gg/bot/${message.client.user.id})`
    )
    .setFooter({
      text: `Developed with ❤️ by Synn • Select a module below`,
      iconURL: botAvatar
    });

  if (devPortalBanner) embed.setImage(devPortalBanner);
  return embed;
}

function buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner) {
  const botAvatarURL = botAvatar || botUser.displayAvatarURL({ dynamic: true, size: 512 });

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setAuthor({ name: 'Naruto Help Menu', iconURL: botAvatarURL })
    .setThumbnail(botAvatarURL)
    .setFooter({
      text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    });

  if (cat.isAntinukeSuite) {
    embed.setTitle(`${emojis.ANTINUKE} Antinuke`);
    embed.setDescription(
      `**Antinuke**\n` +
      `\`\`\`\n.antinuke, .antinuke enable, .antinuke disable, .whitelist, .extraowner, .bypassrole\n\`\`\`\n\n` +
      `**Panicmode**\n` +
      `\`\`\`\n.panicmode, .panicmode enable, .panicmode disable, .panicmode reset, .panicmode set\n\`\`\`\n\n` +
      `**Filters**\n` +
      `${emojis.SUCCESS} \`Anti ban\`\n` +
      `${emojis.SUCCESS} \`Anti kick\`\n` +
      `${emojis.SUCCESS} \`Anti bot add\`\n` +
      `${emojis.SUCCESS} \`Anti channel create\`\n` +
      `${emojis.SUCCESS} \`Anti channel delete\`\n` +
      `${emojis.SUCCESS} \`Anti channel update\`\n` +
      `${emojis.SUCCESS} \`Anti role create\`\n` +
      `${emojis.SUCCESS} \`Anti role delete\`\n` +
      `${emojis.SUCCESS} \`Anti role update\`\n` +
      `${emojis.SUCCESS} \`Anti webhook create\`\n` +
      `${emojis.SUCCESS} \`Anti webhook delete\`\n` +
      `${emojis.SUCCESS} \`Anti webhook update\`\n` +
      `${emojis.SUCCESS} \`Anti sticker/emoji create\`\n` +
      `${emojis.SUCCESS} \`Anti sticker/emoji delete\`\n` +
      `${emojis.SUCCESS} \`Anti sticker/emoji update\`\n\n` +
      `**Special Filters**\n` +
      `${emojis.SUCCESS} \`Anti guild update\`\n` +
      `${emojis.SUCCESS} \`Anti unban\`\n` +
      `${emojis.SUCCESS} \`Anti spam\`\n` +
      `${emojis.SUCCESS} \`Anti content filter\`\n` +
      `${emojis.SUCCESS} \`Anti raid protection\`\n` +
      `${emojis.SUCCESS} \`Anti everyone/here\``
    );
  } else {
    const formattedPills = cat.commands.map(cmd => `\`${cmd}\``).join(', ');
    embed.setTitle(`${cat.heading}`);
    embed.setDescription(formattedPills);
  }

  if (devPortalBanner) embed.setImage(devPortalBanner);
  return embed;
}

module.exports = {
  name: 'help',
  description: 'Display Naruto Bot help panel with all command categories',
  aliases: ['h', 'menu', 'commands'],

  async execute(message, args) {
    const categoryQuery = args[0] ? args[0].toLowerCase() : null;

    let botUser = message.client.user;
    try {
      botUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (err) {}

    const botAvatar = botUser.displayAvatarURL({ dynamic: true, size: 512 });
    const devPortalBanner = botUser.bannerURL({ dynamic: true, size: 1024 })
      || message.client.botBannerURL
      || process.env.BANNER_URL;

    // Direct category argument e.g. .help mod
    if (categoryQuery) {
      const cat = CATEGORIES.find(c => c.value === categoryQuery || c.label.toLowerCase() === categoryQuery);
      if (!cat) {
        const validValues = CATEGORIES.map(c => `\`${c.value}\``).join(', ');
        return message.reply(`⚠️ Category \`${categoryQuery}\` not found! Available: ${validValues}`);
      }
      const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
      return message.channel.send({ embeds: [catEmbed] });
    }

    // ── Main Help Dashboard with Dropdown & Home Button ──
    const mainEmbed = buildMainEmbed(message, botUser, botAvatar, devPortalBanner);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('📖 Select a command category...')
      .addOptions(
        CATEGORIES.map(cat => ({
          label: cat.label,
          value: cat.value,
          description: cat.description ? (cat.description.length > 90 ? cat.description.slice(0, 87) + '...' : cat.description) : undefined,
          emoji: cat.emojiObj
        }))
      );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_home')
        .setLabel('🏠 Main Menu')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('help_securesetup')
        .setLabel('🛡️ Quick Security Setup')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setLabel('🔗 Invite Bot')
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands`)
        .setStyle(ButtonStyle.Link)
    );

    const helpMsg = await message.channel.send({ embeds: [mainEmbed], components: [selectRow, buttonRow] });

    // Component Collector
    const collector = helpMsg.createMessageComponentCollector({
      time: 180000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: '❌ Only the user who ran `.help` can use these controls.', ephemeral: true });
      }

      await interaction.deferUpdate();

      if (interaction.customId === 'help_home') {
        const homeEmbed = buildMainEmbed(message, botUser, botAvatar, devPortalBanner);
        return helpMsg.edit({ embeds: [homeEmbed], components: [selectRow, buttonRow] });
      }

      if (interaction.customId === 'help_securesetup') {
        const secureCmd = message.client.commands.get('securesetup');
        if (secureCmd) {
          return secureCmd.execute(message, []);
        }
      }

      if (interaction.customId === 'help_select') {
        const selectedValue = interaction.values[0];
        const cat = CATEGORIES.find(c => c.value === selectedValue);
        if (!cat) return;

        const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
        return helpMsg.edit({ embeds: [catEmbed], components: [selectRow, buttonRow] });
      }
    });

    collector.on('end', () => {
      selectMenu.setDisabled(true);
      const disabledSelectRow = new ActionRowBuilder().addComponents(selectMenu);
      helpMsg.edit({ components: [disabledSelectRow, buttonRow] }).catch(() => {});
    });
  }
};
