/**
 * Theme-Adaptive Dynamic Button Builder Utility
 * Ensures buttons look ultra-sleek, readable, and high-contrast on both Discord Dark Theme and Light Theme!
 */

const { ButtonBuilder, ButtonStyle } = require('discord.js');
const emojis = require('./emojis');

/**
 * Creates a theme-optimized button that looks stunning on Dark & Light Discord themes.
 * @param {Object} opts
 * @param {string} opts.customId - Button custom ID
 * @param {string} opts.label - Button text label
 * @param {Object|string} [opts.emoji] - Emoji string or object
 * @param {boolean} [opts.isActive=false] - Whether this button represents the current active tab
 * @param {string} [opts.type='nav'] - 'nav' | 'action' | 'danger' | 'link'
 * @param {boolean} [opts.disabled=false] - Disabled state
 * @param {string} [opts.url] - URL if type is link
 */
function createAdaptiveButton({
  customId,
  label,
  emoji,
  isActive = false,
  type = 'nav',
  disabled = false,
  url
}) {
  const btn = new ButtonBuilder();

  if (customId) btn.setCustomId(customId);
  if (emoji) {
    try {
      btn.setEmoji(emoji);
    } catch (e) {}
  }
  if (disabled) btn.setDisabled(true);
  if (url) {
    btn.setURL(url);
    btn.setStyle(ButtonStyle.Link);
    return btn;
  }

  if (isActive) {
    // Active state: Vibrant Success Green for high-visibility contrast on both Dark and Light themes
    btn.setStyle(ButtonStyle.Success);
  } else if (type === 'danger') {
    // Danger/Close action: Crimson Red
    btn.setStyle(ButtonStyle.Danger);
  } else if (type === 'action') {
    // High-priority action: Primary Blurple
    btn.setStyle(ButtonStyle.Primary);
  } else {
    // Standard inactive navigation: Secondary Slate Grey (adapts dynamically to Dark & Light theme backgrounds in Discord)
    btn.setStyle(ButtonStyle.Secondary);
  }

  return btn;
}

module.exports = {
  createAdaptiveButton
};
