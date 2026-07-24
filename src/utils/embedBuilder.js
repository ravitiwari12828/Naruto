const { EmbedBuilder } = require('discord.js');

const ACCENT_COLOR = process.env.DEFAULT_EMBED_COLOR || 0x00E5FF;

function getBannerFiles() {
  return [];
}

/**
 * Strips raw custom emoji tags `<:name:id>` from plain-text areas (Author & Footer) where Discord API doesn't render custom emojis.
 */
function stripCustomEmojis(str) {
  if (!str) return str;
  return str.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').trim();
}

/**
 * Creates a Discord Embed styled with custom server emojis, bot avatar & Developer Portal banner.
 * Matches exact Image 2 aesthetic design across all panels!
 */
function createStyledEmbed({
  title = 'Naruto Module Panel',
  authorName = 'Naruto Module Panel',
  subtitle = '',
  description = '',
  fields = [],
  requestedBy = null,
  clientUser = null,
  footerText = '',
  showBanner = false,
  showThumbnail = true,
  bannerUrl = null,
  thumbnailUrl = null,
  color = ACCENT_COLOR
}) {
  let botUserObj = clientUser || (requestedBy && requestedBy.client ? requestedBy.client.user : null);
  let clientRef = (botUserObj && botUserObj.client) ? botUserObj.client : (requestedBy ? requestedBy.client : null);

  let botIcon = (botUserObj && typeof botUserObj.displayAvatarURL === 'function')
    ? botUserObj.displayAvatarURL({ dynamic: true, size: 512 })
    : null;

  const embed = new EmbedBuilder().setColor(color);

  // Author header: plain text author name + BOT avatar
  const cleanAuthor = stripCustomEmojis(authorName);
  if (botIcon) {
    embed.setAuthor({ name: cleanAuthor, iconURL: botIcon });
  } else {
    embed.setAuthor({ name: cleanAuthor });
  }

  // Thumbnail header: always show BOT avatar (unless custom thumbnailUrl explicitly specified)
  const finalThumbnail = thumbnailUrl || botIcon;
  if (showThumbnail && finalThumbnail) {
    embed.setThumbnail(finalThumbnail);
  }

  // Title: Supports full custom 3D emojis!
  if (title) {
    embed.setTitle(title);
  }

  let fullDesc = '';
  if (subtitle) {
    fullDesc += `### ${subtitle}\n\n`;
  }
  if (description) {
    fullDesc += `${description}\n`;
  }

  if (fullDesc) {
    embed.setDescription(fullDesc);
  }

  if (fields.length > 0) {
    fields.forEach(f => {
      embed.addFields({ name: f.name, value: f.value, inline: f.inline || false });
    });
  }

  if (showBanner) {
    let targetBanner = bannerUrl;

    if (!targetBanner && clientRef && clientRef.botBannerURL) {
      targetBanner = clientRef.botBannerURL;
    }

    if (!targetBanner && botUserObj && typeof botUserObj.bannerURL === 'function') {
      targetBanner = botUserObj.bannerURL({ dynamic: true, size: 1024 });
    }

    if (targetBanner) {
      embed.setImage(targetBanner);
    }
  }

  if (requestedBy) {
    const rawFooter = footerText 
      ? `Requested by ${requestedBy.tag || requestedBy.username} • ${footerText}`
      : `Requested by ${requestedBy.tag || requestedBy.username}`;
    
    const userAvatar = (typeof requestedBy.displayAvatarURL === 'function')
      ? requestedBy.displayAvatarURL({ dynamic: true, size: 128 })
      : null;

    if (userAvatar) {
      embed.setFooter({ text: stripCustomEmojis(rawFooter), iconURL: userAvatar });
    } else {
      embed.setFooter({ text: stripCustomEmojis(rawFooter) });
    }
  } else if (footerText) {
    embed.setFooter({ text: stripCustomEmojis(footerText) });
  }

  embed.setTimestamp();
  return embed;
}

module.exports = {
  createStyledEmbed,
  getBannerFiles,
  stripCustomEmojis
};
