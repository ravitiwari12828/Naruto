const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// In-memory giveaway store (persists during session)
const giveaways = new Map();

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function parseTime(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * mult[unit];
}

// Fisher-Yates shuffle then slice — works on plain arrays (Discord.js v14)
function pickWinners(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  name: 'giveaway',
  description: 'Host and manage giveaways. Subcommands: create, end, reroll, list',
  aliases: ['gw'],

  async execute(message, args) {
    const sub = args[0]?.toLowerCase();

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .giveaway create <time> <winners> <prize>
    if (sub === 'create' || sub === 'start') {
      if (args.length < 4) {
        return message.reply(`${emojis.WARNING} Usage: \`.giveaway create <time: 1m/1h/1d> <winners: 1> <prize>\`\nExample: \`.giveaway create 1h 1 Lifetime Nitro\``);
      }

      const duration = parseTime(args[1]);
      if (!duration) return message.reply(`${emojis.WARNING} Invalid time format. Use: \`10s\`, \`5m\`, \`2h\`, \`1d\``);

      const winnerCount = parseInt(args[2]);
      if (isNaN(winnerCount) || winnerCount < 1) return message.reply(`${emojis.WARNING} Winners must be a number >= 1.`);

      const prize = args.slice(3).join(' ');
      const endTime = Date.now() + duration;
      const id = generateId();
      const endDate = new Date(endTime).toLocaleString();

      const embed = createStyledEmbed({
        title: `🎉 GIVEAWAY — ${prize}`,
        subtitle: `${emojis.NARUTO} Hosted by ${message.author.username}`,
        description:
          `React with 🎉 to enter the giveaway!\n\n` +
          `**Prize:** \`${prize}\`\n` +
          `**Winners:** \`${winnerCount}\`\n` +
          `**Ends:** \`${endDate}\`\n` +
          `**Giveaway ID:** \`${id}\``,
        requestedBy: message.author,
        clientUser,
        footerText: `Giveaway ID: ${id} • Ends at ${endDate}`
      });

      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react('🎉');

      giveaways.set(id, {
        id,
        messageId: msg.id,
        channelId: message.channel.id,
        prize,
        winnerCount,
        endTime,
        hostId: message.author.id,
        ended: false,
        entries: new Set()
      });

      // Auto-end after duration
      setTimeout(async () => {
        const gw = giveaways.get(id);
        if (!gw || gw.ended) return;

        const chan = message.client.channels.cache.get(gw.channelId);
        if (!chan) return;

        const fetchedMsg = await chan.messages.fetch(gw.messageId).catch(() => null);
        const reaction = fetchedMsg?.reactions.cache.get('🎉');
        const users = await reaction?.users.fetch().catch(() => null);
        const eligible = users ? [...users.filter(u => !u.bot).values()] : [];

        gw.ended = true;
        giveaways.set(id, gw);

        if (!eligible || eligible.length === 0) {
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

      return message.channel.send(`${emojis.CELEBRATION} Giveaway **\`${id}\`** created! Ends in **${args[1]}**!`);
    }

    // .giveaway end <id>
    if (sub === 'end') {
      const id = args[1]?.toUpperCase();
      const gw = giveaways.get(id);
      if (!gw) return message.reply(`${emojis.WARNING} No giveaway found with ID \`${id}\`.`);
      if (gw.ended) return message.reply(`${emojis.WARNING} That giveaway already ended.`);

      const chan = message.client.channels.cache.get(gw.channelId);
      const fetchedMsg = await chan?.messages.fetch(gw.messageId).catch(() => null);
      const reaction = fetchedMsg?.reactions.cache.get('🎉');
      const users = await reaction?.users.fetch().catch(() => null);
      const eligible = users ? [...users.filter(u => !u.bot).values()] : [];

      gw.ended = true;
      giveaways.set(id, gw);

      if (!eligible || eligible.length === 0) {
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

    // .giveaway reroll <id>
    if (sub === 'reroll') {
      const id = args[1]?.toUpperCase();
      const gw = giveaways.get(id);
      if (!gw) return message.reply(`${emojis.WARNING} No giveaway found with ID \`${id}\`.`);
      if (!gw.ended) return message.reply(`${emojis.WARNING} That giveaway hasn't ended yet. Use \`.giveaway end ${id}\` first.`);

      const chan = message.client.channels.cache.get(gw.channelId);
      const fetchedMsg = await chan?.messages.fetch(gw.messageId).catch(() => null);
      const reaction = fetchedMsg?.reactions.cache.get('🎉');
      const users = await reaction?.users.fetch().catch(() => null);
      const eligible = users ? [...users.filter(u => !u.bot).values()] : [];

      if (!eligible || eligible.length === 0) {
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
        `• **ID:** \`${gw.id}\` | **Prize:** ${gw.prize} | **Status:** ${gw.ended ? '✅ Ended' : '🟢 Active'}`
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

    // Default help
    const embed = createStyledEmbed({
      title: `${emojis.GIVEAWAY} Giveaway Commands`,
      description:
        `\`.giveaway create <time> <winners> <prize>\` — Start a giveaway\n` +
        `\`.giveaway end <ID>\` — End a giveaway early\n` +
        `\`.giveaway reroll <ID>\` — Pick new winner(s)\n` +
        `\`.giveaway list\` — View all giveaways`,
      requestedBy: message.author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
