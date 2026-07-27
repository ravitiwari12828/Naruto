const { buildGatherCommand } = require('../../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'hunt', description: 'Head into the woods to hunt for animal resources to sell.',
  verb: 'hunting', emoji: '🏹', category: 'hunt', cooldownMs: 25 * 1000, color: 0x8B5A2B,
});
