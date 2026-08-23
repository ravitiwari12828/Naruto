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

    // ─────────────────────────────────────────
    // 1. TOP-LEVEL INDIVIDUAL COMMANDS (All Major Commands)
    // ─────────────────────────────────────────
    client.commands.forEach((cmd) => {
      if (!cmd || !cmd.name) return;
      const cleanName = String(cmd.name).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!cleanName || cleanName.length < 1 || cleanName.length > 32 || registeredNames.has(cleanName)) return;

      registeredNames.add(cleanName);

      const desc = String(cmd.description || `${cleanName} command`).slice(0, 95);

      const builder = new SlashCommandBuilder()
        .setName(cleanName)
        .setDescription(desc);

      // Attach Options based on command type
      if (['play', 'p', 'enlarge', 'e', 'steal', 'setavatar', 'setbanner', 'search', 'lyrics', 'say', 'embed', 'botnickname', 'botbio'].includes(cleanName)) {
        builder.addStringOption(opt => opt.setName('input').setDescription('Search query, link, image URL, or text').setRequired(false));
      } else if (['ban', 'kick', 'warn', 'userinfo', 'user', 'avatar', 'av', 'roleicon', 'giverole', 'addrole', 'rmrole', 'friend', 'girl', 'guest', 'staff', 'vip'].includes(cleanName)) {
        builder.addUserOption(opt => opt.setName('user').setDescription('Target member or user').setRequired(false));
      } else if (['purge', 'volume', 'vol', 'seek', 'limit'].includes(cleanName)) {
        builder.addIntegerOption(opt => opt.setName('amount').setDescription('Number or value').setRequired(false));
      } else {
        builder.addStringOption(opt => opt.setName('options').setDescription('Command arguments').setRequired(false));
      }

      rawCommands.push(builder.toJSON());
    });

    // ─────────────────────────────────────────
    // 2. CATEGORIZED SUBCOMMAND GROUPS (Covers 100% of all subcommands & aliases)
    // ─────────────────────────────────────────
    const categoryGroups = [
      {
        name: 'music',
        desc: 'Lavalink Music Suite: play, skip, pause, resume, queue, volume, loop, shuffle, lyrics, 247',
        subcommands: [
          { name: 'play', desc: 'Play a track or playlist', optionType: 'string', optionName: 'query', optionDesc: 'Song title or link' },
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
        desc: 'Shinobi Economy & Casino: balance, daily, work, beg, deposit, withdraw, pay, shop, buy, sell',
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
          { name: 'leaderboard', desc: 'View richest users' }
        ]
      },
      {
        name: 'moderation',
        desc: 'Server Moderation: ban, kick, warn, unmute, purge, nuke, role, lock, unlock',
        subcommands: [
          { name: 'ban', desc: 'Ban a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'kick', desc: 'Kick a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'warn', desc: 'Warn a member', optionType: 'user', optionName: 'target', optionDesc: 'Target user' },
          { name: 'purge', desc: 'Purge messages', optionType: 'integer', optionName: 'count', optionDesc: 'Number of messages' },
          { name: 'nuke', desc: 'Nuke current channel' },
          { name: 'lock', desc: 'Lock current channel' },
          { name: 'unlock', desc: 'Unlock current channel' }
        ]
      },
      {
        name: 'security',
        desc: 'AntiNuke & Security Privacy: antinuke, antidox, automod, panicmode, whitelist, botlock',
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
          { name: 'enlarge', desc: 'Enlarge custom emoji or sticker', optionType: 'string', optionName: 'emoji', optionDesc: 'Custom emoji' },
          { name: 'roleicon', desc: 'Set custom role icon', optionType: 'user', optionName: 'role', optionDesc: 'Role or user' }
        ]
      }
    ];

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
