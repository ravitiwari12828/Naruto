const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const emojis = require('./emojis');

// Shared Categories definition matching help.js exactly
const CATEGORIES = [
  {
    label: 'Analytics & Tracking',
    value: 'analytics',
    description: 'Track chat, voice timing, invites, joins/leaves, commands & tickets',
    customEmoji: emojis.OBJ_ZAP,
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
    description: 'Support ticket system: setup, category, claim, close, transcript',
    customEmoji: emojis.OBJ_TICKETS,
    unicodeFallback: '🎟️',
    heading: `${emojis.TICKETS || '🎟️'} Ticket Commands`,
    commands: [
      'ticket setup', 'category_add', 'category_edit',
      'category_remove', 'category_toggle', 'category_list',
      'panel_deploy', 'claim', 'close',
      'reopen', 'add_member', 'remove_member',
      'info', 'transcript', 'callstaff'
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
      'setupvc', 'vcsetup', 'vm',
      'vcdeafen', 'vckick', 'vckickall', 'vclist',
      'vcmoveall', 'vcmute', 'vcmuteall', 'vcpull',
      'vcpullall', 'vcundeafen', 'vcunmute', 'vcunmuteall'
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
    customEmoji: emojis.OBJ_GIVEAWAY,
    unicodeFallback: '🎁',
    heading: `${emojis.GIVEAWAY || '🎁'} Giveaway Commands`,
    commands: [
      'giveaway create',
      'giveaway end',
      'giveaway reroll',
      'giveaway list'
    ]
  },
  {
    label: 'Utility & Logs',
    value: 'info',
    description: 'activity, afk, advlogsetup, logsetup, serverbanner, snipe, userinfo',
    customEmoji: emojis.OBJ_ZAP,
    unicodeFallback: '📈',
    heading: `${emojis.STATS_NEW || '📈'} Utility & Info Commands`,
    commands: [
      'activity', 'afk', 'avatar',
      'advlogsetup', 'logsetup',
      'roleinfo', 'serverbanner', 'servericon', 'serverinfo',
      'snipe', 'snipe <1-10>', 'userinfo'
    ]
  },
  {
    label: 'Moderation',
    value: 'mod',
    description: 'Ban, kick, mute, purge, nuke, roles & more',
    customEmoji: emojis.OBJ_MOD,
    unicodeFallback: emojis.MOD,
    heading: `${emojis.MOD || emojis.MOD} Moderation Commands`,
    commands: [
      'ban', 'hackban', 'kick',
      'mute', 'unmute',
      'unban', 'unbanall',
      'purge', 'purgebots',
      'nuke', 'role', 'rolemenu',
      'list', 'warn',
      'modlimits set', 'modlimits reset', 'modlimits status',
      'modlimits bypass add @user', 'modlimits disable', 'modlimits enable',
      'disableeveryone'
    ]
  },
  {
    label: 'Naruto RPG',
    value: 'ninja',
    description: 'Jutsu, Chakra, Quests, Leaderboards & Shinobi Profile',
    customEmoji: emojis.OBJ_NINJUTSU,
    unicodeFallback: '🍥',
    heading: `${emojis.NINJUTSU || '🍥'} Naruto RPG Commands`,
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
    label: 'Economy & Casino',
    value: 'economy',
    description: 'Banking, Casino Games, Jobs, Pets, Stocks & Shop',
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
    heading: `${emojis.GEAR || emojis.GEAR} Automations Commands`,
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
      'ar add',
      'ar remove',
      'autoreact config'
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
      'moderation', 'filter'
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
      'code <task>',
      'priority <query>'
    ]
  },
  {
    label: 'Reaction Roles',
    value: 'reactionrole',
    description: 'Reaction role binding: add, remove, list, reset',
    customEmoji: emojis.OBJ_REACTIONROLES,
    unicodeFallback: '🎭',
    heading: `${emojis.REACTIONROLES || '🎭'} Reaction Role Commands`,
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
    customEmoji: emojis.OBJ_STICKY,
    unicodeFallback: '📌',
    heading: `${emojis.STICKY || '📌'} Sticky Commands`,
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
    customEmoji: emojis.OBJ_PROFILE,
    unicodeFallback: '🖼️',
    heading: `${emojis.PROFILE || '🖼️'} Profile Commands`,
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
    label: 'Welcome',
    value: 'welcome',
    description: 'welcome setup, welcometest, welcomereset',
    customEmoji: emojis.OBJ_WELCOME,
    unicodeFallback: '👋',
    heading: `${emojis.WELCOME || '👋'} Welcome Commands`,
    commands: [
      'welcome setup <#channel> [avatar/imageURL] [text]',
      'welcometest',
      'welcomereset'
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
  const botAvatarURL = botAvatar || botUser.displayAvatarURL({ dynamic: true, size: 512 });

  if (cat.value === 'fun') {
    const embed = new EmbedBuilder()
      .setColor(0x7E0808)
      .setAuthor({ name: 'Naruto Help Menu', iconURL: botAvatarURL })
      .setThumbnail(botAvatarURL)
      .setTitle(`${emojis.FUN || '🎉'} Shinobi Fun & Entertainment Suite`)
      .setDescription(
        `Below is the complete list of commands for **${cat.label}**.\n\n` +
        `${emojis.SCROLL || '🌀'} **Shinobi Games & Oracle**\n` +
        `\`\`\`\n` +
        `.8ball .truth .dare .wyr .pickup .fortune .vibecheck .mood\n` +
        `\`\`\`\n\n` +
        `${emojis.ZAP || '📊'} **Shinobi Ratings & Mini-Games**\n` +
        `\`\`\`\n` +
        `.smartrate .rizzmeter .shipname .wanted .wasted .powerlevel .coolrate .bonk\n` +
        `\`\`\`\n\n` +
        `${emojis.FUN || '😂'} **Meme Generation**\n` +
        `\`\`\`\n` +
        `.spongebobchicken .slapcar .isthisa .drake .distractedbf .communismcat .eject .emergencymeeting .headpat .tradeoffer .waddle\n` +
        `\`\`\`\n\n` +
        `${emojis.EMOTES || '😃'} **Emotes**\n` +
        `\`\`\`\n` +
        `.blush .cry .dance .lewd .pout .shrug .sleepy .smile .smug .thumbsup .wag .thinking .triggered .teehee .deredere .thonking .scoff .happy .thumbs .grin\n` +
        `\`\`\`\n\n` +
        `${emojis.ACTIONS || '🤗'} **Actions**\n` +
        `\`\`\`\n` +
        `.cuddle .hug .kiss .lick .nom .pat .poke .slap .stare .highfive .bite .greet .punch .handholding .tickle .kill .hold .pats .wave .boop .snuggle .bully\n` +
        `\`\`\``
      )
      .setFooter({
        text: `Requested by ${message.author.username} • Total 59 commands`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });

    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  if (cat.value === 'welcome') {
    const embed = new EmbedBuilder()
      .setColor(0x7E0808)
      .setAuthor({ name: 'Naruto Executive Suite', iconURL: botAvatarURL })
      .setTitle(`${emojis.CELEBRATION || '🍥'} Naruto One Help & Command Center`)
      .setDescription(
        `Welcome **${message.author.username}**! Below is the executive suite for **Naruto One**.\n` +
        `Use the dropdown menu below to explore all modules, settings & features.\n\n` +
        `**📌 Quick Feature Highlights:**\n` +
        `• **Wick-Grade Security**: AntiNuke, AntiRaid, AntiSpam, AntiBot & Join Gate.\n` +
        `• **High-Fidelity Audio**: Spotify, YouTube & SoundCloud player with Filters.\n` +
        `• **Automation Grid**: AutoRole, AutoResponder, AutoReact & VoiceMaster.\n` +
        `• **Naruto RPG**: Shinobi ranks, Chakra leveling & Jutsu battles!`
      )
      .setFooter({
        text: `Requested by ${message.author.username} • Type .help <module> for specific commands`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });

    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // Keep Music suite with codeblock box layout
  if (cat.value === 'music') {
    const embed = new EmbedBuilder()
      .setColor(0x7E0808)
      .setAuthor({ name: 'Naruto Executive Suite', iconURL: botAvatarURL })
      .setTitle(`🎶 Music Player Suite & Control Panel`)
      .setDescription(
        `Welcome **${message.author.username}**! Below is the executive suite for **Music**.\n\n` +
        `**🎵 Playback Controls**\n` +
        `\`\`\`\n` +
        `.play <song>  - Play a track or resume queue\n` +
        `.pause        - Pause current track\n` +
        `.resume       - Resume paused track\n` +
        `.skip         - Skip to next track\n` +
        `.prev         - Go back to previous track\n` +
        `.stop         - Stop music and clear queue\n` +
        `\`\`\`\n\n` +
        `**📋 Queue & Playlist**\n` +
        `\`\`\`\n` +
        `.queue        - View current queue\n` +
        `.np           - Show now playing\n` +
        `.loop         - Toggle track or queue looping\n` +
        `.shuffle      - Shuffle queue tracks\n` +
        `.seek <secs>  - Seek to specific timestamp\n` +
        `.clear        - Clear the entire queue\n` +
        `\`\`\`\n\n` +
        `**✨ Advanced Features**\n` +
        `\`\`\`\n` +
        `.volume <0-200>  - Set playback volume\n` +
        `.247             - Toggle 24/7 voice stay\n` +
        `.autoplay        - Smart autoplay on/off\n` +
        `.filter <preset> - Apply audio filter\n` +
        `.fav add/list    - Save favorite tracks\n` +
        `\`\`\``
      )
      .setFooter({
        text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // Executive Dynamic Codeblock Box Layout for all modules
  const { createDynamicBox } = require('./boxBuilder');
  const displayCmds = cat.commands.map(cmd => '.' + cmd);
  let rawTitle = cat.label.includes('&') ? cat.label.split('&')[0].trim() : cat.label;
  rawTitle = rawTitle.toUpperCase() + ' COMMANDS';

  const boxStr = createDynamicBox(rawTitle, displayCmds);

  const embed = new EmbedBuilder()
    .setColor(0x7E0808)
    .setAuthor({ name: 'Naruto Executive Suite', iconURL: botAvatarURL })
    .setTitle(`${cat.heading}`)
    .setDescription(
      `Welcome **${message.author.username}**! Below is the executive suite for **${cat.label}**.\n` +
      `Type any command below in your server to execute.\n\n` +
      '```\n' + boxStr + '\n```'
    )
    .setFooter({
      text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    });

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

  const cat = CATEGORIES.find(c => c.value === categoryValue || c.label.toLowerCase() === categoryValue.toLowerCase()) || CATEGORIES.find(c => c.value === 'welcome');

  const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
  const dropdownRow = buildDropdownMenu();
  const navRow = buildNavigationButtons();

  const msg = await message.channel.send({
    embeds: [catEmbed],
    components: [dropdownRow, navRow]
  });

  const collector = msg.createMessageComponentCollector({
    time: 300000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== author.id) {
      return interaction.reply({
        content: `${emojis.DISABLED || emojis.ERROR} Only the user who executed the command can interact with this panel.`,
        flags: 64
      });
    }

    await interaction.deferUpdate();

    if (interaction.customId === 'help_home') {
      const helpCmd = message.client.commands.get('help');
      if (helpCmd) return helpCmd.execute(message, []);
    }

    if (interaction.customId === 'help_delete') {
      return msg.delete().catch(() => {});
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
      const selectedValue = interaction.values[0];
      const selectedCat = CATEGORIES.find(c => c.value === selectedValue);

      if (selectedCat) {
        const newEmbed = buildCategoryEmbed(message, selectedCat, botUser, botAvatar, devPortalBanner);
        return msg.edit({
          embeds: [newEmbed],
          components: [buildDropdownMenu(), buildNavigationButtons()]
        });
      }
    }
  });

  collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
  });
}

module.exports = {
  CATEGORIES,
  buildCategoryEmbed,
  buildDropdownMenu,
  buildNavigationButtons,
  renderModuleHelpPanel
};
