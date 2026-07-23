const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global No-Prefix Authorized Users Store
const noPrefixStore = new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']);

module.exports = {
  name: 'noprefix',
  description: 'No-Prefix Management Suite: noprefix add, noprefix remove, noprefix list',
  aliases: ['npuser', 'noprefixadd', 'noprefixremove'],
  noPrefixStore,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'noprefixadd') sub = 'add';
    if (invoked === 'noprefixremove') sub = 'remove';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const ownerCmd = message.client.commands.get('owners');
    const isBotOwner = ownerCmd && ownerCmd.isOwner ? ownerCmd.isOwner(author.id) : ['1420687548807905324', '1529362747047805029', '1514546738055348237'].includes(author.id);

    if (!isBotOwner) {
      return message.reply(`${emojis.WARNING} Only Bot Owners & Extra Owners can manage No-Prefix access.`);
    }

    // 1. .noprefix add @user
    if (sub === 'add') {
      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.noprefix add @user\``);

      noPrefixStore.add(user.id);
      return message.reply(`⚡ **${user.tag}** (\`${user.id}\`) has been granted **No-Prefix Access**! They can now execute bot commands without using the prefix.`);
    }

    // 2. .noprefix remove @user
    if (sub === 'remove') {
      const user = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!user) return message.reply(`${emojis.WARNING} Mention a user or provide a User ID e.g. \`.noprefix remove @user\``);

      noPrefixStore.delete(user.id);
      return message.reply(`⚠️ **${user.tag}** (\`${user.id}\`) has been removed from No-Prefix access.`);
    }

    // 3. .noprefix list / status
    const list = Array.from(noPrefixStore).map(id => `<@${id}> (\`${id}\`)`).join('\n') || 'None';
    const embed = createStyledEmbed({
      title: `⚡ No-Prefix Authorized Users`,
      description: `**Users with No-Prefix Access:**\n${list}\n\n**Usage:**\n\`.noprefix add @user\`\n\`.noprefix remove @user\``,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
