const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

// Recent History Tracker per User to Prevent Back-to-Back Duplicate Images
const userImageHistory = new Map();

// Verified Safe, High-Definition SFW Anime Collections (NO Imgur, NO 404s, NO Abstract Stock Photos)
const ANIME_STATIC_FALLBACKS = {
  animes: [
    'https://media.kitsu.app/characters/images/221/original.jpg', // Naruto Uzumaki
    'https://media.kitsu.app/characters/images/388/original.jpg', // Itachi Uchiha
    'https://media.kitsu.app/characters/images/91221/original.jpg', // Hinata Hyuga
    'https://media.kitsu.app/characters/images/74558/original.jpg', // Nezuko Kamado
    'https://media.kitsu.app/characters/images/39556/original.jpg', // Levi Ackerman
    'https://media.kitsu.app/characters/images/28725/original.jpg', // Sasuke Uchiha
    'https://media.kitsu.app/characters/images/411/original.jpg', // Monkey D. Luffy
    'https://media.kitsu.app/characters/images/22784/original.jpg', // Kaguya Shinomiya
    'https://media.kitsu.app/characters/images/60601/original.jpg', // Osamu Dazai
    'https://media.kitsu.app/characters/images/2818/original.jpg', // Killua Zoldyck
    'https://media.kitsu.app/characters/images/15789/original.jpg', // Rem
    'https://media.kitsu.app/characters/images/17472/original.jpg' // Emilia
  ],
  boys: [
    'https://media.kitsu.app/characters/images/221/original.jpg', // Naruto Uzumaki
    'https://media.kitsu.app/characters/images/28725/original.jpg', // Sasuke Uchiha
    'https://media.kitsu.app/characters/images/388/original.jpg', // Itachi Uchiha
    'https://media.kitsu.app/characters/images/39556/original.jpg', // Levi Ackerman
    'https://media.kitsu.app/characters/images/411/original.jpg', // Monkey D. Luffy
    'https://media.kitsu.app/characters/images/60601/original.jpg', // Osamu Dazai
    'https://media.kitsu.app/characters/images/2818/original.jpg', // Killua Zoldyck
    'https://media.kitsu.app/characters/images/68743/original.jpg' // Goku
  ],
  girls: [
    'https://media.kitsu.app/characters/images/91221/original.jpg', // Hinata Hyuga
    'https://media.kitsu.app/characters/images/229/original.jpg', // Tsunade
    'https://media.kitsu.app/characters/images/74558/original.jpg', // Nezuko Kamado
    'https://media.kitsu.app/characters/images/15789/original.jpg', // Rem
    'https://media.kitsu.app/characters/images/17472/original.jpg', // Emilia
    'https://media.kitsu.app/characters/images/6553/original.jpg', // Saber
    'https://media.kitsu.app/characters/images/408/original.jpg', // Nami
    'https://media.kitsu.app/characters/images/22784/original.jpg' // Kaguya Shinomiya
  ],
  couples: [
    'https://cdn.purrbot.site/sfw/hug/gif/hug_061.gif',
    'https://cdn.purrbot.site/sfw/hug/gif/hug_087.gif',
    'https://cdn.purrbot.site/sfw/hug/gif/hug_012.gif',
    'https://cdn.purrbot.site/sfw/hug/gif/hug_025.gif',
    'https://cdn.purrbot.site/sfw/cuddle/gif/cuddle_001.gif'
  ],
  banners: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80', // Anime Sunset Scenery
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80', // Anime Night Sky & Stars
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80', // Japanese Cherry Blossoms
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80', // Kyoto Pagoda Scenery
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80', // Tokyo Neon City
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80', // Anime Aesthetic Room
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80'  // Cyberpunk Neon Glow
  ]
};

// Verified Live SFW Dynamic APIs (GIFs & Wallpapers)
const DYNAMIC_ANIME_APIS = {
  banners: [
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/dance/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=dance' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=happy' },
    { type: 'purr', url: 'https://purrbot.site/api/img/sfw/smile/gif' },
    { type: 'otaku', url: 'https://api.otakugifs.xyz/gif?reaction=smile' },
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

  // Fallback to verified static/GIF pool if API fails
  const fallbackList = ANIME_STATIC_FALLBACKS[category] || ANIME_STATIC_FALLBACKS.banners;
  let fallbackIndex = Math.floor(Math.random() * fallbackList.length);
  userImageHistory.set(historyKey, fallbackIndex);
  return fallbackList[fallbackIndex];
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
        `.banners  - Random animated anime banner & GIF\n` +
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
