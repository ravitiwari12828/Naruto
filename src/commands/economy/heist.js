const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');

const JOIN_TIME = 20000;
const ENTRY_FEE = 100;

module.exports = {
  name: 'heist',
  description: 'Start a group bank heist — others join within 20s, then the vault odds decide who gets paid.',
  usage: '.heist',
  cooldown: 30000,
  async execute(message) {
    const starter = db.economy(message.guild.id, message.author.id);
    if (starter.balance < ENTRY_FEE) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You need **${fmt(ENTRY_FEE)}** ${emojis.coin} to start a heist.`)] });
    }

    const participants = new Map([[message.author.id, message.author]]);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('heist_join').setLabel(`Join Heist (${ENTRY_FEE} coins)`).setEmoji('🏦').setStyle(ButtonStyle.Primary),
    );
    const buildEmbed = () => new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${emojis.bank} Bank Heist`)
      .setDescription(`${message.author} is organizing a heist on the vault!\nEntry fee: **${fmt(ENTRY_FEE)}** ${emojis.coin}\n\n**Crew (${participants.size}):**\n${[...participants.values()].map((u) => u.username).join(', ')}`)
      .setFooter({ text: 'Click to join! Heist starts in 20 seconds.' });

    const sent = await message.channel.send({ embeds: [buildEmbed()], components: [row] });
    const collector = sent.createMessageComponentCollector({ time: JOIN_TIME });
    collector.on('collect', async (i) => {
      if (participants.has(i.user.id)) return i.reply({ content: `${emojis.warning} You're already in the crew.`, ephemeral: true });
      const eco = db.economy(message.guild.id, i.user.id);
      if (eco.balance < ENTRY_FEE) return i.reply({ content: `${emojis.error} You need **${fmt(ENTRY_FEE)}** coins to join.`, ephemeral: true });
      participants.set(i.user.id, i.user);
      await i.update({ embeds: [buildEmbed()] }).catch(() => {});
    });

    collector.on('end', async () => {
      const vaultSuccess = Math.random() < 0.45; // riskier with a bigger reward than solo crime
      const results = [];
      for (const [userId] of participants) {
        const eco = db.economy(message.guild.id, userId);
        eco.balance -= ENTRY_FEE;
        if (vaultSuccess) {
          const payout = ENTRY_FEE * (2.5 + Math.random());
          eco.balance += Math.floor(payout);
          results.push(`<a:money_animated:1537177442672709707> <@${userId}> nets **${fmt(Math.floor(payout - ENTRY_FEE))}** coins`);
        } else {
          results.push(`🚔 <@${userId}> lost their **${fmt(ENTRY_FEE)}** coin entry fee`);
        }
        db.setEconomy(message.guild.id, userId, eco);
      }

      await sent.edit({
        embeds: [new EmbedBuilder()
          .setColor(vaultSuccess ? config.successColor : config.errorColor)
          .setTitle(vaultSuccess ? `${emojis.success} The heist succeeded!` : `${emojis.police} The heist failed — everyone got caught!`)
          .setDescription(results.join('\n'))
          .setFooter({ text: `Crew size: ${participants.size}` })],
        components: [],
      });
    });
  },
};
