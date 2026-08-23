const { REST, Routes, SlashCommandBuilder } = require('discord.js');

async function registerSlashCommands(client) {
  if (!process.env.DISCORD_TOKEN) {
    console.warn('⚠️ [Slash Commands] DISCORD_TOKEN is missing. Skipping Slash Command registration.');
    return;
  }

  try {
    const rawCommands = [];
    const registeredNames = new Set();

    if (!client.commands || client.commands.size === 0) {
      console.warn('⚠️ [Slash Commands] No commands loaded in client.commands. Skipping registration.');
      return;
    }

    // ─────────────────────────────────────────────────────────
    // 1. CATEGORIZED SUBCOMMAND GROUPS (Registers ALL 581 features under top categories!)
    // ─────────────────────────────────────────────────────────
    const categoryGroups = [
      {
        name: 'setup',
        desc: 'Master All-in-One Server Setup Wizard (logs, antinuke, welcome, ticket, automod)',
        subcommands: [
          { name: 'dashboard', desc: 'Interactive Server Setup Dashboard' },
          { name: 'logs', desc: 'Configure unified event audit logging (#naruto-logs)' },
          { name: 'advlogs', desc: 'Deploy multi-category pro audit logging channels' },
          { name: 'antinuke', desc: 'Configure AntiNuke & Anti-Raid server protection' },
          { name: 'automod', desc: 'Configure AutoMod spam & link filters' },
          { name: 'welcome', desc: 'Configure Welcome card banner & system messages' },
          { name: 'ticket', desc: 'Configure interactive support ticket system' },
          { name: 'modmail', desc: 'Configure staff DM modmail system' },
          { name: 'level', desc: 'Configure leveling XP system & rewards' },
          { name: 'autorole', desc: 'Configure auto-assigned join roles' },
          { name: 'antidox', desc: 'Configure Anti-Dox privacy protection' },
          { name: 'sticky', desc: 'Configure sticky channel announcements' },
          { name: 'counter', desc: 'Configure dynamic server stat counter channels' },
          { name: 'autoresponder', desc: 'Configure trigger keyword auto-replies' }
        ]
      },
      {
        name: 'music',
        desc: 'Lavalink High-Quality Music Suite: play, skip, queue, volume, lyrics, 247',
        subcommands: [
          { name: 'play', desc: 'Play a track or playlist', optionType: 'string', optionName: 'query', optionDesc: 'Song title or YouTube/Spotify/SoundCloud link' },
          { name: 'skip', desc: 'Skip current playing track' },
          { name: 'pause', desc: 'Pause music playback' },
          { name: 'resume', desc: 'Resume music playback' },
          { name: 'stop', desc: 'Stop playback and clear queue' },
          { name: 'queue', desc: 'View current song queue' },
          { name: 'nowplaying', desc: 'View current track progress and details' },
          { name: 'volume', desc: 'Set volume (1-150)', optionType: 'integer', optionName: 'level', optionDesc: 'Volume level' },
          { name: 'loop', desc: 'Toggle song/queue loop mode' },
          { name: 'shuffle', desc: 'Shuffle queue tracks' },
          { name: 'lyrics', desc: 'Search lyrics for a song', optionType: 'string', optionName: 'title', optionDesc: 'Song title' },
          { name: 'afk247', desc: 'Toggle 24/7 AFK mode in voice channel' }
        ]
      },
      {
        name: 'economy',
        desc: 'Shinobi Economy & Casino: balance, daily, work, beg, deposit, withdraw, pay, shop',
        subcommands: [
          { name: 'balance', desc: 'View your wallet and bank balance' },
          { name: 'daily', desc: 'Claim your daily Ryo reward' },
          { name: 'work', desc: 'Work a shift for Ryo' },
          { name: 'beg', desc: 'Beg for spare Ryo' },
          { name: 'deposit', desc: 'Deposit Ryo into bank', optionType: 'string', optionName: 'amount', optionDesc: 'Amount or all' },
          { name: 'withdraw', desc: 'Withdraw Ryo from bank', optionType: 'string', optionName: 'amount', optionDesc: 'Amount or all' },
          { name: 'pay', desc: 'Pay Ryo to another user', optionType: 'user', optionName: 'target', optionDesc: 'User to pay' },
          { name: 'inventory', desc: 'View your item inventory' },
          { name: 'shop', desc: 'Browse the item shop' },
          { name: 'buy', desc: 'Buy an item from shop', optionType: 'string', optionName: 'item', optionDesc: 'Item name' },
          { name: 'leaderboard', desc: 'View richest users' },
          { name: 'blackjack', desc: 'Play a game of Blackjack', optionType: 'integer', optionName: 'bet', optionDesc: 'Bet amount' },
          { name: 'crash', desc: 'Play the multiplier Crash game', optionType: 'integer', optionName: 'bet', optionDesc: 'Bet amount' }
        ]
      },
      {
        name: 'level',
        desc: 'Leveling & Rank Cards: rank, ranktheme, cardtheme, leaderboard',
        subcommands: [
          { name: 'rank', desc: 'View rank card & level progress', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'ranktheme', desc: 'Select 1 of 16 vibrant rank card gradient themes', optionType: 'integer', optionName: 'theme', optionDesc: 'Theme number (1-16)' },
          { name: 'leaderboard', desc: 'View top leveled members in server' }
        ]
      },
      {
        name: 'moderation',
        desc: 'Server Moderation: ban, kick, warn, purge, nuke, lock, unlock, mute, unmute',
        subcommands: [
          { name: 'ban', desc: 'Ban a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'kick', desc: 'Kick a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'warn', desc: 'Warn a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'warnings', desc: 'View warnings for a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'purge', desc: 'Purge messages', optionType: 'integer', optionName: 'count', optionDesc: 'Number of messages (1-100)' },
          { name: 'nuke', desc: 'Nuke current channel' },
          { name: 'lock', desc: 'Lock current channel' },
          { name: 'unlock', desc: 'Unlock current channel' },
          { name: 'mute', desc: 'Mute/Timeout a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'unmute', desc: 'Unmute a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' }
        ]
      },
      {
        name: 'security',
        desc: 'AntiNuke & Security Privacy: antinuke, antidox, automod, panicmode, whitelist',
        subcommands: [
          { name: 'antinuke', desc: 'View or toggle AntiNuke security status' },
          { name: 'antidox', desc: 'View or toggle Anti-Dox privacy status' },
          { name: 'automod', desc: 'View AutoMod rules' },
          { name: 'securesetup', desc: '1-Click deployment wizard for full server protection' },
          { name: 'advlogsetup', desc: 'Deploy multi-category audit logging channels' }
        ]
      },
      {
        name: 'utility',
        desc: 'Bot Utilities: help, stats, ping, info, serverinfo, userinfo, avatar, banner, enlarge, steal',
        subcommands: [
          { name: 'help', desc: 'Interactive Multi-Module Help Panel' },
          { name: 'stats', desc: 'View Naruto Bot system analytics' },
          { name: 'ping', desc: 'Check Bot WebSocket latency' },
          { name: 'serverinfo', desc: 'View server information' },
          { name: 'userinfo', desc: 'View user profile information', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'avatar', desc: 'View user avatar', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'enlarge', desc: 'Enlarge custom emoji or sticker', optionType: 'string', optionName: 'emoji', optionDesc: 'Custom emoji' }
        ]
      },
      {
        name: 'fun',
        desc: 'Naruto Shinobi Roleplay & Mini-Games: jutsu, battle, rps, 8ball, coinflip, dice',
        subcommands: [
          { name: 'naruto', desc: 'Generate Naruto character card or lore' },
          { name: 'jutsu', desc: 'Cast a random ninja jutsu technique' },
          { name: 'battle', desc: 'Battle another member in Shinobi arena', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'rps', desc: 'Play Rock Paper Scissors' },
          { name: '8ball', desc: 'Ask the Magic 8-Ball a question', optionType: 'string', optionName: 'question', optionDesc: 'Your question' },
          { name: 'coinflip', desc: 'Flip a coin' },
          { name: 'dice', desc: 'Roll a dice' }
        ]
      },
      {
        name: 'ticket',
        desc: 'Support Ticket System: setup, create, close, add, remove, lock, unlock',
        subcommands: [
          { name: 'setup', desc: 'Deploy ticket panel in channel' },
          { name: 'create', desc: 'Create a new support ticket' },
          { name: 'close', desc: 'Close current support ticket' },
          { name: 'add', desc: 'Add user to ticket', optionType: 'user', optionName: 'target', optionDesc: 'User to add' },
          { name: 'remove', desc: 'Remove user from ticket', optionType: 'user', optionName: 'target', optionDesc: 'User to remove' }
        ]
      },
      {
        name: 'giveaway',
        desc: 'Giveaway Management: start, end, reroll, list',
        subcommands: [
          { name: 'start', desc: 'Start a new giveaway' },
          { name: 'end', desc: 'End an active giveaway' },
          { name: 'reroll', desc: 'Reroll giveaway winner' }
        ]
      }
    ];

    // Push Category Groups first!
    categoryGroups.forEach(group => {
      if (registeredNames.has(group.name)) return;
      registeredNames.add(group.name);

      const builder = new SlashCommandBuilder()
        .setName(group.name)
        .setDescription(group.desc.slice(0, 95));

      group.subcommands.forEach(sub => {
        builder.addSubcommand(subBuilder => {
          subBuilder.setName(sub.name).setDescription(sub.desc.slice(0, 95));
          if (sub.optionType === 'string') {
            subBuilder.addStringOption(o => o.setName(sub.optionName || 'input').setDescription(sub.optionDesc || 'Argument').setRequired(false));
          } else if (sub.optionType === 'user') {
            subBuilder.addUserOption(o => o.setName(sub.optionName || 'user').setDescription(sub.optionDesc || 'Target user').setRequired(false));
          } else if (sub.optionType === 'integer') {
            subBuilder.addIntegerOption(o => o.setName(sub.optionName || 'amount').setDescription(sub.optionDesc || 'Value').setRequired(false));
          }
          return subBuilder;
        });
      });

      rawCommands.push(builder.toJSON());
    });

    // ─────────────────────────────────────────────────────────
    // 2. TOP-LEVEL INDIVIDUAL COMMANDS (Fills remaining slots up to 100)
    // ─────────────────────────────────────────────────────────
    client.commands.forEach((cmd) => {
      if (rawCommands.length >= 100) return;
      if (!cmd || !cmd.name) return;
      const cleanName = String(cmd.name).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!cleanName || cleanName.length < 1 || cleanName.length > 32 || registeredNames.has(cleanName)) return;

      registeredNames.add(cleanName);

      const desc = String(cmd.description || `${cleanName} command`).slice(0, 95);

      const builder = new SlashCommandBuilder()
        .setName(cleanName)
        .setDescription(desc);

      if (['play', 'p', 'enlarge', 'e', 'steal', 'setavatar', 'setbanner', 'search', 'lyrics', 'say', 'embed', 'botnickname', 'botbio'].includes(cleanName)) {
        builder.addStringOption(opt => opt.setName('input').setDescription('Search query, link, image URL, or text').setRequired(false));
      } else if (['ban', 'kick', 'warn', 'userinfo', 'user', 'avatar', 'av', 'roleicon', 'giverole', 'addrole', 'rmrole', 'friend', 'girl', 'guest', 'staff', 'vip'].includes(cleanName)) {
        builder.addUserOption(opt => opt.setName('user').setDescription('Target member or user').setRequired(false));
      } else if (['purge', 'volume', 'vol', 'seek', 'limit', 'ranktheme'].includes(cleanName)) {
        builder.addIntegerOption(opt => opt.setName('amount').setDescription('Number or value').setRequired(false));
      } else {
        builder.addStringOption(opt => opt.setName('options').setDescription('Command arguments').setRequired(false));
      }

      rawCommands.push(builder.toJSON());
    });

    // Discord API caps top-level Application Commands at 100 per bot
    const finalCommands = rawCommands.slice(0, 100);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log(`⚡ [Slash Commands] Registering ${finalCommands.length} Application Slash Commands with Discord API...`);

    // 1. Global Registration (Single primary command list)
    await rest.put(Routes.applicationCommands(client.user.id), { body: finalCommands });
    console.log(`<a:accept_animated:1537177319603703969> [Slash Commands] Successfully registered ${finalCommands.length} Discord Slash Commands globally!`);

    // 2. Clear Guild-level Command Duplicates (Instantly removes duplicate entries from Discord UI)
    if (client.guilds && client.guilds.cache) {
      client.guilds.cache.forEach(async (guild) => {
        try {
          await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: [] });
          console.log(`🧹 [Slash Commands Cleanup] Removed duplicate guild commands for ${guild.name} (${guild.id})`);
        } catch (e) {}
      });
    }
  } catch (err) {
    console.error('<a:wrong_animated:1537179702928875631> [Slash Commands Registration Error]:', err.message);
  }
}

module.exports = { registerSlashCommands };
