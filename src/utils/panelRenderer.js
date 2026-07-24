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
    label: 'Bot Owner Suite',
    value: 'owner',
    description: 'Executive Control: No-Prefix, Premium, BotLock, ExtraOwner & PanicMode',
    customEmoji: emojis.OBJ_OWNER,
    unicodeFallback: '👑',
    heading: `${emojis.OWNER_CROWN || '👑'} Bot Owner Executive Commands`,
    commands: [
      'owner', 'ownermenu',
      'noprefix add', 'noprefix remove', 'noprefix list',
      'premium activate', 'premium revoke', 'premium adduser',
      'premium revokeuser', 'premium status',
      'botlock enable', 'botlock add', 'botlock list',
      'extraowner add', 'extraowner remove',
      'panicmode enable', 'panicmode set'
    ]
  },
  {
    label: 'Analytics & Tracking',
    value: 'analytics',
    description: 'Track chat, voice timing, invites, joins/leaves, commands & tickets',
    customEmoji: emojis.OBJ_ZAP,
    unicodeFallback: '📊',
    heading: `${emojis.ANALYTICS_ZAP || '📊'} Analytics Commands`,
    commands: [
      'analytics', 'topmessages', 'topvoice', 'topinvites',
      'joinsleaves', 'topcommands', 'ticketstats', 'userstats', 'serverstats'
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
      'modmail setup', 'r <message>', 'close [reason]',
      'modmail', 'modmailtranscript'
    ]
  },
  {
    label: 'No-Prefix & Premium',
    value: 'noprefix',
    description: 'No-prefix authorization, server premium & user VIP management',
    customEmoji: emojis.OBJ_PREMIUM,
    unicodeFallback: '💎',
    heading: `${emojis.PREMIUM || '💎'} Premium Commands`,
    commands: [
      'noprefix add', 'noprefix remove', 'noprefix list',
      'premium activate', 'premium revoke', 'premium adduser',
      'premium revokeuser', 'premium status', 'premium redeem'
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
      'vctemp setup', 'vctemp disable', 'vctemp status', 'setupvc',
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
    customEmoji: emojis.OBJ_ANTINUKE,
    unicodeFallback: '🛡️',
    heading: `${emojis.ANTINUKE || '🛡️'} Antinuke Commands`,
    commands: [
      'antinuke', 'antinuke enable', 'antinuke disable',
      'panicmode enable', 'panicmode disable', 'panicmode set',
      'whitelist add', 'whitelist remove', 'extraowner add',
      'extraowner remove', 'bypassrole add', 'quarantine'
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
      'level rank', 'level leaderboard', 'level setup',
      'level disable', 'level status'
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
    description: 'activity, afk, advlogsetup, logsetup, serverbanner, snipe',
    customEmoji: emojis.OBJ_ZAP,
    unicodeFallback: '📈',
    heading: `${emojis.STATS_NEW || '📈'} Utility Commands`,
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
    customEmoji: emojis.OBJ_MOD,
    unicodeFallback: '🔨',
    heading: `${emojis.MOD || '🔨'} Moderation Commands`,
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
    unicodeFallback: '⚙️',
    heading: `${emojis.GEAR || '⚙️'} Automations Commands`,
    commands: [
      'autorole config', 'massrole add',
      'massrole remove', 'automation'
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
    unicodeFallback: '🛡️',
    heading: `${emojis.SHIELD || '🛡️'} AutoMod Commands`,
    commands: [
      'automod config', 'antibot config',
      'moderation', 'filter'
    ]
  },
  {
    label: 'Priority AI',
    value: 'priority',
    description: 'AI text answers & coding assistant',
    customEmoji: emojis.OBJ_PRIORITY,
    unicodeFallback: '🤖',
    heading: `${emojis.PRIORITY || '🤖'} Priority AI Commands`,
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
    description: 'welcome setup <#channel> [avatar/imageURL] [text], welcometest, welcomereset',
    customEmoji: emojis.OBJ_WELCOME,
    unicodeFallback: '👋',
    heading: `${emojis.WELCOME || '👋'} Welcome Commands`,
    commands: [
      'welcome setup <#channel> [avatar/imageURL] [text]',
      'welcometest',
      'welcomereset'
    ]
  }
];

function buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner) {
  const botAvatarURL = botAvatar || botUser.displayAvatarURL({ dynamic: true, size: 512 });

  if (cat.value === 'fun') {
    const embed = new EmbedBuilder()
      .setColor(0x00E5FF)
      .setAuthor({ name: 'Naruto Help Menu', iconURL: botAvatarURL })
      .setThumbnail(botAvatarURL)
      .setTitle(`${emojis.FUN || '🎉'} Shinobi Fun & Entertainment Suite`)
      .setDescription(
        `Below is the complete list of commands for **${cat.label}**.\n\n` +
        `${emojis.SCROLL || '🌀'} **Shinobi Games & Oracle**\n` +
        `\`8ball\` \`truth\` \`dare\` \`wyr\` \`pickup\` \`fortune\` \`vibecheck\` \`mood\`\n\n` +
        `${emojis.ZAP || '📊'} **Shinobi Ratings & Mini-Games**\n` +
        `\`smartrate\` \`rizzmeter\` \`shipname\` \`wanted\` \`wasted\` \`powerlevel\` \`coolrate\` \`bonk\`\n\n` +
        `${emojis.FUN || '😂'} **Meme Generation**\n` +
        `\`spongebobchicken\` \`slapcar\` \`isthisa\` \`drake\` \`distractedbf\` \`communismcat\` \`eject\` \`emergencymeeting\` \`headpat\` \`tradeoffer\` \`waddle\`\n\n` +
        `${emojis.STAR || '😃'} **Emotes**\n` +
        `\`blush\` \`cry\` \`dance\` \`lewd\` \`pout\` \`shrug\` \`sleepy\` \`smile\` \`smug\` \`thumbsup\` \`wag\` \`thinking\` \`triggered\` \`teehee\` \`deredere\` \`thonking\` \`scoff\` \`happy\` \`thumbs\` \`grin\`\n\n` +
        `${emojis.HEART || '🤗'} **Actions**\n` +
        `\`cuddle\` \`hug\` \`kiss\` \`lick\` \`nom\` \`pat\` \`poke\` \`slap\` \`stare\` \`highfive\` \`bite\` \`greet\` \`punch\` \`handholding\` \`tickle\` \`kill\` \`hold\` \`pats\` \`wave\` \`boop\` \`snuggle\` \`bully\``
      )
      .setFooter({
        text: `Requested by ${message.author.username} • Total 59 commands`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });

    if (devPortalBanner) embed.setImage(devPortalBanner);
    return embed;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setAuthor({ name: 'Naruto Help Menu', iconURL: botAvatarURL })
    .setThumbnail(botAvatarURL)
    .setTitle(`${cat.heading}`)
    .setDescription(
      `Below is the complete list of commands for **${cat.label}**.\n` +
      `Type \`.help <command>\` for detailed usage on any command.\n\n` +
      `\`\`\`\n` +
      cat.commands.map(cmd => `.${cmd}`).join('\n') +
      `\n\`\`\``
    )
    .setFooter({
      text: `Requested by ${message.author.username} • Total ${cat.commands.length} commands`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    });

  return embed;
}

function buildDropdownMenu() {
  const options = CATEGORIES.map(cat => {
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
      .setEmoji(emojis.OBJ_HOME || '🏠')
      .setLabel('Home')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_delete')
      .setEmoji(emojis.OBJ_REMOVE || '🗑️')
      .setLabel('Delete')
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
        content: `${emojis.DISABLED || '❌'} Only the user who executed the command can interact with this panel.`,
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
