const { PermissionsBitField, ChannelType } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { createDynamicBox } = require('../utils/boxBuilder');

// Server Counter Config in DB
function getCounters(guildId) {
  if (!db.data.serverCounters) db.data.serverCounters = {};
  if (!db.data.serverCounters[guildId]) {
    db.data.serverCounters[guildId] = {
      categoryId: null,
      counters: [] // [{ channelId, type, goal }]
    };
  }
  return db.data.serverCounters[guildId];
}

function updateCountersConfig(guildId, fn) {
  const cfg = getCounters(guildId);
  if (typeof fn === 'function') fn(cfg);
  db.saveJSON();
  return cfg;
}

async function refreshGuildCounters(guild) {
  if (!guild) return;
  const cfg = getCounters(guild.id);
  if (!cfg.counters || cfg.counters.length === 0) return;

  const totalMembers = guild.memberCount || 0;
  const membersCache = guild.members.cache;
  const botCount = membersCache.filter(m => m.user.bot).size;
  const userCount = Math.max(0, totalMembers - botCount);
  const onlineCount = membersCache.filter(m => m.presence && m.presence.status !== 'offline').size;
  const boosterCount = guild.premiumSubscriptionCount || 0;

  for (const item of cfg.counters) {
    const channel = guild.channels.cache.get(item.channelId);
    if (!channel) continue;

    let newName = null;
    if (item.type === 'total') newName = `👥 Total Members: ${totalMembers.toLocaleString()}`;
    else if (item.type === 'users') newName = `👤 Users: ${userCount.toLocaleString()}`;
    else if (item.type === 'bots') newName = `<a:robot_animated:1537177494183088199> Bots: ${botCount.toLocaleString()}`;
    else if (item.type === 'online') newName = `🟢 Online: ${onlineCount.toLocaleString()}`;
    else if (item.type === 'boosters') newName = `<a:rocket_animated:1537179661371707402> Boosters: ${boosterCount.toLocaleString()}`;
    else if (item.type === 'goal' && item.goal) newName = `🎯 Goal: ${totalMembers}/${item.goal}`;

    if (newName && channel.name !== newName) {
      await channel.setName(newName).catch(() => null);
    }
  }
}

module.exports = {
  name: 'counter',
  description: 'Server Stats Counters & Goal Counter Channels (Total, Users, Bots, Online, Boosters, Goal)',
  aliases: ['counters', 'serverstats', 'statschannel'],
  refreshGuildCounters,

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;
    const guildId = guild.id;
    const sub = args[0]?.toLowerCase();

    let clientUser = message.client.user;

    // 1. .counter setup
    if (sub === 'setup') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can setup server counter channels.`);
      }

      const totalMembers = guild.memberCount || 0;
      const botCount = guild.members.cache.filter(m => m.user.bot).size;
      const userCount = Math.max(0, totalMembers - botCount);

      try {
        // Create Category
        const category = await guild.channels.create({
          name: '<a:chart_animated:1537179539514462308> SERVER STATS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.Connect]
            }
          ]
        });

        // Create Counter Voice Channels
        const cTotal = await guild.channels.create({
          name: `👥 Total Members: ${totalMembers.toLocaleString()}`,
          type: ChannelType.GuildVoice,
          parent: category.id
        });

        const cUsers = await guild.channels.create({
          name: `👤 Users: ${userCount.toLocaleString()}`,
          type: ChannelType.GuildVoice,
          parent: category.id
        });

        const cBots = await guild.channels.create({
          name: `<a:robot_animated:1537177494183088199> Bots: ${botCount.toLocaleString()}`,
          type: ChannelType.GuildVoice,
          parent: category.id
        });

        const nextGoal = Math.ceil((totalMembers + 1) / 100) * 100 || 500;
        const cGoal = await guild.channels.create({
          name: `🎯 Goal: ${totalMembers}/${nextGoal}`,
          type: ChannelType.GuildVoice,
          parent: category.id
        });

        updateCountersConfig(guildId, cfg => {
          cfg.categoryId = category.id;
          cfg.counters = [
            { channelId: cTotal.id, type: 'total' },
            { channelId: cUsers.id, type: 'users' },
            { channelId: cBots.id, type: 'bots' },
            { channelId: cGoal.id, type: 'goal', goal: nextGoal }
          ];
        });

        const box = createDynamicBox('COUNTER SETUP COMPLETE', [
          { key: 'Category', value: '<a:chart_animated:1537179539514462308> SERVER STATS' },
          { key: 'Counters', value: 'Total, Users, Bots, Goal' },
          { key: 'Status  ', value: 'ACTIVE (Auto-Updates)' }
        ]);

        const embed = createStyledEmbed({
          title: `<a:chart_animated:1537179539514462308> Server Stats Counter Channels Configured`,
          description: '```\n' + box + '\n```\n*Counter channels auto-update as members join & leave!*',
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });

      } catch (err) {
        console.error('[Counter Setup Error]', err.message);
        return message.reply(`${emojis.WARNING} Failed to create counter channels: ${err.message}`);
      }
    }

    // 2. .counter list / .counter panel / .counter config
    if (!sub || sub === 'list' || sub === 'panel' || sub === 'config') {
      const cfg = getCounters(guildId);
      const list = (cfg.counters || []).map(c => {
        const chan = guild.channels.cache.get(c.channelId);
        return `• **${c.type.toUpperCase()}**: ${chan ? `<#${chan.id}> (\`${chan.name}\`)` : 'Channel deleted'}`;
      }).join('\n') || 'No counter channels setup yet.';

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_counter_setup').setLabel('Setup Default Counters').setEmoji(emojis.SUCCESS || '<a:chart_animated:1537179539514462308>').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_counter_refresh').setLabel('Refresh Now').setEmoji(emojis.OBJ_REFRESH || '🔄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_counter_reset').setLabel('Reset Counters').setEmoji(emojis.DISABLED || '🗑️').setStyle(ButtonStyle.Danger)
      );

      const embed = createStyledEmbed({
        title: `<a:chart_animated:1537179539514462308> Active Server Counter Channels — ${guild.name}`,
        subtitle: `Real-time Voice & Goal Counter Channel Suite`,
        description:
          `${list}\n\n` +
          `**Commands & Actions:**\n` +
          `• \`.counter setup\` — Auto-create default counter channels\n` +
          `• \`.counter create <total|users|bots|online|boosters>\` — Add specific counter\n` +
          `• \`.counter goal <target_number>\` — Add member goal counter`,
        requestedBy: author,
        clientUser
      });

      const msg = await message.channel.send({ embeds: [embed], components: [row] });
      const collector = msg.createMessageComponentCollector({ time: 180000 });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== author.id) {
          return interaction.reply({ content: `${emojis.DISABLED} Only ${author.username} can click these buttons.`, flags: 64 });
        }
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: `${emojis.WARNING} Administrator permissions required.`, flags: 64 });
        }

        if (interaction.customId === 'btn_counter_refresh') {
          await refreshGuildCounters(guild);
          return interaction.reply({ content: `🔄 Refreshed all server counter channels!`, flags: 64 });
        }

        if (interaction.customId === 'btn_counter_reset') {
          updateCountersConfig(guildId, c => { c.counters = []; c.categoryId = null; });
          return interaction.reply({ content: `🗑️ Counter configuration cleared.`, flags: 64 });
        }

        if (interaction.customId === 'btn_counter_setup') {
          await interaction.deferReply({ flags: 64 });
          try {
            const totalMembers = guild.memberCount || 0;
            const botCount = guild.members.cache.filter(m => m.user.bot).size;
            const userCount = Math.max(0, totalMembers - botCount);

            const category = await guild.channels.create({
              name: '<a:chart_animated:1537179539514462308> SERVER STATS',
              type: ChannelType.GuildCategory,
              permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.Connect] }]
            });

            const cTotal = await guild.channels.create({ name: `👥 Total Members: ${totalMembers.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id });
            const cUsers = await guild.channels.create({ name: `👤 Users: ${userCount.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id });
            const cBots = await guild.channels.create({ name: `<a:robot_animated:1537177494183088199> Bots: ${botCount.toLocaleString()}`, type: ChannelType.GuildVoice, parent: category.id });

            const nextGoal = Math.ceil((totalMembers + 1) / 100) * 100 || 500;
            const cGoal = await guild.channels.create({ name: `🎯 Goal: ${totalMembers}/${nextGoal}`, type: ChannelType.GuildVoice, parent: category.id });

            updateCountersConfig(guildId, cfg => {
              cfg.categoryId = category.id;
              cfg.counters = [
                { channelId: cTotal.id, type: 'total' },
                { channelId: cUsers.id, type: 'users' },
                { channelId: cBots.id, type: 'bots' },
                { channelId: cGoal.id, type: 'goal', goal: nextGoal }
              ];
            });

            return interaction.followUp({ content: `<a:chart_animated:1537179539514462308> Server Stats Counter channels successfully created!`, flags: 64 });
          } catch (err) {
            return interaction.followUp({ content: `Failed to create counters: ${err.message}`, flags: 64 });
          }
        }
      });

      return;
    }

    // 3. .counter goal <target>
    if (sub === 'goal') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${emojis.WARNING} Only Administrators can set member goal counters.`);
      }
      const targetNum = parseInt(args[1]);
      if (isNaN(targetNum) || targetNum <= 0) {
        return message.reply(`${emojis.WARNING} Usage: \`.counter goal <target_number>\` (e.g. \`.counter goal 1000\`)`);
      }

      const totalMembers = guild.memberCount || 0;
      try {
        const cGoal = await guild.channels.create({
          name: `🎯 Goal: ${totalMembers}/${targetNum}`,
          type: ChannelType.GuildVoice
        });

        updateCountersConfig(guildId, cfg => {
          if (!cfg.counters) cfg.counters = [];
          cfg.counters = cfg.counters.filter(c => c.type !== 'goal');
          cfg.counters.push({ channelId: cGoal.id, type: 'goal', goal: targetNum });
        });

        return message.reply(`${emojis.SUCCESS} Created Member Goal Counter channel: <#${cGoal.id}> (Target: **${targetNum.toLocaleString()} members**)`);
      } catch (e) {
        return message.reply(`${emojis.WARNING} Failed to create goal counter channel: ${e.message}`);
      }
    }
  }
};
