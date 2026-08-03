const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const emojis = require('./emojis');
const { createDynamicBox } = require('./boxBuilder');

// Distinct Vibrant Color Palette per Module Panel
const CATEGORY_COLORS = {
  analytics: 0x00F0FF,     // Neon Cyan / Electric Blue
  modmail: 0x57F287,       // Emerald Mint Green
  ticket: 0xFF0055,        // Vibrant Magenta / Crimson Pink
  voice: 0x5865F2,         // Discord Blurple
  music: 0x9B59B6,         // Violet Purple
  antinuke: 0xED4245,      // Security Red
  level: 0xF1C40F,         // Vivid Gold
  fun: 0xFF7A00,           // Sunburst Orange
  giveaway: 0xE91E63,      // Hot Pink
  info: 0x00B8D9,          // Deep Teal / Cyan
  mod: 0xE67E22,           // Amber Orange
  ninja: 0xFF3366,         // Shinobi Pink / Rose Red
  economy: 0x2ECC71,       // Casino Green
  channel: 0x3498DB,       // Sky Blue
  autorole: 0x1ABC9C,      // Turquoise
  autoresponder: 0xA569BD, // Lavender Purple
  automod: 0xC0392B,       // Dark Crimson
  priority: 0xF39C12,      // Electric Gold
  reactionrole: 0x8E44AD,  // Deep Royal Purple
  stickynote: 0x16A085,    // Dark Teal
  profile: 0x34495E,       // Executive Slate
  roles: 0xE84393,         // Bright Magenta
  welcome: 0xFF9F43,       // Bright Sunset Orange
  backup: 0x74B9FF        // Soft Ice Blue
};

// Shared Categories definition matching help.js exactly
const CATEGORIES = [
  {
    label: 'Analytics & Tracking',
    value: 'analytics',
    description: 'Track chat, voice timing, invites, joins/leaves, commands & tickets',
    customEmoji: emojis.ANALYTICS_ZAP,
    unicodeFallback: '📊',
    heading: `${emojis.ANALYTICS_ZAP || '📊'} Analytics Commands`,
    commands: [
      'analytics', 'userstats',
      'topmessages', 'topvoice', 'topinvites',
      'joinsleaves', 'topcommands', 'ticketstats'
    ]
  },
  {
    label: 'ModMail System',
    value: 'modmail',
    description: 'DM ModMail support threads, staff replies & HTML transcripts',
    customEmoji: emojis.OBJ_MODMAIL,
    unicodeFallback: '📬',
    heading: `${emojis.MODMAIL_ENVELOPE || '📬'} ModMail Commands`,
    commands: [
      'modmail setup',
      'r <message>',
      'close [reason]',
      'modmail',
      'modmailtranscript'
    ]
  },
  {
    label: 'Tickets',
    value: 'ticket',
    description: 'Support ticket system: setup, claim, close, transcript',
    customEmoji: emojis.OBJ_TICKETS,
    unicodeFallback: '🎟️',
    heading: `${emojis.TICKETS || '🎟️'} Ticket Commands`,
    commands: [
      'ticket setup', 'panel_deploy', 'claim',
      'close', 'reopen', 'add_member',
      'remove_member', 'info', 'transcript', 'callstaff'
    ]
  },
  {
    label: 'Voice & VoiceMaster',
    value: 'voice',
    description: 'Voice admin, join-to-create temp VCs & VoiceMaster control panel',
    customEmoji: emojis.OBJ_VOICE,
    unicodeFallback: '🔊',
    heading: `${emojis.VOICE || '🔊'} Voice Commands`,
    commands: [
      'vctemp setup', 'vctemp disable', 'vctemp status',
      'vcmute', 'vcunmute', 'vcmuteall', 'vcunmuteall',
      'vcdeafen', 'vcundeafen', 'vckick', 'vckickall',
      'vcpull', 'vcpullall', 'vcmoveall'
    ]
  },
  {
    label: 'Music Suite',
    value: 'music',
    description: 'Lavalink music player: seek, equalizer, multi-filters, 24/7 AFK mode',
    customEmoji: emojis.OBJ_MUSIC,
    unicodeFallback: '🎶',
    heading: `${emojis.MUSIC || '🎶'} Music Commands`,
    commands: [
      'play', 'pause', 'resume', 'seek', 'equalizer',
      'filter', 'skip', 'stop', 'queue', 'nowplaying',
      'volume', 'loop', 'shuffle', '247', 'join', 'leave'
    ]
  },
  {
    label: 'AntiNuke & Security',
    value: 'antinuke',
    description: 'AntiNuke, PanicMode, Whitelist, ExtraOwner, BypassRole & 21 Security Filters',
    customEmoji: emojis.OBJ_AN_SHIELD,
    unicodeFallback: '🛡️',
    heading: `${emojis.AN_SHIELD} AntiNuke & Security Commands`,
    commands: [
      'antinuke', 'antinuke enable', 'antinuke disable',
      'whitelist add', 'whitelist remove',
      'bypassrole add', 'bypassrole remove',
      'quarantine', 'quarantine enable', 'quarantine disable',
      'quarantine set days <1-30>',
      'vanityguard enable', 'vanityguard disable',
      'vanityguard set <vanity>', 'vanityguard status',
      'disableeveryone'
    ]
  },
  {
    label: 'Levels',
    value: 'level',
    description: 'Level System: rank, leaderboard, setup, disable & status',
    customEmoji: emojis.OBJ_LEVEL,
    unicodeFallback: '⭐',
    heading: `${emojis.LEVEL || '⭐'} Level Commands`,
    commands: [
      'level rank', 'level leaderboard',
      'level setup', 'level disable', 'level status'
    ]
  },
  {
    label: 'Fun',
    value: 'fun',
    description: 'Naruto-themed fun: truth, dare, vibecheck, rizzmeter & more',
    customEmoji: emojis.OBJ_FUN,
    unicodeFallback: '🎉',
    heading: `${emojis.FUN || '🎉'} Fun Commands`,
    commands: [
      '8ball', 'truth', 'dare', 'wyr', 'pickup',
      'fortune', 'vibecheck', 'mood', 'smartrate', 'rizzmeter',
      'shipname', 'wanted', 'wasted', 'powerlevel', 'coolrate',
      'bonk', 'spongebobchicken', 'slapcar', 'isthisa', 'drake',
      'distractedbf', 'communismcat', 'eject', 'emergencymeeting', 'headpat',
      'tradeoffer', 'waddle', 'blush', 'cry', 'dance',
      'pout', 'shrug', 'sleepy', 'smile',
      'smug', 'thumbsup', 'wag', 'thinking', 'triggered',
      'teehee', 'deredere', 'thonking', 'scoff', 'happy',
      'thumbs', 'grin', 'cuddle', 'hug', 'kiss',
      'lick', 'nom', 'pat', 'poke', 'slap',
      'stare', 'highfive', 'bite', 'greet', 'punch',
      'handholding', 'tickle', 'kill', 'hold', 'pats',
      'wave', 'boop', 'snuggle', 'bully'
    ]
  },
  {
    label: 'Giveaways',
    value: 'giveaway',
    description: 'Create & manage server giveaways',
    customEmoji: emojis.OBJ_GIVEAWAY,
    unicodeFallback: '🎉',
    heading: `${emojis.GIVEAWAY || '🎉'} Giveaways Commands`,
    commands: [
      'gstart', 'gend <id>', 'greroll <id>'
    ]
  },
  {
    label: 'Information & Bot Stats',
    value: 'info',
    description: 'Bot stats, ping, serverinfo, userinfo, avatar, banner, uptime & invite',
    customEmoji: emojis.OBJ_ANALYTICS,
    unicodeFallback: 'ℹ️',
    heading: `${emojis.STATS || 'ℹ️'} Information Commands`,
    commands: [
      'help', 'info', 'ping', 'uptime', 'invite',
      'support', 'botinfo', 'serverinfo', 'userinfo',
      'avatar', 'banner', 'roles', 'channels', 'emojis', 'stats'
    ]
  },
  {
    label: 'Moderation',
    value: 'mod',
    description: 'Kick, ban, unban, timeout, purge, warn & channel management',
    customEmoji: emojis.OBJ_MOD,
    unicodeFallback: '🔨',
    heading: `${emojis.MOD || '🔨'} Moderation Commands`,
    commands: [
      'ban', 'unban', 'kick', 'timeout', 'untimeout',
      'mute', 'unmute', 'purge', 'warn', 'warnings',
      'clearwarns', 'nuke'
    ]
  },
  {
    label: 'Shinobi Ninja RPG',
    value: 'ninja',
    description: 'Naruto jutsu battles, chakra training, missions, clan & scrolls',
    customEmoji: emojis.OBJ_NINJUTSU,
    unicodeFallback: '🍥',
    heading: `${emojis.NINJUTSU || '🍥'} Shinobi Ninja RPG Commands`,
    commands: [
      'profile', 'train', 'jutsu', 'battle',
      'mission', 'clan', 'rankup', 'inventory'
    ]
  },
  {
    label: 'Economy & Casino',
    value: 'economy',
    description: 'Virtual currency, gambling, jobs, shop, inventory & marriage',
    customEmoji: emojis.OBJ_PRIORITY,
    unicodeFallback: '🪙',
    heading: `${emojis.PRIORITY || '🪙'} Economy & Casino Suite`,
    commands: [
      'balance', 'deposit', 'withdraw',
      'pay', 'networth', 'leaderboard',
      'blackjack', 'plinko', 'crash',
      'roulette', 'dice', 'higherlower',
      'work', 'job', 'mine', 'dig',
      'fish', 'chop', 'hunt', 'crime',
      'daily', 'weekly', 'monthly',
      'shop', 'buy', 'sell', 'inventory',
      'pet', 'marry', 'stocks', 'quest'
    ]
  },
  {
    label: 'Channel Moderation',
    value: 'channel',
    description: 'Lock, unlock, hide and mass lockdown channels',
    customEmoji: emojis.OBJ_TOOLS,
    unicodeFallback: '🔧',
    heading: `${emojis.TOOLS || '🔧'} Channel Moderation`,
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
    customEmoji: emojis.OBJ_GEAR,
    unicodeFallback: emojis.GEAR,
    heading: `${emojis.GEAR || '⚙️'} Automations Commands`,
    commands: [
      'automation',
      'autorole config',
      'massrole add',
      'massrole remove'
    ]
  },
  {
    label: 'Autoresponder & React',
    value: 'autoresponder',
    description: 'Custom trigger replies & auto-reactions',
    customEmoji: emojis.OBJ_AUTORESPOND,
    unicodeFallback: '💬',
    heading: `${emojis.AUTORESPOND || '💬'} Autoresponder Commands`,
    commands: [
      'autoresponder config',
      'ar add <trigger> <reply>',
      'ar remove <trigger>',
      'autoreact add <trigger> <emoji>',
      'autoreact remove <trigger>',
      'autoreact list'
    ]
  },
  {
    label: 'AutoMod & AntiBot',
    value: 'automod',
    description: 'Security filters & bot join whitelist',
    customEmoji: emojis.OBJ_SHIELD,
    unicodeFallback: emojis.SHIELD,
    heading: `${emojis.SHIELD || emojis.SHIELD} AutoMod Commands`,
    commands: [
      'automod config', 'antibot config',
      'moderation'
    ]
  },
  {
    label: 'Priority AI',
    value: 'priority',
    description: 'AI text answers & coding assistant',
    customEmoji: emojis.OBJ_AN_SPARKLES,
    unicodeFallback: '✨',
    heading: `${emojis.SPARKLES} Priority AI Commands`,
    commands: [
      'ask <question>',
      'ai <prompt>',
      'imagine <prompt>',
      'code <task>',
      'priority <query>'
    ]
  },
  {
    label: 'Reaction Roles',
    value: 'reactionrole',
    description: 'Self-assignable roles via emoji reactions',
    customEmoji: emojis.OBJ_REACTIONROLES,
    unicodeFallback: '🎭',
    heading: `${emojis.REACTIONROLES || '🎭'} Reaction Roles Commands`,
    commands: [
      'rr setup',
      'rr add <messageId> <emoji> <@role>',
      'rr remove <messageId> <emoji>'
    ]
  },
  {
    label: 'Sticky Notes',
    value: 'stickynote',
    description: 'Sticky messages automatically kept at the bottom of channels',
    customEmoji: emojis.OBJ_STICKY,
    unicodeFallback: '📌',
    heading: `${emojis.STICKY || '📌'} Sticky Notes Commands`,
    commands: [
      'stickynote add <#channel> <text>',
      'stickynote remove <#channel>',
      'stickynote list'
    ]
  },
  {
    label: 'Profile & Customization',
    value: 'profile',
    description: 'Customize your global user profile & card background',
    customEmoji: emojis.OBJ_PROFILE,
    unicodeFallback: '👤',
    heading: `${emojis.PROFILE || '👤'} Profile Commands`,
    commands: [
      'profile',
      'profile bio <text>',
      'profile title <text>',
      'profile color <#hex>',
      'profile bg <imageURL>'
    ]
  },
  {
    label: 'Special Server Roles',
    value: 'roles',
    description: 'Friend, girl, guest, official, vip, invcrole & autonick',
    customEmoji: emojis.OBJ_ROLES,
    unicodeFallback: '🏷️',
    heading: `${emojis.ROLES || '🏷️'} Role Commands`,
    commands: [
      'autonick', 'friend', 'girl',
      'guest', 'invcrole', 'official',
      'rolesetup', 'vip'
    ]
  },
  {
    label: 'Welcome System',
    value: 'welcome',
    description: 'Welcome cards, Join DMs, Leave DMs & Server Boost announcements',
    customEmoji: emojis.OBJ_WELCOME,
    unicodeFallback: '👋',
    heading: `${emojis.WELCOME || '👋'} Welcome Commands`,
    commands: [
      'welcome setup <#channel> [avatar/imageURL] [text]',
      'welcometest (or .welcomepreview)',
      'welcomereset',
      'joindm <enable/disable/text>',
      'leavedm <enable/disable/text>',
      'boostmsg <#channel> <text>'
    ]
  },
  {
    label: 'Server Backup',
    value: 'backup',
    description: 'Backup & restore server roles, channels, and settings',
    customEmoji: emojis.OBJ_BACKUP,
    unicodeFallback: '💾',
    heading: `${emojis.BACKUP || '💾'} Server Backup Commands`,
    commands: [
      'backup save',
      'backup list',
      'backup restore <backupId>',
      'backup delete <backupId>'
    ]
  }
];

function buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner) {
  const rawAvatar = botAvatar || (botUser && typeof botUser.displayAvatarURL === 'function' ? botUser.displayAvatarURL({ dynamic: true, size: 512 }) : null);
  const botAvatarURL = (rawAvatar && typeof rawAvatar === 'string' && rawAvatar.startsWith('http')) ? rawAvatar : null;
  const userAvatarURL = (message.author && typeof message.author.displayAvatarURL === 'function') ? message.author.displayAvatarURL({ dynamic: true }) : null;
  const validUserAvatar = (userAvatarURL && typeof userAvatarURL === 'string' && userAvatarURL.startsWith('http')) ? userAvatarURL : null;

  const catColor = CATEGORY_COLORS[cat.value] || 0x5865F2;

  if (cat.value === 'fun') {
    const gameEmoji = emojis.NINJUTSU || emojis.FUN || '<a:fun:1530942586876068003>';
    const zapEmoji = emojis.ANALYTICS_ZAP || emojis.ZAP || '<a:analytics:1530942545893265518>';
    const funEmoji = emojis.FUN || '<a:fun:1530942586876068003>';
    const emotesEmoji = emojis.REACTIONROLES || '<a:reaction_roles:1530942623303335966>';
    const actionEmoji = emojis.PROFILE || '<a:profile:1530942618585006364>';

    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Help Menu', iconURL: botAvatarURL } : { name: 'Naruto Help Menu' })
      .setTitle(`${funEmoji} Shinobi Fun & Entertainment Suite`)
      .setDescription(
        `Below is the complete list of commands for **${cat.label}**.\n\n` +
        `${gameEmoji} **Shinobi Games & Oracle**\n` +
        `\`\`\`\n` +
        `.8ball .truth .dare .wyr .pickup .fortune .vibecheck .mood\n` +
        `\`\`\`\n\n` +
        `${zapEmoji} **Shinobi Ratings & Mini-Games**\n` +
        `\`\`\`\n` +
        `.smartrate .rizzmeter .shipname .wanted .wasted .powerlevel .coolrate .bonk\n` +
        `\`\`\`\n\n` +
        `${funEmoji} **Meme Generation**\n` +
        `\`\`\`\n` +
        `.spongebobchicken .slapcar .isthisa .drake .distractedbf .communismcat .eject .emergencymeeting .headpat .tradeoffer .waddle\n` +
        `\`\`\`\n\n` +
        `${emotesEmoji} **Emotes**\n` +
        `\`\`\`\n` +
        `.blush .cry .dance .pout .shrug .sleepy .smile .smug .thumbsup .wag .thinking .triggered .teehee .deredere .thonking .scoff .happy .thumbs .grin\n` +
        `\`\`\`\n\n` +
        `${actionEmoji} **Actions**\n` +
        `\`\`\`\n` +
        `.cuddle .hug .kiss .lick .nom .pat .poke .slap .stare .highfive .bite .greet .punch .handholding .tickle .kill .hold .pats .wave .boop .snuggle .bully\n` +
        `\`\`\``
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${message.author.username} • Total 59 commands`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${message.author.username} • Total 59 commands` });

    if (botAvatarURL) embed.setThumbnail(botAvatarURL);
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  if (cat.value === 'welcome') {
    const gearEmoji = emojis.GEAR || emojis.TOOLS || '<a:an_bot:1530948362784870510>';
    const arEmoji = emojis.AUTORESPOND || '<a:autoresponder:1530942573705822409>';
    const mailEmoji = emojis.MODMAIL_ENVELOPE || '<a:modmail:1530942601497284731>';
    const welcomeEmoji = emojis.WELCOME || '<a:welcome:1530942654530064394>';

    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
      .setTitle(`${welcomeEmoji} Welcome & Greetings System`)
      .setDescription(
        `Welcome **${message.author.username}**! Below is the complete command list for **${cat.label}**.\n\n` +
        `${gearEmoji} **Setup & Configuration**\n` +
        `• \`.welcome setup <#channel>\` \n  └ *Bind welcome channel*\n` +
        `• \`.welcome preset <theme>\` \n  └ *Apply theme (gothic, aesthetic, shinobi, etc.)*\n` +
        `• \`.welcome image <url>\` \n  └ *Set custom banner image or GIF URL*\n` +
        `• \`.welcometest\` \n  └ *Preview current welcome card*\n` +
        `• \`.welcomereset\` \n  └ *Reset welcome setup to default*\n\n` +
        `${arEmoji} **Editable Text & Aesthetics**\n` +
        `• \`.welcome description <text>\` \n  └ *Edit welcome message body text*\n` +
        `• \`.welcome title <text>\` \n  └ *Edit embed title text*\n` +
        `• \`.welcome color <#hex>\` \n  └ *Edit embed border color*\n` +
        `• \`.welcome footer <text>\` \n  └ *Edit embed footer text*\n` +
        `• \`.welcome header <text>\` \n  └ *Edit outer text header*\n\n` +
        `${mailEmoji} **DMs & Server Boosts**\n` +
        `• \`.joindm <on/off/text>\` \n  └ *Configure private welcome DM*\n` +
        `• \`.leavedm <on/off/text>\` \n  └ *Configure private leave DM*\n` +
        `• \`.boostmsg <#channel> <text>\` \n  └ *Configure server boost announcements*\n\n` +
        `✨ **Placeholders:** \`{user}\`, \`{username}\`, \`{server_name}\`, \`{membercount}\``
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${message.author.username} • Type .welcome for setup dashboard`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${message.author.username} • Type .welcome for setup dashboard` });

    if (botAvatarURL) embed.setThumbnail(botAvatarURL);
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // Keep Music suite with codeblock box layout
  if (cat.value === 'music') {
    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
      .setTitle(`${emojis.MUSIC || '🎶'} Music Player Suite & Control Panel`)
      .setDescription(
        `Welcome **${message.author.username}**! Below is the executive suite for **Music**.\n\n` +
        `${emojis.MUSIC || '🎵'} **Playback Controls**\n` +
        `\`\`\`\n` +
        `.play <song>  - Play a track or resume queue\n` +
        `.pause        - Pause current track\n` +
        `.resume       - Resume paused track\n` +
        `.skip         - Skip to next track\n` +
        `.previous     - Go back to previous track\n` +
        `.stop         - Stop music and clear queue\n` +
        `\`\`\`\n\n` +
        `${emojis.ALL_MODULES || '📋'} **Queue & Playlist**\n` +
        `\`\`\`\n` +
        `.queue        - View current queue\n` +
        `.np           - Show now playing\n` +
        `.loop         - Toggle track or queue looping\n` +
        `.shuffle      - Shuffle queue tracks\n` +
        `.seek <secs>  - Seek to specific timestamp\n` +
        `.clear        - Clear the entire queue\n` +
        `\`\`\`\n\n` +
        `${emojis.ANALYTICS_ZAP || emojis.ZAP || '✨'} **Advanced Features**\n` +
        `\`\`\`\n` +
        `.volume <0-200>  - Set playback volume\n` +
        `.247             - Toggle 24/7 voice stay\n` +
        `.autoplay        - Smart autoplay on/off\n` +
        `.filter <preset> - Apply audio filter\n` +
        `.fav add/list    - Save favorite tracks\n` +
        `\`\`\``
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands` });
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // Executive Dynamic Codeblock Box Layout for all modules
  const displayCmds = cat.commands.map(cmd => '.' + cmd);
  let rawTitle = cat.label.includes('&') ? cat.label.split('&')[0].trim() : cat.label;
  rawTitle = rawTitle.toUpperCase() + ' COMMANDS';

  const boxStr = createDynamicBox(rawTitle, displayCmds);

  const embed = new EmbedBuilder()
    .setColor(catColor)
    .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
    .setTitle(`${cat.heading}`)
    .setDescription(
      `Welcome **${message.author.username}**! Below is the executive suite for **${cat.label}**.\n` +
      `Type any command below in your server to execute.\n\n` +
      '```\n' + boxStr + '\n```'
    )
    .setFooter(validUserAvatar ? {
      text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands`,
      iconURL: validUserAvatar
    } : { text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands` });

  return embed;
}

function buildDropdownMenu() {
  const options = CATEGORIES.slice().sort((a,b) => a.label.localeCompare(b.label)).map(cat => {
    return {
      label: cat.label,
      value: cat.value,
      description: cat.description.length > 50 ? cat.description.substring(0, 47) + '...' : cat.description,
      emoji: cat.customEmoji || cat.unicodeFallback || '✨'
    };
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('▚ Select a Module to View Commands...')
      .addOptions(options)
  );
}

function buildNavigationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_home')
      .setEmoji(emojis.OBJ_ALL_MODULES)
      .setLabel('Home Menu')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('help_delete')
      .setEmoji(emojis.OBJ_REMOVE)
      .setLabel('Close Panel')
      .setStyle(ButtonStyle.Danger)
  );
}


async function renderModuleHelpPanel(message, categoryValue) {
  const author = message.author;
  let botUser = message.client.user;

  try {
    botUser = await message.client.users.fetch(message.client.user.id, { force: true });
  } catch (e) {}

  const botAvatar = botUser.displayAvatarURL({ dynamic: true, size: 512 });
  const devPortalBanner = message.client.botBannerURL || null;

  const cat = CATEGORIES.find(c => c.value === categoryValue);
  if (!cat) return null;

  const embed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
  const dropdownRow = buildDropdownMenu();
  const navRow = buildNavigationButtons();

  return { embeds: [embed], components: [dropdownRow, navRow] };
}

module.exports = {
  CATEGORIES,
  CATEGORY_COLORS,
  buildCategoryEmbed,
  buildDropdownMenu,
  buildNavigationButtons,
  renderModuleHelpPanel
};
