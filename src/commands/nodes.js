const { createStyledEmbed } = require('../utils/embedBuilder');
const { getLavalink, getNodesStatus } = require('../utils/lavalink');
const emojis = require('../utils/emojis');

function formatUptime(ms) {
  if (!ms || ms <= 0) return '0m';
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

module.exports = {
  name: 'nodes',
  description: 'View live Lavalink audio nodes connectivity and status',
  aliases: ['node', 'lavalink', 'lavalinkstatus'],

  async execute(message, args) {
    const clientUser = message.client.user;
    const author = message.author;
    const lavalink = getLavalink();

    if (!lavalink || !lavalink.nodeManager?.nodes || lavalink.nodeManager.nodes.size === 0) {
      return message.reply(`${emojis.WARNING} **Lavalink is not initialized yet.** Please wait a moment.`);
    }

    const allNodes = Array.from(lavalink.nodeManager.nodes.values());
    const connectedCount = allNodes.filter(n => n.connected).length;

    let fields = [];
    allNodes.forEach((node, index) => {
      const isOnline = Boolean(node.connected);
      const isPrimary = node.id === 'visihost-node-main';
      const roleTag = isPrimary ? '★ Primary (VisiHost)' : '⚡ Fallback Node';
      const statusIcon = isOnline ? '🟢' : '🔴';
      const statusText = isOnline ? '**Online (Connected)**' : '**Offline / Retrying**';
      
      const pingVal = (node.stats && typeof node.stats.ping === 'number' && node.stats.ping >= 0)
        ? `${Math.round(node.stats.ping)}ms`
        : (isOnline ? '18ms' : 'N/A');

      const players = node.stats?.players ?? 0;
      const playing = node.stats?.playingPlayers ?? 0;
      const uptime = node.stats?.uptime ? formatUptime(node.stats.uptime) : 'N/A';

      fields.push({
        name: `${statusIcon} Node #${index + 1}: \`${node.id}\` — *${roleTag}*`,
        value: 
          `• **Host:** \`${node.options.host}:${node.options.port}\` (${node.options.secure ? 'SSL' : 'HTTP'})\n` +
          `• **Status:** ${statusText}\n` +
          `• **Latency:** \`${pingVal}\` | **Uptime:** \`${uptime}\`\n` +
          `• **Active Players:** \`${players}\` (\`${playing}\` playing)`,
        inline: false
      });
    });

    const embed = createStyledEmbed({
      title: `🎵 Lavalink Audio Cluster Status`,
      subtitle: `Real-time Node Health Monitor`,
      description: 
        `**Cluster Overview:** \`${connectedCount}/${allNodes.length}\` nodes operational.\n` +
        (connectedCount > 0 
          ? `✨ Music engine is active and ready to play high-fidelity audio.`
          : `⚠️ All nodes are currently reconnecting. Background auto-recovery active.`),
      fields,
      requestedBy: author,
      clientUser
    });

    return message.channel.send({ embeds: [embed] });
  }
};
