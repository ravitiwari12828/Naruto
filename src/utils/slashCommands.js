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

    client.commands.forEach((cmd) => {
      if (!cmd || !cmd.name) return;
      const cleanName = String(cmd.name).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!cleanName || cleanName.length < 1 || cleanName.length > 32 || registeredNames.has(cleanName)) return;

      registeredNames.add(cleanName);

      const desc = String(cmd.description || `${cleanName} command`).slice(0, 95);

      const builder = new SlashCommandBuilder()
        .setName(cleanName)
        .setDescription(desc);

      // Dynamically attach parameters for intuitive Slash usage
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

    // Discord API caps top-level Application Commands at 100 per bot
    const finalCommands = rawCommands.slice(0, 100);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log(`⚡ [Slash Commands] Registering ${finalCommands.length} Application Slash Commands with Discord API...`);

    await rest.put(Routes.applicationCommands(client.user.id), { body: finalCommands });
    console.log(`<a:accept_animated:1537177319603703969> [Slash Commands] Successfully registered ${finalCommands.length} Discord Slash Commands globally!`);
  } catch (err) {
    console.error('<a:wrong_animated:1537179702928875631> [Slash Commands Registration Error]:', err.message);
  }
}

module.exports = { registerSlashCommands };
