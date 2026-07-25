const { EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getLavalink } = require('../utils/lavalink');
const https = require('https');
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function fetchLyrics(query, artist = '') {
  const cleanTitle = query
    .replace(/\(Official Video\)/gi, '')
    .replace(/\[Official Music Video\]/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\[.*\]/g, '')
    .trim();

  const searchQuery = artist ? `${artist} ${cleanTitle}`.trim() : cleanTitle;

  // Provider 1: LRCLIB API (Best coverage for Bollywood, Punjabi, Pop & Anime)
  try {
    const encoded = encodeURIComponent(searchQuery);
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

  // Provider 2: Lyrist API
  try {
    const encoded = encodeURIComponent(searchQuery);
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

  // Provider 3: Popcat API
  try {
    const encoded = encodeURIComponent(searchQuery);
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

  // Provider 4: SomeRandomAPI Lyrics
  try {
    const encoded = encodeURIComponent(searchQuery);
    const data = await fetchJson(`https://some-random-api.com/lyrics?title=${encoded}`);
    if (data && data.lyrics) {
      return {
        title: data.title || cleanTitle,
        artist: data.author || artist || 'Artist',
        lyrics: data.lyrics,
        image: data.thumbnail?.genius
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
      return searchingMsg.edit(`❌ **Lyrics Not Found**: Could not find lyrics for **${query}**.`);
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
      title: `📜 Lyrics — ${res.title}`,
      subtitle: `Artist: ${res.artist}`,
      description: lyricsText,
      requestedBy: author,
      clientUser
    });

    if (res.image) embed.setThumbnail(res.image);

    return searchingMsg.edit({ content: `✅ Lyrics found!`, embeds: [embed] });
  },

  fetchLyrics
};
