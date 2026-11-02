const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');
const { fmt, addItem, removeItem } = require('../../utils/economyCore');
const { isBotOwner } = require('../../utils/owners');

module.exports = {
  name: 'giveitem',
  aliases: ['additem', 'ecoitem', 'itemadd', 'takeitem', 'removeitem', 'giveitems'],
  description: 'Bot Owner Executive Command: Give or remove items from any member inventory.',
  usage: '.giveitem [@user/ID] <itemId|all> [amount|inf]',
  async execute(message, args) {
    // 1. Strict Bot Owner Check
    if (!isBotOwner(message.author, message.client)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.errorColor || 0xFF0000)
            .setDescription(`${emojis.error || '❌'} **Access Denied!** This executive item command is strictly reserved for the **Bot Owner**.`)
        ]
      });
    }

    const rawFirstWord = (message.content.trim().split(/ +/)[0] || '').replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const isTake = rawFirstWord === 'takeitem' || rawFirstWord === 'removeitem';

    // 2. Resolve Target User and Arguments
    let target = null;
    let itemArg = null;
    let qtyArg = null;

    if (message.mentions.users.size > 0) {
      target = message.mentions.users.first();
      itemArg = args[1];
      qtyArg = args[2];
    } else if (args[0] && /^\d{17,20}$/.test(args[0])) {
      try {
        target = await message.client.users.fetch(args[0]);
      } catch (e) {
        target = null;
      }
      itemArg = args[1];
      qtyArg = args[2];
    } else {
      // Default target is the bot owner
      target = message.author;
      itemArg = args[0];
      qtyArg = args[1];
    }

    if (!target) target = message.author;

    // 3. Catalogue / Help Embed if no item argument
    const allRegistered = items.allItems();

    if (!itemArg) {
      const toolLines = Object.values(items.TOOLS).map(t => `${t.emoji} \`${t.id}\` — **${t.name}**`).join('\n');
      const consumableLines = Object.values(items.CONSUMABLES).map(c => `${c.emoji} \`${c.id}\` — **${c.name}**`).join('\n');
      const resourceLines = Object.values(items.RESOURCES).map(r => `${r.emoji} \`${r.id}\` — **${r.name}**`).join('\n');

      const helpEmbed = new EmbedBuilder()
        .setColor(0x7E0808)
        .setAuthor({ name: 'Executive Shinobi Inventory Suite', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTitle('🎒 Executive Item Commands & Catalogue')
        .setDescription(
          `**Usage:**\n` +
          `\`${config.prefix || '.'}giveitem [@user] <itemId|all> [amount|inf]\`\n` +
          `\`${config.prefix || '.'}giveitem all 10\` *(gives 10x of everything to yourself)*\n` +
          `\`${config.prefix || '.'}giveitem @user charm inf\` *(infinite casino charms)*\n` +
          `\`${config.prefix || '.'}takeitem @user <itemId> [amount]\`\n\n` +
          `**🛠️ Tools & Equipment:**\n${toolLines}\n\n` +
          `**🧪 Consumables & Charms:**\n${consumableLines}\n\n` +
          `**💎 Resources & Ores:**\n${resourceLines}`
        )
        .setFooter({ text: `Requested by ${message.author.username} • Executive Item Control` })
        .setTimestamp();

      return message.channel.send({ embeds: [helpEmbed] });
    }

    // 4. Parse Quantity
    let qty = 1;
    if (qtyArg) {
      const qStr = String(qtyArg).toLowerCase().trim().replace(/,/g, '');
      if (['inf', 'infinite', 'max', 'infinity'].includes(qStr)) {
        qty = 99999;
      } else {
        const parsed = parseInt(qStr, 10);
        if (!isNaN(parsed) && parsed > 0) qty = parsed;
      }
    }

    const eco = db.economy(message.guild.id, target.id);
    if (!eco.inventory) eco.inventory = {};

    const cleanItemKey = itemArg.toLowerCase().trim();

    // 5. Special Mode: "ALL" items bundle
    if (cleanItemKey === 'all' || cleanItemKey === 'everything') {
      const itemsList = Object.values(allRegistered);
      for (const it of itemsList) {
        if (isTake) {
          removeItem(eco.inventory, it.id, qty);
        } else {
          addItem(eco.inventory, it.id, qty);
        }
      }

      db.setEconomy(message.guild.id, target.id, eco);

      const allEmbed = new EmbedBuilder()
        .setColor(isTake ? 0xED4245 : 0x00F0FF)
        .setAuthor({ name: 'Executive Master Inventory Package', iconURL: target.displayAvatarURL({ dynamic: true }) })
        .setTitle(isTake ? `🗑️ Master Item Removal` : `🎁 Master Item Delivery (${fmt(itemsList.length)} Items)`)
        .setDescription(
          `${isTake ? 'Removed' : 'Delivered'} **x${fmt(qty)}** of **EVERY item** in the game to **<@>**!\n` +
          `Included: Tools, Shinobi Lucky Charms, 2x Ryo Boosters, Mystery Boxes, Ramen, Gems & Ores.`
        )
        .setFooter({ text: `Total Items in Inventory: ${Object.keys(eco.inventory).length} unique items` })
        .setTimestamp();

      return message.channel.send({ embeds: [allEmbed] });
    }

    // 6. Find Item by ID or Name
    let matchedItem = items.findItem(cleanItemKey);
    if (!matchedItem) {
      // Allow custom arbitrary item ID if owner specifies
      matchedItem = {
        id: cleanItemKey,
        name: cleanItemKey.charAt(0).toUpperCase() + cleanItemKey.slice(1),
        emoji: '📦'
      };
    }

    if (isTake) {
      const current = eco.inventory[matchedItem.id] || 0;
      if (current <= 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.errorColor || 0xFF0000)
              .setDescription(`${emojis.error || '❌'} **${target.username}** does not have any **${matchedItem.name}** in their inventory.`)
          ]
        });
      }

      const removeCount = Math.min(current, qty);
      removeItem(eco.inventory, matchedItem.id, removeCount);
      db.setEconomy(message.guild.id, target.id, eco);

      const remaining = eco.inventory[matchedItem.id] || 0;
      const takeEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: 'Executive Item Removal', iconURL: target.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          `Removed **${fmt(removeCount)}x ${matchedItem.name}** ${matchedItem.emoji} from **<@>**'s inventory.\n` +
          `**Remaining Balance:** **${fmt(remaining)}x**`
        )
        .setFooter({ text: `Authorized by Bot Owner: ${message.author.username}` })
        .setTimestamp();

      return message.channel.send({ embeds: [takeEmbed] });
    }

    // Add item
    addItem(eco.inventory, matchedItem.id, qty);
    db.setEconomy(message.guild.id, target.id, eco);

    const newTotal = eco.inventory[matchedItem.id] || qty;

    const giveEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setAuthor({ name: 'Executive Shinobi Inventory Delivery', iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setTitle(`✨ Item Granted to ${target.username}`)
      .setDescription(
        `Bot Owner **${message.author.username}** granted item(s) to **<@>**:\n\n` +
        `**Item:** ${matchedItem.emoji} **${matchedItem.name}** \`(ID: ${matchedItem.id})\`\n` +
        `**Delivered:** **+${fmt(qty)}x**\n` +
        `**Total in Inventory:** **x${fmt(newTotal)}**\n` +
        (qty >= 99999 ? `> ♾️ **Infinite Item Quantity Granted!**\n` : '') +
        `-# Target can check via \`.inv\` or use consumables via \`.use ${matchedItem.id}\``
      )
      .setFooter({ text: `Authorized by Bot Owner: ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    return message.channel.send({ embeds: [giveEmbed] });
  }
};
