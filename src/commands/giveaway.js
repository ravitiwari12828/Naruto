const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// In-memory giveaway store (persists during session)
const giveaways = new Map();

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function parseTime(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * mult[unit];
}

function pickWinners(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function collectEligibleUsers(client, gw) {
  const eligibleUsers = [];
  if (gw.entries && gw.entries.size > 0) {
    for (const uid of gw.entries) {
      try {
        const uObj = await client.users.fetch(uid);
        if (uObj && !uObj.bot) {
          eligibleUsers.push(uObj);
        }
      } catch (e) {}
    }
  }
  return eligibleUsers;
}

module.exports = {
  name: 'giveaway',
  description: 'Host and manage giveaways. Short syntax: .gstart, .gend, .greroll',
  aliases: ['gw', 'gstart', 'gcreate', 'gend', 'greroll', 'reroll'],
  giveaways,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'gstart' || invoked === 'gcreate') {
      sub = 'create';
    } else if (invoked === 'gend') {
      sub = 'end';
    } else if (invoked === 'greroll' || invoked === 'reroll') {
      sub = 'reroll';
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .gstart <time> <winners> <prize> / .giveaway create <time> <winners> <prize>
    if (sub === 'create' || sub === 'start') {
      message.delete().catch(() => {});

      const isDirect = ['gstart', 'gcreate'].includes(invoked);
      const timeRaw = isDirect ? args[0] : args[1];
      const winnersRaw = isDirect ? args[1] : args[2];
      const prizeRaw = isDirect ? args.slice(2).join(' ') : args.slice(3).join(' ');

      if (!timeRaw || !winnersRaw || !prizeRaw) {
        return message.channel.send(`${emojis.WARNING} Usage: \`.gstart <time: 1m/1h/1d> <winners: 1> <prize>\`\nExample: \`.gstart 1h 1 Lifetime Nitro\``).then(m => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});
      }

      const duration = parseTime(timeRaw);
      if (!duration) return message.channel.send(`${emojis.WARNING} Invalid time format. Use: \`10s\`, \`5m\`, \`2h\`, \`1d\``).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});

      const winnerCount = parseInt(winnersRaw, 10);
      if (isNaN(winnerCount) || winnerCount < 1) return message.channel.send(`${emojis.WARNING} Winners must be a valid number >= 1.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});

      const endTime = Date.now() + duration;
      const id = generateId();
      const endTimestamp = Math.floor(endTime / 1000);

      const embed = createStyledEmbed({
        title: `🎉 GIVEAWAY — ${prizeRaw}`,
        subtitle: `Hosted by ${message.author.username}`,
        description:
          `Click the **🎉 Enter Giveaway** button below to participate!\n\n` +
          `• **Host:** <@${message.author.id}>\n` +
          `• **Prize:** \`${prizeRaw}\`\n` +
          `• **Winners:** \`${winnerCount}\`\n` +
          `• **Participants:** \`0\`\n` +
          `• **Ends:** <t:${endTimestamp}:F> (<t:${endTimestamp}:R>)\n` +
          `• **Giveaway ID:** \`${id}\``,
        requestedBy: message.author,
        clientUser,
        footerText: `Giveaway ID: ${id}`
      });

      const enterBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gw_enter_${id}`)
          .setLabel('🎉 Enter Giveaway')
          .setStyle(ButtonStyle.Primary)
      );

      const msg = await message.channel.send({ embeds: [embed], components: [enterBtn] });

      const gwData = {
        id,
        messageId: msg.id,
        channelId: message.channel.id,
        prize: prizeRaw,
        winnerCount,
        endTime,
        hostId: message.author.id,
        ended: false,
        entries: new Set()
      };

      giveaways.set(id, gwData);

      // Auto-end after duration
      setTimeout(async () => {
        const gw = giveaways.get(id);
        if (!gw || gw.ended) return;

        gw.ended = true;
        giveaways.set(id, gw);

        const eligible = await collectEligibleUsers(message.client, gw);
        const chan = message.client.channels.cache.get(gw.channelId);
        if (!chan) return;

        if (eligible.length === 0) {
          return chan.send(`${emojis.WARNING} Giveaway **${id}** ended with no valid entries. No winners selected.`);
        }

        const winners = pickWinners(eligible, gw.winnerCount);
        const winnerMentions = winners.map(w => `<@${w.id}>`).join(', ');

        const endEmbed = createStyledEmbed({
          title: `🎊 GIVEAWAY ENDED — ${gw.prize}`,
          description: `🏆 **Winner(s):** ${winnerMentions}\n\nCongratulations! Claim your prize from <@${gw.hostId}>.`,
          requestedBy: message.author,
          clientUser
        });
        chan.send({ embeds: [endEmbed] });
      }, duration);

      const confirmMsg = await message.channel.send(`${emojis.CELEBRATION || '🎉'} Giveaway **\`${id}\`** created! Ends in **${timeRaw}**!`);
      if (confirmMsg && typeof confirmMsg.delete === 'function') {
        setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);
      }
      return confirmMsg;
    }

    // .gend <id> / .giveaway end <id>
    if (sub === 'end') {
      const isDirect = invoked === 'gend';
      const id = (isDirect ? args[0] : args[1])?.toUpperCase();

      if (!id) {
        return message.reply(`${emojis.WARNING} Usage: \`.gend <giveawayId>\``);
      }

      const gw = giveaways.get(id);
      if (!gw) return message.reply(`${emojis.WARNING} No giveaway found with ID \`${id}\`.`);
      if (gw.ended) return message.reply(`${emojis.WARNING} That giveaway already ended.`);

      gw.ended = true;
      giveaways.set(id, gw);

      const eligible = await collectEligibleUsers(message.client, gw);

      if (eligible.length === 0) {
        return message.channel.send(`${emojis.WARNING} Giveaway **${id}** ended with no valid entries.`);
      }

      const winners = pickWinners(eligible, gw.winnerCount);
      const winnerMentions = winners.map(w => `<@${w.id}>`).join(', ');

      const endEmbed = createStyledEmbed({
        title: `🎊 GIVEAWAY ENDED — ${gw.prize}`,
        description: `🏆 **Winner(s):** ${winnerMentions}\n\nCongratulations! Claim from <@${gw.hostId}>.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [endEmbed] });
    }

    // .greroll <id> / .giveaway reroll <id>
    if (sub === 'reroll') {
      const isDirect = ['greroll', 'reroll'].includes(invoked);
      const id = (isDirect ? args[0] : args[1])?.toUpperCase();

      if (!id) {
        return message.reply(`${emojis.WARNING} Usage: \`.greroll <giveawayId>\``);
      }

      const gw = giveaways.get(id);
      if (!gw) return message.reply(`${emojis.WARNING} No giveaway found with ID \`${id}\`.`);
      if (!gw.ended) return message.reply(`${emojis.WARNING} That giveaway hasn't ended yet. Use \`.gend ${id}\` first.`);

      const eligible = await collectEligibleUsers(message.client, gw);

      if (eligible.length === 0) {
        return message.channel.send(`${emojis.WARNING} No eligible entries to reroll.`);
      }

      const winners = pickWinners(eligible, gw.winnerCount);
      const winnerMentions = winners.map(w => `<@${w.id}>`).join(', ');

      const rerollEmbed = createStyledEmbed({
        title: `🎲 GIVEAWAY REROLLED — ${gw.prize}`,
        description: `🏆 **New Winner(s):** ${winnerMentions}\n\nCongratulations on the reroll! Claim from <@${gw.hostId}>.`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [rerollEmbed] });
    }

    // .giveaway list
    if (sub === 'list') {
      const all = [...giveaways.values()];
      if (all.length === 0) {
        return message.reply(`${emojis.WARNING} No giveaways have been created yet.`);
      }

      const lines = all.map(gw =>
        `• **ID:** \`${gw.id}\` | **Prize:** ${gw.prize} | **Status:** ${gw.ended ? `${emojis.SUCCESS} Ended` : '🟢 Active'}`
      );

      const embed = createStyledEmbed({
        title: `🎉 All Giveaways`,
        description: lines.join('\n'),
        requestedBy: message.author,
        clientUser,
        footerText: `Total: ${all.length} giveaway(s)`
      });
      return message.channel.send({ embeds: [embed] });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'giveaway');
  }
};
