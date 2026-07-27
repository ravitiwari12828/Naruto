const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { cooldownLeft } = require('../../utils/economyCore');

const ADOPT_COOLDOWN = 60 * 60 * 1000;
function xpNeeded(level) { return level * 100; }

module.exports = {
  name: 'pet',
  description: 'Adopt a pet, view your pet stats, or level them up.',
  usage: '.pet [adopt]',
  cooldown: 3000,
  async execute(message, args) {
    const eco = db.economy(message.guild.id, message.author.id);

    if ((args[0] || '').toLowerCase() === 'adopt') {
      const cd = cooldownLeft(eco.lastAdopt || 0, ADOPT_COOLDOWN);
      if (!cd.ready) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.hourglass} You can adopt again in **${cd.text}**.`)] });
      }

      const speciesKeys = Object.keys(items.PET_SPECIES);
      const rolled = speciesKeys[Math.floor(Math.random() * speciesKeys.length)];
      const species = items.PET_SPECIES[rolled];
      const pet = {
        species: rolled,
        name: species.name,
        level: 1,
        xp: 0,
        hp: 100,
        power: species.basePower || 30,
        rarity: species.rarity || '⚪ Common'
      };
      eco.pets = eco.pets || [];
      eco.pets.push(pet);
      eco.activePet = eco.pets.length - 1;
      eco.lastAdopt = Date.now();
      db.setEconomy(message.guild.id, message.author.id, eco);

      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.successColor)
          .setTitle(`${species.emoji} New Pet Adopted!`)
          .setDescription(`Congratulations! You adopted a **${species.name}**!`)
          .addFields(
            { name: 'Power', value: `⚡ ${species.basePower || 30}`, inline: true },
            { name: 'Rarity', value: `${species.rarity || '⚪ Common'}`, inline: true },
            { name: 'Perk', value: `✨ ${species.perk}`, inline: true }
          )
          .setFooter({ text: 'Use .pet to view your pet stats or .battle to train!' })],
      });
    }

    if (!eco.pets?.length) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.pet || '🐾'} You don't have a pet yet. Type \`.pet adopt\` to adopt a new pet!`)],
      });
    }

    const list = eco.pets.map((p, i) => {
      const sp = items.PET_SPECIES[p.species] || { emoji: '🐾', rarity: '⚪ Common', basePower: 30 };
      const power = p.power || sp.basePower || 30;
      const rarity = p.rarity || sp.rarity || '⚪ Common';
      return `${i === eco.activePet ? '⭐' : '▫️'} ${sp.emoji} **${p.name}** — Lv.${p.level} (${p.xp}/${xpNeeded(p.level)} XP)\n` +
             `-# Rarity: ${rarity} • Power: ⚡ ${power} • HP: ❤️ ${p.hp || 100}/100`;
    }).join('\n\n');

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`🐾 ${message.author.username}'s Shinobi Companions`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setDescription(list)
        .setFooter({ text: 'Type .pet adopt to adopt another companion!' })],
    });
  },
};
