const { REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');

async function registerSlashCommands(client) {
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a track from YouTube, Spotify, or SoundCloud')
        .addStringOption(option => option.setName('query').setDescription('Song title, link, or keywords').setRequired(true)),

      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Interactive Multi-Module Help Panel'),

      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View Naruto Bot System & Server Analytics Stats'),

      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check Bot Latency & Gateway WebSocket Ping'),

      new SlashCommandBuilder()
        .setName('antidox')
        .setDescription('Configure Anti-Dox Security Privacy Suite')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(false)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' },
              { name: 'Status', value: 'status' }
            )
        ),

      new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('AntiNuke & Server Security Configuration'),

      new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('User to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban').setRequired(false)),

      new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('User to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick').setRequired(false)),

      new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Purge/Delete messages from channel')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log('⚡ [Slash Commands] Registering Application Slash Commands with Discord API...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(c => c.toJSON()) });
    console.log('<a:accept_animated:1537177319603703969> [Slash Commands] Successfully registered Discord Slash Commands globally!');
  } catch (err) {
    console.error('<a:wrong_animated:1537179702928875631> [Slash Commands Registration Error]:', err.message);
  }
}

module.exports = { registerSlashCommands };
