const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const emojis = require('../utils/emojis');
const { isBotOwner } = require('../utils/owners');
const db = require('../database/db');

const DEFAULT_BOT_OWNERS = ['1420687548807905324'];

// Bot-level Extra Owners Store (Backed by DB)
const globalBotExtraOwners = new Set(DEFAULT_BOT_OWNERS);
const _origAddOwner = globalBotExtraOwners.add.bind(globalBotExtraOwners);
const _origDelOwner = globalBotExtraOwners.delete.bind(globalBotExtraOwners);

function saveBotExtraOwners() {
  const list = Array.from(globalBotExtraOwners).filter(id => typeof id === 'string' && id.trim().length > 0);
  db.setSection('botExtraOwners', list);
}

globalBotExtraOwners.add = (id) => {
  if (!id || typeof id !== 'string') return globalBotExtraOwners;
  const res = _origAddOwner(id);
  saveBotExtraOwners();
  return res;
};

globalBotExtraOwners.delete = (id) => {
  const res = _origDelOwner(id);
  saveBotExtraOwners();
  return res;
};

function hydrateBotExtraOwners() {
  const saved = db.getSection('botExtraOwners', []);
  globalBotExtraOwners.clear();
  for (const id of DEFAULT_BOT_OWNERS) _origAddOwner(id);
  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (id && typeof id === 'string' && id.trim().length > 0) _origAddOwner(id.trim());
    }
  }
}

hydrateBotExtraOwners();
db.onCloudRestore(hydrateBotExtraOwners);

module.exports = {
  name: 'extraowner',
  description: 'Dedicated Extra Owner Suite: .serverextraowner (Server Extra Owners) and .botextraowner (Bot Extra Owners)',
  aliases: ['serverextraowner', 'botextraowner', 'botowner', 'serverowner'],

  globalBotExtraOwners,

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const sub = args[0]?.toLowerCase();

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const antinukeCmd = message.client.commands.get('antinuke');
    const config = antinukeCmd && antinukeCmd.getOrCreateAntinuke ? antinukeCmd.getOrCreateAntinuke(guild.id) : null;

    // ─────────────────────────────────────────
    // 1. BOT EXTRA OWNER (.botextraowner add/remove/list)
    // ─────────────────────────────────────────
    if (invoked === 'botextraowner' || invoked === 'botowner' || sub === 'bot') {
      if (!isBotOwner(message.author, message.client)) return;

      const action = (invoked === 'botextraowner' || invoked === 'botowner' ? args[0] : args[1])?.toLowerCase();
      const targetUser = message.mentions.users.first() || (args[1] && args[1].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);

      if (action === 'add' && targetUser) {
        globalBotExtraOwners.add(targetUser.id);
        return message.reply(`${emojis.SUCCESS || '✅'} **<@${targetUser.id}> (\`${targetUser.tag}\`)** has been added as a **Bot Extra Owner**!`);
      }

      if ((action === 'remove' || action === 'del') && targetUser) {
        globalBotExtraOwners.delete(targetUser.id);
        return message.reply(`${emojis.SUCCESS || '✅'} **<@${targetUser.id}> (\`${targetUser.tag}\`)** has been removed from **Bot Extra Owners**.`);
      }

      const listStr = Array.from(globalBotExtraOwners).map((id, i) => `\`${i + 1}.\` <@${id}> (\`${id}\`)`).join('\n') || 'None assigned';
      const embed = createStyledEmbed({
        title: `👑 Global Bot Extra Owners`,
        subtitle: `Global Bot Developers & System Owners`,
        description: `**Current Bot Extra Owners:**\n${listStr}\n\n**Usage:**\n\`.botextraowner add @user\`\n\`.botextraowner remove @user\``,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 2. SERVER EXTRA OWNER (.serverextraowner add/remove/list)
    // ─────────────────────────────────────────
    const isServerOwner = guild.ownerId === author.id;
    if (!isServerOwner) {
      return message.reply(`${emojis.WARNING || '❌'} **Access Denied**: Only the **Server Owner** (<@${guild.ownerId}>) can manage Server Extra Owners for this guild!`);
    }

    const action = sub;
    const targetUser = message.mentions.users.first() || (args[1] && args[1].match(/^\d{17,20}$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);

    if (action === 'add' && targetUser) {
      if (config) {
        config.extraOwners.add(targetUser.id);
        antinukeCmd.antinukeConfigs.set(guild.id, config);
      }
      return message.reply(`${emojis.SUCCESS || '✅'} **<@${targetUser.id}> (\`${targetUser.tag}\`)** has been appointed as a **Server Extra Owner** for **${guild.name}**!`);
    }

    if ((action === 'remove' || action === 'del') && targetUser) {
      if (config) {
        config.extraOwners.delete(targetUser.id);
        antinukeCmd.antinukeConfigs.set(guild.id, config);
      }
      return message.reply(`${emojis.SUCCESS || '✅'} **<@${targetUser.id}> (\`${targetUser.tag}\`)** has been removed from **Server Extra Owners**.`);
    }

    const serverList = config && config.extraOwners ? Array.from(config.extraOwners).map((id, i) => `\`${i + 1}.\` <@${id}> (\`${id}\`)`).join('\n') : `<@${guild.ownerId}> (Server Owner)`;
    const embed = createStyledEmbed({
      title: `👑 Server Extra Owners — ${guild.name}`,
      subtitle: `Guild Security Authority`,
      description: `**Server Owner:** <@${guild.ownerId}>\n\n**Appointed Server Extra Owners:**\n${serverList}\n\n**Usage:**\n\`.serverextraowner add @user\`\n\`.serverextraowner remove @user\``,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
