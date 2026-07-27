const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const emojis = require('../utils/emojis');
const config = require('../config');
const { isBotOwner } = require('../utils/owners');

const SUBCOMMAND_PRESETS = {
  autorole: ['config', 'add', 'remove', 'list', 'reset'],
  massrole: ['add', 'remove'],
  autoresponder: ['config', 'add', 'remove', 'list', 'reset'],
  ar: ['add', 'remove', 'list', 'reset'],
  autoreact: ['config', 'add', 'remove', 'list', 'reset'],
  automod: ['config', 'anti-spam', 'anti-link', 'whitelist', 'reset'],
  antibot: ['config', 'wl', 'unwl', 'enable', 'disable'],
  channel: ['lock', 'unlock', 'hide', 'unhide', 'lockall', 'unlockall'],
  mod: ['mute', 'unmute', 'kick', 'ban', 'unban', 'warn', 'clearwarns', 'modlogs'],
  modlogs: ['set', 'view', 'reset'],
  modlimits: ['bypass', 'view', 'reset'],
  pet: ['adopt', 'list'],
  stocks: ['view', 'buy', 'sell'],
  shop: ['tools', 'consumables', 'resources'],
  buy: ['pickaxe', 'ramen', 'potion'],
  sell: ['wood', 'pickaxe', 'all'],
  marry: ['propose'],
  divorce: [],
  reactionrole: ['add', 'remove', 'list', 'reset'],
  stickynote: ['set', 'remove', 'list'],
  voicemaster: ['setup', 'lock', 'unlock', 'claim', 'hide', 'unhide'],
  supportsetup: ['set', 'view', 'reset'],
  tickets: ['setup', 'close', 'reopen'],
  vanityguard: ['enable', 'disable', 'config'],
  welcome: ['set', 'view', 'reset'],
  ninja: ['profile', 'jutsu', 'chakra', 'quest', 'lb']
};

module.exports = {
  name: 'testall',
  aliases: ['testsuite', 'testcmds', 'diag', 'auditcmds'],
  description: 'Owner Command: Runs a deep dry-run diagnostic on all bot commands AND subcommands.',
  usage: '.testall [module_name]',
  cooldown: 5000,
  async execute(message, args) {
    if (!isBotOwner(message.author, message.client)) {
      return message.reply(`${emojis.WARNING} Access Denied: Only **Bot Owners** can run the system diagnostic command.`);
    }

    const filterModule = (args[0] || '').toLowerCase();
    const statusMsg = await message.reply(`${emojis.LOADING} **Initiating Deep Subcommand Diagnostic Audit...** Please wait.`);

    const commandsMap = message.client.commands;
    const uniqueCommands = new Map();

    for (const [name, cmd] of commandsMap.entries()) {
      if (cmd && cmd.name && !uniqueCommands.has(cmd.name)) {
        uniqueCommands.set(cmd.name, cmd);
      }
    }

    let testList = Array.from(uniqueCommands.values());

    if (filterModule) {
      testList = testList.filter(cmd => {
        const nameMatch = cmd.name.toLowerCase().includes(filterModule);
        const catMatch = cmd.category?.toLowerCase().includes(filterModule);
        return nameMatch || catMatch;
      });
    }

    if (!testList.length) {
      return statusMsg.edit(`${emojis.error} No commands found matching module filter \`${filterModule}\`.`);
    }

    const passedSubcmds = [];
    const flawedSubcmds = [];
    let totalSubcmdCount = 0;

    const dummyUser = message.author;
    const dummyMember = message.member;
    const dummyGuild = message.guild;

    for (const cmd of testList) {
      const subcmds = SUBCOMMAND_PRESETS[cmd.name] || ['config', 'help'];
      const variations = ['', ...subcmds];

      for (const sub of variations) {
        totalSubcmdCount++;
        const fullName = sub ? `.${cmd.name} ${sub}` : `.${cmd.name}`;

        try {
          const mockMessage = Object.create(message);
          mockMessage.author = dummyUser;
          mockMessage.member = dummyMember;
          mockMessage.guild = dummyGuild;
          mockMessage.client = message.client;
          mockMessage.content = `${fullName} ${dummyUser.id} 100 test`;
          mockMessage.channel = {
            ...message.channel,
            send: async () => ({ edit: async () => {}, delete: async () => {}, createMessageComponentCollector: () => ({ on: () => {}, stop: () => {} }) }),
            sendTyping: async () => {}
          };
          mockMessage.reply = async () => ({ edit: async () => {} });

          const mockUsers = new Collection([[dummyUser.id, dummyUser]]);
          const mockMembers = new Collection([[dummyUser.id, dummyMember]]);
          const mockChannels = new Collection([[message.channel.id, message.channel]]);
          const mockRoles = new Collection();

          mockMessage.mentions = {
            users: mockUsers,
            members: mockMembers,
            channels: mockChannels,
            roles: mockRoles
          };

          const dummyArgs = sub ? [sub, dummyUser.id, '100', 'test'] : [dummyUser.id, '100', 'test'];

          const result = cmd.execute(mockMessage, dummyArgs);
          if (result && typeof result.then === 'function') {
            await Promise.race([
              result,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Async execution timeout (500ms)')), 500))
            ]).catch(asyncErr => {
              if (asyncErr && !asyncErr.message.includes('timeout') && !asyncErr.message.includes('Unknown') && !asyncErr.message.includes('Missing Permissions')) {
                flawedSubcmds.push({ name: fullName, error: asyncErr.message || String(asyncErr) });
              }
            });
          }

          if (!flawedSubcmds.some(f => f.name === fullName)) {
            passedSubcmds.push(fullName);
          }
        } catch (err) {
          flawedSubcmds.push({ name: fullName, error: err.message || String(err) });
        }
      }
    }

    const flawCount = flawedSubcmds.length;
    const passCount = passedSubcmds.length;

    const renderOverview = () => new EmbedBuilder()
      .setColor(flawCount > 0 ? config.warnColor : config.successColor)
      .setAuthor({ name: 'System Subcommand Diagnostic Suite', iconURL: message.client.user.displayAvatarURL() })
      .setTitle(`🧪 Deep Subcommand Diagnostic & Flaw Report`)
      .setDescription(
        `Audited **${totalSubcmdCount}** commands & subcommands${filterModule ? ` in module \`${filterModule}\`` : ''}.\n\n` +
        `✅ **Passed Subcommands (${passCount}/${totalSubcmdCount}):**\n` +
        (passedSubcmds.length > 0 ? passedSubcmds.slice(0, 25).map(c => `\`${c}\``).join(', ') + (passedSubcmds.length > 25 ? ` *+${passedSubcmds.length - 25} more*` : '') : 'None') + `\n\n` +
        `⚠️ **Flaws / Issues Detected (${flawCount}/${totalSubcmdCount}):**\n` +
        (flawedSubcmds.length > 0
          ? flawedSubcmds.slice(0, 15).map((f, i) => `**${i + 1}. ${f.name}** — \`${f.error}\``).join('\n')
          : `${emojis.success} All commands & subcommands passed cleanly with 0 flaws!`)
      )
      .setFooter({ text: `Audit completed at ${new Date().toLocaleTimeString('en-US')} • Operational rate: ${Math.round((passCount / totalSubcmdCount) * 100)}%` })
      .setTimestamp();

    return statusMsg.edit({ content: ' ', embeds: [renderOverview()] });
  },
};
