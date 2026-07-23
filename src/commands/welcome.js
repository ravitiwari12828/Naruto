const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Welcome Config store (guildId -> { channelId, message, enabled })
const welcomeConfigs = new Map();

function getOrCreateWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: true,
      channelId: null,
      message: 'Welcome {user} to **{server}**! You are member #{membercount}! 🍃'
    });
  }
  return welcomeConfigs.get(guildId);
}

module.exports = {
  name: 'welcome',
  description: 'Welcome Commands: welcome, welcomechannel, welcomemessage, welcomereset, welcometest',
  aliases: [
    'welcomechannel', 'welcomemessage', 'welcomereset', 'welcometest'
  ],
  welcomeConfigs,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'welcomechannel') sub = 'channel';
    if (invoked === 'welcomemessage') sub = 'message';
    if (invoked === 'welcomereset') sub = 'reset';
    if (invoked === 'welcometest') sub = 'test';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateWelcomeConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .welcomechannel <#channel>
    if (sub === 'channel' || sub === 'setchannel') {
      const chan = message.mentions.channels.first() || message.channel;
      config.channelId = chan.id;
      config.enabled = true;
      welcomeConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `👋 Welcome Channel Set`,
        description: `New member welcome greetings will be sent to ${chan}!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .welcomemessage <template>
    if (sub === 'message' || sub === 'setmessage') {
      const template = (invoked === 'welcomemessage' ? args : args.slice(1)).join(' ');
      if (!template) {
        return message.reply(`${emojis.WARNING} Usage: \`.welcomemessage <template>\`\nPlaceholders: \`{user}\`, \`{server}\`, \`{membercount}\``);
      }

      config.message = template;
      welcomeConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `📜 Welcome Message Template Saved`,
        description: `Updated template:\n> *${template}*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .welcomereset
    if (sub === 'reset') {
      welcomeConfigs.delete(guild.id);
      return message.reply(`${emojis.SUCCESS} Welcome system configuration reset to default.`);
    }

    // .welcometest
    if (sub === 'test') {
      const formatted = config.message
        .replace(/{user}/g, `<@${author.id}>`)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toString());

      const embed = createStyledEmbed({
        title: `👋 Welcome Preview — ${guild.name}`,
        subtitle: `${emojis.NARUTO} New Shinobi Joined the Village!`,
        description: formatted,
        requestedBy: author,
        clientUser,
        thumbnailUrl: author.displayAvatarURL({ dynamic: true, size: 512 })
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Welcome Help
    const embed = createStyledEmbed({
      title: `👋 Welcome System Commands`,
      description:
        `\`.welcomechannel <#channel>\` — Set welcome greetings channel\n` +
        `\`.welcomemessage <template>\` — Customize welcome text\n` +
        `\`.welcomereset\` — Reset welcome settings\n` +
        `\`.welcometest\` — Preview welcome card`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
