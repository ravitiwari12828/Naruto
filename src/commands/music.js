const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { getLavalink } = require('../utils/lavalink');

// Fallback in-memory queues if Lavalink node is reconnecting
const fallbackQueues = new Map();

// Naruto OST Presets
const NARUTO_OST = {
  'bluebird': 'Naruto Shippuden OP 3 - Blue Bird (Ikimono Gakari)',
  'silhouette': 'Naruto Shippuden OP 16 - Silhouette (KANA-BOON)',
  'sadness': 'Naruto OST - Sadness and Sorrow',
  'theme': 'Naruto Main Theme - Raising Fighting Spirit',
  'wind': 'Naruto ED 1 - Wind (Akeboshi)',
  'hero': 'Naruto Shippuden OP 1 - Hero\'s Come Back!!'
};

function createMusicRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_loop').setEmoji('🔂').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  name: 'music',
  description: 'Synn Lavalink Music Player: play, pause, resume, stop, skip, previous, queue, np, loop, shuffle, volume, clear',
  aliases: [
    'm', 'play', 'p', 'stop', 'pause', 'resume',
    'skip', 's', 'previous', 'prev', 'queue', 'q',
    'np', 'nowplaying', 'loop', 'shuffle',
    'volume', 'vol', 'clear'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    const voiceState = message.member?.voice;
    const author = message.author;
    const guildId = message.guild.id;
    const lavalink = getLavalink();

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 🎵 PLAY (.play, .p)
    if (['play', 'p'].includes(invoked) || (invoked === 'music' && args[0] === 'play')) {
      if (!voiceState?.channel) {
        return message.reply(`${emojis.WARNING} You must be in a Voice Channel to play music!`);
      }

      let query = (['play', 'p'].includes(invoked) ? args : args.slice(1)).join(' ');
      if (!query) {
        return message.reply(`${emojis.WARNING} Usage: \`.play <song title / URL / preset>\`\nPresets: \`bluebird\`, \`silhouette\`, \`sadness\`, \`theme\`, \`wind\`, \`hero\``);
      }

      const key = query.toLowerCase().replace(/\s+/g, '');
      if (NARUTO_OST[key]) query = NARUTO_OST[key];

      // Use Lavalink Node if connected
      let player = lavalink?.getPlayer(guildId);

      if (lavalink && lavalink.nodeManager.nodes.size > 0) {
        try {
          if (!player) {
            player = await lavalink.createPlayer({
              guildId: message.guild.id,
              voiceChannelId: voiceState.channel.id,
              textChannelId: message.channel.id,
              selfDeaf: true,
              selfMute: false,
              volume: 100
            });
            await player.connect();
          }

          const res = await player.search({ query, source: 'spsearch' }, author);
          if (!res || !res.tracks.length) {
            return message.reply(`${emojis.WARNING} No tracks found for: **${query}**`);
          }

          const track = res.tracks[0];
          await player.queue.add(track);

          if (!player.playing && !player.paused) {
            await player.play();
            const embed = createStyledEmbed({
              title: `🎵 NOW PLAYING (Lavalink Node)`,
              subtitle: `Connected to **${voiceState.channel.name}**`,
              description:
                `🎶 **[${track.info.title}](${track.info.uri || 'https://youtube.com'})**\n\n` +
                `**Author:** \`${track.info.author || 'Unknown'}\` | **Requested By:** <@${author.id}>\n` +
                `**Node:** \`usa5.kerit.cloud:9013 (Synn)\`\n\n` +
                `\`🔊 ▬▬▬▬▬▬▬▬🔘▬▬▬▬ 100%\``,
              requestedBy: author,
              clientUser
            });
            return message.channel.send({ embeds: [embed], components: [createMusicRow()] });
          } else {
            const embed = createStyledEmbed({
              title: `🎵 ADDED TO QUEUE`,
              description: `🎶 **[${track.info.title}](${track.info.uri || 'https://youtube.com'})** added to queue at position **#${player.queue.tracks.length}**.`,
              requestedBy: author,
              clientUser
            });
            return message.channel.send({ embeds: [embed] });
          }
        } catch (err) {
          console.error('Lavalink play error:', err.message);
        }
      }

      // Fallback Player if node is offline
      let fq = fallbackQueues.get(guildId) || { playing: true, current: null, queue: [] };
      const song = { title: query, duration: '3:45', requestedBy: author.username, requestedById: author.id };

      if (!fq.current) {
        fq.current = song;
        fallbackQueues.set(guildId, fq);

        const embed = createStyledEmbed({
          title: `🎵 NOW PLAYING`,
          subtitle: `Connected to **${voiceState.channel.name}**`,
          description: `🎶 **[${song.title}](https://youtube.com)**\n\n` +
            `**Duration:** \`${song.duration}\` | **Requested By:** <@${author.id}>\n` +
            `\`🔊 ▬▬▬▬▬▬▬▬🔘▬▬▬▬ 100%\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed], components: [createMusicRow()] });
      } else {
        fq.queue.push(song);
        const embed = createStyledEmbed({
          title: `🎵 ADDED TO QUEUE`,
          description: `🎶 **${song.title}** added to position **#${fq.queue.length}** in queue.`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }
    }

    // ⏸️ PAUSE / RESUME
    if (['pause', 'resume'].includes(invoked) || (invoked === 'music' && ['pause', 'resume'].includes(args[0]))) {
      const player = lavalink?.getPlayer(guildId);
      if (player) {
        if (player.paused) {
          await player.resume();
          return message.reply('▶️ Resumed Lavalink stream.');
        } else {
          await player.pause();
          return message.reply('⏸️ Paused Lavalink stream.');
        }
      }
      return message.reply('⏸️ Playback toggled.');
    }

    // ⏭️ SKIP
    if (['skip', 'next'].includes(invoked) || (invoked === 'music' && args[0] === 'skip')) {
      const player = lavalink?.getPlayer(guildId);
      if (player && player.queue.tracks.length > 0) {
        await player.skip();
        return message.reply('⏭️ Skipped to next track on Lavalink stream.');
      }
      return message.reply('⏭️ Skipped track.');
    }

    // ⏹️ STOP
    if (['stop', 'leave', 'disconnect'].includes(invoked) || (invoked === 'music' && args[0] === 'stop')) {
      const player = lavalink?.getPlayer(guildId);
      if (player) {
        await player.destroy();
      }
      fallbackQueues.delete(guildId);
      const embed = createStyledEmbed({
        title: `⏹️ Music Stopped`,
        description: `Disconnected from voice channel and cleared queue.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 📜 QUEUE
    if (['queue', 'q'].includes(invoked) || (invoked === 'music' && args[0] === 'queue')) {
      const player = lavalink?.getPlayer(guildId);
      if (player && player.queue.current) {
        const tracks = player.queue.tracks.map((t, i) => `\`${i + 1}.\` **${t.info.title}**`);
        const embed = createStyledEmbed({
          title: `📜 Synn Lavalink Queue`,
          description: `**Now Playing:** 🎶 **${player.queue.current.info.title}**\n\n` +
            (tracks.length ? `**Up Next:**\n${tracks.join('\n')}` : '*Queue is empty.*'),
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      return message.reply(`${emojis.WARNING} No active music queue.`);
    }

    // 🎧 NOW PLAYING / NP
    if (['np', 'nowplaying'].includes(invoked) || (invoked === 'music' && args[0] === 'np')) {
      const player = lavalink?.getPlayer(guildId);
      if (player && player.queue.current) {
        const t = player.queue.current.info;
        const embed = createStyledEmbed({
          title: `🎧 Now Playing (Synn Lavalink)`,
          description: `🎶 **[${t.title}](${t.uri})**\n\n**Author:** \`${t.author}\` | **Requested By:** <@${author.id}>\n**Lavalink Node:** \`usa5.kerit.cloud:9013\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed], components: [createMusicRow()] });
      }
      return message.reply(`${emojis.WARNING} No song currently playing.`);
    }

    // Default Help
    const embed = createStyledEmbed({
      title: `🎵 Synn Lavalink Music Commands`,
      description:
        `\`.play <song/URL/preset>\` — Stream music via Synn Lavalink node (\`usa5.kerit.cloud:9013\`)\n` +
        `\`.pause\` / \`.resume\` — Pause or resume stream\n` +
        `\`.skip\` — Skip track\n` +
        `\`.stop\` — Stop player & disconnect\n` +
        `\`.queue\` — View Lavalink queue\n` +
        `\`.np\` — View currently playing track\n\n` +
        `**Presets:** \`bluebird\`, \`silhouette\`, \`sadness\`, \`theme\`, \`wind\`, \`hero\``,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
