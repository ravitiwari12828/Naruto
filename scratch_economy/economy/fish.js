const { buildGatherCommand } = require('../../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'fish', description: 'Cast a line and fish for resources to sell.',
  verb: 'fishing', emoji: '🎣', category: 'fish', cooldownMs: 25 * 1000, color: 0x3498DB,
});
