const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

// Quest pools organized by shinobi rank/level tier
const QUEST_POOLS = {
  // Level 1-5: Academy Student — simple chores & errands
  academy: [
    {
      rank: 'D-Rank Mission',
      title: 'Tora Cat Capture',
      desc: 'Track down Madam Shijimi\'s runaway cat, Tora, and bring it back safely!',
      minRyo: 50, maxRyo: 100, minXp: 10, maxXp: 20
    },
    {
      rank: 'D-Rank Mission',
      title: 'Weeding the Hokage\'s Garden',
      desc: 'Help maintain the Hokage\'s garden by pulling weeds and watering plants.',
      minRyo: 40, maxRyo: 90, minXp: 8, maxXp: 18
    },
    {
      rank: 'D-Rank Mission',
      title: 'Grocery Delivery for the Elderly',
      desc: 'Deliver groceries from the market to elderly villagers across Konoha.',
      minRyo: 45, maxRyo: 95, minXp: 10, maxXp: 18
    }
  ],

  // Level 6-10: Genin — border patrols, minor escorts
  genin: [
    {
      rank: 'C-Rank Mission',
      title: 'Bandit Outpost Patrol',
      desc: 'Patrol the Fire Country borders and clear out a rogue bandit encampment.',
      minRyo: 150, maxRyo: 280, minXp: 30, maxXp: 50
    },
    {
      rank: 'C-Rank Mission',
      title: 'Courier Mission to Hidden Sand',
      desc: 'Safely deliver a top-secret scroll to Sunagakure without getting ambushed.',
      minRyo: 140, maxRyo: 260, minXp: 28, maxXp: 48
    },
    {
      rank: 'C-Rank Mission',
      title: 'Protect the Merchant Caravan',
      desc: 'Guard a merchant caravan through the dangerous Forest of Death.',
      minRyo: 160, maxRyo: 300, minXp: 32, maxXp: 55
    }
  ],

  // Level 11-20: Chunin — escort missions, tracking, recon
  chunin: [
    {
      rank: 'B-Rank Mission',
      title: 'Land of Waves Escort',
      desc: 'Escort Tazuna the bridge builder safely back to the Land of Waves.',
      minRyo: 300, maxRyo: 500, minXp: 55, maxXp: 85
    },
    {
      rank: 'B-Rank Mission',
      title: 'Recover Stolen Forbidden Scroll',
      desc: 'Track down rogue ninjas and recover the stolen secret sealing scroll.',
      minRyo: 350, maxRyo: 550, minXp: 60, maxXp: 95
    },
    {
      rank: 'B-Rank Mission',
      title: 'Capture Rogue Chunin Traitor',
      desc: 'Hunt down and apprehend a Chunin who defected with classified mission data.',
      minRyo: 320, maxRyo: 520, minXp: 58, maxXp: 90
    }
  ],

  // Level 21-35: Jonin — elite operations, enemy elimination
  jonin: [
    {
      rank: 'A-Rank Mission',
      title: 'Infiltrate Akatsuki Outpost',
      desc: 'Gather critical intelligence from a hidden Akatsuki supply depot.',
      minRyo: 550, maxRyo: 850, minXp: 100, maxXp: 150
    },
    {
      rank: 'A-Rank Mission',
      title: 'Subdue Rogue Tailed Beast Energy',
      desc: 'Assist Anbu black ops in sealing a sudden surge of rogue chakra.',
      minRyo: 600, maxRyo: 900, minXp: 110, maxXp: 160
    },
    {
      rank: 'A-Rank Mission',
      title: 'Eliminate the Bounty Hunter Squad',
      desc: 'A notorious bounty hunter squad is targeting Konoha shinobi. Take them out.',
      minRyo: 580, maxRyo: 880, minXp: 105, maxXp: 155
    }
  ],

  // Level 36-50: Anbu — covert black ops, assassination
  anbu: [
    {
      rank: 'A-Rank Mission',
      title: 'Black Ops Deep Cover Mission',
      desc: 'Go undercover inside a criminal organization and extract a double agent.',
      minRyo: 800, maxRyo: 1100, minXp: 150, maxXp: 200
    },
    {
      rank: 'A-Rank Mission',
      title: 'Neutralize the Rogue Anbu Cell',
      desc: 'A renegade Anbu unit has gone dark. Locate and neutralize them before they sell secrets.',
      minRyo: 850, maxRyo: 1200, minXp: 160, maxXp: 210
    },
    {
      rank: 'S-Rank Mission',
      title: 'Eliminate a Missing-nin Jonin',
      desc: 'A former Konoha Jonin has defected and is selling hidden jutsu to enemy nations.',
      minRyo: 1000, maxRyo: 1400, minXp: 180, maxXp: 240
    }
  ],

  // Level 51-70: Sannin — legendary threats, tailed beast ops
  sannin: [
    {
      rank: 'S-Rank Mission',
      title: 'Defend Hidden Leaf Village',
      desc: 'Stand alongside the Hokage to defend Konohagakure from a large-scale invasion!',
      minRyo: 1200, maxRyo: 1800, minXp: 220, maxXp: 320
    },
    {
      rank: 'S-Rank Mission',
      title: 'Seal the Rampaging Tailed Beast',
      desc: 'A tailed beast has broken free from its jinchuriki. Seal it before it destroys the village.',
      minRyo: 1300, maxRyo: 1900, minXp: 240, maxXp: 340
    },
    {
      rank: 'S-Rank Mission',
      title: 'Confront the Seven Swords of the Mist',
      desc: 'Seven legendary swordsmen of Kirigakure are advancing on an allied nation. Stop them.',
      minRyo: 1400, maxRyo: 2000, minXp: 260, maxXp: 360
    }
  ],

  // Level 71-80: Shadow — mythical hidden ops
  shadow: [
    {
      rank: 'S-Rank Shadow Mission',
      title: 'Dismantle the Akatsuki Network',
      desc: 'Trace Akatsuki cells across five nations and eliminate their commanders.',
      minRyo: 1800, maxRyo: 2500, minXp: 320, maxXp: 450
    },
    {
      rank: 'S-Rank Shadow Mission',
      title: 'Retrieve the Lost Bijuu Chakra Fragment',
      desc: 'A shard of the Nine-Tails\' chakra has been stolen. Recover it at all costs.',
      minRyo: 2000, maxRyo: 2800, minXp: 340, maxXp: 480
    },
    {
      rank: 'S-Rank Shadow Mission',
      title: 'The Phantom of the Blood Mist',
      desc: 'Stop a shadow shinobi from reigniting the legendary Blood Mist massacre across Kirigakure.',
      minRyo: 2200, maxRyo: 3000, minXp: 360, maxXp: 500
    }
  ],

  // Level 81+: Hokage — god-tier missions
  hokage: [
    {
      rank: '★ Kage-Tier Mission',
      title: 'Prevent the Fourth Shinobi World War',
      desc: 'Intelligence signals a coalition of hidden villages forming a deadly alliance. Negotiate or fight.',
      minRyo: 3000, maxRyo: 5000, minXp: 500, maxXp: 800
    },
    {
      rank: '★ Kage-Tier Mission',
      title: 'Seal Kaguya\'s Chakra Rift',
      desc: 'An ancient chakra rift linked to Kaguya Otsutsuki has opened. Close it before reality tears.',
      minRyo: 3500, maxRyo: 6000, minXp: 550, maxXp: 900
    },
    {
      rank: '★ Kage-Tier Mission',
      title: 'Face the Reincarnated Madara',
      desc: 'Madara Uchiha has been reincarnated by a rogue shinobi. You alone must stop him.',
      minRyo: 4000, maxRyo: 7000, minXp: 600, maxXp: 1000
    }
  ]
};

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

module.exports = {
  name: 'ninja',
  description: 'Naruto RPG commands: Ninja Profile, Jutsu activation, Chakra meditation, Quests & Leaderboards',
  aliases: ['naruto', 'jutsu', 'rank', 'chakra', 'quest', 'lb', 'leaderboard', 'top'],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0] ? args[0].toLowerCase() : 'profile';

    if (['lb', 'leaderboard', 'top'].includes(invoked)) {
      sub = 'lb';
    }

    const targetUser = message.mentions.users.first() || message.author;
    const userData = db.getUser(targetUser.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    if (sub === 'help') {
      const commandsList = [
        '.ninja profile', '.ninja jutsu', '.ninja chakra',
        '.ninja quest', '.ninja train', '.ninja rank',
        '.ninja lb level', '.ninja lb ryo', '.ninja lb xp'
      ];
      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.NARUTO} Naruto Shinobi Commands`,
        description: `**Shinobi RPG**\n` + formatCodePills(commandsList),
        requestedBy: message.author,
        clientUser,
        footerText: 'Naruto Shinobi Overview'
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Leaderboard System
    if (sub === 'lb' || sub === 'leaderboard' || sub === 'top') {
      const catParam = (invoked === 'lb' || invoked === 'leaderboard' || invoked === 'top') 
        ? (args[0] ? args[0].toLowerCase() : 'level')
        : (args[1] ? args[1].toLowerCase() : 'level');

      const allUsers = Object.entries(db.data.users).map(([id, data]) => ({ id, ...data }));
      let title = '';
      let fieldFormatter = (u) => '';

      if (catParam === 'ryo' || catParam === 'money') {
        allUsers.sort((a, b) => (b.ryo || 0) - (a.ryo || 0));
        title = `${emojis.RYO} Shinobi Ryo Leaderboard`;
        fieldFormatter = (u) => `**${u.ryo || 0} Ryo** • Rank: *${u.rank || 'Academy Student'}*`;
      } else if (catParam === 'xp' || catParam === 'exp') {
        allUsers.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        title = `${emojis.STAR} Shinobi Experience Leaderboard`;
        fieldFormatter = (u) => `**${u.xp || 0} XP** • Level **${u.level || 1}**`;
      } else if (catParam === 'messages' || catParam === 'chat') {
        allUsers.sort((a, b) => (b.messages || 0) - (a.messages || 0));
        title = `${emojis.MESSAGES} Chat Activity Leaderboard`;
        fieldFormatter = (u) => `**${u.messages || 0} Messages Sent**`;
      } else {
        allUsers.sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0));
        title = `${emojis.NINJA_RANK} Shinobi Level Leaderboard`;
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
        subtitle: `${emojis.NARUTO} Konoha Leaderboard Rankings`,
        description: descLines.join('\n\n'),
        requestedBy: message.author,
        clientUser,
        footerText: 'Top 10 Shinobi in Leaf Village'
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'jutsu') {
      const jutsuName = args.slice(1).join(' ') || userData.jutsuList[0];
      const chakraCost = 20;

      if (userData.chakra < chakraCost) {
        return message.reply(`${emojis.WARNING} Not enough Chakra! Your Chakra: \`${userData.chakra}/100\`. Use \`.ninja chakra\` to meditate!`);
      }

      db.updateUser(targetUser.id, (u) => { u.chakra -= chakraCost; });

      const embed = createStyledEmbed({
        title: `${emojis.NINJUTSU} NINJUTSU ACTIVATION!`,
        subtitle: `${targetUser.username} activated **${jutsuName}**!`,
        description: `${emojis.CHAKRA_SPARK} *Chakra gathered in the hands...* \`-${chakraCost} Chakra\`\n\n` +
          `${emojis.KABOOM} **KABOOM!** The technique lands with devastating force!`,
        fields: [
          { name: 'Remaining Chakra', value: `⚡ \`${userData.chakra - chakraCost}/100\``, inline: true }
        ],
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Meditation (24-hour cooldown)
    if (sub === 'chakra' || sub === 'meditate') {
      const now = Date.now();
      const COOLDOWN_24H = 24 * 60 * 60 * 1000;
      const lastMeditate = userData.lastMeditateTime || 0;

      if (now - lastMeditate < COOLDOWN_24H) {
        const remainingMs = COOLDOWN_24H - (now - lastMeditate);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`${emojis.WARNING} **Meditation Cooldown Active!** You can meditate again in **${hours}h ${minutes}m**.`);
      }

      db.updateUser(targetUser.id, (u) => {
        u.chakra = 100;
        u.lastMeditateTime = now;
      });

      const embed = createStyledEmbed({
        title: `${emojis.MEDITATE} Shinobi Meditation`,
        subtitle: `${targetUser.username} focused their inner energy...`,
        description: `${emojis.CHAKRA_SPARK} **Chakra fully restored to 100/100!**\n\n*Note: Meditation can be performed once every 24 hours.*`,
        requestedBy: message.author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Level-Based Daily Quest System (3 Quests Per 24 Hours)
    if (sub === 'quest' || sub === 'train') {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const userLevel = userData.level || 1;

      let questData = userData.dailyQuests || { count: 0, lastReset: 0 };

      // Reset daily count if 24 hours have passed
      if (now - questData.lastReset >= DAY_MS) {
        questData.count = 0;
        questData.lastReset = now;
      }

      if (questData.count >= 3) {
        const remainingMs = DAY_MS - (now - questData.lastReset);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`${emojis.WARNING} **Daily Quest Limit Reached!** You have completed \`3/3\` missions for today. Next quests reset in **${hours}h ${minutes}m**.`);
      }

      // Pick a quest appropriate to the user's level
      const availablePool = getQuestPoolForLevel(userLevel);
      const randomQuest = availablePool[Math.floor(Math.random() * availablePool.length)];
      const ryoGained = Math.floor(Math.random() * (randomQuest.maxRyo - randomQuest.minRyo + 1)) + randomQuest.minRyo;
      const xpGained = Math.floor(Math.random() * (randomQuest.maxXp - randomQuest.minXp + 1)) + randomQuest.minXp;

      questData.count += 1;

      db.updateUser(targetUser.id, (u) => {
        u.ryo += ryoGained;
        u.xp += xpGained;
        u.dailyQuests = questData;
      });

      const embed = createStyledEmbed({
        title: `${emojis.SCROLL} ${randomQuest.title}`,
        subtitle: `${randomQuest.rank} • ${userData.rank} (Lv. ${userLevel}) • \`Daily Quests: ${questData.count}/3\``,
        description: `${emojis.CELEBRATION} ${randomQuest.desc}\n\n` +
          `${emojis.RYO} **Rewards Received:** \`+${ryoGained} Ryo\` | \`+${xpGained} XP\``,
        requestedBy: message.author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // Default Ninja Profile Card
    const embed = createStyledEmbed({
      title: `${targetUser.username}'s Shinobi Scroll`,
      subtitle: `${emojis.NARUTO} Village Ninja Status`,
      fields: [
        { name: `${emojis.NINJA_RANK} Ninja Rank`, value: `**${userData.rank}** (Level ${userData.level})`, inline: true },
        { name: '⚡ Chakra', value: `\`${userData.chakra}/100\``, inline: true },
        { name: `${emojis.RYO} Ryo (Currency)`, value: `\`${userData.ryo} Ryo\``, inline: true },
        { name: `${emojis.SCROLL} Known Jutsu`, value: userData.jutsuList.map(j => `• ${j}`).join('\n'), inline: false }
      ],
      requestedBy: message.author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
