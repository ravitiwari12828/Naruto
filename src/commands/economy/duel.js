const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

module.exports = {
  name: 'duel',
  description: 'Challenge another member to a coin-wager pet duel.',
  usage: '.duel @user <bet>',
  cooldown: 5000,
  async execute(message, args) {
    const target = message.mentions.users.first();
    const bet = parseInt(args.find((a) => /^\d+$/.test(a)) || '', 10);
    if (!target || target.id === message.author.id || target.bot) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Mention someone to duel.`)] });
    }
    if (!bet || bet <= 0) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Usage: \`.duel @user <bet>\``)] });
    }

    const challenger = db.economy(message.guild.id, message.author.id);
    const opponent = db.economy(message.guild.id, target.id);
    if (!challenger.pets?.length || !opponent.pets?.length) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} Both duelists need a pet — use \`.pet adopt\`.`)] });
    }
    if (challenger.balance < bet) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You don't have **${fmt(bet)}** coins to wager.`)] });
    }
    if (opponent.balance < bet) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} ${target.username} doesn't have enough coins to match that bet.`)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('duel_accept').setLabel('Accept Duel').setEmoji(emojis.swords).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('duel_decline').setLabel('Decline').setStyle(ButtonStyle.Danger),
    );
    const embed = new EmbedBuilder()
      .setColor(config.warnColor)
      .setTitle(`${emojis.swords} Duel Challenge`)
      .setDescription(`${message.author} challenges ${target} to a pet duel for **${fmt(bet)}** ${emojis.coin}!`)
      .setFooter({ text: `${target.username} has 30 seconds to accept.` });
    const sent = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = sent.createMessageComponentCollector({ time: 30000, max: 1, filter: (i) => i.user.id === target.id });
    collector.on('collect', async (i) => {
      if (i.customId === 'duel_decline') return i.update({ embeds: [embed.setColor(config.errorColor).setFooter({ text: 'Duel declined.' })], components: [] });

      const p1 = challenger.pets[challenger.activePet ?? 0];
      const p2 = opponent.pets[opponent.activePet ?? 0];
      const roll1 = p1.power * (0.7 + Math.random() * 0.6);
      const roll2 = p2.power * (0.7 + Math.random() * 0.6);
      const challengerWins = roll1 >= roll2;

      const freshChallenger = db.economy(message.guild.id, message.author.id);
      const freshOpponent = db.economy(message.guild.id, target.id);
      if (challengerWins) { freshChallenger.balance += bet; freshOpponent.balance -= bet; }
      else { freshOpponent.balance += bet; freshChallenger.balance -= bet; }
      db.setEconomy(message.guild.id, message.author.id, freshChallenger);
      db.setEconomy(message.guild.id, target.id, freshOpponent);

      const winner = challengerWins ? message.author : target;
      const loser = challengerWins ? target : message.author;
      await i.update({
        embeds: [new EmbedBuilder().setColor(config.successColor).setTitle(`${emojis.trophy} ${winner.username} wins the duel!`)
          .setDescription(`**${p1.name}** (${Math.round(roll1)}) vs **${p2.name}** (${Math.round(roll2)})\n\n${winner} wins **${fmt(bet)}** ${emojis.coin} from ${loser}!`)],
        components: [],
      });
    });
    collector.on('end', (collected) => { if (!collected.size) sent.edit({ components: [] }).catch(() => {}); });
  },
};
