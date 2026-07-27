const { buildGatherCommand } = require('../../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'mine', description: 'Head underground to mine for ore and gems to sell.',
  verb: 'mining', emoji: '⛏️', category: 'mine', cooldownMs: 25 * 1000, color: 0x7F8C8D,
});
