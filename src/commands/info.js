const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const db = require('../database/db');

// Global AFK store (userId -> { reason, timestamp })
const afkStore = new Map();

// Global Snipe store (channelId -> { author, content, image, timestamp })
const snipeStore = new Map();

module.exports = {
  name: 'info',
  description: 'Utility Commands: activity, afk, avatar, roleinfo, serverbanner, servericon, serverinfo, snipe, userinfo',
  aliases: [
    'ping', 'about', 'invite', 'node',
    'profile', 'serverinfo', 'server', 'si',
    'userinfo', 'user', 'membercount',
    'botinfo', 'uptime', 'vote', 'support',
    'afk', 'avatar', 'av', 'roleinfo', 'serverbanner', 'servericon', 'snipe'
  ],
  snipeStore,
  afkStore,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const guild = message.guild;
    const author = message.author;
    const targetUser = message.mentions.users.first() || message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 💤 AFK [reason]
    if (invoked === 'afk') {
      const reason = args.join(' ') || 'AFK';
      afkStore.set(author.id, { reason, timestamp: Date.now() });

      const embed = createStyledEmbed({
        title: `💤 AFK Status Set`,
        description: `<@${author.id}> is now AFK: **${reason}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🏠 SERVERINFO / SERVER / SI
    if (['serverinfo', 'server', 'si'].includes(invoked)) {
      const owner = await guild.fetchOwner().catch(() => null);
      const createdAt = `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:F>`;
      const channels = guild.channels.cache;
      const textChannels = channels.filter(c => c.type === 0).size;
      const voiceChannels = channels.filter(c => c.type === 2).size;
      const categoryChannels = channels.filter(c => c.type === 4).size;

      const regularEmojis = guild.emojis.cache.filter(e => !e.animated).size;
      const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
      const totalEmojis = guild.emojis.cache.size;

      const rolesList = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => `${r}`)
        .slice(0, 10)
        .join('\n') || '*None*';

      const roleCount = Math.max(0, guild.roles.cache.size - 1);

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: `ℹ️ ${guild.name} • Server Information`, iconURL: guild.iconURL({ dynamic: true }) || clientUser.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || clientUser.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**About**\n` +
          `**Name:** ${guild.name}\n` +
          `**ID:** \`${guild.id}\`\n` +
          `**Owner 👑 :** ${owner ? owner.user.username : 'Unknown'} (<@${guild.ownerId}>)\n` +
          `**Created At:** ${createdAt}\n` +
          `**Members:** ${guild.memberCount}\n\n` +
          `──────────────────────────────────────────\n\n` +
          `**General Stats**\n` +
          `**Verification Level:** ${guild.verificationLevel || 'None'}\n` +
          `**Channels:** ${channels.size}\n` +
          `**Roles:** ${roleCount}\n` +
          `**Emojis:** ${totalEmojis}\n` +
          `**Boost Status:** Level ${guild.premiumTier} (Boosts: ${guild.premiumSubscriptionCount || 0})\n\n` +
          `──────────────────────────────────────────\n\n` +
          `**Channels**\n` +
          `**Total:** ${channels.size}\n` +
          `Channels: ${textChannels} text, ${voiceChannels} voice, ${categoryChannels} categories\n\n` +
          `──────────────────────────────────────────\n\n` +
          `**Emoji Info**\n` +
          `Regular: ${regularEmojis}/50\n` +
          `Animated: ${animatedEmojis}/50\n` +
          `Total Emoji: ${totalEmojis}/100\n\n` +
          `──────────────────────────────────────────\n\n` +
          `**Boost Status**\n` +
          `Level: ${guild.premiumTier} [ ${guild.premiumSubscriptionCount || 0} boosts ]\n\n` +
          `──────────────────────────────────────────\n\n` +
          `**Server Roles [ ${roleCount} ]**\n` +
          `${rolesList}`
        )
        .setFooter({
          text: `Requested By ${author.username}`,
          iconURL: author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    // 🖼️ AVATAR / AV [@user]
    if (['avatar', 'av'].includes(invoked)) {
      const pfp = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
      const embed = createStyledEmbed({
        title: `🖼️ ${targetUser.username}'s Avatar`,
        bannerUrl: pfp,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🎭 ROLEINFO <@role>
    if (invoked === 'roleinfo') {
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[0]);
      if (!role) return message.reply(`${emojis.WARNING} Usage: \`.roleinfo <@role>\``);

      const embed = createStyledEmbed({
        title: `🎭 Role Info — ${role.name}`,
        fields: [
          { name: '🆔 Role ID', value: `\`${role.id}\``, inline: true },
          { name: '🎨 Color', value: `\`${role.hexColor}\``, inline: true },
          { name: '👥 Members', value: `\`${role.members.size}\``, inline: true },
          { name: '📍 Position', value: `\`${role.position}\``, inline: true },
          { name: '⚙️ Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
          { name: '📌 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🖼️ SERVERBANNER
    if (invoked === 'serverbanner') {
      const banner = guild.bannerURL({ dynamic: true, size: 1024 });
      if (!banner) return message.reply(`${emojis.WARNING} This server has no banner set.`);

      const embed = createStyledEmbed({
        title: `🖼️ ${guild.name} — Server Banner`,
        bannerUrl: banner,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🖼️ SERVERICON
    if (invoked === 'servericon') {
      const icon = guild.iconURL({ dynamic: true, size: 1024 });
      if (!icon) return message.reply(`${emojis.WARNING} This server has no icon set.`);

      const embed = createStyledEmbed({
        title: `🖼️ ${guild.name} — Server Icon`,
        bannerUrl: icon,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🎯 SNIPE
    if (invoked === 'snipe') {
      const sniped = snipeStore.get(message.channel.id);
      if (!sniped) return message.reply(`${emojis.WARNING} Nothing to snipe in this channel!`);

      const embed = createStyledEmbed({
        title: `🎯 Sniped Message`,
        subtitle: `Deleted by ${sniped.author.tag}`,
        description: sniped.content || '*[Image / Attachment]*',
        bannerUrl: sniped.image || null,
        requestedBy: author,
        clientUser,
        footerText: `Deleted <t:${Math.floor(sniped.timestamp / 1000)}:R>`
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🏓 PING
    if (invoked === 'ping') {
      const sent = await message.channel.send('🏓 Pinging...');
      const latency = sent.createdTimestamp - message.createdTimestamp;
      const apiPing = Math.round(message.client.ws.ping);
      await sent.delete().catch(() => {});

      const embed = createStyledEmbed({
        title: `🏓 Pong! — Response Speed`,
        fields: [
          { name: '⚡ Message Latency', value: `\`${latency}ms\``, inline: true },
          { name: '🌐 API Latency', value: `\`${apiPing}ms\``, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🤖 ABOUT
    if (['about', 'botinfo'].includes(invoked)) {
      const embed = createStyledEmbed({
        title: `${emojis.NARUTO} About Naruto Bot`,
        description: `A feature-rich All-In-One Discord bot built with a Naruto Shinobi theme.`,
        fields: [
          { name: '👨‍💻 Developer', value: `Developed with ❤️ by Synn`, inline: true },
          { name: '🌐 Discord.js', value: `v${djsVersion}`, inline: true },
          { name: '⚙️ Node.js', value: `${process.version}`, inline: true },
          { name: '🏠 Servers', value: `\`${message.client.guilds.cache.size}\``, inline: true },
          { name: '👥 Users', value: `\`${message.client.users.cache.size}\``, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 👤 PROFILE / USERINFO
    if (['profile', 'userinfo', 'user'].includes(invoked)) {
      const member = guild.members.cache.get(targetUser.id);
      const createdAt = `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:F>`;

      const embed = createStyledEmbed({
        title: `👤 ${targetUser.username}'s Profile`,
        fields: [
          { name: '🪪 Username', value: `\`${targetUser.tag}\``, inline: true },
          { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
          { name: '📅 Account Created', value: createdAt, inline: false }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🏠 SERVERINFO / SERVER
    if (['serverinfo', 'server'].includes(invoked)) {
      const embed = createStyledEmbed({
        title: `🏠 ${guild.name} — Server Info`,
        fields: [
          { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
          { name: '👥 Members', value: `\`${guild.memberCount}\``, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Utility Help
    const embed = createStyledEmbed({
      title: `${emojis.STATS_NEW} Utility Commands`,
      description:
        `\`.activity\` — Server activity stats\n` +
        `\`.afk [reason]\` — Set AFK status\n` +
        `\`.avatar [@user]\` — View high-res avatar\n` +
        `\`.roleinfo <@role>\` — View role details\n` +
        `\`.serverbanner\` — View server banner\n` +
        `\`.servericon\` — View server icon\n` +
        `\`.serverinfo\` — View server information\n` +
        `\`.snipe\` — Snipe recently deleted message\n` +
        `\`.userinfo [@user]\` — View user information`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
