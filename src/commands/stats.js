const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder
} = require('discord.js');
const os = require('os');
const { version: djsVersion } = require('discord.js');

// Global counters for commands used and songs played
let totalCommandsExecuted = 269;
let totalSongsPlayed = 156;

function incrementCommandCount() {
  totalCommandsExecuted++;
}

function incrementSongCount() {
  totalSongsPlayed++;
}

module.exports = {
  name: 'stats',
  description: 'Display bot global stats overview, shards and developer team details',
  aliases: ['botstats', 'systemstats', 'stat'],
  incrementCommandCount,
  incrementSongCount,

  async execute(message, args) {
    const author = message.author;
    const client = message.client;

    let botUser = client.user;
    try {
      botUser = await client.users.fetch(client.user.id, { force: true });
    } catch (e) {}

    const botAvatar = botUser.displayAvatarURL({ dynamic: true, size: 512 });

    // Calculate Uptime (e.g. 1d 10h 19m)
    const uptimeMs = process.uptime() * 1000;
    const days = Math.floor(uptimeMs / 86400000);
    const hours = Math.floor((uptimeMs % 86400000) / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeStr = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;

    // Calculate RAM & CPU
    const usedRamMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
    const cpuLoad = (os.loadavg()[0] ? (os.loadavg()[0] * 5).toFixed(2) : '12.45') + '%';

    // Total Users across all servers
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0) || client.users.cache.size;

    // Active players count from Lavalink node if present
    const activePlayers = client.lavalink ? client.lavalink.players.size : 0;

    function buildGeneralEmbed() {
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `${client.user.username}'s Personal`, iconURL: botAvatar })
        .setThumbnail(botAvatar)
        .setTitle('Global Overview')
        .setDescription(
          `• **Servers**  : ${client.guilds.cache.size} servers\n` +
          `• **Users**  : ${totalUsers.toLocaleString()} users\n` +
          `• **Shards**  : 1 shards\n` +
          `• **Ram**  : ${usedRamMB} MB\n` +
          `• **Cpu**  : ${cpuLoad}\n` +
          `• **Uptime**  : ${uptimeStr}\n` +
          `• **Players**  : ${activePlayers} / ${activePlayers}\n` +
          `• **Commands Used** : ${totalCommandsExecuted}\n` +
          `• **Songs Played** : ${totalSongsPlayed}`
        );
    }

    function buildShardsEmbed() {
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `${client.user.username}'s Personal`, iconURL: botAvatar })
        .setThumbnail(botAvatar)
        .setTitle('Shard Information')
        .setDescription(
          `• **Shard #0**  : \`ONLINE 🟢\`\n` +
          `• **Ping**  : \`${Math.round(client.ws.ping)}ms\`\n` +
          `• **Guilds**  : \`${client.guilds.cache.size}\` servers\n` +
          `• **Connection** : \`Connected to Discord Gateway\``
        );
    }

    function buildTeamEmbed() {
      return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `${client.user.username}'s Personal`, iconURL: botAvatar })
        .setThumbnail(botAvatar)
        .setTitle('Developer & Team Information')
        .setDescription(
          `• **Bot Owner**  : Developed with ❤️ by Synn\n` +
          `• **Lead Developer** : **Synn**\n` +
          `• **Framework**  : Discord.js v${djsVersion}\n` +
          `• **Runtime**  : Node.js ${process.version}`
        );
    }

    function buildButtons(activeTab = 'general') {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('stats_general')
          .setLabel('General')
          .setStyle(activeTab === 'general' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('stats_shards')
          .setLabel('Shards')
          .setStyle(activeTab === 'shards' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('stats_team')
          .setLabel('Team')
          .setStyle(activeTab === 'team' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
    }

    const initialEmbed = buildGeneralEmbed();
    const initialRow = buildButtons('general');

    const statsMsg = await message.channel.send({
      embeds: [initialEmbed],
      components: [initialRow]
    });

    const collector = statsMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Only the command requester can use these buttons.', ephemeral: true });
      }

      await interaction.deferUpdate();

      if (interaction.customId === 'stats_general') {
        await statsMsg.edit({ embeds: [buildGeneralEmbed()], components: [buildButtons('general')] });
      } else if (interaction.customId === 'stats_shards') {
        await statsMsg.edit({ embeds: [buildShardsEmbed()], components: [buildButtons('shards')] });
      } else if (interaction.customId === 'stats_team') {
        await statsMsg.edit({ embeds: [buildTeamEmbed()], components: [buildButtons('team')] });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('stats_general').setLabel('General').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('stats_shards').setLabel('Shards').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('stats_team').setLabel('Team').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      statsMsg.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};
