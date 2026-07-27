const { buildGatherCommand } = require('../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'dig', description: 'Dig around for buried treasure to sell.',
  verb: 'digging', emoji: '🥄', category: 'dig', cooldownMs: 25 * 1000, color: 0xC9A66B,
});
