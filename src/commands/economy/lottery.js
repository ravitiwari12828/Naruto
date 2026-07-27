const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const TICKET_PRICE = 50;

module.exports = {
  name: 'lottery',
  description: 'Buy a lottery ticket — pick a number 1-10 and see if it matches the draw.',
  usage: '!lottery <1-10>',
  cooldown: 5000,
  async execute(message, args) {
    const pick = parseInt(args[0], 10);
    if (!pick || pick < 1 || pick > 10) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Pick a number between 1 and 10, e.g. \`!lottery 7\`.`)] });
    }

    const eco = db.economy(message.guild.id, message.author.id);
    if (eco.balance < TICKET_PRICE) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} A ticket costs **${fmt(TICKET_PRICE)}** ${emojis.coin}.`)] });
    }

    eco.balance -= TICKET_PRICE;
    const draw = Math.floor(Math.random() * 10) + 1;
    const won = draw === pick;
    if (won) eco.balance += TICKET_PRICE * 8;
    db.setEconomy(message.guild.id, message.author.id, eco);

    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(won ? config.successColor : config.errorColor)
        .setTitle('🎟️ Lottery Draw')
        .setDescription(`You picked **${pick}** — the draw was **${draw}**.\n\n${won ? `${emojis.success} JACKPOT! You won **${fmt(TICKET_PRICE * 8)}** coins!` : `${emojis.error} No match. Better luck next time.`}`)
        .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
