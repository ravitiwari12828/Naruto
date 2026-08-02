const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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

// Builds the rich ACTIVE giveaway embed
function buildActiveEmbed(prizeRaw, winnerCount, endTimestamp, id, hostId, participantCount, clientUser) {
  const PING = emojis.GIVEAWAY_PING || '🎉';
  const CUP = emojis.GOLD_CUP || '🏆';
  const GIFT = emojis.GIVEAWAY || '🎁';
  const DOT = emojis.DOT || '•';

  const embed = new EmbedBuilder()
    .setColor(0xFF6B35)
    .setTitle(`${PING}  G I V E A W A Y`)
    .setDescription(
      `> **${prizeRaw}**\n\n` +
      `${DOT} **Host:** <@${hostId}>\n` +
      `${DOT} **Winners:** \`${winnerCount}\`\n` +
      `${DOT} **Entries:** \`${participantCount}\`\n` +
      `${DOT} **Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n` +
      `${DOT} **ID:** \`${id}\`\n\n` +
      `*Click **${PING} Enter Giveaway** below to join!*`
    )
    .setFooter({
      text: `Giveaway ID: ${id} • Click button to enter`,
      iconURL: clientUser?.displayAvatarURL?.() || undefined
    })
    .setTimestamp();

  return embed;
}

// Builds the ENDED giveaway embed + Claim Reward button
function buildEndedEmbed(gw, winnerMentions, clientUser) {
  const CUP = emojis.GOLD_CUP || '🏆';
  const isMultiple = winnerMentions.includes('\n');

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${CUP}  GIVEAWAY ENDED`)
    .setDescription(
      `> **${gw.prize}**\n\n` +
      `🎊 **${isMultiple ? 'Winners' : 'Winner'}:**\n${winnerMentions}\n\n` +
      `Congratulations! Please claim your prize from <@${gw.hostId}>.\n\n` +
      `*Use \`.greroll ${gw.id}\` to reroll winners.*`
    )
    .setFooter({
      text: `Giveaway ID: ${gw.id} • Ended`,
      iconURL: clientUser?.displayAvatarURL?.() || undefined
    })
    .setTimestamp();

  const claimBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw_claim_${gw.id}`)
      .setLabel('Claim Reward')
      .setEmoji({ id: '1532508968960786613', name: 'GF_Gold_Cup', animated: true })
      .setStyle(ButtonStyle.Success)
  );

  return { embed, claimBtn };
}

// Builds the REROLLED giveaway embed
function buildRerolledEmbed(gw, winnerMentions, clientUser) {
  const DICE = emojis.DICE || '🎲';
  const CUP = emojis.GOLD_CUP || '🏆';
  const isMultiple = winnerMentions.includes(',');

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`${DICE}  GIVEAWAY REROLLED`)
    .setDescription(
      `> **${gw.prize}**\n\n` +
      `✨ **New ${isMultiple ? 'Winners' : 'Winner'}:**\n${winnerMentions}\n\n` +
      `Congratulations on the reroll! Claim your prize from <@${gw.hostId}>.`
    )
    .setFooter({
      text: `Giveaway ID: ${gw.id} • Rerolled`,
      iconURL: clientUser?.displayAvatarURL?.() || undefined
    })
    .setTimestamp();

  return embed;
}

module.exports = {
  name: 'giveaway',
  description: 'Host and manage giveaways. Short syntax: .gstart, .gend, .greroll',
  aliases: ['gstart', 'gcreate', 'gend', 'greroll', 'reroll'],
  giveaways,
  buildActiveEmbed,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    let isDirect = ['gstart', 'gcreate'].includes(invoked);
    if (invoked === 'gstart' || invoked === 'gcreate') {
      sub = 'create';
    } else if (invoked === 'gend') {
      sub = 'end';
    } else if (invoked === 'greroll' || invoked === 'reroll') {
      sub = 'reroll';
    } else if (invoked === 'giveaway') {
      if (!['create', 'start', 'end', 'reroll', 'list'].includes(sub)) {
        sub = 'create';
        isDirect = true;
      }
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .gstart <time> <winners> <prize> / .giveaway <time> <winners> <prize>
    if (sub === 'create' || sub === 'start') {
      message.delete().catch(() => {});

      const timeRaw = isDirect ? args[0] : args[1];
      const winnersRaw = isDirect ? args[1] : args[2];
      const prizeRaw = isDirect ? args.slice(2).join(' ') : args.slice(3).join(' ');

      if (!timeRaw || !winnersRaw || !prizeRaw) {
        return message.channel.send(
          `${emojis.WARNING} Usage: \`.gstart <time: 1m/1h/1d> <winners: 1> <prize>\`\n` +
          `Example: \`.gstart 1h 1 Lifetime Nitro\``
        ).then(m => {
          if (m && typeof m.delete === 'function') setTimeout(() => m.delete().catch(() => {}), 6000);
        }).catch(() => {});
      }

      const duration = parseTime(timeRaw);
      if (!duration) {
        return message.channel.send(`${emojis.WARNING} Invalid time format. Use: \`10s\`, \`5m\`, \`2h\`, \`1d\``)
          .then(m => { if (m && typeof m.delete === 'function') setTimeout(() => m.delete().catch(() => {}), 5000); })
          .catch(() => {});
      }

      const winnerCount = parseInt(winnersRaw, 10);
      if (isNaN(winnerCount) || winnerCount < 1) {
        return message.channel.send(`${emojis.WARNING} Winners must be a valid number >= 1.`)
          .then(m => { if (m && typeof m.delete === 'function') setTimeout(() => m.delete().catch(() => {}), 5000); })
          .catch(() => {});
      }

      const endTime = Date.now() + duration;
      const id = generateId();
      const endTimestamp = Math.floor(endTime / 1000);

      const embed = buildActiveEmbed(prizeRaw, winnerCount, endTimestamp, id, message.author.id, 0, clientUser);

      const enterBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gw_enter_${id}`)
          .setLabel('Enter Giveaway')
          .setEmoji({ id: '1532508786307104878', name: 'Radha_Giveaway_ping', animated: true })
          .setStyle(ButtonStyle.Success)
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
        const winnerMentions = winners.map(w => `<@${w.id}>`).join('\n');

        const { embed: endEmbed, claimBtn } = buildEndedEmbed(gw, winnerMentions, clientUser);
        chan.send({
          content: `${emojis.GIVEAWAY_PING || '🎉'} **Giveaway ended!** ${winners.map(w => `<@${w.id}>`).join(', ')} won **${gw.prize}**!`,
          embeds: [endEmbed],
          components: [claimBtn]
        });
      }, duration);

      const confirmMsg = await message.channel.send(
        `${emojis.GIVEAWAY_PING || '🎉'} Giveaway **\`${id}\`** created! Ends in **${timeRaw}**!`
      );
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
      const winnerMentions = winners.map(w => `<@${w.id}>`).join('\n');

      const { embed: endEmbed, claimBtn } = buildEndedEmbed(gw, winnerMentions, clientUser);
      return message.channel.send({
        content: `${emojis.GIVEAWAY_PING || '🎉'} **Giveaway ended!** ${winners.map(w => `<@${w.id}>`).join(', ')} won **${gw.prize}**!`,
        embeds: [endEmbed],
        components: [claimBtn]
      });
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
      const winnerMentions = winners.map(w => `<@${w.id}>`).join('\n');

      const rerollEmbed = buildRerolledEmbed(gw, winnerMentions, clientUser);
      return message.channel.send({
        content: `${emojis.DICE || '🎲'} **Rerolled!** ${winners.map(w => `<@${w.id}>`).join(', ')} is the new winner of **${gw.prize}**!`,
        embeds: [rerollEmbed]
      });
    }

    // .giveaway list
    if (sub === 'list') {
      const all = [...giveaways.values()];
      if (all.length === 0) {
        return message.reply(`${emojis.WARNING} No giveaways have been created yet.`);
      }

      const lines = all.map(gw =>
        `${gw.ended ? emojis.GOLD_CUP || '🏆' : emojis.GIVEAWAY_PING || '🎉'} **${gw.prize}** — \`${gw.id}\` — ${gw.ended ? 'Ended' : `<t:${Math.floor(gw.endTime / 1000)}:R>`}`
      );

      const embed = new EmbedBuilder()
        .setColor(0xFF6B35)
        .setTitle(`${emojis.GIVEAWAY_PING || '🎉'}  All Giveaways`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Total: ${all.length} giveaway(s)`, iconURL: clientUser?.displayAvatarURL?.() || undefined })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'giveaway');
  }
};
