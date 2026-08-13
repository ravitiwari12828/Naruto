/**
 * Items Registry for Naruto Bot Economy & RPG Suite
 */

const TOOLS = {
  pickaxe: { id: 'pickaxe', name: 'Iron Pickaxe', emoji: '<a:pickaxe_animated:1537179636675514429>', price: 1500, description: 'Used for mining rare ores' },
  axe: { id: 'axe', name: 'Woodcutter Axe', emoji: '<a:axe_chop_animated:1537179517393576058>', price: 1200, description: 'Used for chopping timber' },
  fishing_rod: { id: 'fishing_rod', name: 'Pro Fishing Rod', emoji: '<a:fishing_rod_animated:1537179574650011718>', price: 1800, description: 'Used for fishing in deep rivers' },
  shovel: { id: 'shovel', name: 'Prospector Shovel', emoji: '🪏', price: 1000, description: 'Used for digging hidden treasures' },
  rifle: { id: 'rifle', name: 'Hunting Rifle', emoji: '🔫', price: 2500, description: 'Used for hunting wild game' }
};

const CONSUMABLES = {
  ramen: { id: 'ramen', name: 'Ichiraku Special Ramen', emoji: '🍜', price: 300, description: 'Restores stamina & energy' },
  potion: { id: 'potion', name: 'Chakra Potion', emoji: '<a:potion_alchemy_animated:1537179643449446581>', price: 500, description: 'Boosts jutsu power by 25%' },
  charm: { id: 'charm', name: 'Shinobi Lucky Charm', emoji: '🧿', price: 2000, description: 'Increases casino win rate' },
  booster: { id: 'booster', name: '2x Ryo Booster', emoji: '<a:rapid_animated:1537177482006896692>', price: 3500, description: 'Doubles rewards for 1 hour' },
  mysterybox: { id: 'mysterybox', name: 'Forbidden Scroll Box', emoji: '<a:openfolder_animated:1537177452936437760>', price: 5000, description: 'Contains random epic loot & ryo' }
};

const RESOURCES = {
  wood: { id: 'wood', name: 'Timber Wood', emoji: '🪵', price: 50, rarity: 'common' },
  iron: { id: 'iron', name: 'Iron Ore', emoji: '🪨', price: 120, rarity: 'common' },
  gold: { id: 'gold', name: 'Gold Nugget', emoji: '🪙', price: 350, rarity: 'rare' },
  diamond: { id: 'diamond', name: 'Chakra Crystal', emoji: '<a:dimond_animated:1537177370719551498>', price: 1000, rarity: 'epic' },
  fish: { id: 'fish', name: 'Salmon', emoji: '🐟', price: 80, rarity: 'common' },
  meat: { id: 'meat', name: 'Game Meat', emoji: '🥩', price: 150, rarity: 'common' }
};

const JOBS = {
  genin: { id: 'genin', name: 'Leaf Genin', emoji: '<a:leaf_animated:1537179616400375939>', salary: 400, description: 'Perform D-rank village missions' },
  chunin: { id: 'chunin', name: 'Chunin Squad Leader', emoji: '<a:security_animated:1537177499862171741>', salary: 850, description: 'Lead tactical C-rank missions' },
  jonin: { id: 'jonin', name: 'Elite Jonin Commander', emoji: '<a:battle_animated:1537177338427605064>', salary: 1800, description: 'Execute S-rank secret missions' },
  ramen_chef: { id: 'ramen_chef', name: 'Ichiraku Master Chef', emoji: '🍜', salary: 1200, description: 'Cook world-famous ramen' },
  medical_ninja: { id: 'medical_ninja', name: 'Medical Shinobi', emoji: '🩺', salary: 1500, description: 'Heal injured shinobi' },
  anbu: { id: 'anbu', name: 'Anbu Black Ops', emoji: '👺', salary: 2500, description: 'Top secret black ops missions' }
};

const PET_SPECIES = {
  dog: { id: 'dog', name: 'Ninken Dog', emoji: '🐕', price: 5000, basePower: 25, rarity: '⚪ Common', perk: '+10% Hunt Reward' },
  cat: { id: 'cat', name: 'Ninja Cat', emoji: '🐈', price: 4500, basePower: 20, rarity: '⚪ Common', perk: '+5% Crime Success' },
  fox: { id: 'fox', name: 'Nine-Tails Fox (Kurama)', emoji: '<a:fox_animated:1537179580450742292>', price: 50000, basePower: 120, rarity: '🟠 Legendary', perk: '+50% All Rewards' },
  hawk: { id: 'hawk', name: 'Messenger Hawk', emoji: '🦅', price: 8000, basePower: 45, rarity: '🔵 Rare', perk: '+15% Work Salary' },
  toad: { id: 'toad', name: 'Mount Myoboku Toad', emoji: '🐸', price: 12000, basePower: 70, rarity: '🟣 Epic', perk: '+20% Battle Damage' }
};

const STOCKS = {
  LEAF: { name: 'Leaf Corp (LEAF)', price: 120, trend: '+2.5%' },
  RAMEN: { name: 'Ichiraku Ramen (RAMEN)', price: 45, trend: '+5.1%' },
  CHAKRA: { name: 'Chakra Tech (CHAK)', price: 310, trend: '-1.2%' },
  AKATSUKI: { name: 'Akatsuki Global (AKAT)', price: 890, trend: '+12.4%' }
};

const RARITIES = {
  common: '⚪ Common',
  rare: '🔵 Rare',
  epic: '🟣 Epic',
  legendary: '🟠 Legendary',
  mythic: '<a:wrong_animated:1537179702928875631> Mythic'
};

function allItems() {
  return { ...TOOLS, ...CONSUMABLES, ...RESOURCES };
}

function findItem(id) {
  if (!id) return null;
  const clean = id.toLowerCase().trim();
  const all = allItems();
  return all[clean] || Object.values(all).find(it => it.name.toLowerCase() === clean);
}

function randomResourceByCategory(category, chance) {
  const pool = Object.values(RESOURCES);
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  TOOLS,
  CONSUMABLES,
  RESOURCES,
  JOBS,
  PET_SPECIES,
  STOCKS,
  RARITIES,
  allItems,
  findItem,
  randomResourceByCategory
};
