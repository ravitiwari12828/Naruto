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
  antidox: 0xFF2D55,
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
    label: 'Anti-Dox Security',
    value: 'antidox',
    description: 'Anti-Dox & Leak Guard: IP address, phone number, doxxing paste links & PII protection',
    customEmoji: '<a:security_animated:1537177499862171741>',
    emojiId: '1537177499862171741',
    unicodeFallback: '<a:security_animated:1537177499862171741>',
    heading: '<a:security_animated:1537177499862171741>',
    commands: [
      'antidox', 'antidox enable', 'antidox disable',
      'antidox status', 'antidox ip <on|off>',
      'antidox phone <on|off>', 'antidox links <on|off>'
    ]
  },
  {
    label: 'Analytics & Tracking',
    value: 'analytics',
    description: 'Track chat, voice timing, invites, joins/leaves, activity & server counters',
    customEmoji: '<a:chart_animated:1537179539514462308>',
    emojiId: '1536620962039210115',
    unicodeFallback: '<a:chart_animated:1537179539514462308>',
    heading: '<a:chart_animated:1537179539514462308>',
    commands: [
      'analytics', 'userstats', 'activity',
      'topmessages', 'topvoice', 'topinvites',
      'joinsleaves', 'topcommands', 'ticketstats',
      'counter setup', 'counter list', 'counter goal <target>'
    ]
  },
  {
    label: 'ModMail System',
    value: 'modmail',
    description: 'DM ModMail support threads, staff replies & HTML transcripts',
    customEmoji: '<a:modmail_animated:1537447208553811999>',
    emojiId: '1537447208553811999',
    unicodeFallback: '<a:modmail_animated:1537447208553811999>',
    heading: '<a:modmail_animated:1537447208553811999>',
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
    customEmoji: '<a:tickety_animated:1537177533961732106>',
    emojiId: '1536620995161628692',
    unicodeFallback: '<a:tickety_animated:1537177533961732106>',
    heading: '<a:tickety_animated:1537177533961732106>',
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
    customEmoji: '<a:microphone_animated:1537177439527112755>',
    emojiId: '1536620908024701028',
    unicodeFallback: '<a:microphone_animated:1537177439527112755>',
    heading: '<a:microphone_animated:1537177439527112755>',
    commands: [
      'vctemp setup', 'vctemp disable', 'vctemp status',
      'voicemaster setup', 'vm name', 'vm limit', 'vm lock', 'vm unlock', 'vm claim',
      'vcmute', 'vcunmute', 'vcmuteall', 'vcunmuteall',
      'vcdeafen', 'vcundeafen', 'vckick', 'vckickall',
      'vcpull', 'vcpullall', 'vcmoveall',
      'vc add', 'vc clear', 'vc count'
    ]
  },
  {
    label: 'Music Suite',
    value: 'music',
    description: 'Lavalink music player: seek, equalizer, multi-filters, lyrics & 24/7 AFK mode',
    customEmoji: '<a:musicplayer_animated:1537177445428633762>',
    emojiId: '1536620919013900378',
    unicodeFallback: '<a:musicplayer_animated:1537177445428633762>',
    heading: '<a:musicplayer_animated:1537177445428633762>',
    commands: [
      'play', 'pause', 'resume', 'seek', 'equalizer',
      'filter', 'skip', 'stop', 'queue', 'nowplaying',
      'volume', 'loop', 'shuffle', 'lyrics', '247', 'join', 'leave'
    ]
  },
  {
    label: 'AntiNuke & Security',
    value: 'antinuke',
    description: 'AntiNuke, PanicMode, Whitelist, ExtraOwner, Securesetup & 21 Security Filters',
    customEmoji: '<a:antinuke_animated:1537447188823805972>',
    emojiId: '1537447188823805972',
    unicodeFallback: '<a:antinuke_animated:1537447188823805972>',
    heading: '<a:antinuke_animated:1537447188823805972>',
    commands: [
      'securesetup',
      'antinuke', 'antinuke enable', 'antinuke disable',
      'whitelist add', 'whitelist remove',
      
      'bypassrole add', 'bypassrole remove',
      'quarantine enable', 'quarantine disable', 'quarantine set days <1-30>',
      'vanityguard enable', 'vanityguard disable', 'vanityguard set <vanity>'
    ]
  },
  {
    label: 'Levels & Shinobi Suite',
    value: 'level',
    description: 'Level System: rank, custom bg, leaderboards, multipliers, role rewards & XP rates',
    customEmoji: '<a:rank_animated:1537179656090943538>',
    emojiId: '1536620959363112991',
    animated: false,
    unicodeFallback: '<a:rank_animated:1537179656090943538>',
    heading: '<a:rank_animated:1537179656090943538>',
    commands: [
      'level rank', 'level bg <url|color|reset>',
      'level leaderboard [weekly|monthly]',
      'level config', 'level setup', 'level disable',
      'level channel <#chan|dm|none>', 'level message <text>',
      'level rewards add/remove/mode', 'level ignore channel/role',
      'level multiplier add/channel', 'level rate <min> <max>',
      'level champion role <@role>', 'level reset <@user|all>'
    ]
  },
  {
    label: 'Fun',
    value: 'fun',
    description: 'Naruto-themed fun: truth, dare, vibecheck, rizzmeter & more',
    customEmoji: '<a:fun_animated:1537447200362070126>',
    emojiId: '1537447200362070126',
    unicodeFallback: '<a:fun_animated:1537447200362070126>',
    heading: '<a:fun_animated:1537447200362070126>',
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
    description: 'Create, edit & manage server giveaways',
    customEmoji: '<a:gift_animated:1537179583064055931>',
    emojiId: '1536620862709702677',
    unicodeFallback: '<a:gift_animated:1537179583064055931>',
    heading: '<a:gift_animated:1537179583064055931>',
    commands: [
      'gstart', 'gend <id>', 'greroll <id>', 'gedit <id>', 'gdelete <id>'
    ]
  },
  {
    label: 'Information & Bot Stats',
    value: 'info',
    description: 'Bot stats, ping, serverinfo, userinfo, avatar, banner, embed builder & invite',
    customEmoji: '<a:infox_animated:1537177409428787251>',
    emojiId: '1536260601339322409',
    unicodeFallback: '<a:infox_animated:1537177409428787251>',
    heading: '<a:infox_animated:1537177409428787251>',
    commands: [
      'help', 'info', 'ping', 'uptime', 'invite',
      'support', 'supportsetup', 'botinfo', 'serverinfo', 'userinfo',
      'avatar', 'banner', 'embed', 'roles', 'channels', 'emojis', 'stats'
    ]
  },
  {
    label: 'Moderation',
    value: 'mod',
    description: 'Kick, ban, unban, timeout, purge, warn, fakepermissions & limits',
    customEmoji: '<a:kick_animated:1537177415552602223>',
    emojiId: '1536260606846435398',
    unicodeFallback: '<a:kick_animated:1537177415552602223>',
    heading: '<a:kick_animated:1537177415552602223>',
    commands: [
      'ban', 'unban', 'kick', 'timeout', 'untimeout',
      'mute', 'unmute', 'purge', 'warn', 'warnings',
      'clearwarns', 'nuke', 'modlimits',
      'fakepermissions add/remove/list',
      'msg add', 'msg clear', 'msg count'
    ]
  },
  {
    label: 'Shinobi Ninja RPG',
    value: 'ninja',
    description: 'Naruto jutsu battles, chakra training, missions, clan & scrolls',
    customEmoji: '<a:naruto_animated:1537179622024814733>',
    unicodeFallback: '🍥',
    heading: '<a:naruto_animated:1537179622024814733>',
    commands: [
      'ninja profile', 'ninja train', 'ninja jutsu',
      'ninja battle', 'ninja mission', 'ninja clan',
      'ninja rankup', 'ninja shop', 'ninja inventory',
      'ninja top'
    ]
  },
  {
    label: 'Economy & Casino',
    value: 'economy',
    description: 'Virtual currency, gambling, jobs, shop, inventory & marriage',
    customEmoji: '<a:money_animated:1537177442672709707>',
    emojiId: '1536620914500698142',
    unicodeFallback: '<a:money_animated:1537177442672709707>',
    heading: '<a:money_animated:1537177442672709707>',
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
    customEmoji: '<a:hashtag_animated:1537177395537248276>',
    emojiId: '1536260624525430845',
    unicodeFallback: '<a:code_animated:1537177358912725033>',
    heading: '<a:hashtag_animated:1537177395537248276>',
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
    customEmoji: '<a:settings_animated:1537177506170404905>',
    emojiId: '1536260507646951534',
    unicodeFallback: '<a:settings_animated:1537177506170404905>',
    heading: '<a:settings_animated:1537177506170404905>',
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
    customEmoji: '<a:code_animated:1537177358912725033>',
    emojiId: '1536260655861207091',
    unicodeFallback: '<a:code_animated:1537177358912725033>',
    heading: '<a:code_animated:1537177358912725033>',
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
    customEmoji: '<a:robot_animated:1537177494183088199>',
    emojiId: '1536620971237187615',
    unicodeFallback: '<a:robot_animated:1537177494183088199>',
    heading: '<a:robot_animated:1537177494183088199>',
    commands: [
      'automod config', 'antibot config',
      'moderation'
    ]
  },
  {
    label: 'Priority AI & Image',
    value: 'priority',
    description: 'AI text answers, image generation & coding assistant',
    customEmoji: '<a:rocket_animated:1537179661371707402>',
    emojiId: '1537177482006896692',
    unicodeFallback: '<a:rocket_animated:1537179661371707402>',
    heading: '<a:rocket_animated:1537179661371707402>',
    commands: [
      'ask <question>',
      'ai <prompt>',
      'imagine <prompt>',
      'image <prompt>',
      'code <task>',
      'priority <query>',
      'noprefix add/remove/list',
      'premium status/grant'
    ]
  },
  {
    label: 'Reaction Roles & Single Reaction',
    value: 'reactionrole',
    description: 'Self-assignable roles & single-reaction enforcement',
    customEmoji: '<a:add_animated:1537177324435283998>',
    emojiId: '1536260677537243257',
    unicodeFallback: '<a:add_animated:1537177324435283998>',
    heading: '<a:add_animated:1537177324435283998>',
    commands: [
      'rr setup',
      'rr add <messageId> <emoji> <@role>',
      'rr remove <messageId> <emoji>',
      'singlereaction add <#channel>',
      'singlereaction remove <#channel>',
      'singlereaction list'
    ]
  },
  {
    label: 'Sticky Notes',
    value: 'stickynote',
    description: 'Sticky messages automatically kept at the bottom of channels',
    customEmoji: '<a:pencil_animated:1537177465829724181>',
    emojiId: '1536260549271355412',
    unicodeFallback: '<a:pencil_animated:1537177465829724181>',
    heading: '<a:pencil_animated:1537177465829724181>',
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
    customEmoji: '<a:membercard_animated:1537177436146638993>',
    emojiId: '1536260557789728828',
    unicodeFallback: '<a:membercard_animated:1537177436146638993>',
    heading: '<a:membercard_animated:1537177436146638993>',
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
    customEmoji: '<a:crown_animated:1537177361093500968>',
    emojiId: '1536260629395021834',
    unicodeFallback: '<a:crown_animated:1537177361093500968>',
    heading: '<a:crown_animated:1537177361093500968>',
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
    customEmoji: '<a:welcome_animated:1537179700349243402>',
    emojiId: '1536620923568922664',
    unicodeFallback: '<a:welcome_animated:1537179700349243402>',
    heading: '<a:welcome_animated:1537179700349243402>',
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
    customEmoji: '<a:cloudcomputing_animated:1537177355766865940>',
    emojiId: '1536260652514025594',
    unicodeFallback: '<a:cloudcomputing_animated:1537177355766865940>',
    heading: '<a:cloudcomputing_animated:1537177355766865940>',
    commands: [
      'backup save',
      'backup list',
      'backup restore <backupId>',
      'backup delete <backupId>'
    ]
  }
];

function buildCategoryEmbed(messageOrInteraction, cat, botUser, botAvatar, devPortalBanner) {
  const userObj = messageOrInteraction?.author || messageOrInteraction?.user;
  const username = userObj ? userObj.username : 'User';
  const rawAvatar = botAvatar || (botUser && typeof botUser.displayAvatarURL === 'function' ? botUser.displayAvatarURL({ dynamic: true, size: 512 }) : null);
  const botAvatarURL = (rawAvatar && typeof rawAvatar === 'string' && rawAvatar.startsWith('http')) ? rawAvatar : null;
  const userAvatarURL = (userObj && typeof userObj.displayAvatarURL === 'function') ? userObj.displayAvatarURL({ dynamic: true }) : null;
  const validUserAvatar = (userAvatarURL && typeof userAvatarURL === 'string' && userAvatarURL.startsWith('http')) ? userAvatarURL : null;
  const catColor = CATEGORY_COLORS[cat.value] || 0x5865F2;

  // SPECIAL FORMATTING FOR ECONOMY CATEGORY SUB-GROUPS
  if (cat.value === 'economy') {
    const bankBox = createDynamicBox('BANKING & WEALTH MANAGEMENT', [
      '.balance     - Check wallet & bank balance',
      '.deposit     - Deposit ryo into bank',
      '.withdraw    - Withdraw ryo from bank',
      '.pay         - Transfer ryo to user',
      '.networth    - View total assets & net worth',
      '.leaderboard - Top richest members'
    ]);

    const casinoBox = createDynamicBox('CASINO & GAMBLING ARENA', [
      '.blackjack   - Play 21 card game',
      '.plinko      - Drop balls for multipliers',
      '.crash       - Multiplier rocket game',
      '.roulette    - Spin the roulette wheel',
      '.dice        - Roll high-stakes dice',
      '.higherlower - Guess higher or lower'
    ]);

    const jobsBox = createDynamicBox('JOBS & RESOURCE HARVESTING', [
      '.work        - Earn salary from your job',
      '.job         - Choose Shinobi profession',
      '.mine        - Mine rare gems & minerals',
      '.dig         - Dig for buried treasure',
      '.fish        - Catch rare sea creatures',
      '.chop        - Harvest timber & wood',
      '.hunt        - Hunt wild forest beasts',
      '.crime       - Risk high-stakes robbery'
    ]);

    const rewardsBox = createDynamicBox('DAILY REWARDS & COMMERCE', [
      '.daily       - Claim daily ryo allowance',
      '.weekly      - Claim weekly ninja bonus',
      '.monthly     - Claim monthly VIP reward',
      '.shop        - View Shinobi market items',
      '.buy         - Purchase market goods',
      '.sell        - Sell inventory items',
      '.inventory   - View owned items & gear'
    ]);

    const lifestyleBox = createDynamicBox('COMPANIONS, MARRIAGE & STOCKS', [
      '.pet         - Adopt & feed loyal pets',
      '.marry       - Propose & manage marriage',
      '.stocks      - Trade in ninja stock market',
      '.quest       - Complete daily ninja quests'
    ]);

    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
      .setTitle(`${cat.heading} Economy & Casino Executive Hub`)
      .setDescription(
        `# ${cat.heading} Economy & Casino Executive Hub\n` +
        `Welcome **${username}**! Below is the categorized command suite for **Economy & Casino**.\n\n` +
        '```\n' + bankBox + '\n```\n\n' +
        '```\n' + casinoBox + '\n```\n\n' +
        '```\n' + jobsBox + '\n```\n\n' +
        '```\n' + rewardsBox + '\n```\n\n' +
        '```\n' + lifestyleBox + '\n```'
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${username} • Total ${cat.commands.length} commands`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${username} • Total ${cat.commands.length} commands` });

    if (botAvatarURL) embed.setThumbnail(botAvatarURL);
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // SPECIAL FORMATTING FOR FUN CATEGORY SUB-GROUPS
  if (cat.value === 'fun') {
    const gamesBox = createDynamicBox('SHINOBI GAMES & ORACLE', [
      '.8ball       - Ask mystic ninja 8ball',
      '.truth       - Answer revealing truth question',
      '.dare        - Perform daring ninja task',
      '.wyr         - Would you rather choice',
      '.fortune     - Read daily ninja fortune',
      '.vibecheck   - Check server vibe percentage'
    ]);

    const ratingBox = createDynamicBox('SHINOBI RATINGS & MINI-GAMES', [
      '.smartrate   - Calculate IQ intelligence rate',
      '.rizzmeter   - Measure charisma & rizz rate',
      '.shipname    - Combine two usernames',
      '.wanted      - Create wild west wanted poster',
      '.wasted      - Generate GTA wasted screen',
      '.powerlevel  - Measure chakra power level',
      '.coolrate    - Calculate coolness rating',
      '.bonk        - Bonk horny ninja user'
    ]);

    const memeBox = createDynamicBox('SHINOBI MEME GENERATORS', [
      '.spongebobchicken - Mocking meme text generator',
      '.slapcar     - Slap roof of car meme',
      '.isthisa     - Is this a pigeon meme',
      '.drake       - Drake approve/reject meme',
      '.distractedbf- Distracted boyfriend meme',
      '.eject       - Among Us ejection screen',
      '.tradeoffer  - Trade offer meme generator'
    ]);

    const emoteBox = createDynamicBox('SHINOBI ANIME EMOTES', [
      '.blush       - Show cute blush expression',
      '.cry         - Express deep sadness',
      '.dance       - Dance with excitement',
      '.pout        - Pout in dissatisfaction',
      '.shrug       - Shrug shoulders shrug',
      '.sleepy      - Show tired sleepy state',
      '.smile       - Share warm happy smile',
      '.smug        - Show confident smug grin',
      '.thumbsup    - Give thumbs up approval',
      '.triggered   - Show triggered reaction'
    ]);

    const actionBox = createDynamicBox('SHINOBI ANIME ACTIONS', [
      '.cuddle      - Cuddle warmly with user',
      '.hug         - Give warm embrace hug',
      '.kiss        - Send sweet kiss to user',
      '.lick        - Playfully lick user',
      '.nom         - Playfully bite/nom user',
      '.pat         - Headpat user gently',
      '.poke        - Poke user cheek',
      '.slap        - Slap user playfully',
      '.stare       - Stare intently at user',
      '.highfive    - Give high five to user',
      '.bite        - Playfully bite user',
      '.punch       - Playfully punch user',
      '.handholding - Hold hands with user',
      '.tickle      - Tickle user playfully',
      '.wave        - Wave hello to user',
      '.boop        - Boop user nose',
      '.snuggle     - Snuggle close together'
    ]);

    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
      .setTitle(`${cat.heading} Shinobi Fun & Entertainment Hub`)
      .setDescription(
        `# ${cat.heading} Shinobi Fun & Entertainment Hub\n` +
        `Welcome **${username}**! Below is the categorized command suite for **Fun & Games**.\n\n` +
        '```\n' + gamesBox + '\n```\n\n' +
        '```\n' + ratingBox + '\n```\n\n' +
        '```\n' + memeBox + '\n```\n\n' +
        '```\n' + emoteBox + '\n```\n\n' +
        '```\n' + actionBox + '\n```'
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${username} • Total ${cat.commands.length} commands`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${username} • Total ${cat.commands.length} commands` });

    if (botAvatarURL) embed.setThumbnail(botAvatarURL);
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // Executive Dynamic Codeblock Box Layout for ALL other categories
  const displayCmds = cat.commands.map(cmd => '.' + cmd);
  let rawTitle = cat.label.includes('&') ? cat.label.split('&')[0].trim() : cat.label;
  rawTitle = rawTitle.toUpperCase() + ' COMMANDS';

  const boxStr = createDynamicBox(rawTitle, displayCmds);

  const embed = new EmbedBuilder()
    .setColor(catColor)
    .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
    .setTitle(`${cat.heading} ${cat.label}`)
    .setDescription(
      `# ${cat.heading} ${cat.label} Executive Hub\n` +
      `Welcome **${username}**! Below is the command suite for **${cat.label}**.\n\n` +
      '```\n' + boxStr + '\n```'
    )
    .setFooter(validUserAvatar ? {
      text: `Requested by ${username} • Total ${cat.commands.length} commands`,
      iconURL: validUserAvatar
    } : { text: `Requested by ${username} • Total ${cat.commands.length} commands` });

  if (botAvatarURL) embed.setThumbnail(botAvatarURL);
  if (devPortalBanner) embed.setImage(devPortalBanner);
  return embed;
}

function _unusedLegacyBuildCategory(messageOrInteraction, cat, botUser, botAvatar, devPortalBanner) {

  if (cat.value === 'fun') {
    const gameEmoji = '<a:gamecontroller_animated:1537177388725706802>';
    const zapEmoji = '<a:rapid_animated:1537177482006896692>';
    const funEmoji = '<a:gamecontroller_animated:1537177388725706802>';
    const emotesEmoji = '🎭';
    const actionEmoji = '<a:membercard_animated:1537177436146638993>';

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
        text: `Requested by ${username} • Total 59 commands`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${username} • Total 59 commands` });

    if (botAvatarURL) embed.setThumbnail(botAvatarURL);
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  if (cat.value === 'welcome') {
    const setupBox = createDynamicBox('SETUP & CONFIG', [
      'welcome setup  : Bind',
      'welcome preset : Preset',
      'welcome image  : Banner',
      'welcometest    : Test',
      'welcomereset   : Reset'
    ]);

    const editBox = createDynamicBox('EDITABLE TEXT', [
      'welcome desc   : Body',
      'welcome title  : Title',
      'welcome color  : Color',
      'welcome footer : Footer',
      'welcome header : Header'
    ]);

    const dmsBox = createDynamicBox('DMS & BOOSTS', [
      'joindm   : Join DM',
      'leavedm  : Leave DM',
      'boostmsg : Boost'
    ]);

    const gearEmoji = '<a:settings_animated:1537177506170404905>';
    const arEmoji = '<a:code_animated:1537177358912725033>';
    const mailEmoji = '<a:socialmedia_animated:1537177527011774534>';
    const welcomeEmoji = '<a:welcome_animated:1537179700349243402>';
    const sparkEmoji = '<a:sparkles_animated:1537179684175872171>';

    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
      .setTitle(`${welcomeEmoji} Welcome & Greetings System`)
      .setDescription(
        `Welcome **${username}**! Below is the executive suite for **${cat.label}**.\n\n` +
        `${gearEmoji} **Setup & Configuration**\n` +
        '```\n' + setupBox + '\n```\n\n' +
        `${arEmoji} **Editable Text & Aesthetics**\n` +
        '```\n' + editBox + '\n```\n\n' +
        `${mailEmoji} **DMs & Server Boosts**\n` +
        '```\n' + dmsBox + '\n```\n\n' +
        `${sparkEmoji} **Placeholders:** \`{user}\`, \`{username}\`, \`{server_name}\`, \`{membercount}\``
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${username} • Type .welcome for setup dashboard`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${username} • Type .welcome for setup dashboard` });

    if (botAvatarURL) embed.setThumbnail(botAvatarURL);
    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  // Keep Music suite with codeblock box layout
  if (cat.value === 'music') {
    const embed = new EmbedBuilder()
      .setColor(catColor)
      .setAuthor(botAvatarURL ? { name: 'Naruto Executive Suite', iconURL: botAvatarURL } : { name: 'Naruto Executive Suite' })
      .setTitle(`${emojis.MUSIC || '<a:musicplayer_animated:1537177445428633762>'} Music Player Suite & Control Panel`)
      .setDescription(
        `Welcome **${username}**! Below is the executive suite for **Music**.\n\n` +
        `${emojis.MUSIC || '<a:musicplayer_animated:1537177445428633762>'} **Playback Controls**\n` +
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
        `${emojis.ANALYTICS_ZAP || emojis.ZAP || '<a:sparkles_animated:1537179684175872171>'} **Advanced Features**\n` +
        `\`\`\`\n` +
        `.volume <0-200>  - Set playback volume\n` +
        `.247             - Toggle 24/7 voice stay\n` +
        `.autoplay        - Smart autoplay on/off\n` +
        `.filter <preset> - Apply audio filter\n` +
        `.fav add/list    - Save favorite tracks\n` +
        `\`\`\``
      )
      .setFooter(validUserAvatar ? {
        text: `Requested by ${username} • Total ${cat.commands.length} commands`,
        iconURL: validUserAvatar
      } : { text: `Requested by ${username} • Total ${cat.commands.length} commands` });
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
      `# ${cat.heading} ${cat.label} Executive Hub\n` +
      `Welcome **${username}**! Below is the command suite for **${cat.label}**.\n\n` +
      '```\n' + boxStr + '\n```'
    )
    .setFooter(validUserAvatar ? {
      text: `Requested by ${username} • Total ${cat.commands.length} commands`,
      iconURL: validUserAvatar
    } : { text: `Requested by ${username} • Total ${cat.commands.length} commands` });

  return embed;
}

function buildDropdownMenu() {
  const options = CATEGORIES.slice().sort((a,b) => a.label.localeCompare(b.label)).map(cat => {
    const opt = {
      label: cat.label,
      value: cat.value,
      description: cat.description.length > 50 ? cat.description.substring(0, 47) + '...' : cat.description
    };
    
    if (cat.customEmoji && cat.customEmoji.includes(':')) {
      const parts = cat.customEmoji.split(':');
      const emojiId = parts[parts.length - 1].replace('>', '').trim();
      const isAnim = cat.customEmoji.startsWith('<a:');
      opt.emoji = { id: emojiId, animated: isAnim };
    } else {
      opt.emoji = { id: '1537179684175872171', animated: true };
    }
    
    return opt;
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
      .setEmoji({ id: '1537177403875401889', animated: true })
      .setLabel('Home Menu')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('help_delete')
      .setEmoji({ id: '1537530932452524152', animated: true })
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
  createDynamicBox,
  buildCategoryEmbed,
  buildDropdownMenu,
  buildNavigationButtons,
  renderModuleHelpPanel
};
