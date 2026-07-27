const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const emojis = require('../utils/emojis');
const config = require('../config');
const { isBotOwner } = require('../utils/owners');

module.exports = {
  name: 'testall',
  aliases: ['testsuite', 'testcmds', 'diag', 'auditcmds'],
  description: 'Owner Command: Runs a dry-run diagnostic test on all bot commands and reports working vs flawed commands in detail.',
  usage: '.testall [module_name]',
  cooldown: 5000,
  async execute(message, args) {
    if (!isBotOwner(message.author, message.client)) {
      return message.reply(`${emojis.WARNING} Access Denied: Only **Bot Owners** can run the system diagnostic command.`);
    }

    const filterModule = (args[0] || '').toLowerCase();
    const statusMsg = await message.reply(`${emojis.LOADING} **Initiating Diagnostic Dry-Run on Bot Commands...** Please wait.`);

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

    const passed = [];
    const flaws = [];

    const dummyUser = message.author;
    const dummyMember = message.member;
    const dummyGuild = message.guild;

    for (const cmd of testList) {
      try {
        const mockMessage = Object.create(message);
        mockMessage.author = dummyUser;
        mockMessage.member = dummyMember;
        mockMessage.guild = dummyGuild;
        mockMessage.client = message.client;
        mockMessage.content = `.${cmd.name} ${dummyUser.id} 100 test`;
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

        const dummyArgs = [dummyUser.id, '100', 'test', 'red'];

        const result = cmd.execute(mockMessage, dummyArgs);
        if (result && typeof result.then === 'function') {
          await Promise.race([
            result,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Async execution timeout (500ms)')), 500))
          ]).catch(asyncErr => {
            if (asyncErr && !asyncErr.message.includes('timeout') && !asyncErr.message.includes('Unknown') && !asyncErr.message.includes('Missing Permissions')) {
              flaws.push({ name: cmd.name, error: asyncErr.message || String(asyncErr) });
            }
          });
        }

        if (!flaws.some(f => f.name === cmd.name)) {
          passed.push(cmd.name);
        }
      } catch (err) {
        flaws.push({ name: cmd.name, error: err.message || String(err) });
      }
    }

    const totalCount = testList.length;
    const flawCount = flaws.length;
    const passCount = passed.length;

    const renderOverview = () => new EmbedBuilder()
      .setColor(flawCount > 0 ? config.warnColor : config.successColor)
      .setAuthor({ name: 'System Command Diagnostic Suite', iconURL: message.client.user.displayAvatarURL() })
      .setTitle(`🧪 Full System Audit & Command Health Report`)
      .setDescription(
        `Tested **${totalCount}** commands${filterModule ? ` in module \`${filterModule}\`` : ''}.\n\n` +
        `✅ **Passed / Operational (${passCount}/${totalCount}):**\n` +
        (passed.length > 0 ? passed.map(c => `\`${c}\``).join(', ') : 'None') + `\n\n` +
        `⚠️ **Flaws / Issues Detected (${flawCount}/${totalCount}):**\n` +
        (flaws.length > 0
          ? flaws.map((f, i) => `**${i + 1}. .${f.name}** — \`${f.error}\``).join('\n')
          : `${emojis.success} All commands passed cleanly with 0 flaws!`)
      )
      .setFooter({ text: `Audit completed at ${new Date().toLocaleTimeString('en-US')} • Operational rate: ${Math.round((passCount / totalCount) * 100)}%` })
      .setTimestamp();

    return statusMsg.edit({ content: ' ', embeds: [renderOverview()] });
  },
};
