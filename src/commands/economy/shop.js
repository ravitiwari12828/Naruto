const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');

const CATEGORIES = {
  tools: { label: 'Tools', emoji: '🧰', data: items.TOOLS },
  consumables: { label: 'Consumables', emoji: '🧪', data: items.CONSUMABLES },
};

function buildEmbed(catKey) {
  const cat = CATEGORIES[catKey];
  const lines = Object.entries(cat.data).map(([id, it]) =>
    `${it.emoji} **${it.name}** — ${it.price} ${emojis.coin}\n-# \`!buy ${id}\`${it.description ? ` • ${it.description}` : ''}`);
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`🛒 Shop — ${cat.label}`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'Use !buy <item id> [amount] to purchase.' });
}

module.exports = {
  name: 'shop',
  description: 'Browse the item shop for tools and consumables.',
  usage: '!shop',
  cooldown: 3000,
  async execute(message) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('shop_category')
      .setPlaceholder('Choose a category')
      .addOptions(Object.entries(CATEGORIES).map(([key, cat]) => ({ label: cat.label, value: key, emoji: cat.emoji })));
    const row = new ActionRowBuilder().addComponents(menu);

    const sent = await message.channel.send({ embeds: [buildEmbed('tools')], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${emojis.error} This isn't your shop menu.`, ephemeral: true });
      await i.update({ embeds: [buildEmbed(i.values[0])] });
    });
    collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
  },
};
