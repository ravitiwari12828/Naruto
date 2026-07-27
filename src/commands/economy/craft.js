const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { removeItem, addItem, countItem } = require('../../utils/economyCore');

// Simple crafting recipes: gather resources to build a tier-2 tool cheaper
// than buying it outright with coins.
const RECIPES = {
  rod: { result: 'rod', resultName: 'Fishing Rod', needs: { fish_uncommon: 5, wood_common: 3 } },
  bow: { result: 'bow', resultName: 'Hunting Bow', needs: { animal_uncommon: 5, wood_common: 3 } },
  drill: { result: 'drill', resultName: 'Drill', needs: { ore_uncommon: 5, treasure_common: 3 } },
  chainsaw: { result: 'chainsaw', resultName: 'Chainsaw', needs: { wood_uncommon: 5, ore_common: 3 } },
  drillrig: { result: 'drillrig', resultName: 'Mining Rig', needs: { ore_uncommon: 5, treasure_uncommon: 3 } },
};

module.exports = {
  name: 'craft',
  description: 'Craft a tier-2 tool from gathered resources instead of buying it.',
  usage: '!craft <rod|bow|drill|chainsaw|drillrig>',
  cooldown: 3000,
  async execute(message, args) {
    const key = (args[0] || '').toLowerCase();
    const recipe = RECIPES[key];
    if (!recipe) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Valid recipes: \`${Object.keys(RECIPES).join('`, `')}\``)],
      });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    const missing = Object.entries(recipe.needs).filter(([id, qty]) => countItem(eco, id) < qty);
    if (missing.length) {
      const list = Object.entries(recipe.needs).map(([id, qty]) => `${countItem(eco, id) >= qty ? '✅' : '❌'} ${id}: ${countItem(eco, id)}/${qty}`).join('\n');
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setTitle(`${emojis.tools} Missing Materials`).setDescription(list)],
      });
    }

    for (const [id, qty] of Object.entries(recipe.needs)) removeItem(eco, id, qty);
    addItem(eco, recipe.result, 1);
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.successColor).setTitle(`${emojis.tools} Crafted!`).setDescription(`You crafted a **${recipe.resultName}**!`).setTimestamp()],
    });
  },
};
