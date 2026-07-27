const { EmbedBuilder } = require('discord.js');
const db = require('../../../database/db');
const config = require('../../../config');
const emojis = require('../../../config/emojis');
const { fmt } = require('../../../utils/economyCore');

const QUEST_POOL = [
  { id: 'gather3', label: 'Gather 3 resources (hunt/fish/mine/chop/dig)', target: 3, reward: 300 },
  { id: 'earn500', label: 'Earn 500 coins from any source', target: 500, reward: 250 },
  { id: 'sell5', label: 'Sell 5 items', target: 5, reward: 300 },
];

module.exports = {
  name: 'quest',
  description: 'View or start your daily quest for bonus coins.',
  usage: '!quest',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const today = new Date().toDateString();

    if (!eco.quest || eco.quest.date !== today) {
      const picked = QUEST_POOL[Math.floor(Math.random() * QUEST_POOL.length)];
      eco.quest = { ...picked, progress: 0, date: today, claimed: false };
      db.setEconomy(message.guild.id, message.author.id, eco);
    }

    const q = eco.quest;
    const complete = q.progress >= q.target;
    const filled = Math.round((Math.min(q.progress, q.target) / q.target) * 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const embed = new EmbedBuilder()
      .setColor(complete ? config.successColor : config.embedColor)
      .setTitle(`${emojis.target} Daily Quest`)
      .setDescription(`**${q.label}**\n\n${bar}  ${Math.min(q.progress, q.target)}/${q.target}\n\nReward: **${fmt(q.reward)}** ${emojis.coin}`)
      .setFooter({ text: complete ? (q.claimed ? 'Already claimed — check back tomorrow!' : 'Complete! Run !quest claim to collect your reward.') : 'Resets daily.' });

    if (complete && !q.claimed && message.content.split(/\s+/)[1]?.toLowerCase() === 'claim') {
      eco.balance += q.reward;
      eco.quest.claimed = true;
      db.setEconomy(message.guild.id, message.author.id, eco);
      embed.setColor(config.successColor).setFooter({ text: `Claimed +${fmt(q.reward)} coins!` });
    }

    await message.channel.send({ embeds: [embed] });
  },
};
