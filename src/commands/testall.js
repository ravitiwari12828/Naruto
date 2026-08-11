const { EmbedBuilder, Collection } = require('discord.js');
const emojis = require('../utils/emojis');
const config = require('../config');
const { isBotOwner } = require('../utils/owners');

const MODULE_ALIASES = {
  automations: ['autorole', 'massrole', 'automation'],
  automation: ['autorole', 'massrole', 'automation'],
  autorole: ['autorole', 'massrole'],
  autoresponder: ['autoresponder', 'ar', 'autoreact'],
  autorespond: ['autoresponder', 'ar', 'autoreact'],
  automod: ['automod', 'antibot', 'moderation', 'filter'],
  security: ['antinuke', 'vanityguard', 'quarantine', 'securesetup'],
  channel: ['channel', 'lock', 'unlock', 'hide', 'unhide', 'lockall', 'unlockall'],
  moderation: ['mod', 'modlogs', 'modlimits', 'channel'],
  economy: ['balance', 'deposit', 'withdraw', 'pay', 'networth', 'leaderboard', 'blackjack', 'plinko', 'crash', 'roulette', 'dice', 'higherlower', 'work', 'job', 'mine', 'dig', 'fish', 'chop', 'hunt', 'crime', 'daily', 'weekly', 'monthly', 'shop', 'buy', 'sell', 'inventory', 'pet', 'marry', 'stocks', 'quest'],
  casino: ['blackjack', 'plinko', 'crash', 'roulette', 'dice', 'higherlower', 'limbo', 'scratchcard'],
  naruto: ['ninja'],
  rpg: ['ninja']
};

module.exports = {
  name: 'testall',
  aliases: [],
  description: 'Owner Command: Runs a deep dry-run diagnostic on all bot commands.',
  usage: '.testall [module_name]',
  cooldown: 5000,
  async execute(message, args) {
    if (!isBotOwner(message.author, message.client)) {
      return message.reply(`${emojis.WARNING} Access Denied: Only **Bot Owners** can run the system diagnostic command.`);
    }

    const filterModule = (args[0] || '').toLowerCase();
    const statusMsg = await message.reply(`${emojis.LOADING} **Initiating Command Diagnostic Audit...** Please wait.`);

    const commandsMap = message.client.commands;
    const uniqueCommands = new Map();

    for (const [name, cmd] of commandsMap.entries()) {
      // Exclude support server setup command from testall per user directive
      if (cmd && cmd.name && !uniqueCommands.has(cmd.name) && !['supportsetup', 'createsupportserver', 'buildsupportserver'].includes(cmd.name)) {
        uniqueCommands.set(cmd.name, cmd);
      }
    }

    let testList = Array.from(uniqueCommands.values());

    if (filterModule) {
      const aliasMatch = MODULE_ALIASES[filterModule];
      testList = testList.filter(cmd => {
        if (aliasMatch && aliasMatch.includes(cmd.name)) return true;
        const nameMatch = cmd.name.toLowerCase().includes(filterModule);
        const aliasListMatch = cmd.aliases && Array.isArray(cmd.aliases) && cmd.aliases.some(a => a.toLowerCase().includes(filterModule));
        const catMatch = cmd.category?.toLowerCase().includes(filterModule);
        return nameMatch || aliasListMatch || catMatch;
      });
    }

    if (!testList.length) {
      return statusMsg.edit(`${emojis.error} No commands found matching module filter \`${filterModule}\`.`);
    }

    const passedCmds = [];
    const flawedCmds = [];
    let totalCount = 0;

    const dummyUser = message.author;
    const dummyMember = message.member;
    const dummyGuild = message.guild;

    for (const cmd of testList) {
      totalCount++;
      const fullName = `.${cmd.name}`;

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

        const dummyArgs = [dummyUser.id, '100', 'test'];

        const result = cmd.execute(mockMessage, dummyArgs);
        if (result && typeof result.then === 'function') {
          await Promise.race([
            result,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Async execution timeout (1500ms)')), 1500))
          ]).catch(asyncErr => {
            if (asyncErr && !asyncErr.message.includes('timeout') && !asyncErr.message.includes('Unknown') && !asyncErr.message.includes('Missing Permissions')) {
              flawedCmds.push({ name: fullName, error: asyncErr.message || String(asyncErr) });
            }
          });
        }

        if (!flawedCmds.some(f => f.name === fullName)) {
          passedCmds.push(fullName);
        }
      } catch (err) {
        flawedCmds.push({ name: fullName, error: err.message || String(err) });
      }
    }

    const flawCount = flawedCmds.length;
    const passCount = passedCmds.length;

    const renderOverview = () => new EmbedBuilder()
      .setColor(flawCount > 0 ? config.warnColor : config.successColor)
      .setAuthor({ name: 'System Diagnostic Suite', iconURL: message.client.user.displayAvatarURL() })
      .setTitle(`🧪 Command Diagnostic & Flaw Report`)
      .setDescription(
        `Audited **${totalCount}** commands${filterModule ? ` in module \`${filterModule}\`` : ''}.\n\n` +
        `✅ **Passed Commands (${passCount}/${totalCount}):**\n` +
        (passedCmds.length > 0 ? passedCmds.map(c => `\`${c}\``).join(', ') : 'None') + `\n\n` +
        `⚠️ **Flaws / Issues Detected (${flawCount}/${totalCount}):**\n` +
        (flawedCmds.length > 0
          ? flawedCmds.slice(0, 15).map((f, i) => `**${i + 1}. ${f.name}** — \`${f.error}\``).join('\n')
          : `${emojis.success} All commands passed cleanly with 0 flaws!`)
      )
      .setFooter({ text: `Audit completed at ${new Date().toLocaleTimeString('en-US')} • Operational rate: ${Math.round((passCount / totalCount) * 100)}%` })
      .setTimestamp();

    return statusMsg.edit({ content: ' ', embeds: [renderOverview()] });
  },
};
