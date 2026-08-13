/**
 * Economy Core Helpers for Naruto Bot Economy Suite
 */

function fmt(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US');
}

function cooldownLeft(lastTime, cooldownMs) {
  const now = Date.now();
  const elapsed = now - (lastTime || 0);
  if (elapsed >= cooldownMs) {
    return { ready: true, text: 'Ready', ms: 0 };
  }

  const remainingMs = cooldownMs - elapsed;
  const totalSecs = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return {
    ready: false,
    text: parts.join(' '),
    ms: remainingMs
  };
}

function addItem(inventory, itemId, amount = 1) {
  if (!inventory) inventory = {};
  const current = inventory[itemId] || 0;
  inventory[itemId] = current + amount;
  return inventory;
}

function removeItem(inventory, itemId, amount = 1) {
  if (!inventory) return false;
  const current = inventory[itemId] || 0;
  if (current < amount) return false;
  inventory[itemId] = current - amount;
  if (inventory[itemId] <= 0) {
    delete inventory[itemId];
  }
  return true;
}

function bumpQuest(eco, questType, amount = 1) {
  if (!eco.quest) {
    eco.quest = { type: questType, progress: 0, target: 5, reward: 1000, active: true };
  }
  if (eco.quest.type === questType && eco.quest.active) {
    eco.quest.progress = (eco.quest.progress || 0) + amount;
  }
}

function buildGatherCommand({ name, description, verb, emoji, category, cooldownMs, color }) {
  const { EmbedBuilder } = require('discord.js');
  const db = require('../database/db');
  const emojis = require('./emojis');
  const items = require('../config/items');

  return {
    name,
    description,
    cooldown: cooldownMs || 15000,
    async execute(message) {
      const eco = db.economy(message.guild.id, message.author.id);
      const cdKey = `last_${name}`;
      const cd = cooldownLeft(eco.cooldowns?.[cdKey], cooldownMs);
      if (!cd.ready) {
        return message.reply(`${emojis.WARNING || '<a:hourglass_animated:1537179590982631575>'} You need to rest from ${verb}. Try again in **${cd.text}**.`);
      }

      if (!eco.cooldowns) eco.cooldowns = {};
      eco.cooldowns[cdKey] = Date.now();

      const item = items.randomResourceByCategory(category, 0.2);
      const amount = Math.floor(Math.random() * 3) + 1;
      addItem(eco.inventory, item.id, amount);
      const coins = Math.floor(Math.random() * 200) + 100;
      eco.balance += coins;

      db.setEconomy(message.guild.id, message.author.id, eco);

      const embed = new EmbedBuilder()
        .setColor(color || 0x7E0808)
        .setTitle(`${emoji} ${name.toUpperCase()} SUCCESSFUL`)
        .setDescription(`You spent time **${verb}** and gathered **${amount}x ${item.name}** ${item.emoji}!\n` +
                        `Plus you found **+${fmt(coins)}** ${emojis.coin || '🪙'}!`)
        .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }
  };
}

module.exports = {
  fmt,
  cooldownLeft,
  addItem,
  removeItem,
  bumpQuest,
  buildGatherCommand
};
