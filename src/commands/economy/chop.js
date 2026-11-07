const { buildGatherCommand } = require('../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'chop', description: 'Chop wood in the forest to sell.',
  verb: 'chopping wood', emoji: '🪓', category: 'chop', cooldownMs: 25 * 1000, color: 0x6E4B1F,
});
