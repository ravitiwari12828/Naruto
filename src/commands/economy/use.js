const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { removeItem } = require('../../utils/economyCore');

module.exports = {
  name: 'use',
  description: 'Use a consumable item from your inventory.',
  usage: '!use <item id>',
  cooldown: 3000,
  async execute(message, args) {
    const itemId = (args[0] || '').toLowerCase();
    const consumable = items.CONSUMABLES[itemId];
    if (!consumable) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} That's not a usable item. Check \`!inventory\`.`)] });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    if (!removeItem(eco, itemId, 1)) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have a **${consumable.name}**.`)] });
    }

    let effectText;
    switch (consumable.effect) {
      case 'reset_cooldown':
        for (const key of ['lastWork', 'lastHunt', 'lastFish', 'lastDig', 'lastChop', 'lastMine', 'lastBeg', 'lastCrime']) eco[key] = 0;
        effectText = 'All your gathering & work cooldowns have been reset!';
        break;
      case 'luck':
        eco.luckyUntil = Date.now() + consumable.duration;
        effectText = 'Your luck is boosted for the next 30 minutes — better drops incoming!';
        break;
      case 'heal':
        if (eco.pets.length) { eco.pets[0].hp = 100; effectText = `${eco.pets[0].name || 'Your pet'} is fully healed!`; }
        else effectText = "You don't have a pet to heal, but the bandage felt nice anyway.";
        break;
      case 'bait':
        eco.guaranteedFish = true;
        effectText = 'Your next `!fish` is guaranteed to catch something!';
        break;
      default:
        effectText = 'Nothing seemed to happen.';
    }

    db.setEconomy(message.guild.id, message.author.id, eco);
    await message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.successColor).setTitle(`${consumable.emoji} Used ${consumable.name}`).setDescription(effectText).setTimestamp()],
    });
  },
};
