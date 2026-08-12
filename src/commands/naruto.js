const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const { createDynamicBox } = require('../utils/boxBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

// Quest pools organized by shinobi rank/level tier
const QUEST_POOLS = {
  academy: [
    { rank: 'D-Rank Mission', title: 'Tora Cat Capture', desc: 'Track down Madam Shijimi\'s runaway cat, Tora, and bring it back safely!', minRyo: 50, maxRyo: 100, minXp: 10, maxXp: 20 },
    { rank: 'D-Rank Mission', title: 'Weeding Hokage Garden', desc: 'Help maintain the Hokage\'s garden by pulling weeds.', minRyo: 40, maxRyo: 90, minXp: 8, maxXp: 18 },
    { rank: 'D-Rank Mission', title: 'Grocery Delivery', desc: 'Deliver groceries to elderly villagers across Konoha.', minRyo: 45, maxRyo: 95, minXp: 10, maxXp: 18 }
  ],
  genin: [
    { rank: 'C-Rank Mission', title: 'Bandit Outpost Patrol', desc: 'Patrol Fire Country borders and clear out a rogue bandit encampment.', minRyo: 150, maxRyo: 280, minXp: 30, maxXp: 50 },
    { rank: 'C-Rank Mission', title: 'Courier to Sand Village', desc: 'Deliver a secret scroll to Sunagakure without getting ambushed.', minRyo: 140, maxRyo: 260, minXp: 28, maxXp: 48 },
    { rank: 'C-Rank Mission', title: 'Caravan Escort', desc: 'Guard a merchant caravan through the Forest of Death.', minRyo: 160, maxRyo: 300, minXp: 32, maxXp: 55 }
  ],
  chunin: [
    { rank: 'B-Rank Mission', title: 'Land of Waves Escort', desc: 'Escort Tazuna the bridge builder safely back to Land of Waves.', minRyo: 300, maxRyo: 500, minXp: 55, maxXp: 85 },
    { rank: 'B-Rank Mission', title: 'Forbidden Scroll Recovery', desc: 'Track down rogue ninjas and recover the stolen secret scroll.', minRyo: 350, maxRyo: 550, minXp: 60, maxXp: 95 },
    { rank: 'B-Rank Mission', title: 'Rogue Chunin Capture', desc: 'Apprehend a Chunin who defected with classified mission data.', minRyo: 320, maxRyo: 520, minXp: 58, maxXp: 90 }
  ],
  jonin: [
    { rank: 'A-Rank Mission', title: 'Akatsuki Infiltration', desc: 'Gather critical intelligence from a hidden Akatsuki depot.', minRyo: 550, maxRyo: 850, minXp: 100, maxXp: 150 },
    { rank: 'A-Rank Mission', title: 'Bijuu Energy Subjugation', desc: 'Assist Anbu black ops in sealing a sudden surge of rogue chakra.', minRyo: 600, maxRyo: 900, minXp: 110, maxXp: 160 },
    { rank: 'A-Rank Mission', title: 'Bounty Squad Elimination', desc: 'A bounty hunter squad is targeting Konoha. Neutralize them.', minRyo: 580, maxRyo: 880, minXp: 105, maxXp: 155 }
  ],
  anbu: [
    { rank: 'A-Rank Mission', title: 'Black Ops Deep Cover', desc: 'Go undercover inside a criminal org and extract a double agent.', minRyo: 800, maxRyo: 1100, minXp: 150, maxXp: 200 },
    { rank: 'S-Rank Mission', title: 'Missing-nin Elimination', desc: 'A former Jonin defected and sells secret jutsu to enemy nations.', minRyo: 1000, maxRyo: 1400, minXp: 180, maxXp: 240 }
  ],
  sannin: [
    { rank: 'S-Rank Mission', title: 'Defend Hidden Leaf', desc: 'Stand alongside the Hokage to defend Konohagakure from invasion!', minRyo: 1200, maxRyo: 1800, minXp: 220, maxXp: 320 },
    { rank: 'S-Rank Mission', title: 'Tailed Beast Sealing', desc: 'A tailed beast broke free. Seal it before village destruction.', minRyo: 1300, maxRyo: 1900, minXp: 240, maxXp: 340 }
  ],
  shadow: [
    { rank: 'S-Rank Shadow', title: 'Dismantle Akatsuki Network', desc: 'Trace Akatsuki cells across five nations and eliminate commanders.', minRyo: 1800, maxRyo: 2500, minXp: 320, maxXp: 450 }
  ],
  hokage: [
    { rank: '★ Kage-Tier', title: 'Prevent Shinobi World War', desc: 'A coalition of rogue villages formed. Negotiate or fight.', minRyo: 3000, maxRyo: 5000, minXp: 500, maxXp: 800 },
    { rank: '★ Kage-Tier', title: 'Confront Reincarnated Madara', desc: 'Madara Uchiha has been reincarnated. Stop him at all costs.', minRyo: 4000, maxRyo: 7000, minXp: 600, maxXp: 1000 }
  ]
};

const CLANS = {
  uchiha: { name: 'Uchiha', emoji: '🔥', perk: '+20% Jutsu Fire Damage & Sharingan' },
  senju: { name: 'Senju', emoji: '🌲', perk: '+30% Max HP & Wood Style Regeneration' },
  hyuga: { name: 'Hyuga', emoji: '👁️', perk: '+20% Critical Strike & Byakugan' },
  uzumaki: { name: 'Uzumaki', emoji: '🌀', perk: '+50% Max Chakra & Sealing Jutsu' },
  hatake: { name: 'Hatake', emoji: '⚡', perk: '+15% Battle Speed & Lightning Blade' },
  nara: { name: 'Nara', emoji: '👥', perk: '+15% Evasion & Shadow Strangle' }
};

const SHOP_ITEMS = [
  { id: 'kunai', aliases: ['kunai', 'kunais', 'blade', 'blades'], name: '🗡️ Kunai Blade', cost: 100, sellPrice: 60, maxCap: 50, desc: '+15 Physical Attack in Battle' },
  { id: 'shuriken', aliases: ['shuriken', 'shurikens', 'star', 'stars'], name: '🥷 Shuriken Pack', cost: 150, sellPrice: 90, maxCap: 50, desc: '+25 Ranged Attack in Battle' },
  { id: 'elixir', aliases: ['elixir', 'elixirs', 'potion', 'potions', 'healthpotion', 'healthpotions'], name: '🧪 Health Elixir', cost: 200, sellPrice: 120, maxCap: 20, desc: 'Restores 50 HP in Battle' },
  { id: 'pill', aliases: ['pill', 'pills', 'chakrapill', 'chakrapills'], name: '💊 Military Chakra Pill', cost: 250, sellPrice: 150, maxCap: 20, desc: 'Restores 50 Chakra in Battle' },
  { id: 'scroll', aliases: ['scroll', 'scrolls', 'jutsuscroll'], name: '📜 Ancient Jutsu Scroll', cost: 500, sellPrice: 300, maxCap: 10, desc: 'Unlocks advanced Jutsu training' }
];

const AVAILABLE_JUTSUS = [
  { name: 'Rasengan', cost: 0, damage: 45, chakra: 25, reqLevel: 1 },
  { name: 'Shadow Clone Jutsu', cost: 0, damage: 35, chakra: 20, reqLevel: 1 },
  { name: 'Chidori', cost: 500, damage: 65, chakra: 35, reqLevel: 5 },
  { name: 'Fireball Jutsu', cost: 750, damage: 80, chakra: 40, reqLevel: 10 },
  { name: 'Amaterasu', cost: 1500, damage: 120, chakra: 55, reqLevel: 20 },
  { name: 'Sage Mode Rasenshuriken', cost: 3000, damage: 180, chakra: 70, reqLevel: 35 }
];

function getQuestPoolForLevel(level) {
  if (level >= 81) return QUEST_POOLS.hokage;
  if (level >= 71) return QUEST_POOLS.shadow;
  if (level >= 51) return QUEST_POOLS.sannin;
  if (level >= 36) return QUEST_POOLS.anbu;
  if (level >= 21) return QUEST_POOLS.jonin;
  if (level >= 11) return QUEST_POOLS.chunin;
  if (level >= 6)  return QUEST_POOLS.genin;
  return QUEST_POOLS.academy;
}

function calculateRankRequirements(level) {
  if (level < 6) return { current: 'Academy Student', next: 'Genin', reqLevel: 6 };
  if (level < 11) return { current: 'Genin', next: 'Chunin', reqLevel: 11 };
  if (level < 21) return { current: 'Chunin', next: 'Jonin', reqLevel: 21 };
  if (level < 36) return { current: 'Jonin', next: 'Anbu', reqLevel: 36 };
  if (level < 51) return { current: 'Anbu', next: 'Sannin', reqLevel: 51 };
  if (level < 71) return { current: 'Sannin', next: 'Shadow', reqLevel: 71 };
  if (level < 81) return { current: 'Shadow', next: 'Hokage', reqLevel: 81 };
  return { current: 'Hokage', next: 'Max Rank', reqLevel: 100 };
}

function findShopItem(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  return SHOP_ITEMS.find(i => i.id === q || i.aliases.includes(q) || i.name.toLowerCase().includes(q));
}

function buildLeaderboardPayload(catParam, author, clientUser) {
  const allUsers = Object.entries(db.data.users).map(([id, data]) => ({ id, ...data }));
  let title = '';
  let fieldFormatter = (u) => '';

  if (catParam === 'ryo' || catParam === 'money') {
    allUsers.sort((a, b) => (b.ryo || 0) - (a.ryo || 0));
    title = `💴 Global Shinobi Ryo Leaderboard`;
    fieldFormatter = (u) => `**${u.ryo || 0} Ryo** • Rank: *${u.rank || 'Academy Student'}*`;
  } else if (catParam === 'wins' || catParam === 'battles') {
    allUsers.sort((a, b) => (b.ninjaStats?.wins || 0) - (a.ninjaStats?.wins || 0));
    title = `⚔️ Global Shinobi PvP Battles Leaderboard`;
    fieldFormatter = (u) => `**${u.ninjaStats?.wins || 0} Victories** (${u.ninjaStats?.battles || 0} Total Battles)`;
  } else if (catParam === 'rank' || catParam === 'ranks') {
    const rankWeight = { 'Hokage': 8, 'Shadow': 7, 'Sannin': 6, 'Anbu': 5, 'Jonin': 4, 'Chunin': 3, 'Genin': 2, 'Academy Student': 1 };
    allUsers.sort((a, b) => (rankWeight[b.rank || 'Academy Student'] || 1) - (rankWeight[a.rank || 'Academy Student'] || 1) || (b.level || 1) - (a.level || 1));
    title = `🏅 Global Shinobi Ninja Rank Leaderboard`;
    fieldFormatter = (u) => `**${u.rank || 'Academy Student'}** • Level **${u.level || 1}** (${u.xp || 0} XP)`;
  } else if (catParam === 'missions' || catParam === 'quests') {
    allUsers.sort((a, b) => (b.ninjaStats?.missionsCompleted || 0) - (a.ninjaStats?.missionsCompleted || 0));
    title = `📜 Global Shinobi Missions Leaderboard`;
    fieldFormatter = (u) => `**${u.ninjaStats?.missionsCompleted || 0} Missions Completed**`;
  } else {
    allUsers.sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0));
    title = `🍥 Global Shinobi Level Leaderboard`;
    fieldFormatter = (u) => `Level **${u.level || 1}** (${u.xp || 0} XP) • Rank: *${u.rank || 'Academy Student'}*`;
  }

  const top10 = allUsers.slice(0, 10);
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  let descLines = [];
  for (let i = 0; i < top10.length; i++) {
    const u = top10[i];
    const medal = medals[i] || `**${i + 1}.**`;
    descLines.push(`${medal} <@${u.id}> — ${fieldFormatter(u)}`);
  }
  if (descLines.length === 0) descLines.push('*No shinobi data tracked yet.*');

  const embed = createStyledEmbed({
    title: title,
    subtitle: `Global Konoha Leaderboard Rankings`,
    description: descLines.join('\n\n'),
    requestedBy: author,
    clientUser,
    footerText: 'Top 10 Shinobi in Naruto Bot World'
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ninjalb_level')
      .setLabel('Level')
      .setEmoji('🍥')
      .setStyle(catParam === 'level' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ninjalb_ryo')
      .setLabel('Ryo')
      .setEmoji('💴')
      .setStyle(catParam === 'ryo' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ninjalb_rank')
      .setLabel('Rank')
      .setEmoji('🏅')
      .setStyle(catParam === 'rank' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ninjalb_wins')
      .setLabel('Battles')
      .setEmoji('⚔️')
      .setStyle(catParam === 'wins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ninjalb_missions')
      .setLabel('Missions')
      .setEmoji('📜')
      .setStyle(catParam === 'missions' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  name: 'ninja',
  description: 'Global Shinobi Ninja RPG: Profile, Jutsu, Train, Battle, Missions, Clans, Rankup, Shop, Buy, Sell & Leaderboards',
  aliases: [
    'ninjaprofile', 'ninjatrain', 'ninjajutsu',
    'ninjabattle', 'ninjamission', 'ninjaclan', 'ninjarankup',
    'ninjainventory', 'ninjainv', 'ninjashop', 'ninjabuy', 'ninjasell',
    'ninjalb', 'ninjaleaderboard', 'ninjatop', 'jutsu', 'quest'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase() || 'profile';

    if (invoked === 'ninjaprofile') sub = 'profile';
    if (invoked === 'ninjatrain') sub = 'train';
    if (invoked === 'ninjajutsu' || invoked === 'jutsu') sub = 'jutsu';
    if (invoked === 'ninjabattle') sub = 'battle';
    if (invoked === 'ninjamission' || invoked === 'quest') sub = 'mission';
    if (invoked === 'ninjaclan') sub = 'clan';
    if (invoked === 'ninjarankup') sub = 'rankup';
    if (invoked === 'ninjainventory' || invoked === 'ninjainv') sub = 'inventory';
    if (invoked === 'ninjashop') sub = 'shop';
    if (invoked === 'ninjabuy') sub = 'buy';
    if (invoked === 'ninjasell') sub = 'sell';
    if (invoked === 'ninjalb' || invoked === 'ninjaleaderboard' || invoked === 'ninjatop') sub = 'leaderboard';

    const author = message.author;
    const targetUser = message.mentions.users.first() || author;
    const userData = db.getUser(targetUser.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // ─────────────────────────────────────────
    // 1. SHINOBI PROFILE (.ninja profile / .ninjaprofile / .shinobi)
    // ─────────────────────────────────────────
    if (sub === 'profile' || sub === 'info' || sub === 'stats') {
      const clanInfo = CLANS[userData.clan?.toLowerCase()] || { name: 'None', emoji: '🥋', perk: 'No clan perks' };

      const profileBox = createDynamicBox('SHINOBI PROFILE', [
        { key: 'Rank  ', value: userData.rank || 'Academy Student' },
        { key: 'Level ', value: `Lv.${userData.level || 1} (${userData.xp || 0} XP)` },
        { key: 'Chakra', value: `${userData.chakra || 100}/100` },
        { key: 'Ryo   ', value: `${userData.ryo || 500} Ryo` },
        { key: 'Clan  ', value: `${clanInfo.name}` },
        { key: 'Wins  ', value: `${userData.ninjaStats?.wins || 0} Wins` },
        { key: 'Streak', value: `${userData.ninjaStats?.winStreak || 0} (Max: ${userData.ninjaStats?.maxWinStreak || 0})` }
      ]);

      const embed = createStyledEmbed({
        title: `📜 ${targetUser.username}'s Shinobi Scroll`,
        subtitle: `${emojis.NARUTO || '🍥'} Konoha Global Shinobi Profile`,
        description:
          '```\n' + profileBox + '\n```\n\n' +
          `• **Clan Perks:** ${clanInfo.perk}\n` +
          `• **Missions Completed:** \`${userData.ninjaStats?.missionsCompleted || 0}\` Missions\n\n` +
          `**Mastered Jutsus:**\n` +
          (userData.jutsuList.map(j => `• ⚡ **${j}**`).join('\n') || 'None'),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 2. CHAKRA MEDITATION & STAT TRAINING (.ninja train / .ninjatrain)
    // ─────────────────────────────────────────
    if (sub === 'train' || sub === 'chakra' || sub === 'meditate') {
      const now = Date.now();
      const COOLDOWN_1H = 60 * 60 * 1000;
      const lastMeditate = userData.lastMeditateTime || 0;

      if (now - lastMeditate < COOLDOWN_1H) {
        const remainingMins = Math.ceil((COOLDOWN_1H - (now - lastMeditate)) / 60000);
        return message.reply(`${emojis.WARNING || '⚠️'} **Meditation Cooldown Active!** You can train chakra again in **${remainingMins} minutes**.`);
      }

      const xpGained = Math.floor(Math.random() * 30) + 20;
      const ryoGained = Math.floor(Math.random() * 100) + 50;

      db.updateUser(targetUser.id, (u) => {
        u.chakra = 100;
        u.xp += xpGained;
        u.ryo += ryoGained;
        u.lastMeditateTime = now;
      });

      const embed = createStyledEmbed({
        title: `🧘 Shinobi Chakra Meditation & Stat Training`,
        subtitle: `${author.username} focused inner energy under Konoha waterfall...`,
        description:
          `⚡ **Chakra Fully Restored:** \`100/100\`\n` +
          `✨ **Rewards Earned:** \`+${xpGained} XP\` | \`+${ryoGained} Ryo\`\n\n` +
          `*Your chakra control has tightened! Next meditation available in 1 hour.*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 3. JUTSU SELECTION & ACQUISITION (.ninja jutsu / .ninjajutsu)
    // ─────────────────────────────────────────
    if (sub === 'jutsu' || sub === 'learn') {
      const targetJutsuName = args.slice(1).join(' ');

      if (!targetJutsuName) {
        const jutsuListStr = AVAILABLE_JUTSUS.map(j => {
          const isOwned = userData.jutsuList.includes(j.name);
          return `• **${j.name}** ${isOwned ? '✅ *(Owned)*' : `— \`${j.cost} Ryo\` (Req: Lv. ${j.reqLevel})`}\n  └ Damage: \`${j.damage}\` | Chakra Cost: \`${j.chakra}\``;
        }).join('\n\n');

        const embed = createStyledEmbed({
          title: `⚡ Konoha Secret Jutsu Archives`,
          subtitle: `Master Shinobi Techniques`,
          description: `**Available Jutsus to Learn:**\n\n${jutsuListStr}\n\n**To Learn:** \`.ninja jutsu learn <Jutsu Name>\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const jutsuToLearn = AVAILABLE_JUTSUS.find(j => j.name.toLowerCase() === targetJutsuName.toLowerCase());
      if (!jutsuToLearn) {
        return message.reply(`${emojis.WARNING || '⚠️'} Jutsu **"${targetJutsuName}"** not found in the archives! Type \`.ninja jutsu\` to view all jutsus.`);
      }

      if (userData.jutsuList.includes(jutsuToLearn.name)) {
        return message.reply(`${emojis.WARNING || '⚠️'} You have already mastered **${jutsuToLearn.name}**!`);
      }

      if (userData.level < jutsuToLearn.reqLevel) {
        return message.reply(`${emojis.WARNING || '⚠️'} You need to reach **Level ${jutsuToLearn.reqLevel}** to learn **${jutsuToLearn.name}**!`);
      }

      if (userData.ryo < jutsuToLearn.cost) {
        return message.reply(`${emojis.WARNING || '⚠️'} You need **${jutsuToLearn.cost} Ryo** to purchase this Jutsu scroll! You have \`${userData.ryo} Ryo\`.`);
      }

      db.updateUser(author.id, (u) => {
        u.ryo -= jutsuToLearn.cost;
        u.jutsuList.push(jutsuToLearn.name);
      });

      return message.reply(`${emojis.SUCCESS || '✅'} **CONGRATULATIONS!** You spent \`${jutsuToLearn.cost} Ryo\` and mastered **⚡ ${jutsuToLearn.name}**!`);
    }

    // ─────────────────────────────────────────
    // 4. SHINOBI BATTLE ENGINE (.ninja battle / .ninjabattle)
    // ─────────────────────────────────────────
    if (sub === 'battle' || sub === 'fight' || sub === 'pvp') {
      const now = Date.now();
      const COOLDOWN_2M = 2 * 60 * 1000;
      const lastBattle = userData.lastBattleTime || 0;

      if (now - lastBattle < COOLDOWN_2M) {
        const remainingSecs = Math.ceil((COOLDOWN_2M - (now - lastBattle)) / 1000);
        return message.reply(`${emojis.WARNING || '⚠️'} **Battle Fatigue Active!** Rest your body and fight again in **${remainingSecs} seconds**.`);
      }

      const enemies = [
        { name: 'Rogue Sound Shinobi', hp: 80, atk: 25, ryo: 150, xp: 40 },
        { name: 'Akatsuki Scout', hp: 120, atk: 35, ryo: 300, xp: 75 },
        { name: 'Mist Swordsman Trainee', hp: 100, atk: 30, ryo: 220, xp: 55 },
        { name: 'Rogue Anbu Assassin', hp: 150, atk: 45, ryo: 450, xp: 110 }
      ];

      const enemy = enemies[Math.floor(Math.random() * enemies.length)];

      if (userData.chakra < 25) {
        return message.reply(`${emojis.WARNING || '⚠️'} You do not have enough Chakra (\`${userData.chakra}/100\`) to enter battle! Use \`.ninja train\` to meditate.`);
      }

      const userJutsuName = userData.jutsuList[Math.floor(Math.random() * userData.jutsuList.length)];
      const jutsuObj = AVAILABLE_JUTSUS.find(j => j.name === userJutsuName) || { damage: 40, chakra: 20 };

      let clanBonusText = '';
      let userAtkBonus = 0;
      if (userData.clan === 'Uchiha') { userAtkBonus += 15; clanBonusText = '🔥 *Uchiha Sharingan activated (+15 Atk)*'; }
      if (userData.clan === 'Hyuga') { userAtkBonus += 10; clanBonusText = '👁️ *Hyuga Byakugan strike (+10 Critical Atk)*'; }

      const totalUserDamage = jutsuObj.damage + userAtkBonus + Math.floor(Math.random() * 15);
      const isWin = totalUserDamage >= enemy.hp || Math.random() > 0.3;

      let winStreak = userData.ninjaStats?.winStreak || 0;
      let maxWinStreak = userData.ninjaStats?.maxWinStreak || 0;
      let streakBonusRyo = 0;
      let streakBonusXp = 0;

      if (isWin) {
        winStreak += 1;
        if (winStreak > maxWinStreak) maxWinStreak = winStreak;
        const streakPct = Math.min(1.0, (winStreak - 1) * 0.1);
        streakBonusRyo = Math.floor(enemy.ryo * streakPct);
        streakBonusXp = Math.floor(enemy.xp * streakPct);
      } else {
        winStreak = 0;
      }

      db.updateUser(author.id, (u) => {
        u.chakra = Math.max(0, u.chakra - jutsuObj.chakra);
        u.lastBattleTime = now;
        if (!u.ninjaStats) u.ninjaStats = { wins: 0, losses: 0, battles: 0, missionsCompleted: 0, winStreak: 0, maxWinStreak: 0 };
        u.ninjaStats.battles += 1;
        u.ninjaStats.winStreak = winStreak;
        u.ninjaStats.maxWinStreak = Math.max(u.ninjaStats.maxWinStreak || 0, maxWinStreak);

        if (isWin) {
          u.ninjaStats.wins += 1;
          u.ryo += (enemy.ryo + streakBonusRyo);
          u.xp += (enemy.xp + streakBonusXp);
        } else {
          u.ninjaStats.losses += 1;
        }
      });

      const totalRyoGained = enemy.ryo + streakBonusRyo;
      const totalXpGained = enemy.xp + streakBonusXp;

      const battleBox = createDynamicBox('BATTLE RESULTS', [
        { key: 'Enemy  ', value: enemy.name },
        { key: 'Outcome', value: isWin ? 'VICTORY [WIN]' : 'DEFEAT [LOSS]' },
        { key: 'Streak ', value: isWin ? `${winStreak} Wins` : 'Reset to 0' },
        { key: 'Damage ', value: `${totalUserDamage} HP` },
        { key: 'Reward ', value: isWin ? `+${totalRyoGained} Ryo` : '0 Ryo' }
      ]);

      const embed = createStyledEmbed({
        title: isWin ? `⚔️ SHINOBI VICTORY! (${winStreak} Win Streak)` : `💀 SHINOBI DEFEAT!`,
        subtitle: `${author.username} engaged ${enemy.name} in combat!`,
        description:
          '```\n' + battleBox + '\n```\n\n' +
          (clanBonusText ? `${clanBonusText}\n\n` : '') +
          (isWin
            ? `🎉 **You defeated ${enemy.name}!** Earned \`+${totalRyoGained} Ryo\` (+${streakBonusRyo} streak bonus) and \`+${totalXpGained} XP\`!`
            : `💥 **${enemy.name} counter-attacked and forced your retreat!** Win streak reset to 0. Train harder and try again.`),
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 5. SHINOBI MISSIONS (.ninja mission / .ninjamission)
    // ─────────────────────────────────────────
    if (sub === 'mission' || sub === 'quest') {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const userLevel = userData.level || 1;

      let questData = userData.dailyQuests || { count: 0, lastReset: 0 };
      if (now - questData.lastReset >= DAY_MS) {
        questData.count = 0;
        questData.lastReset = now;
      }

      if (questData.count >= 3) {
        const remainingMs = DAY_MS - (now - questData.lastReset);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`${emojis.WARNING || '⚠️'} **Daily Mission Limit Reached!** You completed \`3/3\` missions today. Next missions reset in **${hours}h ${minutes}m**.`);
      }

      const pool = getQuestPoolForLevel(userLevel);
      const quest = pool[Math.floor(Math.random() * pool.length)];

      const ryoGained = Math.floor(Math.random() * (quest.maxRyo - quest.minRyo + 1)) + quest.minRyo;
      const xpGained = Math.floor(Math.random() * (quest.maxXp - quest.minXp + 1)) + quest.minXp;

      questData.count += 1;

      db.updateUser(author.id, (u) => {
        u.ryo += ryoGained;
        u.xp += xpGained;
        u.dailyQuests = questData;
        if (!u.ninjaStats) u.ninjaStats = { wins: 0, losses: 0, battles: 0, missionsCompleted: 0 };
        u.ninjaStats.missionsCompleted += 1;
      });

      const missionBox = createDynamicBox(`MISSION COMPLETED — ${quest.title.toUpperCase()}`, [
        { key: 'Rank   ', value: quest.rank },
        { key: 'Reward ', value: `+${ryoGained} Ryo` },
        { key: 'XP Gain', value: `+${xpGained} XP` },
        { key: 'Daily  ', value: `${questData.count}/3 Completed` }
      ]);

      const embed = createStyledEmbed({
        title: `📜 Mission Accomplished!`,
        subtitle: `${quest.title} (${quest.rank})`,
        description:
          '```\n' + missionBox + '\n```\n\n' +
          `• **Details:** ${quest.desc}\n` +
          `• **Total Missions Completed:** \`${userData.ninjaStats?.missionsCompleted || 1}\``,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 6. SHINOBI CLAN SELECTION (.ninja clan / .ninjaclan)
    // ─────────────────────────────────────────
    if (sub === 'clan') {
      const selectedClanName = args[1]?.toLowerCase();

      if (!selectedClanName) {
        const clanListStr = Object.values(CLANS).map(c => `• ${c.emoji} **${c.name} Clan** — *${c.perk}*`).join('\n');
        const embed = createStyledEmbed({
          title: `⛩️ Konoha Great Shinobi Clans`,
          subtitle: `Select Your Ancestral Lineage`,
          description:
            `**Current Clan:** \`${userData.clan || 'None'}\`\n\n` +
            `**Available Clans:**\n${clanListStr}\n\n` +
            `**To Join a Clan:** \`.ninja clan <clanName>\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const targetClan = CLANS[selectedClanName];
      if (!targetClan) {
        return message.reply(`${emojis.WARNING || '⚠️'} Invalid clan! Choose from: \`uchiha\`, \`senju\`, \`hyuga\`, \`uzumaki\`, \`hatake\`, \`nara\`.`);
      }

      db.updateUser(author.id, (u) => { u.clan = targetClan.name; });
      return message.reply(`${emojis.SUCCESS || '✅'} **ANCIENT LINEAGE AWAKENED!** You are now a proud member of the **${targetClan.emoji} ${targetClan.name} Clan**! Perk: *${targetClan.perk}*.`);
    }

    // ─────────────────────────────────────────
    // 7. SHINOBI RANKUP (.ninja rankup / .ninjarankup)
    // ─────────────────────────────────────────
    if (sub === 'rankup' || sub === 'rank') {
      const reqs = calculateRankRequirements(userData.level);

      if (userData.level < reqs.reqLevel) {
        return message.reply(`${emojis.WARNING || '⚠️'} **Rankup Requirement Not Met!** You are currently **${userData.rank}** (Lv. ${userData.level}). You need **Level ${reqs.reqLevel}** to advance to **${reqs.next}**!`);
      }

      if (userData.rank === reqs.next) {
        return message.reply(`${emojis.SUCCESS || '✅'} You are already at **${userData.rank}** rank! Keep training to reach the next tier.`);
      }

      db.updateUser(author.id, (u) => { u.rank = reqs.next; });

      const embed = createStyledEmbed({
        title: `🏅 SHINOBI RANK PROMOTION!`,
        subtitle: `${author.username} passed the Shinobi Exams!`,
        description: `🎉 **CONGRATULATIONS!** You have been promoted to **${reqs.next}**! Your authority and village respect have increased!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 8. SHINOBI SHOP & QUANTITY BUY/SELL (.ninja shop, .ninja buy, .ninja sell)
    // ─────────────────────────────────────────
    if (sub === 'shop' || sub === 'buy' || sub === 'sell' || sub === 'inventory' || sub === 'inv') {
      let action = sub;
      let argIndexOffset = 0;

      if (sub === 'inventory' || sub === 'inv') {
        if (['shop', 'buy', 'sell'].includes(args[1]?.toLowerCase())) {
          action = args[1].toLowerCase();
          argIndexOffset = 1;
        } else {
          action = 'inventory';
        }
      }

      // 🛒 SHOP DISPLAY (.ninja shop)
      if (action === 'shop') {
        // ── Box 1: Buy Prices ──
        const buyBox =
          '╭──────────────────────────╮\n' +
          '│    BUY PRICES  (Ryo)     │\n' +
          '├──────────────────────────┤\n' +
          '│ 🗡️  Kunai Blade    :  100 │\n' +
          '│ 🥷  Shuriken Pack  :  150 │\n' +
          '│ 🧪  Health Elixir  :  200 │\n' +
          '│ 💊  Chakra Pill    :  250 │\n' +
          '│ 📜  Ancient Scroll :  500 │\n' +
          '╰──────────────────────────╯';

        // ── Box 2: Sell Values ──
        const sellBox =
          '╭──────────────────────────╮\n' +
          '│   SELL VALUES  (Ryo)     │\n' +
          '├──────────────────────────┤\n' +
          '│ 🗡️  Kunai Blade    :   60 │\n' +
          '│ 🥷  Shuriken Pack  :   90 │\n' +
          '│ 🧪  Health Elixir  :  120 │\n' +
          '│ 💊  Chakra Pill    :  150 │\n' +
          '│ 📜  Ancient Scroll :  300 │\n' +
          '╰──────────────────────────╯';

        // ── Box 3: Max Inventory Capacity ──
        const capBox =
          '╭──────────────────────────╮\n' +
          '│   MAX INVENTORY CAPACITY │\n' +
          '├──────────────────────────┤\n' +
          '│ 🗡️  Kunai Blade    : × 50 │\n' +
          '│ 🥷  Shuriken Pack  : × 50 │\n' +
          '│ 🧪  Health Elixir  : × 20 │\n' +
          '│ 💊  Chakra Pill    : × 20 │\n' +
          '│ 📜  Ancient Scroll : × 10 │\n' +
          '╰──────────────────────────╯';

        const embed = createStyledEmbed({
          title: `🛍️ Konoha Shinobi Shop & Armory`,
          subtitle: `Prices, Resell Values & Inventory Caps`,
          description:
            `🏮 **Buy Prices**\n` +
            '```\n' + buyBox + '\n```\n\n' +
            `<a:money_animated:1537177442672709707> **Sell Values**\n` +
            '```\n' + sellBox + '\n```\n\n' +
            `🎒 **Max Inventory Capacity**\n` +
            '```\n' + capBox + '\n```\n\n' +
            `• **To Buy:** \`.ninja buy <item> [amount]\` *(e.g. \`.ninja buy kunai 5\`)*\n` +
            `• **To Sell:** \`.ninja sell <item> [amount]\` *(e.g. \`.ninja sell elixir 2\`)*\n` +
            `• **Check Bag:** \`.ninja inventory\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }


      // 🛍️ BUY ITEMS IN QUANTITY (.ninja buy <item> [quantity])
      if (action === 'buy') {
        const p1 = args[1 + argIndexOffset];
        const p2 = args[2 + argIndexOffset];

        let qty = 1;
        let query = p1;

        if (p1 && !isNaN(parseInt(p1))) {
          qty = parseInt(p1);
          query = p2;
        } else if (p2 && !isNaN(parseInt(p2))) {
          qty = parseInt(p2);
        }

        if (!query) {
          return message.reply(`${emojis.WARNING || '⚠️'} Please specify an item to buy! Usage: \`.ninja buy <item> [amount]\`. Type \`.ninja shop\` for prices.`);
        }

        const item = findShopItem(query);
        if (!item) {
          return message.reply(`${emojis.WARNING || '⚠️'} Item **"${query}"** not found in shop! Type \`.ninja shop\` to view available weapons and potions.`);
        }

        qty = Math.max(1, qty);
        const inv = userData.ninjaInventory || {};
        const currentQty = inv[item.id] || 0;

        if (currentQty + qty > item.maxCap) {
          return message.reply(`${emojis.WARNING || '⚠️'} **Inventory Limit Exceeded!** You can only hold up to **${item.maxCap} ${item.name}**! You currently hold \`${currentQty}\`.`);
        }

        const totalCost = item.cost * qty;
        if (userData.ryo < totalCost) {
          return message.reply(`${emojis.WARNING || '⚠️'} You need **${totalCost} Ryo** to buy \`${qty}x ${item.name}\`! You currently have \`${userData.ryo} Ryo\`.`);
        }

        db.updateUser(author.id, (u) => {
          u.ryo -= totalCost;
          if (!u.ninjaInventory) u.ninjaInventory = {};
          u.ninjaInventory[item.id] = currentQty + qty;
        });

        return message.reply(`${emojis.SUCCESS || '✅'} **PURCHASE SUCCESSFUL!** Purchased \`${qty}x ${item.name}\` for **${totalCost} Ryo**! Balance: \`${userData.ryo - totalCost} Ryo\`.`);
      }

      // <a:money_animated:1537177442672709707> SELL ITEMS FOR RYO (.ninja sell <item> [quantity])
      if (action === 'sell') {
        const p1 = args[1 + argIndexOffset];
        const p2 = args[2 + argIndexOffset];

        let qty = 1;
        let query = p1;

        if (p1 && !isNaN(parseInt(p1))) {
          qty = parseInt(p1);
          query = p2;
        } else if (p2 && !isNaN(parseInt(p2))) {
          qty = parseInt(p2);
        }

        if (!query) {
          return message.reply(`${emojis.WARNING || '⚠️'} Please specify an item to sell! Usage: \`.ninja sell <item> [amount]\`.`);
        }

        const item = findShopItem(query);
        if (!item) {
          return message.reply(`${emojis.WARNING || '⚠️'} Item **"${query}"** not recognized!`);
        }

        qty = Math.max(1, qty);
        const inv = userData.ninjaInventory || {};
        const currentQty = inv[item.id] || 0;

        if (currentQty < qty) {
          return message.reply(`${emojis.WARNING || '⚠️'} You do not have \`${qty}x ${item.name}\` in your inventory! You currently hold \`${currentQty}\`.`);
        }

        const totalEarned = item.sellPrice * qty;

        db.updateUser(author.id, (u) => {
          if (!u.ninjaInventory) u.ninjaInventory = {};
          u.ninjaInventory[item.id] = Math.max(0, currentQty - qty);
          u.ryo += totalEarned;
        });

        return message.reply(`${emojis.SUCCESS || '✅'} **SALE SUCCESSFUL!** Sold \`${qty}x ${item.name}\` for **+${totalEarned} Ryo**! Balance: \`${userData.ryo + totalEarned} Ryo\`.`);
      }

      // 🎒 INVENTORY DISPLAY (.ninja inventory)
      const inv = userData.ninjaInventory || {};
      const invBox = createDynamicBox('NINJA GEAR BAG', [
        { key: 'Kunai   ', value: `${inv.kunai || 0} / 50` },
        { key: 'Shuriken', value: `${inv.shuriken || 0} / 50` },
        { key: 'Elixirs ', value: `${inv.elixir || inv.healthPotion || 0} / 20` },
        { key: 'Pills   ', value: `${inv.pill || inv.chakraPill || 0} / 20` },
        { key: 'Scrolls ', value: `${inv.scroll || 0} / 10` },
        { key: 'Ryo     ', value: `${userData.ryo || 0} Ryo` }
      ], 20, 22);

      const embed = createStyledEmbed({
        title: `🎒 ${targetUser.username}'s Shinobi Weapon Bag`,
        subtitle: `Ninja Armory & Consumables`,
        description:
          '```\n' + invBox + '\n```\n\n' +
          `• **Buy Items:** \`.ninja buy <item> [amount]\`\n` +
          `• **Sell Items:** \`.ninja sell <item> [amount]\`\n` +
          `• **View Shop:** \`.ninja shop\``,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 9. SHINOBI GLOBAL LEADERBOARD (.ninja top / .ninjalb) WITH INTERACTIVE BUTTONS
    // ─────────────────────────────────────────
    if (sub === 'leaderboard' || sub === 'lb' || sub === 'top') {
      const catParam = args[1]?.toLowerCase() || 'level';

      const payload = buildLeaderboardPayload(catParam, message.author, clientUser);
      const replyMsg = await message.channel.send(payload);

      // Create Interactive Component Collector for 2 minutes
      const collector = replyMsg.createMessageComponentCollector({
        filter: i => i.user.id === author.id,
        time: 120000
      });

      collector.on('collect', async i => {
        let newCat = 'level';
        if (i.customId === 'ninjalb_level') newCat = 'level';
        if (i.customId === 'ninjalb_ryo') newCat = 'ryo';
        if (i.customId === 'ninjalb_rank') newCat = 'rank';
        if (i.customId === 'ninjalb_wins') newCat = 'wins';
        if (i.customId === 'ninjalb_missions') newCat = 'missions';

        const updatedPayload = buildLeaderboardPayload(newCat, message.author, clientUser);
        await i.update(updatedPayload).catch(() => {});
      });

      return;
    }

    // Default Fallback: Shinobi Help Card
    const helpEmbed = createStyledEmbed({
      title: '🍥 Naruto Shinobi RPG Hub',
      subtitle: `Master Shinobi Commands`,
      description:
        `• \`.ninja profile\` — *View your global shinobi scroll*\n` +
        `• \`.ninja train\` — *Meditate to restore chakra & gain XP*\n` +
        `• \`.ninja jutsu\` — *Learn & view jutsu techniques*\n` +
        `• \`.ninja battle\` — *Fight rogue ninjas & Akatsuki*\n` +
        `• \`.ninja mission\` — *Complete daily shinobi missions*\n` +
        `• \`.ninja clan\` — *Choose your shinobi clan*\n` +
        `• \`.ninja rankup\` — *Advance your shinobi rank*\n` +
        `• \`.ninja shop\` — *View Konoha weapons & potions shop*\n` +
        `• \`.ninja buy <item> [amount]\` — *Buy weapons & items in quantity*\n` +
        `• \`.ninja sell <item> [amount]\` — *Sell items for Ryo*\n` +
        `• \`.ninja top\` — *View interactive global leaderboards*`,
      requestedBy: message.author,
      clientUser,
      footerText: 'Naruto Shinobi Suite'
    });
    return message.channel.send({ embeds: [helpEmbed] });
  }
};

// ─────────────────────────────────────────
// PROBOT-STYLE XP LEVELING ENGINE
// Text XP: 15–40 XP per message (2-min cooldown per user per guild)
// Level formula: XP needed = 5 * (level^2) + 50 * level + 100
// Level-up announcements + optional role rewards
// ─────────────────────────────────────────

const xpCooldowns = new Map(); // key: `${userId}:${guildId}` → last xp timestamp

function getXpForLevel(level) {
  // ProBot-style curve: each level requires more XP
  return 5 * (level * level) + 50 * level + 100;
}

function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) total += getXpForLevel(i);
  return total;
}

function calculateLevelFromXp(totalXp) {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = getXpForLevel(level);
    if (accumulated + needed > totalXp) break;
    accumulated += needed;
    level++;
    if (level > 200) break;
  }
  return { level, currentLevelXp: totalXp - accumulated, neededXp: getXpForLevel(level) };
}

module.exports.handleMessageXP = async function(message) {
  if (!message.guild || message.author.bot) return;

  const key = `${message.author.id}:${message.guild.id}`;
  const now = Date.now();
  const last = xpCooldowns.get(key) || 0;

  // 2-minute cooldown
  if (now - last < 120000) return;
  xpCooldowns.set(key, now);

  // Random 15–40 XP per message (ProBot range)
  const xpGain = Math.floor(Math.random() * 26) + 15;

  const userData = db.getUser(message.author.id);
  const oldTotalXp = userData.ninjaXP || 0;
  const newTotalXp = oldTotalXp + xpGain;

  const before = calculateLevelFromXp(oldTotalXp);
  const after = calculateLevelFromXp(newTotalXp);

  db.updateUser(message.author.id, (u) => {
    u.ninjaXP = newTotalXp;
    u.level = after.level;
    u.xp = after.currentLevelXp;
  });

  // Level-up announcement
  if (after.level > before.level) {
    const newLevel = after.level;

    // Determine new shinobi rank at this level
    const rankReqs = calculateRankRequirements(newLevel);
    const rankMsg = newLevel === rankReqs.reqLevel
      ? `\n🎖️ You can now **rank up to ${rankReqs.next}**! Type \`.ninja rankup\`.`
      : '';

    // Auto role rewards (if guild has leveling roles configured)
    let roleMsg = '';
    try {
      const levelingConfig = db.getGuildLevelingConfig ? db.getGuildLevelingConfig(message.guild.id) : null;
      if (levelingConfig?.roleRewards) {
        const reward = levelingConfig.roleRewards.find(r => r.level === newLevel);
        if (reward) {
          const role = message.guild.roles.cache.get(reward.roleId);
          if (role) {
            await message.member.roles.add(role).catch(() => {});
            roleMsg = `\n<a:gift_animated:1537179583064055931> You earned the **${role.name}** role reward!`;
          }
        }
      }
    } catch (e) {}

    const levelUpBox = createDynamicBox('LEVEL UP', [
      { key: 'Level  ', value: `${before.level} → ${newLevel}` },
      { key: 'Next XP', value: `${after.neededXp} XP needed` }
    ], 20, 22);

    try {
      await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [{
          color: 0xFF7A00,
          description: `**⬆️ LEVEL UP!** You reached **Level ${newLevel}**!${rankMsg}${roleMsg}\n\`\`\`\n${levelUpBox}\n\`\`\``
        }]
      });
    } catch (e) {}
  }
};

