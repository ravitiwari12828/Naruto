const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { cooldownLeft, fmt } = require('../../utils/economyCore');

const COOLDOWN = 5 * 60 * 1000;
const MONSTERS = [
  { name: 'Slime', emoji: '🟢', power: 6, reward: 80 },
  { name: 'Goblin', emoji: '👺', power: 12, reward: 150 },
  { name: 'Skeleton', emoji: '💀', power: 18, reward: 220 },
  { name: 'Orc', emoji: '👹', power: 26, reward: 320 },
  { name: 'Troll', emoji: '🧌', power: 36, reward: 450 },
];

module.exports = {
  name: 'battle',
  description: 'Send your active pet to battle a wild monster for coins and XP.',
  usage: '.battle',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    if (!eco.pets?.length) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription(`${emojis.error} You need a pet first — use \`.pet adopt\`.`)],
      });
    }

    const cd = cooldownLeft(eco.lastBattle || 0, COOLDOWN);
    if (!cd.ready) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(config.warnColor).setDescription(`${emojis.hourglass} Your pet is resting. Try again in **${cd.text}**.`)],
      });
    }

    const pet = eco.pets[eco.activePet ?? 0];
    const monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    const petRoll = pet.power * (0.75 + Math.random() * 0.5);
    const monsterRoll = monster.power * (0.75 + Math.random() * 0.5);
    const won = petRoll >= monsterRoll;

    if (!eco.battleStreak) eco.battleStreak = { current: 0, max: 0 };

    eco.lastBattle = Date.now();
    let resultText;
    if (won) {
      eco.battleStreak.current += 1;
      if (eco.battleStreak.current > eco.battleStreak.max) eco.battleStreak.max = eco.battleStreak.current;

      const xpGain = 25 + Math.floor(Math.random() * 20);
      pet.xp += xpGain;
      const needed = pet.level * 100;
      let leveledUp = false;
      if (pet.xp >= needed) { pet.xp -= needed; pet.level++; pet.power += 3; leveledUp = true; }

      const streakBonusPct = Math.min(1.0, (eco.battleStreak.current - 1) * 0.1);
      const bonusCoins = Math.floor(monster.reward * streakBonusPct);
      const totalReward = monster.reward + bonusCoins;

      eco.balance += totalReward;
      let streakText = eco.battleStreak.current > 1 ? `\n**Win Streak:** \`${eco.battleStreak.current} Wins\` (+${Math.round(streakBonusPct * 100)}% Bonus: +${fmt(bonusCoins)} ${emojis.coin})` : '';

      resultText = `${emojis.success} **${pet.name}** defeated the **${monster.name}**!\n+${fmt(totalReward)} ${emojis.coin} • +${xpGain} XP${streakText}${leveledUp ? `\n${emojis.levelup} **${pet.name}** leveled up to Lv.${pet.level}!` : ''}`;
    } else {
      eco.battleStreak.current = 0;
      pet.hp = Math.max(10, pet.hp - 15);
      resultText = `${emojis.error} **${pet.name}** was defeated by the **${monster.name}**! HP dropped to ${pet.hp}/100.\n**Win Streak Reset!**`;
    }

    db.setEconomy(message.guild.id, message.author.id, eco);
    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(won ? config.successColor : config.errorColor)
        .setTitle(`${emojis.swords} ${pet.name} vs ${monster.emoji} ${monster.name}`)
        .setDescription(resultText)
        .setTimestamp()],
    });
  },
};
