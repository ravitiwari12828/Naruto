const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const emojis = require('../../utils/emojis');

const PRICE = 100;
const SYMBOLS = ['🍒', '🍋', '💎', '⭐', '⚡', '💀'];
const PAYOUTS = { '🍒': 2, '🍋': 3, '⚡': 5, '⭐': 10, '💎': 25, '💀': 0 };

module.exports = {
  name: 'scratchcard',
  description: 'Buy and scratch an instant-win scratchcard.',
  aliases: ['scratch', 'scratchcard'],
  cooldown: 5000,

  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (eco.balance < PRICE) {
      return message.reply(`${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} A scratchcard costs **${PRICE}** coins. You only have **${eco.balance}** coins.`);
    }

    eco.balance -= PRICE;

    const grid = Array.from({ length: 9 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    if (Math.random() < 0.35) {
      const win = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1))];
      grid[0] = win; grid[4] = win; grid[8] = win;
    }

    const initialEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('<a:tickety_animated:1537177533961732106> Shinobi Scratchcard')
      .setDescription(
        `**Scratching card for ${message.author.username}...**\n\n` +
        `❓ ❓ ❓\n` +
        `❓ ❓ ❓\n` +
        `❓ ❓ ❓\n\n` +
        `*Scratching in progress...*`
      )
      .setFooter({ text: `Cost: ${PRICE} coins` });

    const sent = await message.channel.send({ embeds: [initialEmbed] });

    await new Promise(r => setTimeout(r, 1000));

    const stepEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('<a:tickety_animated:1537177533961732106> Shinobi Scratchcard')
      .setDescription(
        `**Scratching card for ${message.author.username}...**\n\n` +
        `${grid[0]} ❓ ❓\n` +
        `❓ ${grid[4]} ❓\n` +
        `❓ ❓ ${grid[8]}\n\n` +
        `*Revealing diagonal chakra pattern...*`
      );

    await sent.edit({ embeds: [stepEmbed] }).catch(() => {});

    await new Promise(r => setTimeout(r, 1000));

    const diag = [grid[0], grid[4], grid[8]];
    const match = diag[0] === diag[1] && diag[1] === diag[2] ? diag[0] : null;
    const payout = match ? PRICE * PAYOUTS[match] : 0;

    eco.balance += payout;
    db.setEconomy(message.guild.id, message.author.id, eco);

    const fullGridStr =
      `${grid[0]} ${grid[1]} ${grid[2]}\n` +
      `${grid[3]} ${grid[4]} ${grid[5]}\n` +
      `${grid[6]} ${grid[7]} ${grid[8]}`;

    const finalEmbed = new EmbedBuilder()
      .setColor(payout > 0 ? 0x2ECC71 : 0xED4245)
      .setTitle(payout > 0 ? '<a:tada_party_animated:1537179689381134356> Instant Scratchcard WINNER!' : '<a:wrong_animated:1537179702928875631> No Match — Better Luck Next Time')
      .setDescription(
        `**${message.author.username}'s Scratchcard Result:**\n\n` +
        `${fullGridStr}\n\n` +
        (payout > 0
          ? `🎉 **MATCHED 3x ${match} ON DIAGONAL!**\n> You won **${payout}** coins!`
          : `💔 **No diagonal match.** You lost **${PRICE}** coins.`)
      )
      .setFooter({ text: `New Balance: ${eco.balance} coins` })
      .setTimestamp();

    await sent.edit({ embeds: [finalEmbed] }).catch(() => {});
  }
};
