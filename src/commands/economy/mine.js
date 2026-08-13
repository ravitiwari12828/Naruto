const { buildGatherCommand } = require('../../utils/economyCore');
const emojis = require('../../utils/emojis');

module.exports = buildGatherCommand({
  name: 'mine', description: 'Head underground to mine for ore and gems to sell.',
  verb: 'mining', emoji: emojis.PICKAXE || '<a:pickaxe_animated:1537179636675514429>', category: 'mine', cooldownMs: 25 * 1000, color: 0x7F8C8D,
});
