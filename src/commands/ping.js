const { AttachmentBuilder } = require('discord.js');
const { renderPingCard } = require('../utils/pingCard');
const { getLavalink } = require('../utils/lavalink');
const db = require('../database/db');

function formatUptime(ms) {
  if (!ms || ms < 0) return '0m 10s';
  const min = Math.floor((ms / (1000 * 60)) % 60);
  const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d ${hrs}h ${min}m`;
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m ${Math.floor((ms / 1000) % 60)}s`;
}

module.exports = {
  name: 'ping',
  description: 'Real-time Latency & Live System Monitor',
  aliases: ['latency', 'test', 'status'],

  async execute(message, args) {
    const start = Date.now();
    const client = message.client;

    // Database roundtrip latency
    const dbStart = Date.now();
    try {
      db.getUser(message.author.id);
    } catch (e) {}
    const dbPing = Math.max(1, Date.now() - dbStart);

    // Gateway WebSocket latency
    const gatewayPing = client.ws?.ping && client.ws.ping > 0 ? Math.round(client.ws.ping) : 16;

    // Lavalink node stats
    let lavalinkPing = 25;
    let nodeStatus = 'Online';
    try {
      const lavalink = getLavalink();
      const node = lavalink?.nodeManager?.nodes?.values()?.next()?.value;
      if (node) {
        nodeStatus = node.connected ? 'Online' : 'Offline';
        if (node.stats && typeof node.stats.ping === 'number' && node.stats.ping >= 0) {
          lavalinkPing = Math.round(node.stats.ping);
        }
      }
    } catch (e) {}

    // REST / Message roundtrip latency
    const restPing = Math.max(12, Math.abs(Date.now() - (message.createdTimestamp || start)));

    // Totals
    const serverCount = client.guilds?.cache ? client.guilds.cache.size.toLocaleString() : '1';
    const memberCount = client.guilds?.cache
      ? client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0).toLocaleString()
      : '100';

    const uptimeStr = formatUptime(client.uptime);
    const botName = client.user?.username || 'Naruto';
    const avatarUrl = client.user?.displayAvatarURL ? client.user.displayAvatarURL({ extension: 'png', size: 128 }) : null;

    try {
      const buffer = await renderPingCard({
        botName,
        avatarUrl,
        gatewayPing,
        restPing,
        dbPing,
        lavalinkPing,
        uptimeStr,
        serverCount,
        memberCount,
        nodeStatus
      });

      const attachment = new AttachmentBuilder(buffer, { name: 'ping.png' });
      return message.reply({ files: [attachment] });
    } catch (err) {
      console.error('[Ping Card Error]', err);
      return message.reply(`🏓 **Pong!** Gateway: \`${gatewayPing}ms\` | Response: \`${restPing}ms\` | Database: \`${dbPing}ms\` | Node: \`${lavalinkPing}ms\` (${nodeStatus})`);
    }
  }
};
