const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { fmt } = require('../../utils/economyCore');

const CATEGORIES = {
  tools: { label: 'Gathering Tools', emoji: '🧰', data: items.TOOLS },
  consumables: { label: 'Potions & Boosters', emoji: '🧪', data: items.CONSUMABLES },
  resources: { label: 'Trade Resources', emoji: '💎', data: items.RESOURCES }
};

function buildShopEmbed(catKey) {
  const cat = CATEGORIES[catKey] || CATEGORIES.tools;
  const lines = Object.entries(cat.data).map(([id, it]) => {
    const sellPrice = it.sell || Math.floor((it.price || 100) * 0.75) || 50;
    return `${it.emoji} **${it.name}** \`(ID: ${id})\` — **${fmt(it.price)}** ${emojis.coin}\n-# ${it.description || `Gathering item`} • Sell: ${fmt(sellPrice)} ${emojis.coin} • Buy: \`.buy ${id}\``;
  });

  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${emojis.SHOP || '🛒'} Shinobi Emporium Shop — ${cat.label}`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'Use .buy <item id> [amount] to purchase items.' })
    .setTimestamp();
}

module.exports = {
  name: 'shop',
  description: 'Browse the item shop for tools, potions, and resources.',
  usage: '.shop',
  cooldown: 3000,
  async execute(message) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('shop_category')
      .setPlaceholder('Choose a Shop Category')
      .addOptions(Object.entries(CATEGORIES).map(([key, cat]) => ({ label: cat.label, value: key, emoji: cat.emoji })));

    const row = new ActionRowBuilder().addComponents(menu);

    const sent = await message.channel.send({ embeds: [buildShopEmbed('tools')], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: `${emojis.error} This is not your shop menu.`, ephemeral: true });
      await i.update({ embeds: [buildShopEmbed(i.values[0])], components: [row] });
    });

    collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
  },
};
