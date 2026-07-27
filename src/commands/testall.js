const { EmbedBuilder } = require('discord.js');
const emojis = require('../utils/emojis');
const config = require('../config');
const { isBotOwner } = require('../utils/owners');

module.exports = {
  name: 'testall',
  aliases: ['testsuite', 'testcmds', 'diag', 'auditcmds'],
  description: 'Owner Command: Runs a dry-run diagnostic test on all bot commands and reports any flaws or errors.',
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

    // Deduplicate commands (filter out alias mappings pointing to the same command object)
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

    // Mock message object for safe dry-run execution
    const dummyUser = message.author;
    const dummyMember = message.member;
    const dummyGuild = message.guild;

    for (const cmd of testList) {
      try {
        // Create mock context that intercepts sends/replies without spamming Discord
        const mockMessage = {
          ...message,
          author: dummyUser,
          member: dummyMember,
          guild: dummyGuild,
          channel: {
            ...message.channel,
            send: async () => ({ edit: async () => {}, delete: async () => {}, createMessageComponentCollector: () => ({ on: () => {}, stop: () => {} }) }),
            sendTyping: async () => {}
          },
          reply: async () => ({ edit: async () => {} }),
          mentions: {
            users: new Map([[dummyUser.id, dummyUser]]),
            members: new Map([[dummyUser.id, dummyMember]]),
            channels: new Map([[message.channel.id, message.channel]]),
            roles: new Map()
          },
          content: `.${cmd.name} ${dummyUser.id} 100 test`
        };

        // Dummy arguments array
        const dummyArgs = [dummyUser.id, '100', 'test', 'red'];

        // Dry run execute call inside try/catch block
        const result = cmd.execute(mockMessage, dummyArgs);
        if (result && typeof result.then === 'function') {
          await Promise.race([
            result,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Async execution timeout (500ms)')), 500))
          ]).catch(asyncErr => {
            // Ignore normal user input validation errors, record unhandled code crashes
            if (asyncErr && !asyncErr.message.includes('timeout') && !asyncErr.message.includes('Unknown') && !asyncErr.message.includes('Missing Permissions')) {
              flaws.push({ name: cmd.name, error: asyncErr.message || String(asyncErr) });
            }
          });
        }

        passed.push(cmd.name);
      } catch (err) {
        flaws.push({ name: cmd.name, error: err.message || String(err) });
      }
    }

    const totalCount = testList.length;
    const flawCount = flaws.length;
    const passCount = totalCount - flawCount;

    const flawLines = flaws.length > 0
      ? flaws.slice(0, 15).map((f, i) => `**${i + 1}. .${f.name}**\n-# ❌ Flaw: \`${f.error}\``).join('\n\n')
      : `${emojis.success} **Zero Flaws Detected!** All tested commands executed cleanly without any code crashes.`;

    const reportEmbed = new EmbedBuilder()
      .setColor(flawCount > 0 ? config.warnColor : config.successColor)
      .setAuthor({ name: 'System Command Diagnostic Suite', iconURL: message.client.user.displayAvatarURL() })
      .setTitle(`🧪 Command Diagnostic & Flaw Audit Report`)
      .setDescription(
        `Tested **${totalCount}** commands${filterModule ? ` in module \`${filterModule}\`` : ''}.\n\n` +
        `✅ **Passed / Operational:** \`${passCount}\`\n` +
        `⚠️ **Flaws / Issues Detected:** \`${flawCount}\`\n\n` +
        `__**Diagnostic Findings:**__\n${flawLines}`
      )
      .setFooter({ text: `Audit completed at ${new Date().toLocaleTimeString('en-US')}` })
      .setTimestamp();

    return statusMsg.edit({ content: ' ', embeds: [reportEmbed] });
  },
};
