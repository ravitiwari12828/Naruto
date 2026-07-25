const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

// Verified Anime Aesthetic Direct Image Collections (100% Guaranteed Render)
const ANIME_PFP_COLLECTION = {
  animes: [
    'https://cdn.nekos.life/avatar/avatar_01.png',
    'https://cdn.nekos.life/avatar/avatar_05.png',
    'https://cdn.nekos.life/avatar/avatar_10.png',
    'https://cdn.nekos.life/avatar/avatar_15.png',
    'https://cdn.nekos.life/avatar/avatar_20.png',
    'https://cdn.nekos.life/avatar/avatar_25.png',
    'https://cdn.nekos.life/avatar/avatar_30.png',
    'https://cdn.nekos.life/avatar/avatar_40.png',
    'https://cdn.nekos.life/avatar/avatar_50.png'
  ],
  boys: [
    'https://cdn.nekos.life/avatar/avatar_02.png',
    'https://cdn.nekos.life/avatar/avatar_06.png',
    'https://cdn.nekos.life/avatar/avatar_12.png',
    'https://cdn.nekos.life/avatar/avatar_18.png',
    'https://cdn.nekos.life/avatar/avatar_24.png',
    'https://cdn.nekos.life/avatar/avatar_36.png'
  ],
  girls: [
    'https://cdn.nekos.life/neko/neko046.png',
    'https://cdn.nekos.life/neko/neko202.jpeg',
    'https://cdn.nekos.life/avatar/avatar_03.png',
    'https://cdn.nekos.life/avatar/avatar_07.png',
    'https://cdn.nekos.life/avatar/avatar_11.png',
    'https://cdn.nekos.life/avatar/avatar_21.png'
  ],
  couples: [
    'https://cdn.nekos.life/avatar/avatar_08.png',
    'https://cdn.nekos.life/avatar/avatar_16.png',
    'https://cdn.nekos.life/avatar/avatar_32.png',
    'https://cdn.nekos.life/avatar/avatar_48.png'
  ],
  banners: [
    'https://cdn.nekos.life/wallpaper/sSlML-mWFXA.jpg',
    'https://cdn.nekos.life/wallpaper/kAw8QHl_wbM.jpg'
  ]
};

async function fetchDynamicAnimeImage(category) {
  const apis = {
    girls: [
      'https://nekos.life/api/v2/img/neko',
      'https://nekos.life/api/v2/img/fox_girl',
      'https://nekos.life/api/v2/img/waifu'
    ],
    boys: [
      'https://nekos.life/api/v2/img/avatar'
    ],
    animes: [
      'https://nekos.life/api/v2/img/avatar',
      'https://nekos.life/api/v2/img/fox_girl',
      'https://nekos.life/api/v2/img/neko'
    ],
    couples: [
      'https://api.otakugifs.xyz/gif?reaction=hug',
      'https://purrbot.site/api/img/sfw/hug/gif',
      'https://kawaii.red/api/gif/hug/token=anonymous/'
    ],
    banners: [
      'https://nekos.life/api/v2/img/wallpaper'
    ]
  };

  const list = apis[category] || apis.animes;
  const urlToFetch = list[Math.floor(Math.random() * list.length)];

  try {
    const response = await fetch(urlToFetch, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000)
    });
    if (response.ok) {
      const data = await response.json();
      const imgUrl = data.url || data.link || data.response || (data.results && data.results[0]?.url) || (data.images && data.images[0]?.url);
      if (imgUrl && typeof imgUrl === 'string') return imgUrl;
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
