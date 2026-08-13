const { buildGatherCommand } = require('../../utils/economyCore');
module.exports = buildGatherCommand({
  name: 'fish', description: 'Cast a line and fish for resources to sell.',
  verb: 'fishing', emoji: '<a:fishing_rod_animated:1537179574650011718>', category: 'fish', cooldownMs: 25 * 1000, color: 0x3498DB,
});
