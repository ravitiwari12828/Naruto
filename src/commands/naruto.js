const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
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
  { id: 'kunai', name: '🗡️ Kunai Blade', cost: 100, desc: '+15 Physical Attack in Battle' },
  { id: 'shuriken', name: '🥷 Shuriken Pack', cost: 150, desc: '+25 Ranged Attack in Battle' },
  { id: 'healthPotion', name: '🧪 Health Elixir', cost: 200, desc: 'Restores 50 HP in Battle' },
  { id: 'chakraPill', name: '💊 Military Chakra Pill', cost: 250, desc: 'Restores 50 Chakra in Battle' },
  { id: 'scroll', name: '📜 Ancient Jutsu Scroll', cost: 500, desc: 'Unlocks advanced Jutsu training' }
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

module.exports = {
  name: 'ninja',
  description: 'Global Shinobi Ninja RPG: Profile, Jutsu, Train, Battle, Missions, Clans, Rankup & Inventory',
  aliases: [
    'shinobi', 'ninjaprofile', 'ninjatrain', 'ninjajutsu',
    'ninjabattle', 'ninjamission', 'ninjaclan', 'ninjarankup',
    'ninjainventory', 'ninjainv', 'ninjalb', 'ninjaleaderboard',
    'ninjatop', 'jutsu', 'quest'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase() || 'profile';

    if (invoked === 'shinobi' || invoked === 'ninjaprofile') sub = 'profile';
    if (invoked === 'ninjatrain') sub = 'train';
    if (invoked === 'ninjajutsu' || invoked === 'jutsu') sub = 'jutsu';
    if (invoked === 'ninjabattle') sub = 'battle';
    if (invoked === 'ninjamission' || invoked === 'quest') sub = 'mission';
    if (invoked === 'ninjaclan') sub = 'clan';
    if (invoked === 'ninjarankup') sub = 'rankup';
    if (invoked === 'ninjainventory' || invoked === 'ninjainv') sub = 'inventory';
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

      const profileBox = createDynamicBox(`SHINOBI PROFILE — ${targetUser.username.toUpperCase()}`, [
        { key: 'Rank ', value: userData.rank || 'Academy Student' },
        { key: 'Level', value: `Lv. ${userData.level || 1} (${userData.xp || 0} XP)` },
        { key: 'Chakra', value: `${userData.chakra || 100}/100` },
        { key: 'Ryo  ', value: `${userData.ryo || 500} Ryo` },
        { key: 'Clan ', value: `${clanInfo.emoji} ${clanInfo.name}` },
        { key: 'Wins ', value: `${userData.ninjaStats?.wins || 0} Battles` }
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

      // Pick user's strongest jutsu
      const userJutsuName = userData.jutsuList[Math.floor(Math.random() * userData.jutsuList.length)];
      const jutsuObj = AVAILABLE_JUTSUS.find(j => j.name === userJutsuName) || { damage: 40, chakra: 20 };

      // Calculate Clan Perk bonus
      let clanBonusText = '';
      let userAtkBonus = 0;
      if (userData.clan === 'Uchiha') { userAtkBonus += 15; clanBonusText = '🔥 *Uchiha Sharingan activated (+15 Atk)*'; }
      if (userData.clan === 'Hyuga') { userAtkBonus += 10; clanBonusText = '👁️ *Hyuga Byakugan strike (+10 Critical Atk)*'; }

      const totalUserDamage = jutsuObj.damage + userAtkBonus + Math.floor(Math.random() * 15);
      const enemyDamage = Math.max(10, enemy.atk - Math.floor(Math.random() * 10));

      const isWin = totalUserDamage >= enemy.hp || Math.random() > 0.3;

      db.updateUser(author.id, (u) => {
        u.chakra = Math.max(0, u.chakra - jutsuObj.chakra);
        u.lastBattleTime = now;
        if (!u.ninjaStats) u.ninjaStats = { wins: 0, losses: 0, battles: 0, missionsCompleted: 0 };
        u.ninjaStats.battles += 1;

        if (isWin) {
          u.ninjaStats.wins += 1;
          u.ryo += enemy.ryo;
          u.xp += enemy.xp;
        } else {
          u.ninjaStats.losses += 1;
        }
      });

      const battleBox = createDynamicBox(`BATTLE RESULTS — VS ${enemy.name.toUpperCase()}`, [
        { key: 'Outcome ', value: isWin ? 'VICTORY [WIN]' : 'DEFEAT [LOSS]' },
        { key: 'Technique', value: userJutsuName },
        { key: 'Damage  ', value: `${totalUserDamage} HP` },
        { key: 'Chakra  ', value: `-${jutsuObj.chakra} Used` },
        { key: 'Reward  ', value: isWin ? `+${enemy.ryo} Ryo | +${enemy.xp} XP` : '0 Ryo' }
      ]);

      const embed = createStyledEmbed({
        title: isWin ? `⚔️ SHINOBI VICTORY!` : `💀 SHINOBI DEFEAT!`,
        subtitle: `${author.username} engaged ${enemy.name} in combat!`,
        description:
          '```\n' + battleBox + '\n```\n\n' +
          (clanBonusText ? `${clanBonusText}\n\n` : '') +
          (isWin
            ? `🎉 **You defeated ${enemy.name}!** Earned \`+${enemy.ryo} Ryo\` and \`+${enemy.xp} XP\`!`
            : `💥 **${enemy.name} counter-attacked and forced your retreat!** Train harder and try again.`),
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
    // 8. SHINOBI INVENTORY (.ninja inventory / .ninjainventory)
    // ─────────────────────────────────────────
    if (sub === 'inventory' || sub === 'inv' || sub === 'shop') {
      const action = args[1]?.toLowerCase();

      if (action === 'buy') {
        const itemQuery = args[2]?.toLowerCase();
        const itemToBuy = SHOP_ITEMS.find(i => i.id.toLowerCase() === itemQuery || i.name.toLowerCase().includes(itemQuery || ''));

        if (!itemToBuy) {
          const shopStr = SHOP_ITEMS.map(i => `• **${i.name}** — \`${i.cost} Ryo\`\n  └ *${i.desc}*`).join('\n');
          return message.reply(`🛍️ **Konoha Weapon Shop:**\n\n${shopStr}\n\n**To Buy:** \`.ninja buy <item>\``);
        }

        if (userData.ryo < itemToBuy.cost) {
          return message.reply(`${emojis.WARNING || '⚠️'} You need **${itemToBuy.cost} Ryo** to buy **${itemToBuy.name}**! You have \`${userData.ryo} Ryo\`.`);
        }

        db.updateUser(author.id, (u) => {
          u.ryo -= itemToBuy.cost;
          if (!u.ninjaInventory) u.ninjaInventory = {};
          u.ninjaInventory[itemToBuy.id] = (u.ninjaInventory[itemToBuy.id] || 0) + 1;
        });

        return message.reply(`${emojis.SUCCESS || '✅'} Purchased **${itemToBuy.name}** for \`${itemToBuy.cost} Ryo\`!`);
      }

      const inv = userData.ninjaInventory || {};
      const invBox = createDynamicBox(`NINJA GEAR BAG — ${targetUser.username.toUpperCase()}`, [
        { key: 'Kunai    ', value: `${inv.kunai || 0} Blades` },
        { key: 'Shuriken ', value: `${inv.shuriken || 0} Packs` },
        { key: 'Elixirs  ', value: `${inv.healthPotion || 0} Potions` },
        { key: 'Pills    ', value: `${inv.chakraPill || 0} Pills` },
        { key: 'Scrolls  ', value: `${inv.scroll || 0} Scrolls` },
        { key: 'Ryo      ', value: `${userData.ryo || 0} Ryo` }
      ]);

      const embed = createStyledEmbed({
        title: `🎒 ${targetUser.username}'s Shinobi Weapon Bag`,
        subtitle: `Ninja Armory & Consumables`,
        description:
          '```\n' + invBox + '\n```\n\n' +
          `💡 *Tip: Type \`.ninja buy <item>\` to buy weapons or items from Konoha Shop!*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // 9. SHINOBI GLOBAL LEADERBOARD (.ninja top / .ninjalb)
    // ─────────────────────────────────────────
    if (sub === 'leaderboard' || sub === 'lb' || sub === 'top') {
      const catParam = args[1]?.toLowerCase() || 'level';

      const allUsers = Object.entries(db.data.users).map(([id, data]) => ({ id, ...data }));
      let title = '';
      let fieldFormatter = (u) => '';

      if (catParam === 'ryo' || catParam === 'money') {
        allUsers.sort((a, b) => (b.ryo || 0) - (a.ryo || 0));
        title = `💴 Shinobi Ryo Leaderboard`;
        fieldFormatter = (u) => `**${u.ryo || 0} Ryo** • Rank: *${u.rank || 'Academy Student'}*`;
      } else if (catParam === 'wins' || catParam === 'battles') {
        allUsers.sort((a, b) => (b.ninjaStats?.wins || 0) - (a.ninjaStats?.wins || 0));
        title = `⚔️ Shinobi PvP Battle Leaderboard`;
        fieldFormatter = (u) => `**${u.ninjaStats?.wins || 0} Victories** (${u.ninjaStats?.battles || 0} Battles)`;
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
        requestedBy: message.author,
        clientUser,
        footerText: 'Top 10 Shinobi in Naruto Bot World'
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default Fallback: Shinobi Help Card
    const commandsList = [
      '.ninja profile', '.ninja train', '.ninja jutsu',
      '.ninja battle', '.ninja mission', '.ninja clan',
      '.ninja rankup', '.ninja inventory', '.ninja top'
    ];
    const helpEmbed = createStyledEmbed({
      title: '🍥 Naruto Shinobi RPG Hub',
      subtitle: `Master Shinobi Commands`,
      description: `**Shinobi RPG**\n` + formatCodePills(commandsList),
      requestedBy: message.author,
      clientUser,
      footerText: 'Naruto Shinobi Suite'
    });
    return message.channel.send({ embeds: [helpEmbed] });
  }
};
