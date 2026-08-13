const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { animate } = require('../../utils/funCore');
const { fmt } = require('../../utils/economyCore');

const PRICE = 100;
const SYMBOLS = ['🍒', '🍋', '<a:dimond_animated:1537177370719551498>', '<a:rank_animated:1537179656090943538>', '<a:signal_animated:1537177512365260911>', '💀'];
const PAYOUTS = { '🍒': 2, '🍋': 3, '<a:signal_animated:1537177512365260911>': 5, '<a:rank_animated:1537179656090943538>': 10, '<a:dimond_animated:1537177370719551498>': 25, '💀': 0 };

module.exports = {
  name: 'scratchcard',
  description: 'Buy and scratch an instant-win scratchcard.',
  usage: '.scratchcard',
  cooldown: 5000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (eco.balance < PRICE) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} A scratchcard costs **${fmt(PRICE)}** ${emojis.coin}.`)] });
    }
    eco.balance -= PRICE;

    const grid = Array.from({ length: 9 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    // guarantee a fair chance at a real match by occasionally forcing three-of-a-kind
    if (Math.random() < 0.3) {
      const win = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1))]; // exclude skull from forced wins
      grid[0] = win; grid[4] = win; grid[8] = win;
    }

    const sent = await message.channel.send({ embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('<a:tickety_animated:1537177533961732106> Scratching...').setDescription('❓❓❓\n❓❓❓\n❓❓❓')] });
    await animate(sent, [
      { embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle('<a:tickety_animated:1537177533961732106> Scratching...').setDescription(`${grid[0]}❓❓\n❓${grid[4]}❓\n❓❓${grid[8]}`)] },
    ], 700);

    const diag = [grid[0], grid[4], grid[8]];
    const match = diag[0] === diag[1] && diag[1] === diag[2] ? diag[0] : null;
    const payout = match ? PRICE * PAYOUTS[match] : 0;
    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const rows = [grid.slice(0, 3).join(''), grid.slice(3, 6).join(''), grid.slice(6, 9).join('')].join('\n');
    await sent.edit({
      embeds: [new EmbedBuilder()
        .setColor(payout > 0 ? config.successColor : config.errorColor)
        .setTitle(payout > 0 ? `${emojis.success} Winner!` : `${emojis.error} No Match`)
        .setDescription(`${rows}\n\n${payout > 0 ? `Matched **${match}** on the diagonal — won **${fmt(payout)}** coins!` : 'Better luck next time!'}`)
        .setFooter({ text: `New balance: ${fmt(eco.balance)} coins` })],
    });
  },
};
