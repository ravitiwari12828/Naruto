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
            { name: 'Power', value: `<a:rapid_animated:1537177482006896692> ${species.basePower || 30}`, inline: true },
            { name: 'Rarity', value: `${species.rarity || '⚪ Common'}`, inline: true },
            { name: 'Perk', value: `<a:sparkles_animated:1537179684175872171> ${species.perk}`, inline: true }
          )
          .setFooter({ text: 'Use .pet to view your pet stats or .battle to train!' })],
      });
    }

    if (!eco.pets?.length) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(config.embedColor).setDescription(`${emojis.pet || '<a:pet_paw_animated:1537179634159067229>'} You don't have a pet yet. Type \`.pet adopt\` to adopt a new pet!`)],
      });
    }

    const list = eco.pets.map((p, i) => {
      const sp = items.PET_SPECIES[p.species] || { emoji: '<a:pet_paw_animated:1537179634159067229>', rarity: '⚪ Common', basePower: 30 };
      const power = p.power || sp.basePower || 30;
      const rarity = p.rarity || sp.rarity || '⚪ Common';
      return `${i === eco.activePet ? '<a:rank_animated:1537179656090943538>' : '▫️'} ${sp.emoji} **${p.name}** — Lv.${p.level} (${p.xp}/${xpNeeded(p.level)} XP)\n` +
             `-# Rarity: ${rarity} • Power: <a:rapid_animated:1537177482006896692> ${power} • HP: ❤️ ${p.hp || 100}/100`;
    }).join('\n\n');

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`<a:pet_paw_animated:1537179634159067229> ${message.author.username}'s Shinobi Companions`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setDescription(list)
        .setFooter({ text: 'Type .pet adopt to adopt another companion!' })],
    });
  },
};
