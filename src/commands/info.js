const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version: djsVersion } = require('discord.js');
const os = require('os');
const db = require('../database/db');

// Global AFK store (userId -> { reason, timestamp })
const afkStore = new Map();

// Global Snipe store (channelId -> { author, content, image, timestamp })
const snipeStore = new Map();

function buildServerInfoMainEmbed(guild, owner, author, clientUser) {
  const createdAt = `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:F>`;
  const channels = guild.channels.cache;
  const textChannels = channels.filter(c => c.type === 0).size;
  const voiceChannels = channels.filter(c => c.type === 2).size;
  const categoryChannels = channels.filter(c => c.type === 4).size;
  const forumChannels = channels.filter(c => c.type === 15).size;

  const regularEmojis = guild.emojis.cache.filter(e => !e.animated).size;
  const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
  const totalEmojis = guild.emojis.cache.size;

  const roleCount = Math.max(0, guild.roles.cache.size - 1);
  const rolesList = guild.roles.cache
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => `${r}`)
    .slice(0, 10)
    .join('\n') || '*None*';

  const remainingRoles = Math.max(0, roleCount - 10);
  const rolesFooter = remainingRoles > 0 ? `\n*...and ${remainingRoles} more*` : '';

  const featuresList = guild.features && guild.features.length > 0
    ? guild.features.slice(0, 12).map(f => `\`${f.replace(/_/g, ' ')}\``).join(' • ')
    : '`STANDARD`';

  const banner = guild.bannerURL({ dynamic: true, size: 1024 });

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setAuthor({ name: `ℹ️ ${guild.name} • Server Information`, iconURL: guild.iconURL({ dynamic: true }) || clientUser.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || clientUser.displayAvatarURL({ dynamic: true }))
    .setDescription(
      `**ℹ️ About**\n` +
      `• **Name:** ${guild.name}\n` +
      `• **ID:** \`${guild.id}\`\n` +
      `• **Owner ${emojis.OWNER_CROWN || '👑'} :** ${owner ? owner.user.username : 'Unknown'} (<@${guild.ownerId}>)\n` +
      `• **Created At:** ${createdAt}\n` +
      `• **Members:** **${guild.memberCount.toLocaleString()}**\n\n` +
      (guild.description ? `**📝 Description**\n${guild.description}\n\n` : '') +
      `──────────────────────────────────────────\n\n` +
      `**⚙️ General Stats**\n` +
      `• **Verification Level:** \`${guild.verificationLevel || 'None'}\`\n` +
      `• **Channels:** \`${channels.size}\` | **Roles:** \`${roleCount}\` | **Emojis:** \`${totalEmojis}\`\n` +
      `• **Boost Status:** Level ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} Boosts)\n\n` +
      `──────────────────────────────────────────\n\n` +
      `**📁 Channels**\n` +
      `• **Total:** \`${channels.size}\` (${textChannels} text, ${voiceChannels} voice, ${categoryChannels} categories, ${forumChannels} forum)\n\n` +
      `──────────────────────────────────────────\n\n` +
      `**🎨 Emoji Info**\n` +
      `• Regular: \`${regularEmojis}/250\` | Animated: \`${animatedEmojis}/250\` | Total Emoji: \`${totalEmojis}/500\`\n\n` +
      `──────────────────────────────────────────\n\n` +
      `**🚀 Boost Status**\n` +
      `• Level: \`${guild.premiumTier}\` [ \`${guild.premiumSubscriptionCount || 0}\` boosts ]\n\n` +
      `──────────────────────────────────────────\n\n` +
      `**🛡️ Guild Features**\n` +
      `${featuresList}\n\n` +
      `──────────────────────────────────────────\n\n` +
      `**🎭 Server Roles [ ${roleCount} ]**\n` +
      `${rolesList}${rolesFooter}`
    )
    .setFooter({
      text: `Requested By ${author.username} • Realtime Server Info`,
      iconURL: author.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();

  if (banner) embed.setImage(banner);
  return embed;
}

function buildServerInfoRow1(activeTab = 'overview') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sinfo_overview')
      .setLabel('Overview')
      .setEmoji(emojis.OBJ_STATS || 'ℹ️')
      .setStyle(activeTab === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('sinfo_channels')
      .setLabel('Channels')
      .setEmoji(emojis.OBJ_TOOLS || '📁')
      .setStyle(activeTab === 'channels' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('sinfo_emojis')
      .setLabel('Emojis')
      .setEmoji(emojis.OBJ_REACTIONROLES || '🎨')
      .setStyle(activeTab === 'emojis' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('sinfo_features')
      .setLabel('Features')
      .setEmoji(emojis.OBJ_SHIELD || '🛡️')
      .setStyle(activeTab === 'features' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('sinfo_roles')
      .setLabel('Roles')
      .setEmoji(emojis.OBJ_ROLES || '🎭')
      .setStyle(activeTab === 'roles' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildServerInfoRow2(guild) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sinfo_icon')
      .setLabel('Server Icon')
      .setEmoji('🖼️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('sinfo_banner')
      .setLabel('Server Banner')
      .setEmoji('🌆')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!guild.bannerURL()),
    new ButtonBuilder()
      .setCustomId('sinfo_splash')
      .setLabel('Invite Splash')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!guild.splashURL()),
    new ButtonBuilder()
      .setCustomId('sinfo_refresh')
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success)
  );
}

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
      let activeTab = 'overview';

      let embed = buildServerInfoMainEmbed(guild, owner, author, clientUser);
      let row1 = buildServerInfoRow1(activeTab);
      let row2 = buildServerInfoRow2(guild);

      const msg = await message.channel.send({ embeds: [embed], components: [row1, row2] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.customId === 'sinfo_icon') {
          const icon = guild.iconURL({ dynamic: true, size: 1024 });
          const iconEmbed = createStyledEmbed({
            title: `🖼️ ${guild.name} — Server Icon`,
            bannerUrl: icon,
            requestedBy: author,
            clientUser
          });
          return i.reply({ embeds: [iconEmbed], ephemeral: true });
        } else if (i.customId === 'sinfo_banner') {
          const banner = guild.bannerURL({ dynamic: true, size: 1024 });
          const bannerEmbed = createStyledEmbed({
            title: `🖼️ ${guild.name} — Server Banner`,
            bannerUrl: banner,
            requestedBy: author,
            clientUser
          });
          return i.reply({ embeds: [bannerEmbed], ephemeral: true });
        } else if (i.customId === 'sinfo_splash') {
          const splash = guild.splashURL({ dynamic: true, size: 1024 });
          const splashEmbed = createStyledEmbed({
            title: `🖼️ ${guild.name} — Invite Splash`,
            bannerUrl: splash,
            requestedBy: author,
            clientUser
          });
          return i.reply({ embeds: [splashEmbed], ephemeral: true });
        } else if (i.customId.startsWith('sinfo_')) {
          activeTab = i.customId.replace('sinfo_', '');
          const newEmbed = buildServerInfoMainEmbed(guild, owner, author, clientUser);
          const newRow1 = buildServerInfoRow1(activeTab);
          const newRow2 = buildServerInfoRow2(guild);
          return i.update({ embeds: [newEmbed], components: [newRow1, newRow2] });
        }
      });

      collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
      return;
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
        title: `🏓 Pong!`,
        fields: [
          { name: '⚡ Bot Latency', value: `\`${latency}ms\``, inline: true },
          { name: '🌐 Discord API Ping', value: `\`${apiPing}ms\``, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }
  }
};
