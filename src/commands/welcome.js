const { EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Welcome Config store
const welcomeConfigs = new Map();

function getOrCreateWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: true,
      channelId: null,
      useEmbed: true,
      headerText: '★.◦@°.★ Welcome to {server} ☕.◦★ {user}',
      title: 'Welcome!',
      description:
        `╭ ──-── ──-── ──-── ╮\n` +
        `   Check out! **Events**\n` +
        `🍵 **Take Roles**\n` +
        `📖 **Read Rules**\n` +
        `╰ ──-── ──-── ──-── ╯`,
      footer: "You're {membercount}th Member in our Server !",
      imageUrl: null,
      useAvatarThumbnail: true
    });
  }
  return welcomeConfigs.get(guildId);
}

function buildWelcomeCard(config, member) {
  const guild = member.guild;
  const user = member.user;

  const headerText = (config.headerText || 'Welcome {user} to {server}')
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{username}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());

  const description = (config.description || 'Welcome!')
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{username}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());

  const footer = (config.footer || "You're {membercount}th Member in our Server !")
    .replace(/{user}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toString());

  if (!config.useEmbed) {
    return { content: `${headerText}\n\n${description}` };
  }

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle(config.title || 'Welcome!')
    .setDescription(description)
    .setFooter({ text: footer });

  if (config.useAvatarThumbnail) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));
  } else if (config.imageUrl) {
    embed.setImage(config.imageUrl);
  }

  return { content: headerText, embeds: [embed] };
}

module.exports = {
  name: 'welcome',
  description: '1-Step Single-Command Welcome Setup: .welcome setup <#channel> [avatar / imageURL] [messageText]',
  aliases: [
    'welcomechannel', 'welcomemessage', 'welcomeimage', 'welcomesetup', 'welcomereset', 'welcometest'
  ],
  welcomeConfigs,
  getOrCreateWelcomeConfig,
  buildWelcomeCard,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'welcomesetup') sub = 'setup';
    if (invoked === 'welcomereset') sub = 'reset';
    if (invoked === 'welcometest') sub = 'test';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateWelcomeConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. SINGLE-COMMAND SETUP (.welcome setup <#channel> [imageURL/avatar] [text])
    if (sub === 'setup' || sub === 'set' || sub === 'channel' || sub === 'config') {
      const chan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;
      config.channelId = chan.id;
      config.enabled = true;

      // Extract image & text arguments from remaining args
      const remainingArgs = args.slice(1).filter(arg => !arg.startsWith('<#') && !arg.endsWith('>'));

      if (remainingArgs.length > 0) {
        const firstArg = remainingArgs[0];
        if (firstArg.toLowerCase() === 'avatar') {
          config.useAvatarThumbnail = true;
          config.imageUrl = null;
          remainingArgs.shift();
        } else if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
          config.useAvatarThumbnail = false;
          config.imageUrl = firstArg;
          remainingArgs.shift();
        }
      }

      if (remainingArgs.length > 0) {
        config.description = remainingArgs.join(' ');
      }

      welcomeConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `👋 Welcome System Configured!`,
        description:
          `• **Channel**: ${chan}\n` +
          `• **Image**: ${config.useAvatarThumbnail ? '`Member Avatar Thumbnail`' : `\`${config.imageUrl}\``}\n` +
          `• **Message Description**:\n> *${config.description}*\n\n` +
          `*Run \`.welcometest\` to preview the card!*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 2. PREVIEW TEST (.welcometest)
    if (sub === 'test') {
      const payload = buildWelcomeCard(config, message.member);
      return message.channel.send(payload);
    }

    // 3. RESET (.welcomereset)
    if (sub === 'reset') {
      welcomeConfigs.delete(guild.id);
      return message.reply(`✅ Welcome configuration reset to default.`);
    }

    // Default Help Panel matching screenshot
    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'welcome');
  }
};
