const { buildGatherCommand } = require('../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'hunt', description: 'Head into the woods to hunt for animal resources to sell.',
  verb: 'hunting', emoji: '<a:bow_hunt_animated:1537179523068469258>', category: 'hunt', cooldownMs: 25 * 1000, color: 0x8B5A2B,
});
