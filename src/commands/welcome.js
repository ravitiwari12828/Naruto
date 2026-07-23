const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Welcome, DM & Boost Config store
const welcomeConfigs = new Map();

function getOrCreateWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: true,
      channelId: null,
      style: 'modern',
      useEmbed: true,
      headerText: 'Welcome {user} to **{server_name}**, where the vibe starts the moment you join.',
      title: 'Welcome to {server_name}',
      description: 'You are member #{membercount}. Read the rules, say hello, and make yourself at home.',
      footer: 'Member #{membercount} • {server_name}',
      imageUrl: null,
      useAvatarThumbnail: true,

      // Join DM Config
      joinDmEnabled: true,
      joinDmText: 'Welcome to **{server_name}**, {user}! 🍥 Make sure to check out our rules and enjoy your stay!',

      // Leave DM Config
      leaveDmEnabled: true,
      leaveDmText: 'Goodbye {user}! We hope to see you back in **{server_name}** soon.',

      // Boost Msg Config
      boostEnabled: true,
      boostChannelId: null,
      boostText: '🚀 **SERVER BOOST!** {user} just boosted **{server_name}**! Thank you for supporting the village! ✨'
    });
  }
  return welcomeConfigs.get(guildId);
}

function parsePlaceholders(text, member) {
  if (!text) return '';
  const guild = member.guild;
  const user = member.user;

  return text
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{username}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{server_name}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());
}

function buildWelcomeCard(config, member) {
  const guild = member.guild;
  const user = member.user;

  const headerText = parsePlaceholders(config.headerText, member);
  const description = parsePlaceholders(config.description, member);
  const title = parsePlaceholders(config.title, member);
  const footer = parsePlaceholders(config.footer, member);

  if (!config.useEmbed) {
    return { content: `${headerText}\n\n${description}` };
  }

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle(title || `Welcome to ${guild.name}`)
    .setDescription(description)
    .setFooter({
      text: `${footer} • ${new Date().toLocaleDateString()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    });

  if (config.useAvatarThumbnail) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));
  } else if (config.imageUrl) {
    embed.setImage(config.imageUrl);
  }

  return { content: headerText, embeds: [embed] };
}

function buildWelcomeConfigPanel(config, guild, author, clientUser) {
  const chanStr = config.channelId ? `<#${config.channelId}>` : '`Not set`';
  const boostChanStr = config.boostChannelId ? `<#${config.boostChannelId}>` : '`Not set`';

  const embed = createStyledEmbed({
    title: `${emojis.WELCOME} Welcome & Greetings System Dashboard`,
    subtitle: `ORBIS-Style Welcome, Join DM, Leave DM & Boost Panel`,
    description:
      `**Status:** ${config.enabled ? '`Enabled ✅`' : '`Disabled ❌`'}\n` +
      `**Style:** \`${config.style || 'modern'}\`\n` +
      `**Channel:** ${chanStr}\n` +
      `**Join DM:** ${config.joinDmEnabled ? '`Enabled ✅`' : '`Disabled ❌`'}\n` +
      `**Leave DM:** ${config.leaveDmEnabled ? '`Enabled ✅`' : '`Disabled ❌`'}\n` +
      `**Boost Msg:** ${config.boostEnabled ? '`Enabled ✅`' : '`Disabled ❌`'} (${boostChanStr})\n\n` +
      `**Welcome Message:**\n> *${config.headerText}*\n\n` +
      `**Join DM Message:**\n> *${config.joinDmText || 'Not set'}*\n\n` +
      `**Leave DM Message:**\n> *${config.leaveDmText || 'Not set'}*\n\n` +
      `**Server Boost Message:**\n> *${config.boostText || 'Not set'}*\n\n` +
      `**Quick Setup:** \`.welcome setup #channel Welcome {user} to {server_name}!\` \n` +
      `**Preview:** \`.welcome preview\` / \`.welcometest\``,
    requestedBy: author,
    clientUser
  });

  return embed;
}

module.exports = {
  name: 'welcome',
  description: 'Customizable Welcome Cards, Join DM, Leave DM & Server Boost Suite (ORBIS-style)',
  aliases: [
    'welcomesetup', 'welcomereset', 'welcometest', 'welcomepreview',
    'joindm', 'leavedm', 'boostmsg', 'welcomeconfig'
  ],
  welcomeConfigs,
  getOrCreateWelcomeConfig,
  buildWelcomeCard,
  parsePlaceholders,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'welcomesetup') sub = 'setup';
    if (invoked === 'welcomereset') sub = 'reset';
    if (invoked === 'welcometest' || invoked === 'welcomepreview') sub = 'test';
    if (invoked === 'joindm') sub = 'joindm';
    if (invoked === 'leavedm') sub = 'leavedm';
    if (invoked === 'boostmsg') sub = 'boostmsg';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateWelcomeConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. SETUP / CONFIG (.welcome setup <#channel> [message])
    if (sub === 'setup' || sub === 'set' || sub === 'channel') {
      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;
      config.channelId = chan.id;
      config.enabled = true;

      const remainingText = args.slice(1).filter(arg => !arg.startsWith('<#') && !arg.endsWith('>')).join(' ');
      if (remainingText) {
        config.headerText = remainingText;
        config.description = remainingText;
      }

      welcomeConfigs.set(guild.id, config);

      const panelEmbed = buildWelcomeConfigPanel(config, guild, author, clientUser);
      return message.channel.send({ embeds: [panelEmbed] });
    }

    // 2. JOIN DM CONFIG (.joindm on/off/message)
    if (sub === 'joindm') {
      const opt = args[1]?.toLowerCase();
      if (opt === 'off' || opt === 'disable') {
        config.joinDmEnabled = false;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`✅ **Join DM Message** has been **Disabled**.`);
      }
      if (opt === 'on' || opt === 'enable') {
        config.joinDmEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`✅ **Join DM Message** has been **Enabled**!`);
      }

      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.joindm <enable/disable/text>\`\nPlaceholders: \`{user}\`, \`{username}\`, \`{server_name}\`, \`{membercount}\``);
      }

      config.joinDmEnabled = true;
      config.joinDmText = text;
      welcomeConfigs.set(guild.id, config);

      return message.reply(`📬 **Join DM Message Updated**:\n> *${parsePlaceholders(text, message.member)}*`);
    }

    // 3. LEAVE DM CONFIG (.leavedm on/off/message)
    if (sub === 'leavedm') {
      const opt = args[1]?.toLowerCase();
      if (opt === 'off' || opt === 'disable') {
        config.leaveDmEnabled = false;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`✅ **Leave DM Message** has been **Disabled**.`);
      }
      if (opt === 'on' || opt === 'enable') {
        config.leaveDmEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`✅ **Leave DM Message** has been **Enabled**!`);
      }

      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.leavedm <enable/disable/text>\`\nPlaceholders: \`{user}\`, \`{username}\`, \`{server_name}\`, \`{membercount}\``);
      }

      config.leaveDmEnabled = true;
      config.leaveDmText = text;
      welcomeConfigs.set(guild.id, config);

      return message.reply(`📤 **Leave DM Message Updated**:\n> *${parsePlaceholders(text, message.member)}*`);
    }

    // 4. BOOST MESSAGE CONFIG (.boostmsg #channel/on/off/message)
    if (sub === 'boostmsg' || sub === 'boost') {
      const chan = message.mentions.channels.first();
      if (chan) {
        config.boostChannelId = chan.id;
        config.boostEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`🚀 **Server Boost Message Channel** set to ${chan}!`);
      }

      const opt = args[1]?.toLowerCase();
      if (opt === 'off' || opt === 'disable') {
        config.boostEnabled = false;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`✅ **Server Boost Message** has been **Disabled**.`);
      }
      if (opt === 'on' || opt === 'enable') {
        config.boostEnabled = true;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`✅ **Server Boost Message** has been **Enabled**!`);
      }

      const text = args.slice(1).join(' ');
      if (!text) {
        return message.reply(`ℹ️ Usage: \`.boostmsg <#channel / enable / disable / text>\``);
      }

      config.boostEnabled = true;
      config.boostText = text;
      welcomeConfigs.set(guild.id, config);

      return message.reply(`🚀 **Server Boost Message Updated**:\n> *${parsePlaceholders(text, message.member)}*`);
    }

    // 5. PREVIEW TEST (.welcometest / .welcome preview)
    if (sub === 'test' || sub === 'preview') {
      const payload = buildWelcomeCard(config, message.member);
      await message.channel.send({ content: `🧪 **Welcome Channel Card Preview:**` });
      await message.channel.send(payload);

      if (config.joinDmEnabled) {
        await message.channel.send(`📬 **Join DM Message Preview:**\n> ${parsePlaceholders(config.joinDmText, message.member)}`);
      }
      if (config.leaveDmEnabled) {
        await message.channel.send(`📤 **Leave DM Message Preview:**\n> ${parsePlaceholders(config.leaveDmText, message.member)}`);
      }
      if (config.boostEnabled) {
        await message.channel.send(`🚀 **Server Boost Message Preview:**\n> ${parsePlaceholders(config.boostText, message.member)}`);
      }
      return;
    }

    // 6. DASHBOARD PANEL (.welcome config / .welcome status)
    if (sub === 'config' || sub === 'status' || sub === 'panel') {
      const panelEmbed = buildWelcomeConfigPanel(config, guild, author, clientUser);
      return message.channel.send({ embeds: [panelEmbed] });
    }

    // 7. RESET (.welcomereset)
    if (sub === 'reset') {
      welcomeConfigs.delete(guild.id);
      return message.reply(`✅ Welcome configuration reset to default.`);
    }

    // Default Help Panel matching screenshot
    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'welcome');
  }
};
