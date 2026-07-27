const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { addItem, fmt } = require('../../utils/economyCore');

const PRICE = 250;

module.exports = {
  name: 'mysterybox',
  description: 'Buy a mystery box for a random item, coins, or gems with an animated rarity reveal.',
  usage: '!mysterybox',
  cooldown: 5000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (eco.balance < PRICE) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} A mystery box costs **${fmt(PRICE)}** ${emojis.coin}.`)] });
    }
    eco.balance -= PRICE;

    const sent = await message.channel.send({ embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('🎁 Opening Mystery Box...').setDescription('❓❓❓')] });
    await new Promise((r) => setTimeout(r, 1500));

    const roll = Math.random();
    let embed;
    if (roll < 0.4) {
      const coins = Math.floor(Math.random() * 200) + 50;
      eco.balance += coins;
      embed = new EmbedBuilder().setColor(config.successColor).setTitle('🎁 Mystery Box Opened!').setDescription(`You found **${fmt(coins)}** ${emojis.coin}!`);
    } else if (roll < 0.7) {
      const category = ['fish', 'hunt', 'mine', 'chop', 'dig'][Math.floor(Math.random() * 5)];
      const drop = items.randomResourceByCategory(category, 0.15);
      addItem(eco, drop.id, 1);
      const rarity = items.RARITIES[drop.rarity];
      embed = new EmbedBuilder().setColor(rarity.color).setTitle('🎁 Mystery Box Opened!').setDescription(`You found a **${drop.emoji} ${drop.name}** (${rarity.label})!`);
    } else if (roll < 0.92) {
      const gems = Math.floor(Math.random() * 3) + 1;
      eco.gems = (eco.gems || 0) + gems;
      embed = new EmbedBuilder().setColor(0xE91E63).setTitle('🎁 Mystery Box Opened!').setDescription(`Jackpot! You found **${gems}** ${emojis.gem} gems!`);
    } else {
      embed = new EmbedBuilder().setColor(config.warnColor).setTitle('🎁 Mystery Box Opened!').setDescription('Just an old sock. Better luck next time.');
    }

    db.setEconomy(message.guild.id, message.author.id, eco);
    await sent.edit({ embeds: [embed.setFooter({ text: `Cost: ${fmt(PRICE)} coins` })] });
  },
};
