const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const { fmt } = require('../../utils/economyCore');
const { isBotOwner } = require('../../utils/owners');

// Helper to parse human-readable quantities like 10k, 5m, 1b, inf, max
function parseAmount(str) {
  if (!str) return null;
  const s = String(str).toLowerCase().trim().replace(/,/g, '');
  if (['inf', 'infinite', 'max', 'infinity'].includes(s)) {
    return 999999999999; // 1 Trillion Ryo
  }
  const match = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/i);
  if (!match) return null;
  let val = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === 'k') val *= 1e3;
  else if (unit === 'm') val *= 1e6;
  else if (unit === 'b') val *= 1e9;
  return Math.floor(val);
}

module.exports = {
  name: 'addmoney',
  aliases: [
    'givemoney',
    'ecoadd',
    'addcoins',
    'givecoins',
    'setmoney',
    'removemoney',
    'takemoney',
    'infmoney',
    'infinite',
    'resetmoney',
    'addgems',
    'setgems',
    'addbank'
  ],
  description: 'Bot Owner Executive Command: Add, set, deduct, or grant infinite coins/bank/gems.',
  usage: '.addmoney [@user/ID] <amount|inf> [wallet|bank|gems]',
  async execute(message, args) {
    // 1. Strict Bot Owner Check
    if (!isBotOwner(message.author, message.client)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.errorColor || 0xFF0000)
            .setDescription(`${emojis.error || '❌'} **Access Denied!** This executive economy command is strictly reserved for the **Bot Owner**.`)
        ]
      });
    }

    const rawFirstWord = (message.content.trim().split(/ +/)[0] || '').replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();

    // 2. Resolve Target User and Arguments
    let target = null;
    let amountArg = null;
    let typeArg = 'wallet';

    // Check if first arg is mention or user ID
    if (message.mentions.users.size > 0) {
      target = message.mentions.users.first();
      amountArg = args[1];
      typeArg = (args[2] || '').toLowerCase();
    } else if (args[0] && /^\d{17,20}$/.test(args[0])) {
      try {
        target = await message.client.users.fetch(args[0]);
      } catch (e) {
        target = null;
      }
      amountArg = args[1];
      typeArg = (args[2] || '').toLowerCase();
    } else {
      // No user mentioned -> Defaults to the bot owner themselves!
      target = message.author;
      amountArg = args[0];
      typeArg = (args[1] || '').toLowerCase();
    }

    if (!target) {
      target = message.author;
    }

    // Determine command intent based on command alias
    const isReset = rawFirstWord === 'resetmoney';
    const isSet = rawFirstWord === 'setmoney';
    const isTake = rawFirstWord === 'removemoney' || rawFirstWord === 'takemoney';
    const isGemsCmd = rawFirstWord === 'addgems' || rawFirstWord === 'setgems';
    const isBankCmd = rawFirstWord === 'addbank';
    const isInfCmd = rawFirstWord === 'infmoney' || rawFirstWord === 'infinite';

    if (isGemsCmd) typeArg = 'gems';
    if (isBankCmd) typeArg = 'bank';

    // 3. Handle Reset Mode
    const eco = db.economy(message.guild.id, target.id);

    if (isReset) {
      eco.balance = 1000;
      eco.bank = 0;
      eco.gems = 10;
      db.setEconomy(message.guild.id, target.id, eco);

      const resetEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({ name: 'Executive Treasury Reset', iconURL: target.displayAvatarURL({ dynamic: true }) })
        .setTitle(`🔄 Economy Reset for ${target.username}`)
        .setDescription(`Successfully reset **<@>** to default starter balances.`)
        .addFields(
          { name: '🪙 Wallet', value: `**${fmt(eco.balance)}**`, inline: true },
          { name: '🏦 Bank', value: `**${fmt(eco.bank)}**`, inline: true },
          { name: '💎 Gems', value: `**${fmt(eco.gems)}**`, inline: true }
        )
        .setFooter({ text: `Authorized by Bot Owner: ${message.author.username}` })
        .setTimestamp();

      return message.channel.send({ embeds: [resetEmbed] });
    }

    // 4. Parse Amount
    let parsedAmount = isInfCmd ? 999999999999 : parseAmount(amountArg);

    if (parsedAmount === null) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.errorColor || 0xFF0000)
            .setTitle('📖 Executive Money Command Usage')
            .setDescription(
              `**Add Infinite Coins:**\n` +
              `\`${config.prefix || '.'}addmoney @user inf\`\n` +
              `\`${config.prefix || '.'}addmoney inf\` *(gives to yourself)*\n\n` +
              `**Add Custom Amount:**\n` +
              `\`${config.prefix || '.'}addmoney @user 500000\`\n` +
              `\`${config.prefix || '.'}addmoney @user 10M\` *(10 Million)*\n\n` +
              `**Add Bank / Gems:**\n` +
              `\`${config.prefix || '.'}addmoney @user 1M bank\`\n` +
              `\`${config.prefix || '.'}addgems @user 500\`\n\n` +
              `**Direct Set & Deduct:**\n` +
              `\`${config.prefix || '.'}setmoney @user 1000000\`\n` +
              `\`${config.prefix || '.'}removemoney @user 50000\`\n` +
              `\`${config.prefix || '.'}resetmoney @user\``
            )
        ]
      });
    }

    // 5. Apply balance update
    let actionDesc = '';
    let unitLabel = `${emojis.coin || '🪙'} Ryo`;

    if (typeArg.includes('gem')) {
      unitLabel = '💎 Gems';
      if (isSet) {
        eco.gems = Math.max(0, parsedAmount);
        actionDesc = `Set gems directly to **${fmt(eco.gems)}** 💎`;
      } else if (isTake) {
        eco.gems = Math.max(0, (eco.gems || 0) - parsedAmount);
        actionDesc = `Deducted **-${fmt(parsedAmount)}** 💎`;
      } else {
        eco.gems = (eco.gems || 0) + parsedAmount;
        actionDesc = `Added **+${fmt(parsedAmount)}** 💎`;
      }
    } else if (typeArg.includes('bank')) {
      unitLabel = `${emojis.bank || '🏦'} Bank Ryo`;
      // Ensure bank limit expands automatically to fit
      if (eco.bankLimit < parsedAmount) {
        eco.bankLimit = Math.max(eco.bankLimit || 50000, parsedAmount * 2);
      }
      if (isSet) {
        eco.bank = Math.max(0, parsedAmount);
        actionDesc = `Set bank balance directly to **${fmt(eco.bank)}** ${emojis.coin || '🪙'}`;
      } else if (isTake) {
        eco.bank = Math.max(0, (eco.bank || 0) - parsedAmount);
        actionDesc = `Deducted **-${fmt(parsedAmount)}** ${emojis.coin || '🪙'} from bank`;
      } else {
        eco.bank = (eco.bank || 0) + parsedAmount;
        actionDesc = `Added **+${fmt(parsedAmount)}** ${emojis.coin || '🪙'} into bank`;
      }
    } else {
      // Default: Wallet Balance (used for casino bets, blackjack, etc.)
      if (isSet) {
        eco.balance = Math.max(0, parsedAmount);
        actionDesc = `Set wallet balance directly to **${fmt(eco.balance)}** ${emojis.coin || '🪙'}`;
      } else if (isTake) {
        eco.balance = Math.max(0, (eco.balance || 0) - parsedAmount);
        actionDesc = `Deducted **-${fmt(parsedAmount)}** ${emojis.coin || '🪙'} from wallet`;
      } else {
        eco.balance = (eco.balance || 0) + parsedAmount;
        actionDesc = `Added **+${fmt(parsedAmount)}** ${emojis.coin || '🪙'} to wallet`;
      }
    }

    // Save to Database
    db.setEconomy(message.guild.id, target.id, eco);

    const netWorth = (eco.balance || 0) + (eco.bank || 0);

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setAuthor({ name: 'Executive Shinobi Treasury', iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setTitle(`✨ Treasury Funds Transferred!`)
      .setDescription(
        `Bot Owner **${message.author.username}** successfully updated the accounts of **<@>**.\n\n` +
        `**Action:** ${actionDesc}\n` +
        (parsedAmount >= 999999999999 ? `> ♾️ **Infinite Casino Funds Activated!**\n` : '')
      )
      .addFields(
        { name: `${emojis.money || '🪙'} Wallet Balance`, value: `**${fmt(eco.balance)}** ${emojis.coin || '🪙'}`, inline: true },
        { name: `${emojis.bank || '🏦'} Bank Balance`, value: `**${fmt(eco.bank)}** ${emojis.coin || '🪙'}`, inline: true },
        { name: `${emojis.gem || '💎'} Gems`, value: `**${fmt(eco.gems)}** 💎`, inline: true },
        { name: `📈 Total Net Worth`, value: `**${fmt(netWorth)}** ${emojis.coin || '🪙'}`, inline: false }
      )
      .setFooter({ text: `Requested by ${message.author.username} • Executive Owner Action`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};
