const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Recent History Tracker per User to Prevent Back-to-Back Duplicate Images
const userImageHistory = new Map();

// Verified Safe, High-Definition SFW Anime Collections
const ANIME_STATIC_FALLBACKS = {
  animes: [
    'https://media.kitsu.app/characters/images/221/original.jpg',
    'https://media.kitsu.app/characters/images/388/original.jpg',
    'https://media.kitsu.app/characters/images/91221/original.jpg',
    'https://media.kitsu.app/characters/images/74558/original.jpg',
    'https://media.kitsu.app/characters/images/39556/original.jpg',
    'https://media.kitsu.app/characters/images/28725/original.jpg',
    'https://media.kitsu.app/characters/images/411/original.jpg',
    'https://media.kitsu.app/characters/images/22784/original.jpg',
    'https://media.kitsu.app/characters/images/60601/original.jpg',
    'https://media.kitsu.app/characters/images/2818/original.jpg',
    'https://media.kitsu.app/characters/images/15789/original.jpg',
    'https://media.kitsu.app/characters/images/17472/original.jpg'
  ],
  boys: [
    'https://media.kitsu.app/characters/images/221/original.jpg',
    'https://media.kitsu.app/characters/images/28725/original.jpg',
    'https://media.kitsu.app/characters/images/388/original.jpg',
    'https://media.kitsu.app/characters/images/39556/original.jpg',
    'https://media.kitsu.app/characters/images/411/original.jpg',
    'https://media.kitsu.app/characters/images/60601/original.jpg',
    'https://media.kitsu.app/characters/images/2818/original.jpg',
    'https://media.kitsu.app/characters/images/68743/original.jpg'
  ],
  girls: [
    'https://media.kitsu.app/characters/images/91221/original.jpg',
    'https://media.kitsu.app/characters/images/229/original.jpg',
    'https://media.kitsu.app/characters/images/74558/original.jpg',
    'https://media.kitsu.app/characters/images/15789/original.jpg',
    'https://media.kitsu.app/characters/images/17472/original.jpg',
    'https://media.kitsu.app/characters/images/6553/original.jpg',
    'https://media.kitsu.app/characters/images/408/original.jpg',
    'https://media.kitsu.app/characters/images/22784/original.jpg'
  ],
  couples: [
    'https://cdn.purrbot.site/sfw/hug/gif/hug_061.gif',
    'https://cdn.purrbot.site/sfw/hug/gif/hug_087.gif',
    'https://cdn.purrbot.site/sfw/hug/gif/hug_012.gif',
    'https://cdn.purrbot.site/sfw/hug/gif/hug_025.gif',
    'https://cdn.purrbot.site/sfw/cuddle/gif/cuddle_001.gif'
  ],
  banners: [
    'https://cdn.purrbot.site/sfw/dance/gif/dance_001.gif',
    'https://cdn.purrbot.site/sfw/smile/gif/smile_001.gif',
    'https://cdn.purrbot.site/sfw/happy/gif/happy_001.gif'
  ]
};

const DYNAMIC_ANIME_APIS = {
  banners: [
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/dance/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=dance' },
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/hug/gif' }
  ],
  animes: [
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=happy' },
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/smile/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=dance' }
  ],
  couples: [
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/hug/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=hug' },
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/cuddle/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=cuddle' }
  ],
  girls: [
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=blush' },
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/blush/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=wink' }
  ],
  boys: [
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=smile' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=happy' }
  ]
};

async function fetchDynamicAnimeImage(category, userId = 'default') {
  const apiList = DYNAMIC_ANIME_APIS[category] || DYNAMIC_ANIME_APIS.banners;
  const historyKey = `${userId}_${category}`;
  const lastIndex = userImageHistory.get(historyKey);

  let attempts = 0;
  while (attempts < apiList.length) {
    let nextIndex = Math.floor(Math.random() * apiList.length);
    if (apiList.length > 1 && nextIndex === lastIndex) {
      nextIndex = (nextIndex + 1) % apiList.length;
    }

    const apiItem = apiList[nextIndex];
    try {
      const res = await fetch(apiItem.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        const imgUrl = data.link || data.url || data.response;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
          userImageHistory.set(historyKey, nextIndex);
          return imgUrl;
        }
      }
    } catch (e) {}

    attempts++;
  }

  const fallbackList = ANIME_STATIC_FALLBACKS[category] || ANIME_STATIC_FALLBACKS.banners;
  let fallbackIndex = Math.floor(Math.random() * fallbackList.length);
  userImageHistory.set(historyKey, fallbackIndex);
  return fallbackList[fallbackIndex];
}

module.exports = {
  name: 'profile',
  description: 'Profile Commands: animes, banners, boys, couples, girls',
  aliases: ['animes', 'banners', 'boys', 'couples', 'girls'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .animes, .banners, .boys, .couples, .girls
    if (['animes', 'banners', 'boys', 'couples', 'girls'].includes(invoked)) {
      const imageUrl = await fetchDynamicAnimeImage(invoked, author.id);

      const titles = {
        animes: '🎌 Dynamic Anime PFP',
        banners: '🖼️ Dynamic Animated Anime Banner',
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

      return message.channel.send({ embeds: [embed] });
    }

    // Default Profile Help
    const embed = createStyledEmbed({
      title: `${emojis.RULERS_CARD || '<a:membercard_animated:1537177436146638993>'} Profile Suite`,
      description:
        `Welcome **${author.username}**! Fetch aesthetic dynamic anime avatars and banners.\n\n` +
        `**🖼️ Dynamic Avatar Commands**\n` +
        `\`\`\`\n` +
        `.animes   - Random aesthetic anime PFP\n` +
        `.banners  - Random animated anime banner & GIF\n` +
        `.boys     - Random anime boy avatar\n` +
        `.girls    - Random anime girl avatar\n` +
        `.couples  - Random matching couple avatars\n` +
        `\`\`\``,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
