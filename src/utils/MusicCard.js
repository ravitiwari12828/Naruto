/**
 * MusicCard.js - Naruto One Bot
 * Canvas-based music player card renderer
 * Ported from synn project (original by Synn) — adapted to CommonJS for Naruto bot
 * Uses @napi-rs/canvas for high-performance canvas rendering
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { join } = require('path');

let _fontsReady = false;

class MusicCard {
  constructor() {
    if (!_fontsReady) this.registerFonts();
  }

  registerFonts() {
    try {
      const fontPaths = [
        join(process.cwd(), 'src', 'fonts'),
        join(process.cwd(), 'fonts'),
        join(process.cwd(), 'assets', 'fonts'),
        join(__dirname, '..', 'fonts'),
      ];

      let fontsRegistered = false;

      for (const fontPath of fontPaths) {
        try {
          GlobalFonts.registerFromPath(join(fontPath, 'NotoSansJP-Bold.ttf'), 'Noto Sans JP Bold');
          GlobalFonts.registerFromPath(join(fontPath, 'NotoSansJP-Regular.ttf'), 'Noto Sans JP');
          GlobalFonts.registerFromPath(join(fontPath, 'Inter-Bold.ttf'), 'Inter Bold');
          GlobalFonts.registerFromPath(join(fontPath, 'Inter-SemiBold.ttf'), 'Inter SemiBold');
          GlobalFonts.registerFromPath(join(fontPath, 'Inter-Medium.ttf'), 'Inter Medium');
          GlobalFonts.registerFromPath(join(fontPath, 'Inter-Regular.ttf'), 'Inter');

          console.log(`[MusicCard] Fonts registered from: ${fontPath}`);
          fontsRegistered = true;
          _fontsReady = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!fontsRegistered) {
        console.warn('[MusicCard] Could not register custom fonts. Using system defaults.');
      }
    } catch (e) {
      console.error('[MusicCard] Font registration error:', e);
    }
  }

  createFrostedGlass(ctx, x, y, width, height, radius = 15) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.clip();

    ctx.fillStyle = 'rgba(20, 25, 40, 0.4)';
    ctx.fillRect(x, y, width, height);

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(100, 120, 160, ${0.05 - i * 0.015})`;
      ctx.filter = `blur(${2 + i}px)`;
      ctx.fillRect(x - 10, y - 10, width + 20, height + 20);
    }
    ctx.filter = 'none';

    const innerGlow = ctx.createRadialGradient(
      x + width / 2, y + height / 2, 0,
      x + width / 2, y + height / 2, Math.max(width, height) / 2
    );
    innerGlow.addColorStop(0, 'rgba(180, 200, 220, 0.08)');
    innerGlow.addColorStop(1, 'rgba(180, 200, 220, 0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = 'rgba(180, 200, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();

    ctx.restore();
  }

  createFrostSnowflake(ctx, x, y, size, opacity = 0.3) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = `rgba(200, 220, 240, ${opacity * 0.4})`;
    ctx.shadowBlur = size * 0.8;
    ctx.fillStyle = `rgba(220, 230, 250, ${opacity})`;
    ctx.strokeStyle = `rgba(200, 220, 240, ${opacity * 0.8})`;
    ctx.lineWidth = size * 0.05;

    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(-size * 0.15, -size * 0.55);
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(size * 0.15, -size * 0.55);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -size, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(240, 245, 255, ${opacity})`;
    ctx.fill();

    ctx.restore();
  }

  createSnowflakeDecorations(ctx, width, height) {
    ctx.save();
    // Large snowflakes
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 20 + Math.random() * 15;
      const opacity = 0.1 + Math.random() * 0.15;
      this.createFrostSnowflake(ctx, x, y, size, opacity);
    }
    // Medium snowflakes
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 10 + Math.random() * 10;
      const opacity = 0.15 + Math.random() * 0.2;
      this.createFrostSnowflake(ctx, x, y, size, opacity);
    }
    // Tiny snow particles
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 1 + Math.random() * 2;
      ctx.fillStyle = `rgba(220, 230, 250, ${0.2 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  createFrostText(ctx, text, x, y, fontSize, fontFamily, isTitle = false) {
    ctx.save();
    ctx.font = `${fontSize}px "${fontFamily}"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(text, x + 1, y + 1);

    if (isTitle) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(200, 220, 240, 0.4)';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = '#e0e8f0';
    }

    ctx.fillText(text, x, y);
    ctx.restore();
  }

  createFrostedProgressBar(ctx, x, y, width, height, progress) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(30, 40, 60, 0.3)';
    ctx.fillRect(x, y, width, height);

    for (let i = 0; i < 2; i++) {
      ctx.filter = `blur(${3 + i * 2}px)`;
      ctx.fillStyle = `rgba(100, 130, 180, ${0.1 - i * 0.04})`;
      ctx.fillRect(x - 5, y - 5, width + 10, height + 10);
    }
    ctx.filter = 'none';

    const innerHighlight = ctx.createLinearGradient(x, y, x, y + height);
    innerHighlight.addColorStop(0, 'rgba(200, 220, 240, 0.2)');
    innerHighlight.addColorStop(0.5, 'rgba(200, 220, 240, 0.05)');
    innerHighlight.addColorStop(1, 'rgba(200, 220, 240, 0.1)');
    ctx.fillStyle = innerHighlight;
    ctx.fillRect(x, y, width, height);

    if (progress > 0) {
      const progressWidth = width * progress;

      const progressGradient = ctx.createLinearGradient(x, y, x + progressWidth, y);
      progressGradient.addColorStop(0, 'rgba(100, 180, 255, 0.7)');
      progressGradient.addColorStop(0.5, 'rgba(120, 190, 255, 0.8)');
      progressGradient.addColorStop(1, 'rgba(140, 200, 255, 0.7)');
      ctx.fillStyle = progressGradient;
      ctx.fillRect(x, y, progressWidth, height);

      const shine = ctx.createLinearGradient(x, y, x, y + height);
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      shine.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shine;
      ctx.fillRect(x, y, progressWidth, height);
    }

    ctx.restore();

    // Border stroke
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.stroke();

    // Thumb dot
    if (progress > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(140, 200, 255, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + width * progress, y + height / 2, height / 2 + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(140, 200, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x + width * progress, y + height / 2, height / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  async drawArtwork(ctx, artworkUrl, x, y, size) {
    ctx.save();
    try {
      if (artworkUrl) {
        const artwork = await loadImage(artworkUrl);

        ctx.shadowColor = 'rgba(140, 180, 220, 0.3)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(100, 140, 180, 0.1)';
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 18);
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 18);
        ctx.clip();
        ctx.drawImage(artwork, x, y, size, size);

        const frostOverlay = ctx.createRadialGradient(
          x + size * 0.5, y + size * 0.5, 0,
          x + size * 0.5, y + size * 0.5, size * 0.7
        );
        frostOverlay.addColorStop(0, 'rgba(220, 230, 250, 0)');
        frostOverlay.addColorStop(0.7, 'rgba(180, 200, 220, 0.05)');
        frostOverlay.addColorStop(1, 'rgba(140, 180, 220, 0.1)');
        ctx.fillStyle = frostOverlay;
        ctx.fillRect(x, y, size, size);
      } else {
        throw new Error('No artwork URL');
      }
    } catch (e) {
      // Fallback: frosted glass with snowflake
      this.createFrostedGlass(ctx, x, y, size, size, 18);
      this.createFrostSnowflake(ctx, x + size / 2, y + size / 2, 35, 0.6);
    }
    ctx.restore();

    // Artwork border
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, size + 2, size + 2, 19);
    ctx.stroke();
    ctx.restore();
  }

  truncateText(ctx, text, maxWidth, font, ellipsis = '...') {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + ellipsis;
  }

  formatDuration(ms) {
    if (ms === null || ms === undefined || ms < 0) return '0:00';
    const seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((ms / (1000 * 60)) % 60).toString();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours > 0) return `${hours}:${minutes.padStart(2, '0')}:${seconds}`;
    return `${minutes}:${seconds}`;
  }

  /**
   * Main entry: creates a full 800x780 frosted-glass music card PNG buffer
   * @param {object} opts
   * @param {string} opts.title - Track title
   * @param {string} opts.artist - Track artist / author
   * @param {string} opts.artworkUrl - Thumbnail image URL
   * @param {number} opts.position - Current playback position in ms
   * @param {number} opts.duration - Total track duration in ms
   * @param {string} opts.source - Source platform (youtube, spotify, etc.)
   * @param {boolean} opts.isLive - Whether the track is a livestream
   * @param {string} opts.requester - User requester tag
   * @returns {Promise<Buffer>} PNG image buffer
   */
  async createMusicCard(opts = {}) {
    const {
      title = 'Unknown Title',
      artist = 'Unknown Artist',
      artworkUrl = null,
      position = 0,
      duration = 0,
      source = 'Spotify',
      isLive = false,
      requester = 'Synn'
    } = opts;

    const width = 800;
    const height = 480;
    const cx = width / 2;
    const thumbSize = 240;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- Background Base (Dark Obsidian + Neon Orange Border) ---
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 28);
    ctx.fillStyle = '#0c0f18';
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(4, 4, width - 8, height - 8, 24);
    ctx.fillStyle = 'rgba(20, 26, 40, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#FF7800';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top Gloss Reflection
    const refGrad = ctx.createLinearGradient(0, 0, width, 100);
    refGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    refGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = refGrad;
    ctx.fillRect(4, 4, width - 8, 90);
    ctx.restore();

    // --- 1. Top Metadata Header Row ---
    ctx.save();
    ctx.font = '15px "Inter Medium", sans-serif';
    ctx.fillStyle = '#a0b0c0';
    ctx.textAlign = 'left';
    ctx.fillText('👤 Author:', 48, 32);
    ctx.fillText('🔊 Volume:', cx - 40, 32);
    ctx.fillText('🌐 Duration:', width - 160, 32);

    ctx.font = 'bold 18px "Inter Bold", sans-serif';
    ctx.fillStyle = '#ffffff';
    const reqText = this.truncateText(ctx, requester, 180, 'bold 18px "Inter Bold"');
    ctx.fillText(reqText, 48, 56);

    ctx.fillStyle = '#1ee064';
    ctx.fillText('100%', cx - 40, 56);

    ctx.fillStyle = '#00dcff';
    const totalTimeStr = isLive ? 'LIVE' : this.formatDuration(duration);
    ctx.fillText(totalTimeStr, width - 160, 56);

    // Separator line
    ctx.strokeStyle = 'rgba(255, 120, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(32, 72);
    ctx.lineTo(width - 32, 72);
    ctx.stroke();
    ctx.restore();

    // --- 2. Large Centered Album Artwork Slot (Hero Thumbnail Box) ---
    const artX = cx - thumbSize / 2;
    const artY = 86;

    ctx.save();
    ctx.strokeStyle = '#FF7800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(artX - 4, artY - 4, thumbSize + 8, thumbSize + 8, 22);
    ctx.stroke();

    await this.drawArtwork(ctx, artworkUrl, artX, artY, thumbSize);

    ctx.strokeStyle = 'rgba(0, 220, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(artX - 1, artY - 1, thumbSize + 2, thumbSize + 2, 19);
    ctx.stroke();
    ctx.restore();

    // --- 3. Song Title & Artist (Centered below Artwork with proper margin) ---
    const titleY = artY + thumbSize + 24; // y = 350
    ctx.save();
    const displayTitle = this.truncateText(ctx, `${title} — ${artist}`, width - 100, 'bold 22px "Inter Bold"');
    ctx.font = 'bold 22px "Inter Bold", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayTitle, cx, titleY);
    ctx.restore();

    // --- 4. Dynamic Equalizer Frequency Bars (Below Title with clear margin) ---
    const eqY = titleY + 34; // y = 384
    ctx.save();
    ctx.fillStyle = '#00dcff';
    for (let b = 0; b < 22; b++) {
      const bx = cx - 154 + b * 14;
      const bh = Math.max(4, Math.floor(12 + 10 * Math.sin((position / 1000) * 2 + b * 0.5)));
      ctx.beginPath();
      ctx.roundRect(bx, eqY - bh, 6, bh, 2);
      ctx.fill();
    }
    ctx.restore();

    // --- 5. Progress Timeline & Scrubber Bar ---
    const barX1 = 80;
    const barY = eqY + 20; // y = 404
    const barW = width - 160;
    const barX2 = barX1 + barW;

    const progress = isLive ? 1 : (duration > 0 ? Math.min(position / duration, 1) : 0);
    const fillW = Math.floor(barW * progress);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX1, barY, barW, 8, 4);
    ctx.fillStyle = 'rgba(40, 50, 70, 0.8)';
    ctx.fill();

    if (fillW > 0) {
      ctx.beginPath();
      ctx.roundRect(barX1, barY, fillW, 8, 4);
      ctx.fillStyle = '#00dcff';
      ctx.fill();
    }

    // Scrubber Knob
    const knobX = barX1 + fillW;
    ctx.shadowColor = 'rgba(0, 220, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(knobX, barY + 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Timestamps
    const currentTimeStr = this.formatDuration(position);
    ctx.save();
    ctx.font = '14px "Inter Medium", sans-serif';
    ctx.fillStyle = '#00dcff';
    ctx.textAlign = 'left';
    ctx.fillText(currentTimeStr, barX1, barY + 30);

    ctx.fillStyle = '#a0b0c0';
    ctx.textAlign = 'right';
    ctx.fillText(totalTimeStr, barX2, barY + 30);
    ctx.restore();

    return canvas.toBuffer('image/png');
  }
}

module.exports = MusicCard;
