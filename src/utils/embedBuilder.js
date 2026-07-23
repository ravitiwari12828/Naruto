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
  return str.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '⚡').trim();
}

/**
 * Creates a Discord Embed styled with custom server emojis, bot avatar & Developer Portal banner.
 */
function createStyledEmbed({
  title = 'Naruto Help Menu',
  subtitle = '',
  description = '',
  fields = [],
  requestedBy = null,
  clientUser = null,
  footerText = '',
  showBanner = true,
  showThumbnail = true,
  bannerUrl = null,
  thumbnailUrl = null,
  color = ACCENT_COLOR
}) {
  let botUserObj = clientUser || (requestedBy && requestedBy.client ? requestedBy.client.user : null);
  let clientRef = (botUserObj && botUserObj.client) ? botUserObj.client : (requestedBy ? requestedBy.client : null);

  let botIcon = thumbnailUrl;
  if (!botIcon && botUserObj && botUserObj.displayAvatarURL) {
    botIcon = botUserObj.displayAvatarURL({ dynamic: true, size: 512 });
  }

  const embed = new EmbedBuilder().setColor(color);

  const cleanTitle = stripCustomEmojis(title);
  if (botIcon) {
    embed.setAuthor({ name: cleanTitle, iconURL: botIcon });
    if (showThumbnail) {
      embed.setThumbnail(botIcon);
    }
  } else {
    embed.setAuthor({ name: cleanTitle });
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

    // 1. Try stored client.botBannerURL (fetched on ready event from Discord Developer Portal)
    if (!targetBanner && clientRef && clientRef.botBannerURL) {
      targetBanner = clientRef.botBannerURL;
    }

    // 2. Try direct bannerURL() method if available
    if (!targetBanner && botUserObj && typeof botUserObj.bannerURL === 'function') {
      targetBanner = botUserObj.bannerURL({ dynamic: true, size: 1024 });
    }

    // Set Developer Portal Banner URL if available
    if (targetBanner) {
      embed.setImage(targetBanner);
    }
  }

  if (requestedBy) {
    const rawFooter = footerText 
      ? `Requested by ${requestedBy.tag || requestedBy.username} • ${footerText}`
      : `Requested by ${requestedBy.tag || requestedBy.username}`;
    
    embed.setFooter({
      text: stripCustomEmojis(rawFooter),
      iconURL: requestedBy.displayAvatarURL ? requestedBy.displayAvatarURL({ dynamic: true }) : undefined
    });
  } else if (footerText) {
    embed.setFooter({ text: stripCustomEmojis(footerText) });
  }

  return embed;
}

/**
 * Formats command tags into code block pills like: `cmd1`, `cmd2`, `cmd3`
 */
function formatCodePills(commands = []) {
  return commands.map(cmd => `\`${cmd}\``).join(', ');
}

module.exports = {
  createStyledEmbed,
  formatCodePills,
  getBannerFiles,
  ACCENT_COLOR
};
