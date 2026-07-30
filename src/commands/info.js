const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { createAdaptiveButton } = require('../utils/buttonTheme');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version: djsVersion } = require('discord.js');

const os = require('os');
const db = require('../database/db');

// Global AFK store (userId -> { reason, timestamp })
const afkStore = new Map();

// Global Snipe store (channelId -> { author, content, image, timestamp })
const snipeStore = new Map();

function buildServerInfoMainEmbed(guild, owner, activeTab = 'overview', author, clientUser) {
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
    .slice(0, 15)
    .join('\n') || '*None*';

  const remainingRoles = Math.max(0, roleCount - 15);
  const rolesFooter = remainingRoles > 0 ? `\n*...and ${remainingRoles} more*` : '';

  const featuresList = guild.features && guild.features.length > 0
    ? guild.features.slice(0, 12).map(f => `\`${f.replace(/_/g, ' ')}\``).join(' • ')
    : '`STANDARD`';

  const banner = guild.bannerURL({ dynamic: true, size: 1024 });

  let title = `${guild.name} • Server Information`;
  let description = '';

  if (activeTab === 'channels') {
    title = `${guild.name} • Channels Breakdown`;
    description =
      '```\n' +
      '╭──────────────────────────╮\n' +
      '│    CHANNELS BREAKDOWN    │\n' +
      '├──────────────────────────┤\n' +
      '│ Total     : ' + String(channels.size).padEnd(12, ' ') + ' │\n' +
      '│ Text      : ' + String(textChannels).padEnd(12, ' ') + ' │\n' +
      '│ Voice     : ' + String(voiceChannels).padEnd(12, ' ') + ' │\n' +
      '│ Categories: ' + String(categoryChannels).padEnd(12, ' ') + ' │\n' +
      '│ Forum     : ' + String(forumChannels).padEnd(12, ' ') + ' │\n' +
      '╰──────────────────────────╯\n' +
      '```';
  } else if (activeTab === 'emojis') {
    title = `${guild.name} • Emojis Information`;
    description =
      '```\n' +
      '╭──────────────────────────╮\n' +
      '│    EMOJI INFORMATION     │\n' +
      '├──────────────────────────┤\n' +
      '│ Regular   : ' + String(regularEmojis + '/250').padEnd(12, ' ') + ' │\n' +
      '│ Animated  : ' + String(animatedEmojis + '/250').padEnd(12, ' ') + ' │\n' +
      '│ Total     : ' + String(totalEmojis + '/500').padEnd(12, ' ') + ' │\n' +
      '╰──────────────────────────╯\n' +
      '```';
  } else if (activeTab === 'features') {
    title = `${guild.name} • Guild Features`;
    description =
      `${emojis.ANTINUKE} **Unlocked Discord Features**\n\n` +
      `${featuresList}`;
  } else if (activeTab === 'roles') {
    title = `${guild.name} • Server Roles [ ${roleCount} ]`;
    description =
      `${emojis.ROLES} **Top Hierarchy Roles**\n\n` +
      `${rolesList}${rolesFooter}`;
  } else if (activeTab === 'icon') {
    const iconURL = guild.iconURL({ dynamic: true, size: 1024 });
    title = `${guild.name} • Server Icon`;
    description = iconURL ? `🖼️ **Server Icon Image**\n[Click for High-Res Original Image](${iconURL})` : `${emojis.WARNING} *This server does not have an icon.*`;
  } else if (activeTab === 'banner') {
    const bannerURL = guild.bannerURL({ dynamic: true, size: 1024 });
    title = `${guild.name} • Server Banner`;
    description = bannerURL ? `🌆 **Server Banner Image**\n[Click for High-Res Original Image](${bannerURL})` : `${emojis.WARNING} *This server does not have a banner.*`;
  } else if (activeTab === 'splash') {
    const splashURL = guild.splashURL({ dynamic: true, size: 1024 });
    title = `${guild.name} • Invite Splash`;
    description = splashURL ? `🎨 **Invite Splash Image**\n[Click for High-Res Original Image](${splashURL})` : `${emojis.WARNING} *This server does not have an invite splash.*`;
  } else {
    // OVERVIEW
    const ownerName = owner ? owner.user.username : 'Unknown';
    const boxText =
      '```\n' +
      '╭──────────────────────────╮\n' +
      '│     SERVER OVERVIEW      │\n' +
      '├──────────────────────────┤\n' +
      '│ Server    : ' + String(guild.name).slice(0, 12).padEnd(12, ' ') + ' │\n' +
      '│ Server ID : ' + String(guild.id).slice(0, 12).padEnd(12, ' ') + ' │\n' +
      '│ Owner     : ' + String(ownerName).slice(0, 12).padEnd(12, ' ') + ' │\n' +
      '│ Members   : ' + String(guild.memberCount).padEnd(12, ' ') + ' │\n' +
      '│ Channels  : ' + String(channels.size).padEnd(12, ' ') + ' │\n' +
      '│ Roles     : ' + String(roleCount).padEnd(12, ' ') + ' │\n' +
      '│ Boosts    : ' + String('Lvl ' + guild.premiumTier + ' (' + (guild.premiumSubscriptionCount || 0) + ')').slice(0, 12).padEnd(12, ' ') + ' │\n' +
      '╰──────────────────────────╯\n' +
      '```';

    description =
      boxText + `\n\n` +
      `**Owner:** <@${guild.ownerId}> • **Created:** ${createdAt}\n\n` +
      `${emojis.ANTINUKE} **Guild Features**\n${featuresList}\n\n` +
      `${emojis.ROLES} **Top Server Roles [ ${roleCount} ]**\n${rolesList}${rolesFooter}`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x7E0808)
    .setAuthor({ name: title, iconURL: guild.iconURL({ dynamic: true }) || clientUser.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || clientUser.displayAvatarURL({ dynamic: true }))
    .setDescription(description)
    .setFooter({
      text: `Requested By ${author.username} • Realtime Server Info`,
      iconURL: author.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();

  if (activeTab === 'icon' && guild.iconURL()) embed.setImage(guild.iconURL({ dynamic: true, size: 1024 }));
  else if (activeTab === 'banner' && guild.bannerURL()) embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
  else if (activeTab === 'splash' && guild.splashURL()) embed.setImage(guild.splashURL({ dynamic: true, size: 1024 }));
  else if (banner) embed.setImage(banner);

  return embed;
}

function buildServerInfoRow1(activeTab = 'overview') {
  return new ActionRowBuilder().addComponents(
    createAdaptiveButton({ customId: 'sinfo_overview', label: 'Overview', emoji: emojis.OBJ_OVERVIEW, isActive: activeTab === 'overview' }),
    createAdaptiveButton({ customId: 'sinfo_channels', label: 'Channels', emoji: emojis.OBJ_CHANNELS, isActive: activeTab === 'channels' }),
    createAdaptiveButton({ customId: 'sinfo_emojis', label: 'Emojis', emoji: emojis.OBJ_EMOJIS, isActive: activeTab === 'emojis' })
  );
}

function buildServerInfoRow2(guild, activeTab = 'overview') {
  return new ActionRowBuilder().addComponents(
    createAdaptiveButton({ customId: 'sinfo_features', label: 'Features', emoji: emojis.OBJ_FEATURES, isActive: activeTab === 'features' }),
    createAdaptiveButton({ customId: 'sinfo_roles', label: 'Roles', emoji: emojis.OBJ_ROLES, isActive: activeTab === 'roles' }),
    createAdaptiveButton({ customId: 'sinfo_icon', label: 'Icon', emoji: emojis.OBJ_ICON, isActive: activeTab === 'icon' })
  );
}

function buildServerInfoRow3(guild, activeTab = 'overview') {
  return new ActionRowBuilder().addComponents(
    createAdaptiveButton({ customId: 'sinfo_banner', label: 'Banner', emoji: emojis.OBJ_BANNER, isActive: activeTab === 'banner', disabled: !guild.bannerURL() }),
    createAdaptiveButton({ customId: 'sinfo_splash', label: 'Splash', emoji: emojis.OBJ_SPLASH, isActive: activeTab === 'splash', disabled: !guild.splashURL() }),
    createAdaptiveButton({ customId: 'sinfo_refresh', label: 'Refresh', emoji: emojis.OBJ_REFRESH, type: 'action' })
  );
}





module.exports = {
  name: 'info',
  description: 'Utility Commands: activity, afk, avatar, roleinfo, serverbanner, servericon, serverinfo, snipe, userinfo',
  buildServerInfoMainEmbed,
  buildServerInfoRow1,
  buildServerInfoRow2,
  buildServerInfoRow3,

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
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const guild = message.guild;
    const author = message.author;
    const targetUser = message.mentions.users.first() || message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ℹ️ INFO / BOTINFO / ABOUT / NODE / UPTIME
    if (['info', 'botinfo', 'about', 'node', 'uptime'].includes(invoked)) {
      const totalGuilds = message.client.guilds.cache.size;
      const totalUsers = message.client.users.cache.size;
      const uptimeSec = Math.floor(message.client.uptime / 1000);
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec % 86400) / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const uptimeStr = `${days}d ${hours}h ${mins}m`;
      const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const ping = Math.round(message.client.ws.ping);

      const boxText =
        '```\n' +
        '╭──────────────────────────╮\n' +
        '│     BOT & SYSTEM INFO    │\n' +
        '├──────────────────────────┤\n' +
        '│ Bot Name : Naruto Shinobi│\n' +
        '│ Prefix   : .             │\n' +
        '│ Guilds   : ' + String(totalGuilds).padEnd(13, ' ') + ' │\n' +
        '│ Users    : ' + String(totalUsers).padEnd(13, ' ') + ' │\n' +
        '│ Ping     : ' + String(ping + 'ms').padEnd(13, ' ') + ' │\n' +
        '│ Memory   : ' + String(memUsage + ' MB').padEnd(13, ' ') + ' │\n' +
        '│ Uptime   : ' + String(uptimeStr).padEnd(13, ' ') + ' │\n' +
        '│ Node.js  : ' + String(process.version).padEnd(13, ' ') + ' │\n' +
        '│ Discord.js: ' + String('v' + djsVersion).padEnd(13, ' ') + ' │\n' +
        '╰──────────────────────────╯\n' +
        '```';

      const embed = createStyledEmbed({
        title: `${emojis.STATS_NEW || '📈'} Naruto Bot Information & System Metrics`,
        subtitle: `Developed with ❤️ by Synn • All-In-One Shinobi Bot`,
        description:
          boxText + `\n\n` +
          `**⚡ Quick Info Links:**\n` +
          `[Support Server](https://discord.gg/ZPKcPreUMT) • [Invite Bot](https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands)\n\n` +
          `*Type \`.help\` to view all 24 active system modules and 545+ commands!*`,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // 💤 AFK [reason]
    if (invoked === 'afk') {
      const reason = args.join(' ') || 'I am afk :)';
      const authorId = author.id;

      const afkData = {
        reason,
        timestamp: Date.now(),
        scope: 'global',
        guildId: guild.id,
        notifyDM: true
      };

      afkStore.set(authorId, afkData);

      function buildAfkEmbed(data) {
        const scopeText = data.scope === 'global' ? 'Global' : 'Server Only';
        const dmText = data.notifyDM ? 'Enabled' : 'Disabled';

        const boxText =
          '```\n' +
          '╭──────────────────────────╮\n' +
          '│       AFK SETTINGS       │\n' +
          '├──────────────────────────┤\n' +
          '│ Status   : ACTIVE (AFK)  │\n' +
          '│ Reason   : ' + String(data.reason || 'I am afk :)').slice(0, 13).padEnd(13, ' ') + ' │\n' +
          '│ Scope    : ' + scopeText.padEnd(13, ' ') + ' │\n' +
          '│ DM Notify: ' + dmText.padEnd(13, ' ') + ' │\n' +
          '╰──────────────────────────╯\n' +
          '```';

        return createStyledEmbed({
          title: `${emojis.SUCCESS} AFK Status Configured`,
          subtitle: `<@${authorId}>, you are now marked as AFK.`,
          description: boxText,
          requestedBy: author,
          clientUser
        });
      }

      function buildAfkButtons(data) {
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`afk_scope_global_${authorId}`)
            .setLabel('🌐 Global AFK')
            .setStyle(data.scope === 'global' ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`afk_scope_server_${authorId}`)
            .setLabel('🏠 Server Only')
            .setStyle(data.scope === 'server' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`afk_dm_enable_${authorId}`)
            .setLabel('🔔 Enable DM Mention')
            .setStyle(data.notifyDM ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`afk_dm_disable_${authorId}`)
            .setLabel('🔕 Disable DM Mention')
            .setStyle(!data.notifyDM ? ButtonStyle.Danger : ButtonStyle.Secondary)
        );

        return [row1, row2];
      }

      const msg = await message.channel.send({
        embeds: [buildAfkEmbed(afkData)],
        components: buildAfkButtons(afkData)
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === authorId,
        time: 300000
      });

      collector.on('collect', async (i) => {
        const curData = afkStore.get(authorId) || afkData;

        if (i.customId.startsWith('afk_scope_global_')) {
          curData.scope = 'global';
          afkStore.set(authorId, curData);
          await i.update({ embeds: [buildAfkEmbed(curData)], components: buildAfkButtons(curData) }).catch(() => {});
        } else if (i.customId.startsWith('afk_scope_server_')) {
          curData.scope = 'server';
          afkStore.set(authorId, curData);
          await i.update({ embeds: [buildAfkEmbed(curData)], components: buildAfkButtons(curData) }).catch(() => {});
        } else if (i.customId.startsWith('afk_dm_enable_')) {
          curData.notifyDM = true;
          afkStore.set(authorId, curData);
          await i.update({ embeds: [buildAfkEmbed(curData)], components: buildAfkButtons(curData) }).catch(() => {});
        } else if (i.customId.startsWith('afk_dm_disable_')) {
          curData.notifyDM = false;
          afkStore.set(authorId, curData);
          await i.update({ embeds: [buildAfkEmbed(curData)], components: buildAfkButtons(curData) }).catch(() => {});
        }
      });

      return;
    }

    // 🏠 SERVERINFO / SERVER / SI
    if (['serverinfo', 'server', 'si'].includes(invoked)) {
      const owner = await guild.fetchOwner().catch(() => null);
      let activeTab = 'overview';

      let embed = buildServerInfoMainEmbed(guild, owner, activeTab, author, clientUser);
      let row1 = buildServerInfoRow1(activeTab);
      let row2 = buildServerInfoRow2(guild, activeTab);
      let row3 = buildServerInfoRow3(guild, activeTab);

      const msg = await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });

      const collector = msg.createMessageComponentCollector({ time: 300000 });
      collector.on('collect', async (i) => {
        if (i.user.id !== author.id) {
          return i.reply({ content: `${emojis.WARNING} **Access Denied**: Only **${author.username}** (who requested this panel) can interact with these controls.`, flags: 64 });
        }

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
          const newEmbed = buildServerInfoMainEmbed(guild, owner, activeTab, author, clientUser);
          const newRow1 = buildServerInfoRow1(activeTab);
          const newRow2 = buildServerInfoRow2(guild, activeTab);
          const newRow3 = buildServerInfoRow3(guild, activeTab);
          return i.update({ embeds: [newEmbed], components: [newRow1, newRow2, newRow3] });
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

      const boxText =
        '```\n' +
        '╭──────────────────────────╮\n' +
        '│     ROLE INFORMATION     │\n' +
        '├──────────────────────────┤\n' +
        '│ Role Name: ' + String('@' + role.name).slice(0, 13).padEnd(13, ' ') + ' │\n' +
        '│ Role ID  : ' + String(role.id).slice(0, 13).padEnd(13, ' ') + ' │\n' +
        '│ Color Hex: ' + String(role.hexColor).padEnd(13, ' ') + ' │\n' +
        '│ Members  : ' + String(role.members.size).padEnd(13, ' ') + ' │\n' +
        '│ Position : ' + String('#' + role.position).padEnd(13, ' ') + ' │\n' +
        '│ Mention  : ' + (role.mentionable ? 'YES' : 'NO').padEnd(13, ' ') + ' │\n' +
        '│ Hoisted  : ' + (role.hoist ? 'YES' : 'NO').padEnd(13, ' ') + ' │\n' +
        '╰──────────────────────────╯\n' +
        '```';

      const embed = createStyledEmbed({
        title: `${emojis.ROLES} Role Info — ${role.name}`,
        description: boxText,
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

    // 🎯 SNIPE (Shows last 10 sniped messages in channel)
    if (invoked === 'snipe') {
      const rawStore = snipeStore.get(message.channel.id);
      const history = Array.isArray(rawStore) ? rawStore : (rawStore ? [rawStore] : []);

      if (history.length === 0) {
        return message.reply(`${emojis.WARNING} Nothing to snipe in this channel! No deleted messages found.`);
      }

      const indexArg = parseInt(args[0]);
      if (!isNaN(indexArg) && indexArg >= 1 && indexArg <= history.length) {
        const item = history[indexArg - 1];
        const embed = createStyledEmbed({
          title: `🎯 Sniped Message #${indexArg} of ${history.length}`,
          subtitle: `Sent & Deleted by ${item.authorTag || 'Unknown User'}`,
          description: `**Author:** ${item.authorId ? `<@${item.authorId}>` : `\`${item.authorTag}\``}\n**Deleted:** <t:${Math.floor(item.timestamp / 1000)}:R>\n\n**Message Content:**\n${item.content || '*[Empty]*'}`,
          bannerUrl: item.image || null,
          thumbnailUrl: item.authorAvatar || null,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const lines = history.map((item, i) => {
        const timeAgo = `<t:${Math.floor(item.timestamp / 1000)}:R>`;
        const userMention = item.authorId ? `<@${item.authorId}>` : `**${item.authorTag}**`;
        const contentSnippet = item.content ? (item.content.length > 80 ? item.content.slice(0, 77) + '...' : item.content) : '*[Attachment]*';
        const imgTag = item.image ? ' 🖼️' : '';
        return `\`#${i + 1}\` ${userMention} (${timeAgo}):\n> ${contentSnippet}${imgTag}`;
      });

      const embed = createStyledEmbed({
        title: `${emojis.SCROLL || '🎯'} Snipe History — #${message.channel.name}`,
        subtitle: `Displaying last ${history.length} deleted message(s) in this channel`,
        description:
          `${lines.join('\n\n')}\n\n` +
          `*Type \`.snipe <1-${history.length}>\` to view full content & image attachments of any message!*`,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // 👤 USERINFO / USER / UI [@user]
    if (['userinfo', 'user', 'ui'].includes(invoked)) {
      const member = message.mentions.members?.first() || message.guild.members.cache.get(args[0]) || message.member;
      const user = member.user;

      const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
      const joinedTimestamp = member.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

      const rolesList = member.roles.cache
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`)
        .slice(0, 10)
        .join(', ') || '*None*';

      const keyPermissions = member.permissions.toArray().slice(0, 8).map(p => `\`${p.replace(/_/g, ' ')}\``).join(', ') || '`None`';

      const createdStr = user.createdAt ? user.createdAt.toISOString().split('T')[0] : 'Unknown';
      const joinedStr = member.joinedAt ? member.joinedAt.toISOString().split('T')[0] : 'Unknown';
      const topRoleName = member.roles.highest ? member.roles.highest.name : 'None';

      const boxText =
        '```\n' +
        '╭──────────────────────────╮\n' +
        '│       USER PROFILE       │\n' +
        '├──────────────────────────┤\n' +
        '│ Username : ' + String(user.username).slice(0, 13).padEnd(13, ' ') + ' │\n' +
        '│ User ID  : ' + String(user.id).slice(0, 13).padEnd(13, ' ') + ' │\n' +
        '│ Account  : ' + (user.bot ? 'BOT ACCOUNT' : 'HUMAN MEMBER').padEnd(13, ' ') + ' │\n' +
        '│ Created  : ' + String(createdStr).padEnd(13, ' ') + ' │\n' +
        '│ Joined   : ' + String(joinedStr).padEnd(13, ' ') + ' │\n' +
        '│ Top Role : ' + String(topRoleName).slice(0, 13).padEnd(13, ' ') + ' │\n' +
        '╰──────────────────────────╯\n' +
        '```';

      const embed = createStyledEmbed({
        title: `${emojis.PROFILE} User Information — ${user.username}`,
        thumbnailUrl: user.displayAvatarURL({ dynamic: true, size: 256 }),
        description:
          boxText + `\n\n` +
          `**${emojis.ROLES} Server Roles [ ${Math.max(0, member.roles.cache.size - 1)} ]**\n${rolesList}\n\n` +
          `**${emojis.SHIELD} Key Permissions**\n${keyPermissions}`,
        requestedBy: author,
        clientUser
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
