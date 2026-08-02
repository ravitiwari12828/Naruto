const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const GAUGE_TITLES = {
  smartrate: { title: '🧠 Intelligence Scan', emoji: '🧠' },
  rizzmeter: { title: '💅 Rizz Meter', emoji: '💅' },
  shipname: { title: '🚢 Shinobi Ship Name', emoji: '🚢' },
  wanted: { title: '🤠 Bingo Book Wanted Level', emoji: '🤠' },
  wasted: { title: '💀 Battle Wasted Level', emoji: '💀' },
  powerlevel: { title: '⚡ Power Level Scan', emoji: '⚡' },
  coolrate: { title: '❄️ Coolness Rate', emoji: '❄️' },
  bonk: { title: '🔨 Bonk Level', emoji: '🔨' }
};

function renderGaugeBox(cmdName, score = null) {
  const titles = {
    smartrate: 'INTELLIGENCE SCAN',
    rizzmeter: 'RIZZ METER SCAN',
    shipname: 'SHIP NAME SCAN',
    wanted: 'WANTED BOUNTY LEVEL',
    wasted: 'BATTLE WASTED LEVEL',
    powerlevel: 'POWER LEVEL SCAN',
    coolrate: 'COOLNESS RATE SCAN',
    bonk: 'BONK LEVEL'
  };

  const title = titles[cmdName] || 'LEVEL SCAN';

  const items = score === null
    ? [
        { key: 'Scale ', value: '0 - 100%' },
        { key: 'Status', value: 'IDLE' }
      ]
    : [
        { key: 'Score ', value: `${score}%` },
        { key: 'Status', value: score > 80 ? 'MAX [OK]' : score > 50 ? 'HIGH [OK]' : 'NORMAL' }
      ];

  const { createDynamicBox } = require('../utils/boxBuilder');
  const box = createDynamicBox(title, items);
  const bar = '█'.repeat(Math.floor((score || 0) / 10)) + '░'.repeat(10 - Math.floor((score || 0) / 10));

  return '```\n' + box + '\n```\n' + `\`[${bar}] ${score || 0}%\``;
}

function getAssessmentText(cmdName, score, targetUser, author, user2) {
  if (cmdName === 'smartrate') {
    return score > 80 ? '🧠 **Super Genius** — Shikamaru IQ: 200+' : score > 50 ? '📜 **Above Average** — Kakashi-level reading speed' : '🌿 **Dense as a Rock** — Might Guy energy!';
  }
  if (cmdName === 'rizzmeter') {
    return score > 80 ? '🔥 **Full Minato Yellow Flash Charm Unlocked**' : score > 50 ? '⚡ **Solid Chunin-Level Rizz**' : '🥹 **Naruto before Hinata noticed him**';
  }
  if (cmdName === 'shipname') {
    const name1 = author.username.slice(0, Math.ceil(author.username.length / 2));
    const name2 = (user2 || author).username.slice(Math.floor((user2 || author).username.length / 2));
    const ship = name1 + name2;
    return `🚢 **Ship Name:** \`${ship}\`\n\n` + (score >= 80 ? '🌸 A love story worthy of a Naruto ending arc!' : score >= 50 ? '⚡ There is potential — keep fighting for it!' : '💔 Awkward silence in Ichiraku ramen...');
  }
  if (cmdName === 'wanted') {
    return score > 80 ? '☠️ **S-Rank Rogue Ninja** — Maximum Bounty! Report to Hokage!' : score > 50 ? '📜 **B-Rank Wanted** — Watch out for ANBU Black Ops' : '🌱 **Low-Level Rascal** — Only stole ramen!';
  }
  if (cmdName === 'wasted') {
    return score > 80 ? '💀 **CRITICAL WASTED** — Defeated by a forbidden jutsu!' : score > 50 ? '⚔️ **Severe Battle Damage** — Needs Medical Ninja!' : '🍃 **Minor Scratches** — Ready for next mission!';
  }
  if (cmdName === 'powerlevel') {
    return score > 80 ? '🔥 **BEYOND HOKAGE LEVEL** — Divine Chakra Unlocked!' : score > 50 ? '🏯 **Jonin / Kage-Class Shinobi** ⚔️' : '🌿 **Genin Level** — Keep training!';
  }
  if (cmdName === 'coolrate') {
    return score > 80 ? '😤 **Sasuke-level Coolness** & Cold Aura 🔥' : score > 50 ? '📖 **Kakashi Mysterious Reading Vibes** ⚡' : '💪 **Rock Lee without eyebrows energy!**';
  }
  if (cmdName === 'bonk') {
    return score > 80 ? '🔨 **MAXIMUM BONK LEVEL** — Sent to Shinobi Jail!' : score > 50 ? '⚠️ **High Energy Detected** — Caution advised!' : '😇 **Pure Soul** — Pure Konoha Shinobi!';
  }
  return '✨ Scan completed!';
}

function renderGaugeResultEmbed(cmdName, targetUser, userWhoClicked, clientUser, score, author = targetUser, user2 = null) {
  const info = GAUGE_TITLES[cmdName] || { title: 'Level Calculator', emoji: '📊' };
  const assessment = getAssessmentText(cmdName, score, targetUser, author, user2);

  const activeEmbed = createStyledEmbed({
    title: `${info.emoji} ${info.title} — ${targetUser.username}`,
    subtitle: `Calculation Complete for ${targetUser.username}`,
    description:
      renderGaugeBox(cmdName, score) + `\n\n` +
      `**Calculated Score:** \`${score} / 100\` (\`${score}%\`)\n\n` +
      `${assessment}`,
    requestedBy: userWhoClicked,
    clientUser
  });

  const doneRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gauge_done_${cmdName}`)
      .setLabel(`Scan Complete (${score}%)`)
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true)
  );

  return { activeEmbed, doneRow };
}

async function sendInteractiveGaugeCalculator(message, cmdName, targetUser, author, clientUser, user2 = null) {
  const info = GAUGE_TITLES[cmdName] || { title: 'Level Calculator', emoji: '📊' };

  const initialEmbed = createStyledEmbed({
    title: `${info.emoji} ${info.title} — ${targetUser.username}`,
    subtitle: `Click "Start Scan" below to run the gauge calculation!`,
    description:
      renderGaugeBox(cmdName, null) + `\n\n` +
      `*Click the **▶️ Start Scan** button below to calculate level percentage (1-100%)!*`,
    requestedBy: author,
    clientUser
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gauge_start_${cmdName}_${targetUser.id}_${author.id}`)
      .setLabel('▶️ Start Scan')
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [initialEmbed], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 120000 });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate().catch(() => {});

    const score = Math.floor(Math.random() * 100) + 1;
    const { activeEmbed, doneRow } = renderGaugeResultEmbed(cmdName, targetUser, interaction.user, clientUser, score, author, user2);

    await msg.edit({ embeds: [activeEmbed], components: [doneRow] }).catch(() => {});
    collector.stop();
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      const timeoutRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gauge_timeout')
          .setLabel('⏱️ Scan Timed Out')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
      msg.edit({ components: [timeoutRow] }).catch(() => {});
    }
  });
}

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EIGHT_BALL = [
  'It is certain.', 'Without a doubt.', 'You may rely on it.',
  'Yes, definitely.', 'Most likely.', 'Outlook good.',
  'Yes.', 'Signs point to yes.', 'Reply hazy, try again.',
  'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', 'Don\'t count on it.',
  'My reply is no.', 'My sources say no.', 'Outlook not so good.',
  'Very doubtful.'
];

const TRUTH_Q = [
  'What\'s your most embarrassing Naruto-related memory?',
  'Have you ever cried at an anime death? Which one?',
  'What jutsu would you use if you were a shinobi?',
  'Who is your least favourite Naruto character and why?',
  'What\'s the weirdest thing you\'ve done alone?',
  'Have you ever rage-quit an anime mid-episode?',
  'What\'s a secret talent only your closest friends know?',
  'If you had to join a Hidden Village, which one and why?',
  'What is your biggest weakness as a shinobi?',
  'Confess something you\'ve never told anyone here.'
];

const DARE_D = [
  'Do your best Naruto run for 30 seconds and record it.',
  'Say "Believe it!" after every sentence for the next 5 minutes.',
  'Let the next person in chat change your nickname for 1 hour.',
  'Send a voice message doing your best Kakashi impression.',
  'Type your next 3 messages entirely in caps.',
  'Send a childhood photo in chat.',
  'Write a 3-line poem about your favourite Naruto character.',
  'Call out your rival in chat and challenge them to a jutsu duel.',
  'Do a dramatic anime "noooo" reaction in VC.',
  'Send your current lock screen image in chat.'
];

const WOULD_YOU_RATHER = [
  'Have the Sharingan 👁️ OR the Rinnegan 🔮?',
  'Fight Madara at full power OR Kaguya Otsutsuki?',
  'Be a jinchuriki of the Nine-Tails OR the Eight-Tails?',
  'Have unlimited chakra but be forbidden from using ninjutsu OR use any jutsu but only 10 times a day?',
  'Train under Might Guy OR Jiraiya?',
  'Live in Konoha OR Sunagakure for one year?',
  'Fight 100 Naruto clones OR 1 Sasuke at peak power?',
  'Have the ability to use all 5 nature types OR master space-time ninjutsu?',
  'Be Hokage for a day OR be a Kage from any other village?',
  'Have Kakashi\'s Sharingan OR Rock Lee\'s physical power without chakra?'
];

const PICKUP_LINES = [
  'Are you a Rasengan? Because you\'ve been spinning in my mind all day. 🌀',
  'I must have eaten the food at Ichiraku\'s because I\'m totally ramen-tic about you. 🍜',
  'Are you the Nine-Tails? Because you\'ve got my chakra going wild. 🦊',
  'My heart beats faster than Rock Lee\'s taijutsu when I see you. 💚',
  'Are you a Sharingan? Because I can\'t stop staring into your eyes. 👁️',
  'Are you a shadow clone? Because whenever I\'m alone, I still see you everywhere. 🌀',
  'You must be a Sage because your beauty is on another level. 🐸',
  'Are you from the Land of Waves? Because every time I see you, a bridge connects our hearts. 🌊',
  'Even Kakashi would put down his book to read the story of us. 📖',
  'Forget Sasuke — you\'re the one who stole my heart for real. ❤️'
];

const FORTUNES = [
  'A great mission awaits you — your chakra is aligned with destiny. 🌟',
  'Beware of a false ally. Not every shinobi wears their face with honour. 🎭',
  'A quiet day will bring unexpected power. Meditate and trust the process. 🧘',
  'Your strength will be tested soon, but Konoha stands with you. 🍃',
  'Romance may bloom from an unexpected direction — open your eyes like a Byakugan. 👁️',
  'Financial rewards are on the horizon — keep grinding those quests. 💰',
  'A long-lost ally will return to your side when you need them most. 🤝',
  'Your next jutsu attempt will exceed all expectations. Go beyond your limits. ⚡',
  'The universe whispers: believe it! Your time is coming. 🍥',
  'Danger lurks in comfort zones. Break free and discover your true rank. 🔥'
];

const VIBES = ['🔥 Chaotic Shinobi', '😤 Revenge Arc Energy', '✨ Main Character Aura', '🌸 Sakura Useless Energy', '🦊 Nine-Tails Unleashed', '😴 Shikamaru Mode (Too Troublesome)', '😤 Sasuke Uchiha Cold Energy', '🌀 Rasengan Gyaat', '🍜 Ramen-Powered', '🥹 Emotional Backstory Incoming'];
const MOODS   = ['⚡ Ready to take on the Akatsuki', '😴 Shikamaru-level lazy today', '🔥 Full Might Guy Eight Gates mode', '🍜 Just hungry for Ichiraku ramen', '😤 Full Sasuke brooding mode', '🌸 Cherry blossom chill vibes', '🦊 Nine-Tails chakra leaking slightly', '🧘 Sage mode meditation energy', '😂 Naruto laughing at his own jokes', '💀 Rock Lee without his eyebrows energy'];
const SMART   = ['Super Genius — Shikamaru IQ: 200+', 'Above Average — Kakashi-level reading speed', 'Street Smart — Naruto\'s pure instinct', 'You\'d pass the Chunin Exams on charm alone', 'Barely Passing — but you make it look good', 'Galaxy Brain — Minato-level tactical thinking', 'Book Smart — could rival Sakura\'s medical knowledge', 'Dense as a Rock — Might Guy doesn\'t need brains!'];
const RIZO    = ['0% — Naruto before Hinata noticed him', '20% — You tried. Lee acknowledges the effort.', '40% — Solid Chunin-level rizz', '60% — Kakashi-tier mysterious appeal', '80% — Sasuke dark aura rizz activated', '99% — Full Minato Yellow Flash charm unlocked', '100% — Even the Nine-Tails would blush'];

// MEME TEMPLATES MAP
const MEMES_MAP = {
  spongebobchicken: { title: '🐔 Mocking Spongebob Meme', template: 'sb' },
  slapcar: { title: '🚗 Slaps Roof of Car Meme', template: 'slap' },
  isthisa: { title: '🦋 Is This a Pigeon? Meme', template: 'pigeon' },
  drake: { title: '👔 Drake Hotline Bling Meme', template: 'drake' },
  distractedbf: { title: '👀 Distracted Boyfriend Meme', template: 'disastergirl' },
  communismcat: { title: '☭ Our Communism Meme', template: 'cat' },
  eject: { title: '🚀 Among Us Eject Meme', template: 'eject' },
  emergencymeeting: { title: '🚨 Emergency Meeting Meme', template: 'meeting' },
  headpat: { title: '✋ Headpat Anime Meme', template: 'pat' },
  tradeoffer: { title: '🤝 Trade Offer Meme', template: 'trade' },
  waddle: { title: '🦆 Duck Waddle Meme', template: 'duck' }
};

// EMOTES MAP
const EMOTES_MAP = {
  blush: '😳 *blushes brightly*',
  cry: '😭 *crying tears of emotion*',
  dance: '💃 *dances enthusiastically*',
  pout: '😤 *pouts angrily*',
  shrug: '🤷 *shrugs indifferent*',
  sleepy: '😴 *yawns and gets sleepy*',
  smile: '😊 *smiles warmly*',
  smug: '😏 *smug anime grin*',
  thumbsup: '👍 *gives a big thumbs up!*',
  wag: '🐕 *wags tail excitedly*',
  thinking: '🤔 *thinks intensely*',
  triggered: '🤬 *GETS TRIGGERED!*',
  teehee: '🤭 *teehee giggles*',
  deredere: '😍 *deredere in love mode*',
  thonking: '🧐 *thonking deeply*',
  scoff: '😒 *scoffs in disbelief*',
  happy: '😄 *super happy vibes*',
  thumbs: '👍 *thumbs up*',
  grin: '😁 *big cheerful grin*'
};

// ACTIONS MAP
const ACTIONS_MAP = {
  cuddle: '🤗 cuddled',
  hug: '🫂 gave a warm hug to',
  kiss: '💋 kissed',
  lick: '👅 licked',
  nom: '😋 nommed on',
  pat: '✋ patted the head of',
  poke: '👉 poked',
  slap: '🖐️ slapped',
  stare: '👀 stared intensely at',
  highfive: '🙌 gave a high five to',
  bite: '🦷 bit',
  greet: '👋 greeted',
  punch: '👊 punched',
  handholding: '🤝 held hands with',
  tickle: '👉 tickled',
  kill: '⚔️ executed jutsu on',
  hold: '🤲 held',
  pats: '✋ patted',
  wave: '👋 waved at',
  boop: '👉 booped the nose of',
  snuggle: '🤗 snuggled with',
  bully: '👿 playfully bullied'
};

module.exports = {
  name: 'fun',
  description: 'Complete Fun Suite: Memes, Emotes, Actions, Games & Naruto Lore',
  aliases: [
    'fun', 'meme', 'ship', 'coinflip', 'roll', 'gauge', 'bonk',
    '8ball', 'eightball', 'truth', 'dare', 'wouldyourather', 'wyr',
    'pickup', 'fortune', 'vibecheck', 'mood', 'smartrate', 'rizzmeter',
    'shipname', 'wanted', 'wasted', 'powerlevel', 'coolrate',
    // Memes
    'spongebobchicken', 'slapcar', 'isthisa', 'drake', 'distractedbf',
    'communismcat', 'eject', 'emergencymeeting', 'headpat', 'tradeoffer', 'waddle',
    // Emotes
    'blush', 'cry', 'dance', 'pout', 'shrug', 'sleepy', 'smile',
    'smug', 'thumbsup', 'wag', 'thinking', 'triggered', 'teehee', 'deredere',
    'thonking', 'scoff', 'happy', 'thumbs', 'grin',
    // Actions
    'cuddle', 'hug', 'kiss', 'lick', 'nom', 'pat', 'poke', 'slap', 'stare',
    'highfive', 'bite', 'greet', 'punch', 'handholding', 'tickle', 'kill',
    'hold', 'pats', 'wave', 'boop', 'snuggle', 'bully'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const target = (message.mentions?.members && typeof message.mentions.members.first === 'function')
      ? message.mentions.members.first()
      : (message.mentions?.users && typeof message.mentions.users.first === 'function' ? message.mentions.users.first() : null) || message.member;
    const targetUser = target?.user || (target?.id ? target : message.author);
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const { createDynamicBox } = require('../utils/boxBuilder');

    // 1. MEME GENERATION COMMANDS
    if (invoked === 'meme' || invoked === 'memes' || MEMES_MAP[invoked]) {
      let memeKey = invoked;
      if (invoked === 'meme' || invoked === 'memes') {
        const sub = args[0]?.toLowerCase();
        if (sub && MEMES_MAP[sub]) {
          memeKey = sub;
          args = args.slice(1);
        } else {
          const keys = Object.keys(MEMES_MAP);
          memeKey = keys[Math.floor(Math.random() * keys.length)];
        }
      }
      const memeInfo = MEMES_MAP[memeKey];
      const fullArgs = args.join(' ');
      const RANDOM_MEME_PRESETS = [
        { text1: 'Me trying to pass Chunin Exams', text2: 'Without opening a single book' },
        { text1: 'When you use Rasengan', text2: 'To solve every minor problem' },
        { text1: 'Shikamaru looking at work', text2: 'What a drag...' },
        { text1: 'Me after 5 minutes of study', text2: 'Sage Mode Activated' },
        { text1: 'When Kakashi is 3 hours late', text2: 'Lost on the road of life' },
        { text1: 'When you unlock Eight Gates', text2: 'Just to win a 1v1 duel' },
        { text1: 'Itachi looking at his brother', text2: 'You lack hatred...' }
      ];
      const randomPreset = RANDOM_MEME_PRESETS[Math.floor(Math.random() * RANDOM_MEME_PRESETS.length)];
      let text1 = randomPreset.text1;
      let text2 = randomPreset.text2;

      if (fullArgs.includes('|')) {
        const parts = fullArgs.split('|');
        text1 = parts[0].trim() || randomPreset.text1;
        text2 = parts.slice(1).join('|').trim() || randomPreset.text2;
      } else if (fullArgs.length > 0) {
        text1 = fullArgs;
        text2 = ' ';
      }

      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      const memeUrl = `https://api.memegen.link/images/${memeInfo.template}/${encodedText1}/${encodedText2}.png`;

      const embed = createStyledEmbed({
        title: `😂 ${memeInfo.title}`,
        subtitle: `Generated by ${author.username}`,
        requestedBy: author,
        clientUser
      });
      embed.setImage(memeUrl);
      return message.channel.send({ embeds: [embed] });
    }

async function fetchActionAnimeGif(action) {
  const ALIASES = {
    // Actions
    pats: 'pat',
    headpat: 'pat',
    handholding: 'handhold',
    hold: 'hug',
    greet: 'wave',
    boop: 'poke',
    snuggle: 'cuddle',
    bully: 'slap',
    kill: 'slap',
    stare: 'stare',
    highfive: 'highfive',
    bite: 'bite',
    punch: 'punch',
    tickle: 'tickle',
    nom: 'feed',
    lick: 'lick',

    // Emotes
    sleepy: 'sleep',
    thumbs: 'thumbsup',
    thonking: 'thinking',
    teehee: 'giggle',
    deredere: 'blush',
    scoff: 'pout',
    happy: 'smile',
    grin: 'smile',
    shrug: 'smug',
    wag: 'smile',
    triggered: 'slap'
  };

  const key = ALIASES[action] || action;

  const sources = [
    `https://purrbot.site/api/img/sfw/${key}/gif`,
    `https://api.otakugifs.xyz/gif?reaction=${key}`
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        const img = data.url || data.link || data.response;
        if (img && typeof img === 'string' && img.startsWith('http')) return img;
      }
    } catch(e) {}
  }

  const ACTION_FALLBACKS = {
    pat: ['https://cdn.purrbot.site/sfw/pat/gif/pat_018.gif'],
    hug: ['https://cdn.otakugifs.xyz/gifs/hug/d6b2dfe0ae69b8d0.gif', 'https://cdn.purrbot.site/sfw/hug/gif/hug_061.gif'],
    kiss: ['https://cdn.otakugifs.xyz/gifs/kiss/1a12a524e75eb82b.gif'],
    slap: ['https://cdn.otakugifs.xyz/gifs/slap/99d7a3247ec4bd51.gif'],
    cuddle: ['https://cdn.purrbot.site/sfw/cuddle/gif/cuddle_001.gif'],
    poke: ['https://cdn.otakugifs.xyz/gifs/poke/8c541784ef04a372.gif'],
    dance: ['https://cdn.otakugifs.xyz/gifs/dance/a0b411d33261a9bc.gif'],
    smile: ['https://cdn.otakugifs.xyz/gifs/smile/5d7426b3a3221b6d.gif'],
    blush: ['https://cdn.otakugifs.xyz/gifs/blush/90df111a8b1a8d05.gif'],
    cry: ['https://cdn.otakugifs.xyz/gifs/cry/0811e51b14a4805c.gif'],
    bite: ['https://cdn.otakugifs.xyz/gifs/bite/8b51a54b38d38a0f.gif'],
    punch: ['https://cdn.otakugifs.xyz/gifs/punch/95cf580459eb542b.gif'],
    wave: ['https://cdn.otakugifs.xyz/gifs/wave/8193f419842a537f.gif'],
    wink: ['https://cdn.otakugifs.xyz/gifs/wink/6b9b32c610996f4b.gif']
  };

  const fallbacks = ACTION_FALLBACKS[key] || [
    'https://cdn.purrbot.site/sfw/pat/gif/pat_018.gif',
    'https://cdn.otakugifs.xyz/gifs/hug/d6b2dfe0ae69b8d0.gif'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

    // 2. EMOTES COMMANDS
    if (EMOTES_MAP[invoked]) {
      const actionText = EMOTES_MAP[invoked];
      const imageUrl = await fetchActionAnimeGif(invoked);

      const embed = createStyledEmbed({
        title: `😃 ${author.username} ${invoked}!`,
        description: `**${author.username}** ${actionText}`,
        bannerUrl: imageUrl,
        showBanner: true,
        showThumbnail: false,
        requestedBy: author,
        clientUser
      });
      if (imageUrl) embed.setImage(imageUrl);

      return message.channel.send({ embeds: [embed] });
    }

    // 3. ACTIONS COMMANDS
    if (ACTIONS_MAP[invoked]) {
      const verb = ACTIONS_MAP[invoked];
      const isSelf = targetUser.id === author.id;
      const targetText = isSelf ? 'themselves! *Awkward...*' : `<@${targetUser.id}>!`;
      const imageUrl = await fetchActionAnimeGif(invoked);

      const embed = createStyledEmbed({
        title: `🤗 ${invoked.toUpperCase()}!`,
        description: `**<@${author.id}>** ${verb} ${targetText}`,
        bannerUrl: imageUrl,
        showBanner: true,
        showThumbnail: false,
        requestedBy: author,
        clientUser
      });
      if (imageUrl) embed.setImage(imageUrl);

      return message.channel.send({ embeds: [embed] });
    }

    // 🎱 Eight Ball
    if (['8ball', 'eightball'].includes(invoked)) {
      const question = args.join(' ') || 'Will I become Hokage?';
      const answer = pick(EIGHT_BALL);

      const boxPanel = createDynamicBox('SHARINGAN ORACLE SPEAKS', [
        `User     : ${author.username}`,
        `Question : ${question.slice(0, 24)}`,
        `Answer   : ${answer.slice(0, 24)}`
      ]);

      const embed = createStyledEmbed({
        title: `🎱 The Sharingan Oracle Speaks`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `• **Question:** *${question}*\n` +
          `• **Answer:** **${answer}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 💬 Truth
    if (invoked === 'truth') {
      const q = pick(TRUTH_Q);
      const boxPanel = createDynamicBox('SHINOBI TRUTH CHALLENGE', [
        `User     : ${author.username}`,
        `Status   : Answer Honestly`,
        `Penalty  : Face Village Dishonour`
      ]);

      const embed = createStyledEmbed({
        title: `📜 Shinobi Truth Challenge`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `**Question:**\n> **${q}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🎯 Dare
    if (invoked === 'dare') {
      const d = pick(DARE_D);
      const boxPanel = createDynamicBox('SHINOBI DARE CHALLENGE', [
        `User     : ${author.username}`,
        `Status   : Challenge Accepted`,
        `Rule     : Complete or Lose Face`
      ]);

      const embed = createStyledEmbed({
        title: `⚡ Shinobi Dare Challenge`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `**Your Dare:**\n> **${d}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🤔 Would You Rather
    if (['wouldyourather', 'wyr'].includes(invoked)) {
      const wyr = pick(WOULD_YOU_RATHER);
      const boxPanel = createDynamicBox('SHINOBI DILEMMA (WYR)', [
        `User     : ${author.username}`,
        `Type     : Would You Rather`,
        `Status   : Choose One Option`
      ]);

      const embed = createStyledEmbed({
        title: `⚔️ Shinobi Dilemma — Would You Rather?`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `**Dilemma:**\n> **${wyr}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 💘 Pickup Lines
    if (invoked === 'pickup') {
      const pickup = pick(PICKUP_LINES);
      const boxPanel = createDynamicBox('SHINOBI CHARM SCROLL', [
        `Caster   : ${author.username}`,
        `Item     : Scroll of Charm`,
        `Effect   : Heart Fluttering`
      ]);

      const embed = createStyledEmbed({
        title: `💘 Shinobi Pickup Line`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `> **${pickup}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🔮 Fortune
    if (invoked === 'fortune') {
      const fortune = pick(FORTUNES);
      const boxPanel = createDynamicBox('KONOHA FORTUNE TELLER', [
        `User     : ${author.username}`,
        `Reading  : Today's Shinobi Fate`,
        `Align    : Divine Chakra`
      ]);

      const embed = createStyledEmbed({
        title: `🔮 Konoha Fortune Teller`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `> **${fortune}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ✨ Vibe Check
    if (invoked === 'vibecheck') {
      const vibe = pick(VIBES);
      const boxPanel = createDynamicBox('VIBE CHECK SCANNER', [
        `Target   : ${targetUser.username}`,
        `Vibe     : ${vibe.replace(/^[^a-zA-Z0-9]+/, '').trim()}`
      ]);

      const embed = createStyledEmbed({
        title: `✨ Vibe Check — ${targetUser.username}`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `• **Current Vibe:** **${vibe}**\n\n` +
          `*The village has spoken. Accept your fate.*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 😤 Mood
    if (invoked === 'mood') {
      const mood = pick(MOODS);
      const boxPanel = createDynamicBox('DAILY SHINOBI MOOD SCAN', [
        `Target   : ${targetUser.username}`,
        `Energy   : Calculated 100%`
      ]);

      const embed = createStyledEmbed({
        title: `😤 Daily Shinobi Mood`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `• **Energy Today:** **${mood}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🧠 Smart Rate
    if (invoked === 'smartrate') {
      return sendInteractiveGaugeCalculator(message, 'smartrate', targetUser, author, clientUser);
    }

    // 💅 Rizz Meter
    if (invoked === 'rizzmeter') {
      return sendInteractiveGaugeCalculator(message, 'rizzmeter', targetUser, author, clientUser);
    }

    // 🚢 Ship
    if (['ship', 'shipname'].includes(invoked)) {
      const user2 = message.mentions.users.size > 1 ? Array.from(message.mentions.users.values())[1] : (message.mentions.users.first() !== targetUser ? message.mentions.users.first() : null);
      return sendInteractiveGaugeCalculator(message, 'shipname', targetUser, author, clientUser, user2);
    }

    // 🪙 Coinflip
    if (invoked === 'coinflip') {
      const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
      const emoji = result === 'Heads' ? '🪙' : '🪙';
      const boxPanel = createDynamicBox('COIN FLIP RESULT', [
        `User   : ${author.username}`,
        `Side   : ${result}`,
        `Status : Verified Flip`
      ]);

      const embed = createStyledEmbed({
        title: `${emoji} Coin Flip — ${result}`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `• **The coin landed on:** **${result}** ${emoji}`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🎲 Dice Roll
    if (invoked === 'roll') {
      const maxVal = parseInt(args[0]) || 100;
      const rollVal = Math.floor(Math.random() * maxVal) + 1;
      const boxPanel = createDynamicBox('DICE ROLL RESULT', [
        `User   : ${author.username}`,
        `Max    : 1 to ${maxVal}`,
        `Rolled : ${rollVal}`
      ]);

      const embed = createStyledEmbed({
        title: `🎲 Dice Roll — ${rollVal} / ${maxVal}`,
        description: '```\n' + boxPanel + '\n```\n\n' +
          `• **Result:** **${rollVal}** (out of 1–${maxVal})`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 📊 Gauge Scanner
    if (invoked === 'gauge') {
      const gaugeTypes = ['smartrate', 'rizzmeter', 'wanted', 'wasted', 'powerlevel', 'coolrate', 'bonk'];
      const chosenGauge = pick(gaugeTypes);
      return sendInteractiveGaugeCalculator(message, chosenGauge, targetUser, author, clientUser);
    }

    // 😂 Meme Generator / Random Meme
    if (invoked === 'meme') {
      const randomMemeKey = pick(Object.keys(MEMES_MAP));
      const memeInfo = MEMES_MAP[randomMemeKey];
      const fullArgs = args.join(' ');
      let text1 = fullArgs || 'When you run Naruto Bot commands!';
      let text2 = fullArgs ? 'Believe it!' : 'Instant Shinobi Power!';

      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      const memeUrl = `https://api.memegen.link/images/${memeInfo.template}/${encodedText1}/${encodedText2}.png`;

      const embed = createStyledEmbed({
        title: `😂 ${memeInfo.title}`,
        subtitle: `Generated for ${author.username}`,
        requestedBy: author,
        clientUser
      });
      embed.setImage(memeUrl);
      return message.channel.send({ embeds: [embed] });
    }

    // 🤠 Wanted Poster
    if (invoked === 'wanted') {
      return sendInteractiveGaugeCalculator(message, 'wanted', targetUser, author, clientUser);
    }

    // 💀 Wasted
    if (invoked === 'wasted') {
      return sendInteractiveGaugeCalculator(message, 'wasted', targetUser, author, clientUser);
    }

    // ⚡ Power Level
    if (invoked === 'powerlevel') {
      return sendInteractiveGaugeCalculator(message, 'powerlevel', targetUser, author, clientUser);
    }

    // ❄️ Cool Rate
    if (invoked === 'coolrate') {
      return sendInteractiveGaugeCalculator(message, 'coolrate', targetUser, author, clientUser);
    }

    // ${emojis.MOD} Bonk
    if (invoked === 'bonk') {
      return sendInteractiveGaugeCalculator(message, 'bonk', targetUser, author, clientUser);
    }

    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    const panelPayload = await renderModuleHelpPanel(message, 'fun');
    if (panelPayload) {
      return message.channel.send(panelPayload);
    }
  },

  renderGaugeResultEmbed
};

