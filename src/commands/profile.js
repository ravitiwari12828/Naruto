const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

// Anime Aesthetic Profile Pictures and Banners Galleries (Fallbacks)
const ANIME_PFP_COLLECTION = {
  animes: [
    'https://i.pinimg.com/564x/49/71/61/49716183015f3484f29a0076a084c8a2.jpg',
    'https://i.pinimg.com/564x/5a/88/ef/5a88ef3914a1e944747201c1bcbbbc62.jpg',
    'https://i.pinimg.com/564x/6c/13/21/6c13217bcaeeed6649f8728d8b948b8b.jpg',
    'https://i.pinimg.com/564x/0f/50/66/0f50669b3df9bbba2ff666060c4fb3ee.jpg',
    'https://i.pinimg.com/564x/12/34/56/1234567890abcdef.jpg'
  ],
  boys: [
    'https://i.pinimg.com/564x/8e/32/79/8e3279188e7f1bf509aa009c9103fbdf.jpg',
    'https://i.pinimg.com/564x/1a/bc/47/1abc47ef8d9101f379201a4efc8c19eb.jpg',
    'https://i.pinimg.com/564x/39/10/7c/39107ca61a6c429388df6c1032cfdb84.jpg'
  ],
  girls: [
    'https://i.pinimg.com/564x/a4/09/a4/a409a4732104ff477d9c66bc289b52a1.jpg',
    'https://i.pinimg.com/564x/f7/32/bf/f732bfe8f9abf7bb5d70ab3d7d7b3720.jpg',
    'https://i.pinimg.com/564x/44/22/02/4422026e6d19ca78aaee43dfef0b9bb8.jpg'
  ],
  couples: [
    'https://i.pinimg.com/564x/6b/68/74/6b68748dfae37976e5d0f622b720cd09.jpg',
    'https://i.pinimg.com/564x/4b/32/7c/4b327c10b42f2bf8f8c8dcfbcf1823bb.jpg'
  ],
  banners: [
    'https://i.imgur.com/8QZ5Z2A.png',
    'https://i.imgur.com/r8470a1.png'
  ]
};

async function fetchDynamicAnimeImage(category) {
  const apis = {
    girls: [
      'https://api.waifu.pics/sfw/waifu',
      'https://nekos.best/api/v2/neko',
      'https://api.waifu.pics/sfw/neko'
    ],
    boys: [
      'https://nekos.best/api/v2/husbando'
    ],
    animes: [
      'https://api.waifu.pics/sfw/shinobu',
      'https://nekos.best/api/v2/kitsune',
      'https://api.waifu.pics/sfw/megumin'
    ],
    couples: [
      'https://api.waifu.pics/sfw/cuddle',
      'https://api.waifu.pics/sfw/hug',
      'https://nekos.best/api/v2/hug'
    ],
    banners: [
      'https://api.waifu.pics/sfw/waifu',
      'https://nekos.best/api/v2/neko'
    ]
  };

  const list = apis[category] || apis.animes;
  const urlToFetch = list[Math.floor(Math.random() * list.length)];

  try {
    const response = await fetch(urlToFetch, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      if (data.url) return data.url;
      if (data.results && data.results[0]?.url) return data.results[0].url;
      if (data.images && data.images[0]?.url) return data.images[0].url;
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
        description: `Here is a fresh dynamic **${invoked}** image fetched live! Type \`.${invoked}\` to get another one.`,
        bannerUrl: imageUrl,
        showBanner: true,
        requestedBy: author,
        clientUser
      });
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
