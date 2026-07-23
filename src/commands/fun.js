const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

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
const MOODS   = ['⚡ Ready to take on the Akatsuki', '😴 Shikamaru-level lazy today', '🔥 Full Might Guy Eight Gates mode', '🍜 Just hungry for Ichiraku ramen', '😤 Full Sasuke brooding mode', '🌸 Cherry blossom chill vibes', '🦊 Nine-Tails chakra leaking slightly', '🧘 Sage mode meditation energy', '😂 Naruto laughing at his own jokes', '💀 Rock Lee without his weights energy'];
const SMART   = ['Super Genius — Shikamaru IQ: 200+', 'Above Average — Kakashi-level reading speed', 'Street Smart — Naruto\'s pure instinct', 'You\'d pass the Chunin Exams on charm alone', 'Barely Passing — but you make it look good', 'Galaxy Brain — Minato-level tactical thinking', 'Book Smart — could rival Sakura\'s medical knowledge', 'Dense as a Rock — Might Guy doesn\'t need brains!'];
const RIZO    = ['0% — Naruto before Hinata noticed him', '20% — You tried. Lee acknowledges the effort.', '40% — Solid Chunin-level rizz', '60% — Kakashi-tier mysterious appeal', '80% — Sasuke dark aura rizz activated', '99% — Full Minato Yellow Flash charm unlocked', '100% — Even the Nine-Tails would blush'];

module.exports = {
  name: 'fun',
  description: 'Fun Naruto-themed commands: eightball, truth, dare, vibecheck, shipname, fortune & more!',
  aliases: [
    '8ball', 'eightball', 'truth', 'dare', 'wouldyourather', 'wyr',
    'pickup', 'fortune', 'vibecheck', 'mood', 'smartrate', 'rizzmeter',
    'shipname', 'poke', 'bonk', 'cuddle', 'highfive', 'wave',
    'wanted', 'wasted', 'powerlevel', 'coolrate'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const target = message.mentions.members?.first() || message.member;
    const targetUser = target?.user || message.author;
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 🎱 Eight Ball
    if (['8ball', 'eightball'].includes(invoked)) {
      const question = args.join(' ') || 'Will I become Hokage?';
      const answer = pick(EIGHT_BALL);
      const embed = createStyledEmbed({
        title: `🎱 The Sharingan Oracle Speaks`,
        subtitle: `Question: *${question}*`,
        description: `**${answer}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 💬 Truth
    if (invoked === 'truth') {
      const embed = createStyledEmbed({
        title: `${emojis.SCROLL} Shinobi Truth Challenge`,
        subtitle: `${author.username}, answer honestly or face dishonour!`,
        description: `**${pick(TRUTH_Q)}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🎯 Dare
    if (invoked === 'dare') {
      const embed = createStyledEmbed({
        title: `${emojis.KABOOM} Shinobi Dare`,
        subtitle: `${author.username} accepted the dare! Do it or lose face in the village!`,
        description: `**${pick(DARE_D)}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🤔 Would You Rather
    if (['wouldyourather', 'wyr'].includes(invoked)) {
      const embed = createStyledEmbed({
        title: `⚔️ Shinobi Dilemma — Would You Rather?`,
        description: `**${pick(WOULD_YOU_RATHER)}**\n\nReact with your answer!`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 💘 Pickup Lines
    if (invoked === 'pickup') {
      const embed = createStyledEmbed({
        title: `💘 Shinobi Pickup Line`,
        subtitle: `${author.username} pulls out a scroll of charm...`,
        description: pick(PICKUP_LINES),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🔮 Fortune
    if (invoked === 'fortune') {
      const embed = createStyledEmbed({
        title: `🔮 Konoha Fortune Teller`,
        subtitle: `${author.username}'s fate for today:`,
        description: pick(FORTUNES),
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ✨ Vibe Check
    if (invoked === 'vibecheck') {
      const user = targetUser;
      const embed = createStyledEmbed({
        title: `✨ Vibe Check — ${user.username}`,
        description: `**Current Vibe: ${pick(VIBES)}**\n\nThe village has spoken. Accept your fate.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 😤 Mood
    if (invoked === 'mood') {
      const embed = createStyledEmbed({
        title: `😤 Daily Shinobi Mood`,
        subtitle: `${author.username}'s energy today:`,
        description: `**${pick(MOODS)}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🧠 Smart Rate
    if (invoked === 'smartrate') {
      const score = rng(1, 100);
      const label = pick(SMART);
      const embed = createStyledEmbed({
        title: `🧠 Intelligence Scan — ${targetUser.username}`,
        description: `**IQ Score: \`${score}/100\`**\n\n${label}`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 💅 Rizz Meter
    if (invoked === 'rizzmeter') {
      const score = rng(0, 100);
      const label = RIZO.find((r, i) => score <= (i + 1) * (100 / RIZO.length)) || RIZO[RIZO.length - 1];
      const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
      const embed = createStyledEmbed({
        title: `💅 Rizz Meter — ${targetUser.username}`,
        description: `**Rizz Score: \`${score}%\`**\n\`${bar}\`\n\n${label}`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🚢 Ship Name
    if (invoked === 'shipname') {
      const user2 = message.mentions.users.first();
      const name1 = author.username.slice(0, Math.ceil(author.username.length / 2));
      const name2 = (user2 || author).username.slice(Math.floor((user2 || author).username.length / 2));
      const ship = name1 + name2;
      const compat = rng(50, 100);
      const embed = createStyledEmbed({
        title: `🚢 Shinobi Ship Name`,
        subtitle: `${author.username} ❤️ ${(user2 || author).username}`,
        description: `**Ship Name: \`${ship}\`**\n**Compatibility: \`${compat}%\`**\n\n${compat >= 80 ? '🌸 A love story worthy of a Naruto ending arc!' : '⚡ There\'s potential — keep fighting for it!'}`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 👉 Poke
    if (invoked === 'poke') {
      const embed = createStyledEmbed({
        title: `👉 Poke!`,
        description: `${author.username} poked ${targetUser.username}! *They flinch like they got hit by a kunai.*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🔨 Bonk
    if (invoked === 'bonk') {
      const embed = createStyledEmbed({
        title: `🔨 BONK!`,
        description: `${author.username} bonked ${targetUser.username} on the head with a chakra-charged scroll. **Go to horny jail.** 👮`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🤗 Cuddle
    if (invoked === 'cuddle') {
      const embed = createStyledEmbed({
        title: `🤗 Shinobi Cuddle`,
        description: `${author.username} pulled ${targetUser.username} in for a warm Konoha hug. *Even Sasuke felt something.* 🍃`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🙌 High Five
    if (invoked === 'highfive') {
      const embed = createStyledEmbed({
        title: `🙌 High Five!`,
        description: `${author.username} gave ${targetUser.username} a chakra-enhanced high five! The shockwave knocked over three Academy students.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 👋 Wave
    if (invoked === 'wave') {
      const embed = createStyledEmbed({
        title: `👋 Greetings, Shinobi!`,
        description: `${author.username} waves at ${targetUser.username} with Naruto-level enthusiasm. *BELIEVE IT!* 🍥`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 🤠 Wanted Poster
    if (invoked === 'wanted') {
      const bounty = rng(1000, 9999999).toLocaleString();
      const crimes = ['Excessive use of Shadow Clone Jutsu in public', 'Eating all the Ichiraku ramen', 'Stealing Kakashi\'s Icha Icha book', 'Running in Chunin Exam corridors', 'Being too powerful and scaring villagers'];
      const embed = createStyledEmbed({
        title: `🤠 BINGO BOOK — WANTED`,
        subtitle: `☠️ ${targetUser.username} — DANGEROUS MISSING-NIN`,
        description: `**Bounty: \`${bounty} Ryo\`**\n\n**Crime:** *${pick(crimes)}*\n\nReport to the nearest Kage office immediately.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 💀 Wasted
    if (invoked === 'wasted') {
      const embed = createStyledEmbed({
        title: `💀 WASTED — Game Over`,
        subtitle: `${targetUser.username} has fallen in battle!`,
        description: `*${author.username} defeated ${targetUser.username} using a forbidden jutsu.*\n\n**WASTED** — Respawning at the Leaf Village entrance in 3... 2... 1...`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ⚡ Power Level
    if (invoked === 'powerlevel') {
      const power = rng(100, 999999).toLocaleString();
      const ranks = ['Below Genin 😬', 'Genin Territory 🌿', 'Chunin Worthy 📜', 'Jonin Level ⚔️', 'Kage-Class 🏯', 'Sannin Tier 🐍', 'Legendary Shinobi 🌟', 'BEYOND HOKAGE LEVEL 🔥'];
      const label = power.replace(/,/g, '') > 500000 ? ranks[7] : power.replace(/,/g, '') > 300000 ? ranks[5] : power.replace(/,/g, '') > 100000 ? ranks[4] : ranks[rng(0, 3)];
      const embed = createStyledEmbed({
        title: `⚡ Power Level Scan — ${targetUser.username}`,
        description: `**Power Level: \`${power}\`**\n\n**Assessment: ${label}**`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // ❄️ Cool Rate
    if (invoked === 'coolrate') {
      const score = rng(0, 100);
      const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
      const label = score >= 90 ? 'Sasuke-level coolness 😤🔥' : score >= 70 ? 'Kakashi mysterious vibes 📖' : score >= 50 ? 'Solid Jonin energy ⚔️' : score >= 30 ? 'Naruto before the timeskip 🍥' : 'Rock Lee without his eyebrows 💪';
      const embed = createStyledEmbed({
        title: `❄️ Cool Rate — ${targetUser.username}`,
        description: `**Cool Score: \`${score}%\`**\n\`${bar}\`\n\n${label}`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default: help list
    const embed = createStyledEmbed({
      title: `${emojis.FUN} Fun Commands`,
      subtitle: 'Naruto-themed fun for the whole server!',
      description:
        '`.8ball` `.truth` `.dare` `.wyr` `.pickup` `.fortune`\n' +
        '`.vibecheck` `.mood` `.smartrate` `.rizzmeter` `.shipname`\n' +
        '`.poke` `.bonk` `.cuddle` `.highfive` `.wave`\n' +
        '`.wanted` `.wasted` `.powerlevel` `.coolrate`',
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
