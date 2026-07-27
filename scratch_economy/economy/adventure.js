const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { fmt } = require('../../../utils/economyCore');

const DURATION = 30 * 60 * 1000; // 30 minutes
const DESTINATIONS = [
  { name: 'the Whispering Woods', min: 100, max: 300 },
  { name: 'the Sunken Ruins', min: 200, max: 450 },
  { name: "the Dragon's Peak", min: 350, max: 700 },
];

module.exports = {
  name: 'adventure',
  description: 'Send your pet on a 30-minute adventure for a reward — claim it later with !claim.',
  usage: '!adventure',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (!eco.pets?.length) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You need a pet first — use \`!pet adopt\`.`)],
      });
    }
    if (eco.adventure) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.warning} Your pet is already on an adventure! Use \`!claim\` once it's back.`)],
      });
    }

    const pet = eco.pets[eco.activePet ?? 0];
    const destination = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    const reward = Math.floor(Math.random() * (destination.max - destination.min + 1)) + destination.min;
    eco.adventure = { destination: destination.name, reward, readyAt: Date.now() + DURATION, petName: pet.name };
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('🗺️ Adventure Started!')
        .setDescription(`**${pet.name}** set off for **${destination.name}**!`)
        .addFields({ name: `${emojis.hourglass} Reward Ready In`, value: '**30 minutes**' })
        .setFooter({ text: 'Use !claim once your pet gets back.' })
        .setTimestamp()],
    });
  },
};
