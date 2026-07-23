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
  description: 'Picture & Embed Welcome Suite matching screenshot 1: welcomechannel, welcomemessage, welcomeimage, welcometest',
  aliases: [
    'welcomechannel', 'welcomemessage', 'welcomeimage', 'welcomeembed', 'welcomereset', 'welcometest'
  ],
  welcomeConfigs,
  getOrCreateWelcomeConfig,
  buildWelcomeCard,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'welcomechannel') sub = 'channel';
    if (invoked === 'welcomemessage') sub = 'message';
    if (invoked === 'welcomeimage') sub = 'image';
    if (invoked === 'welcomeembed') sub = 'embed';
    if (invoked === 'welcomereset') sub = 'reset';
    if (invoked === 'welcometest') sub = 'test';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateWelcomeConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 1. .welcomechannel <#channel>
    if (sub === 'channel' || sub === 'setchannel') {
      const chan = message.mentions.channels.first() || message.channel;
      config.channelId = chan.id;
      config.enabled = true;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`👋 Welcome greetings channel set to ${chan}!`);
    }

    // 2. .welcomemessage <text>
    if (sub === 'message' || sub === 'setmessage') {
      const template = (invoked === 'welcomemessage' ? args : args.slice(1)).join(' ');
      if (!template) {
        return message.reply(`${emojis.WARNING} Usage: \`.welcomemessage <text>\`\nPlaceholders: \`{user}\`, \`{server}\`, \`{membercount}\``);
      }
      config.description = template;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`✅ Welcome message description updated.`);
    }

    // 3. .welcomeimage <url / avatar / reset>
    if (sub === 'image') {
      const url = args[1];
      if (url === 'avatar' || !url) {
        config.useAvatarThumbnail = true;
        config.imageUrl = null;
        welcomeConfigs.set(guild.id, config);
        return message.reply(`🖼️ Welcome card set to use member avatar thumbnail!`);
      }
      config.useAvatarThumbnail = false;
      config.imageUrl = url;
      welcomeConfigs.set(guild.id, config);
      return message.reply(`🖼️ Welcome card background/image set to: ${url}`);
    }

    // 4. .welcometest
    if (sub === 'test') {
      const payload = buildWelcomeCard(config, message.member);
      return message.channel.send(payload);
    }

    // 5. .welcomereset
    if (sub === 'reset') {
      welcomeConfigs.delete(guild.id);
      return message.reply(`✅ Welcome configuration reset to default.`);
    }

    // Default Help Panel matching screenshot
    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'welcome');
  }
};
