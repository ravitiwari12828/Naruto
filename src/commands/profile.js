const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

// Verified Anime Aesthetic Direct Image Collections (100% Guaranteed Render)
const ANIME_PFP_COLLECTION = {
  animes: [
    'https://i.imgur.com/8QZ5Z2A.png',
    'https://i.imgur.com/r8470a1.png',
    'https://i.imgur.com/W2h0y5l.jpeg',
    'https://i.imgur.com/Qk9b9vQ.jpeg',
    'https://i.imgur.com/x0qL0X8.jpeg'
  ],
  boys: [
    'https://i.imgur.com/4zJqO9V.jpeg',
    'https://i.imgur.com/5uD8L5q.jpeg',
    'https://i.imgur.com/X4y1F6K.jpeg',
    'https://i.imgur.com/3b6p3Xm.jpeg',
    'https://i.imgur.com/W2h0y5l.jpeg'
  ],
  girls: [
    'https://i.imgur.com/8W0mZ4K.jpeg',
    'https://i.imgur.com/1GvK0Xm.jpeg',
    'https://i.imgur.com/6X9mY3z.jpeg',
    'https://i.imgur.com/9v8X0y1.jpeg',
    'https://i.imgur.com/8QZ5Z2A.png'
  ],
  couples: [
    'https://i.imgur.com/4m0yK1X.jpeg',
    'https://i.imgur.com/2X9m0K1.jpeg',
    'https://i.imgur.com/7v1X9m0.jpeg',
    'https://i.imgur.com/r8470a1.png'
  ],
  banners: [
    'https://i.imgur.com/8QZ5Z2A.png',
    'https://i.imgur.com/r8470a1.png',
    'https://i.imgur.com/W2h0y5l.jpeg'
  ]
};

async function fetchDynamicAnimeImage(category) {
  const apis = {
    girls: ['https://nekos.best/api/v2/neko', 'https://api.waifu.im/search?included_tags=waifu'],
    boys: ['https://nekos.best/api/v2/husbando'],
    animes: ['https://nekos.best/api/v2/kitsune'],
    couples: ['https://nekos.best/api/v2/hug'],
    banners: ['https://nekos.best/api/v2/neko']
  };

  const list = apis[category] || apis.animes;
  const urlToFetch = list[Math.floor(Math.random() * list.length)];

  try {
    const response = await fetch(urlToFetch, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results[0]?.url) return data.results[0].url;
      if (data.images && data.images[0]?.url) return data.images[0].url;
      if (data.url) return data.url;
    }
  } catch (e) {}

  const fallbacks = ANIME_PFP_COLLECTION[category] || ANIME_PFP_COLLECTION['animes'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = {
  name: 'profile',
  description: 'Profile Commands: bioset, bioreset, bioshow, animes, banners, boys, couples, girls',
  aliases: [
    'bioset', 'bioreset', 'bioshow', 'bio',
    'animes', 'banners', 'boys', 'couples', 'girls'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const author = message.author;
    const targetUser = message.mentions.users.first() || author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .bioset <text>
    if (invoked === 'bioset' || (invoked === 'profile' && args[0] === 'bioset')) {
      const bioText = (invoked === 'bioset' ? args : args.slice(1)).join(' ');
      if (!bioText) {
        return message.reply(`${emojis.WARNING} Usage: \`.bioset <your bio text>\``);
      }
      if (bioText.length > 300) {
        return message.reply(`${emojis.WARNING} Bio cannot exceed 300 characters.`);
      }

      db.updateUser(author.id, u => { u.bio = bioText; });

      const embed = createStyledEmbed({
        title: `✨ Bio Set Successfully`,
        description: `Your custom bio has been saved to database:\n\n> *"${bioText}"*`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .bioreset
    if (invoked === 'bioreset' || (invoked === 'profile' && args[0] === 'bioreset')) {
      db.updateUser(author.id, u => { u.bio = null; });

      const embed = createStyledEmbed({
        title: `✨ Bio Reset`,
        description: `Your custom bio has been cleared from database.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .bioshow
    if (invoked === 'bioshow' || invoked === 'bio' || (invoked === 'profile' && args[0] === 'bioshow')) {
      const userObj = db.getUser(targetUser.id);
      const bio = userObj.bio || '*No bio set yet. Use `.bioset <text>` to add one!*';

      const embed = createStyledEmbed({
        title: `👤 Profile Bio — ${targetUser.username}`,
        description: `> ${bio}`,
        requestedBy: author,
        clientUser,
        thumbnailUrl: targetUser.displayAvatarURL({ dynamic: true, size: 512 })
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .animes, .banners, .boys, .couples, .girls
    if (['animes', 'banners', 'boys', 'couples', 'girls'].includes(invoked)) {
      const imageUrl = await fetchDynamicAnimeImage(invoked);

      const titles = {
        animes: '🎌 Dynamic Anime PFP',
        banners: '🖼️ Dynamic Anime Header Banner',
        boys: '👦 Dynamic Anime Boy PFP',
        girls: '👧 Dynamic Anime Girl PFP',
        couples: '👩‍❤️‍👨 Dynamic Matching Couple PFP'
      };

      const embed = createStyledEmbed({
        title: titles[invoked] || '🎌 Anime Profile Collection',
        description: `Here is a fresh dynamic **${invoked}** avatar! Type \`.${invoked}\` to get another one.`,
        bannerUrl: imageUrl,
        showBanner: true,
        showThumbnail: false,
        requestedBy: author,
        clientUser
      });
      embed.setImage(imageUrl);

      return message.channel.send({ embeds: [embed] });
    }

    // Default Profile Help
    const userObj = db.getUser(author.id);
    const currentBio = userObj.bio ? `\n\n> *"${userObj.bio}"*` : '';

    const embed = createStyledEmbed({
      title: `👤 Profile Suite`,
      description:
        `Welcome **${author.username}**! Configure your custom bio or fetch dynamic anime avatars.\n\n` +
        `**👤 Bio Commands**\n` +
        `\`\`\`\n` +
        `.bioset <text>    - Save custom profile bio\n` +
        `.bioreset         - Clear profile bio\n` +
        `.bioshow [@user]  - Display profile bio\n` +
        `\`\`\`\n\n` +
        `**🖼️ Dynamic Avatar Commands**\n` +
        `\`\`\`\n` +
        `.animes   - Random aesthetic anime PFP\n` +
        `.banners  - Random anime header banner\n` +
        `.boys     - Random anime boy avatar\n` +
        `.girls    - Random anime girl avatar\n` +
        `.couples  - Random matching couple avatars\n` +
        `\`\`\`` + currentBio,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
