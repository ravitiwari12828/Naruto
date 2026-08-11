const emojis = require('../utils/emojis');

module.exports = {
  name: 'ping',
  description: 'Check bot latency and gateway WebSocket responsiveness',
  aliases: ['latency', 'test', 'status'],

  async execute(message, args) {
    const start = Date.now();
    const replyMsg = await message.reply('🏓 Pinging...').catch(() => null);

    const roundtrip = replyMsg ? (Date.now() - start) : 0;
    const wsLatency = Math.round(message.client.ws.ping);

    const statusText = `🏓 **Pong!** Bot is online & fully responsive!\n` +
      `• **Roundtrip Latency:** \`${roundtrip}ms\`\n` +
      `• **WebSocket Ping:** \`${wsLatency >= 0 ? wsLatency : 0}ms\`\n` +
      `• **System Prefix:** \`.\` or \`@Naruto\``;

    if (replyMsg) {
      await replyMsg.edit(statusText).catch(() => {});
    } else {
      await message.channel.send(statusText).catch(() => {});
    }
  }
};
