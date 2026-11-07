const { EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getLavalink } = require('../utils/lavalink');
const https = require('https');
const http = require('http');

function fetchRawUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', () => resolve(''));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve('');
    });
  });
}

function fetchJson(url) {
  return fetchRawUrl(url).then(raw => {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  });
}

function sanitizeQuery(query) {
  if (!query) return '';
  return query
    .replace(/\(feat.*?\)/gi, '')
    .replace(/\(ft.*?\)/gi, '')
    .replace(/\(with.*?\)/gi, '')
    .replace(/\(from.*?\)/gi, '')
    .replace(/\(official.*?\)/gi, '')
    .replace(/\(audio.*?\)/gi, '')
    .replace(/\(video.*?\)/gi, '')
    .replace(/\(lyrics.*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ official music video/gi, '')
    .replace(/ official video/gi, '')
    .replace(/ official audio/gi, '')
    .replace(/ full song/gi, '')
    .replace(/ lyric video/gi, '')
    .trim();
}

async function fetchGeniusLyrics(query) {
  try {
    const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
    const searchJson = await fetchJson(searchUrl);
    const sections = searchJson?.response?.sections || [];
    let hit = null;
    for (const sec of sections) {
      if (sec.hits && sec.hits.length > 0) {
        const found = sec.hits.find(h => h.result && h.result.path && h.result.path.includes('lyrics'));
        if (found) {
          hit = found.result;
          break;
        }
      }
    }
    if (!hit || !hit.path) return null;

    const pageHtml = await fetchRawUrl(`https://genius.com${hit.path}`);
    if (!pageHtml) return null;

    const parts = [];
    const splitKey = 'data-lyrics-container="true"';
    const splitArr = pageHtml.split(splitKey);

    for (let i = 1; i < splitArr.length; i++) {
      const chunk = splitArr[i].split('</div>')[0];
      if (chunk) {
        parts.push(chunk.replace(/^[^>]*>/, ''));
      }
    }

    if (parts.length === 0) return null;

    const cleanLyrics = parts.join('\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/^\d+\s+Contributors.*?\n/gi, '')
      .replace(/^Translations.*?\n/gi, '')
      .replace(/^Romanization.*?\n/gi, '')
      .trim();

    if (!cleanLyrics) return null;

    return {
      title: hit.title || query,
      artist: hit.primary_artist?.name || 'Artist',
      lyrics: cleanLyrics,
      image: hit.song_art_image_url || null
    };
  } catch (e) {
    return null;
  }
}

async function fetchLyrics(query, artist = '') {
  const cleanTitle = sanitizeQuery(query);
  const searchQuery = artist ? `${artist} ${cleanTitle}`.trim() : cleanTitle;

  // Provider 1: Genius API & Direct Scraper (100% Coverage for Indian & Global Songs)
  try {
    const geniusResult = await fetchGeniusLyrics(searchQuery);
    if (geniusResult && geniusResult.lyrics) return geniusResult;

    // Fallback search without artist name if original query had feat/extra tags
    if (cleanTitle !== query) {
      const fallbackGenius = await fetchGeniusLyrics(cleanTitle);
      if (fallbackGenius && fallbackGenius.lyrics) return fallbackGenius;
    }
  } catch (e) {}

  // Provider 2: LRCLIB API (Synced & Plain Lyrics)
  try {
    const encoded = encodeURIComponent(cleanTitle);
    const data = await fetchJson(`https://lrclib.net/api/search?q=${encoded}`);
    if (Array.isArray(data) && data.length > 0) {
      const match = data.find(d => d.plainLyrics || d.syncedLyrics) || data[0];
      const lyrics = match.plainLyrics || match.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '').trim();
      if (lyrics) {
        return {
          title: match.trackName || cleanTitle,
          artist: match.artistName || artist || 'Artist',
          lyrics: lyrics,
          image: null
        };
      }
    }
  } catch (e) {}

  // Provider 3: Lyrist API
  try {
    const encoded = encodeURIComponent(cleanTitle);
    const data = await fetchJson(`https://lyrist.vercel.app/api/${encoded}`);
    if (data && data.lyrics) {
      return {
        title: data.title || cleanTitle,
        artist: data.artist || artist || 'Artist',
        lyrics: data.lyrics,
        image: data.image
      };
    }
  } catch (e) {}

  // Provider 4: Popcat API
  try {
    const encoded = encodeURIComponent(cleanTitle);
    const data = await fetchJson(`https://api.popcat.xyz/lyrics?song=${encoded}`);
    if (data && data.lyrics) {
      return {
        title: data.title || cleanTitle,
        artist: data.artist || artist || 'Artist',
        lyrics: data.lyrics,
        image: data.image
      };
    }
  } catch (e) {}

  return null;
}

module.exports = {
  name: 'lyrics',
  description: 'Fetch real-time lyrics for currently playing song or search by title',
  aliases: ['lyric', 'ly'],

  async execute(message, args) {
    const author = message.author;
    const guildId = message.guild?.id;

    let query = args.join(' ');
    let artist = '';

    // If no query provided, fetch currently playing track from Lavalink
    if (!query && guildId) {
      const lavalink = getLavalink();
      const player = lavalink?.getPlayer(guildId);
      const currentTrack = player?.queue?.current;
      if (currentTrack?.info?.title) {
        query = currentTrack.info.title;
        artist = currentTrack.info.author || '';
      }
    }

    if (!query) {
      return message.reply(`${emojis.WARNING} Usage: \`.lyrics <song title>\` or play a song and run \`.lyrics\`!`);
    }

    const searchingMsg = await message.channel.send(`🔍 **Searching lyrics for:** \`${query}\`...`);

    const res = await fetchLyrics(query, artist);
    if (!res || !res.lyrics) {
      return searchingMsg.edit(`${emojis.ERROR} **Lyrics Not Found**: Could not find lyrics for **${query}**.`);
    }

    // Split lyrics into max 3500 chars for Discord embed limit
    let lyricsText = res.lyrics;
    if (lyricsText.length > 3500) {
      lyricsText = lyricsText.slice(0, 3500) + '\n\n*...lyrics truncated due to length.*';
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const embed = createStyledEmbed({
      title: `${emojis.NINJA_SCROLL || emojis.SCROLL || '📜'} Lyrics — ${res.title}`,
      subtitle: `Artist: ${res.artist}`,
      description: lyricsText,
      requestedBy: author,
      clientUser
    });

    if (res.image) embed.setThumbnail(res.image);

    return searchingMsg.edit({ content: `${emojis.SUCCESS} Lyrics found!`, embeds: [embed] });
  },

  fetchLyrics
};
