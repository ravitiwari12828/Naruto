const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const { generateAIAnswer } = require('../utils/aiService');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'priority',
  description: 'AI-powered assistant for fast text, question answering, and code generation',
  aliases: ['ask', 'code'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    
    let sub = args[0] ? args[0].toLowerCase() : null;
    let query = '';
    let mode = 'general';

    // Handle Direct Shorthand Invocations: .ask, .ai, .code
    if (invoked === 'ask' || invoked === 'ai') {
      if (sub === 'help') {
        sub = 'help';
      } else {
        query = args.join(' ');
        mode = 'ask';
        sub = 'ask';
      }
    } else if (invoked === 'code') {
      if (sub === 'help') {
        sub = 'help';
      } else {
        query = args.join(' ');
        mode = 'code';
        sub = 'code';
      }
    } else {
      // Called via .priority
      if (sub === 'ask') {
        query = args.slice(1).join(' ');
        mode = 'ask';
      } else if (sub === 'code') {
        query = args.slice(1).join(' ');
        mode = 'code';
      } else if (sub && sub !== 'help') {
        query = args.join(' ');
        mode = 'general';
        sub = 'ask';
      }
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // HELP MENU (BOX UI)
    if (!sub || sub === 'help' || (!query && invoked === 'priority')) {
      const usageBox = createDynamicBox('EXACT COMMAND USAGES', [
        '.ask <question>',
        '.ai <prompt>',
        '.imagine <prompt>',
        '.code <task>',
        '.priority <query>'
      ]);

      const featureBox = createDynamicBox('SAGE AI CAPABILITIES', [
        'Facts  : Science & Math',
        'Code   : Py, C++, Java, JS',
        'Summary: Fast & Detailed',
        'Engine : Google Gemini'
      ]);

      const embed = createStyledEmbed({
        title: 'Sage AI Assistant — Priority Module',
        subtitle: `${emojis.SPARKLES} Priority AI Hub`,
        description:
          '```\n' + usageBox + '\n```\n' +
          '```\n' + featureBox + '\n```',
        requestedBy: message.author,
        clientUser,
        footerText: 'Naruto One Priority AI • Google Gemini Integrated'
      });

      return message.channel.send({ embeds: [embed] });
    }

    if (!query || !query.trim()) {
      return message.reply(`${emojis.WARNING} Please provide a prompt or question!\n**Example:** \`.ask What is Google?\` or \`.code write a JS discord command\``);
    }

    const waitingMsg = await message.reply(`${emojis.AN_BOT || emojis.OBJ_AN_BOT || '⚡'} *Consulting Sage AI Intelligence...*`);

    try {
      const aiResponse = await generateAIAnswer(query, mode);

      const statusBox = createDynamicBox('AI RESPONSE SUMMARY', [
        { key: 'Engine', value: mode === 'code' ? 'Code Compiler' : 'Sage AI Engine' },
        { key: 'Status', value: '🟢 Completed' }
      ]);

      const embed = createStyledEmbed({
        title: mode === 'code' ? `${emojis.LAPTOP || '💻'} Priority Code Assistant` : `${emojis.SPARKLES || '✨'} Priority AI Assistant`,
        subtitle: mode === 'code' ? 'Generated Code Solution' : 'Sage Intelligence Response',
        description:
          '```\n' + statusBox + '\n```\n\n' +
          aiResponse.slice(0, 3500),
        requestedBy: message.author,
        clientUser,
        showThumbnail: false,
        footerText: 'Powered by Naruto One Priority AI'
      });

      return waitingMsg.edit({ content: ' ', embeds: [embed] });
    } catch (err) {
      console.error('[Priority AI Error]', err.message);
      return waitingMsg.edit(`${emojis.WARNING} Could not generate AI response: \`${err.message || 'API Error'}\``);
    }
  }
};
