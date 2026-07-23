const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// ─────────────────────────────────────────
// Category definitions — label, value, emoji, description, commands list
// ─────────────────────────────────────────
const CATEGORIES = [
  {
    label: 'Analytics & Tracking',
    value: 'analytics',
    description: 'Track chat, voice timing, invites, joins/leaves, commands & tickets',
    emojiObj: emojis.OBJ_ZAP || { name: '📊' },
    heading: '📊 Timeframe & Category Analytics Suite',
    commands: [
      'analytics', '1d', '7d', '14d', '30d', 'overall',
      'topmessages', 'topvoice', 'topinvites', 'joinsleaves',
      'topcommands', 'ticketstats', 'userstats', 'serverstats'
    ]
  },
  {
    label: 'ModMail System',
    value: 'modmail',
    description: 'DM ModMail support threads, staff replies & HTML transcripts',
    emojiObj: { name: '📬' },
    heading: '📬 ModMail Support System',
    commands: [
      'modmail setup', 'r <message>', 'close [reason]',
      'modmail', 'modmailtranscript'
    ]
  },
  {
    label: 'No-Prefix & Premium',
    value: 'noprefix',
    description: 'No-prefix authorization, server premium & user VIP management',
    emojiObj: emojis.OBJ_PREMIUM || { name: '💎' },
    heading: '💎 No-Prefix & Premium Suite',
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
    emojiObj: emojis.OBJ_TICKETS,
    heading: `${emojis.TICKETS} Support Ticket Commands`,
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
    emojiObj: emojis.OBJ_VOICE,
    heading: `${emojis.VOICE} Voice & VoiceMaster Commands`,
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
    emojiObj: emojis.OBJ_MUSIC,
    heading: `${emojis.MUSIC} Music & Audio Filter Commands`,
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
    emojiObj: emojis.OBJ_ANTINUKE,
    heading: `${emojis.ANTINUKE} AntiNuke & Security Commands`,
    isAntinukeSuite: true,
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
    description: 'level rank, leaderboard, setup, disable, status, refresh',
    emojiObj: emojis.OBJ_LEVEL,
    heading: `${emojis.LEVEL} Level Commands`,
    commands: [
      'level rank', 'level leaderboard', 'level setup',
      'level disable', 'level status', '/level rank',
      '/level leaderboard', '/level setup', '/level disable'
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
    label: 'Utility & Logs',
    value: 'info',
    description: 'activity, afk, advlogsetup, logsetup, serverbanner, snipe',
    emojiObj: emojis.OBJ_INFO,
    heading: `${emojis.STATS_NEW} Utility & Log Commands`,
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
    description: 'welcome, welcomechannel, welcomemessage, welcomeimage, welcometest',
    emojiObj: emojis.OBJ_WELCOME,
    heading: `${emojis.WELCOME} Welcome Commands`,
    commands: [
      'welcome', 'welcomechannel', 'welcomemessage',
      'welcomeimage', 'welcometest', 'welcomereset'
    ]
  }
];

function buildMainEmbed(message, botUser, botAvatar, devPortalBanner) {
  const totalCommands = message.client.commands && message.client.commands.size > 0 ? message.client.commands.size : 283;

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
    embed.setTitle(`${cat.heading}`);
    embed.setDescription(
      `🔒 **Server Protection & Owner Security Suite**\n\n` +
      `• **\`securesetup\`**: Deploy AntiNuke whitelist & emergency panic mode.\n` +
      `• **\`quarantine\`**: 15-day member probation guard against mass pings.\n` +
      `• **\`antinuke\`**: Enable/disable individual security filters (antiban, antikick, antibot, antichannel, antirole, antiwebhook).\n` +
      `• **\`panicmode\`**: Emergency lockdown system (Level 1-3).\n` +
      `• **\`whitelist / extraowner / bypassrole\`**: Owner-only permission delegation.\n\n` +
      `**Command List:**\n` +
      `\`${cat.commands.join('`, `')}\``
    );
  } else {
    embed.setTitle(`${cat.heading}`);
    embed.setDescription(
      `Below is the complete list of commands for **${cat.label}**.\n` +
      `Type \`.help <command>\` for detailed usage on any command.\n\n` +
      `\`\`\`\n` +
      cat.commands.map(cmd => `.${cmd}`).join('\n') +
      `\n\`\`\``
    );
  }

  if (devPortalBanner) embed.setImage(devPortalBanner);
  return embed;
}

function buildDropdownMenu() {
  const options = CATEGORIES.map(cat => {
    const opt = {
      label: cat.label,
      value: cat.value,
      description: cat.description.length > 50 ? cat.description.substring(0, 47) + '...' : cat.description
    };
    if (typeof cat.emojiObj === 'string') {
      opt.emoji = cat.emojiObj;
    } else if (cat.emojiObj && cat.emojiObj.id) {
      opt.emoji = { id: cat.emojiObj.id, name: cat.emojiObj.name };
    } else if (cat.emojiObj && cat.emojiObj.name) {
      opt.emoji = cat.emojiObj.name;
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
      .setEmoji('🏠')
      .setLabel('Home')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help_delete')
      .setEmoji('🗑️')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  name: 'help',
  description: 'Interactive Multi-Module Help Panel with Dropdown Menu & Category Navigator',
  aliases: ['h', 'menu', 'commands'],

  async execute(message, args) {
    const author = message.author;
    let botUser = message.client.user;

    try {
      botUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const botAvatar = botUser.displayAvatarURL({ dynamic: true, size: 512 });
    const devPortalBanner = message.client.botBannerURL || null;

    if (args[0]) {
      const search = args[0].toLowerCase();
      const cat = CATEGORIES.find(c => c.value === search || c.label.toLowerCase() === search);
      if (cat) {
        const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
        return message.channel.send({
          embeds: [catEmbed],
          components: [buildDropdownMenu(), buildNavigationButtons()]
        });
      }
    }

    const mainEmbed = buildMainEmbed(message, botUser, botAvatar, devPortalBanner);
    const dropdownRow = buildDropdownMenu();
    const navRow = buildNavigationButtons();

    const helpMessage = await message.channel.send({
      embeds: [mainEmbed],
      components: [dropdownRow, navRow]
    });

    const collector = helpMessage.createMessageComponentCollector({
      time: 300000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({
          content: '❌ Only the user who ran `.help` can use this menu.',
          flags: 64
        });
      }

      await interaction.deferUpdate();

      if (interaction.customId === 'help_home') {
        return helpMessage.edit({
          embeds: [buildMainEmbed(message, botUser, botAvatar, devPortalBanner)],
          components: [buildDropdownMenu(), buildNavigationButtons()]
        });
      }

      if (interaction.customId === 'help_delete') {
        return helpMessage.delete().catch(() => {});
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
        const selectedValue = interaction.values[0];
        const cat = CATEGORIES.find(c => c.value === selectedValue);

        if (cat) {
          const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
          return helpMessage.edit({
            embeds: [catEmbed],
            components: [buildDropdownMenu(), buildNavigationButtons()]
          });
        }
      }
    });

    collector.on('end', () => {
      helpMessage.edit({ components: [] }).catch(() => {});
    });
  }
};
