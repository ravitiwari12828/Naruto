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
  /**
   * Main entry: creates a full 800x360 sleek music card PNG buffer
   * Left Thumbnail + Right Song Details with spacious volume padding
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

    // 16 Dynamic Gradient Color Themes
    const DYNAMIC_PALETTES = [
      { name: 'Sunset Chakra', main: '#ff7800', sec: '#ec4899', accent: '#8b5cf6' },
      { name: 'Neon Cyberpunk', main: '#06b6d4', sec: '#a855f7', accent: '#3b82f6' },
      { name: 'Emerald Shinobi', main: '#10b981', sec: '#14b8a6', accent: '#06b6d4' },
      { name: 'Crimson Kyuubi', main: '#ef4444', sec: '#f59e0b', accent: '#9333ea' },
      { name: 'Cosmic Lavender', main: '#6366f1', sec: '#a855f7', accent: '#f43f5e' },
      { name: 'Golden Sage', main: '#f59e0b', sec: '#eab308', accent: '#ea580c' },
      { name: 'Hyper Neon Magenta', main: '#ff007f', sec: '#ff4500', accent: '#7b2cbf' },
      { name: 'Oceanic Rasengan', main: '#1d4ed8', sec: '#06b6d4', accent: '#34d399' },
      { name: 'Midnight Amaterasu', main: '#0f172a', sec: '#4338ca', accent: '#c084fc' },
      { name: 'Sakura Blossom', main: '#f472b6', sec: '#e11d48', accent: '#fbbf24' },
      { name: 'Raijin Lightning', main: '#facc15', sec: '#22d3ee', accent: '#2563eb' },
      { name: 'Toxic Venom Green', main: '#84cc16', sec: '#22c55e', accent: '#065f46' },
      { name: 'Solar Flare', main: '#dc2626', sec: '#f97316', accent: '#facc15' },
      { name: 'Astral Nebula', main: '#581c87', sec: '#d946ef', accent: '#38bdf8' },
      { name: 'Velvet Midnight', main: '#7e22ce', sec: '#881337', accent: '#d97706' },
      { name: 'Frozen Frost Glaze', main: '#38bdf8', sec: '#2dd4bf', accent: '#e2e8f0' }
    ];

    // Pick Palette deterministically based on track title string hash
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    const palIdx = Math.abs(hash) % DYNAMIC_PALETTES.length;
    const palette = DYNAMIC_PALETTES[palIdx];

    const width = 800;
    const height = 360;
    const thumbSize = 220;
    const artX = 42;
    const artY = 96;

    const infoX = artX + thumbSize + 32;
    const rightW = width - infoX - 42;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- Background Base (Dark Obsidian + Dynamic Gradient Border) ---
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 28);
    ctx.fillStyle = '#0a0c16';
    ctx.fill();

    // Background Gradient Glow Orbs
    const orbGrad1 = ctx.createRadialGradient(100, 100, 10, 100, 100, 300);
    orbGrad1.addColorStop(0, palette.main + '40');
    orbGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad1;
    ctx.fillRect(0, 0, width, height);

    const orbGrad2 = ctx.createRadialGradient(width - 100, height - 100, 10, width - 100, height - 100, 300);
    orbGrad2.addColorStop(0, palette.sec + '40');
    orbGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad2;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.roundRect(4, 4, width - 8, height - 8, 24);
    ctx.fillStyle = 'rgba(18, 22, 36, 0.92)';
    ctx.fill();

    // Linear Gradient Border
    const borderGrad = ctx.createLinearGradient(0, 0, width, height);
    borderGrad.addColorStop(0, palette.main);
    borderGrad.addColorStop(0.5, palette.sec);
    borderGrad.addColorStop(1, palette.accent);
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Top Gloss Reflection
    const refGrad = ctx.createLinearGradient(0, 0, width, 90);
    refGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    refGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = refGrad;
    ctx.fillRect(4, 4, width - 8, 80);
    ctx.restore();

    // --- 1. Top Metadata Header Row ---
    ctx.save();
    ctx.font = '15px "Inter Medium", sans-serif';
    ctx.fillStyle = '#a0b0c0';
    ctx.textAlign = 'left';
    ctx.fillText('👤 Author:', 48, 30);
    ctx.fillText('🔊 Volume:', width / 2 - 40, 30);
    ctx.fillText('🌐 Duration:', width - 160, 30);

    ctx.font = 'bold 17px "Inter Bold", sans-serif';
    ctx.fillStyle = '#ffffff';
    const reqText = this.truncateText(ctx, requester, 180, 'bold 17px "Inter Bold"');
    ctx.fillText(reqText, 48, 54);

    ctx.fillStyle = palette.main;
    ctx.fillText('100%', width / 2 - 40, 54);

    ctx.fillStyle = palette.sec;
    const totalTimeStr = isLive ? 'LIVE' : this.formatDuration(duration);
    ctx.fillText(totalTimeStr, width - 160, 54);

    // Separator line with Gradient
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(32, 68);
    ctx.lineTo(width - 32, 68);
    ctx.stroke();
    ctx.restore();

    // --- 2. Left Side Album Artwork Box (220x220px) ---
    ctx.save();
    ctx.strokeStyle = palette.main;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(artX - 5, artY - 5, thumbSize + 10, thumbSize + 10, 22);
    ctx.stroke();

    await this.drawArtwork(ctx, artworkUrl, artX, artY, thumbSize);

    ctx.strokeStyle = palette.sec;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(artX - 1, artY - 1, thumbSize + 2, thumbSize + 2, 19);
    ctx.stroke();
    ctx.restore();

    // --- 3. Right Side Song Title & Artist Description ---
    ctx.save();
    const displayTitle = this.truncateText(ctx, title, rightW, 'bold 22px "Inter Bold"');
    ctx.font = 'bold 22px "Inter Bold", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(displayTitle, infoX, artY + 8);

    const displayArtist = this.truncateText(ctx, artist, rightW, '16px "Inter Medium"');
    ctx.font = '16px "Inter Medium", sans-serif';
    ctx.fillStyle = '#a0b0c0';
    ctx.fillText(displayArtist, infoX, artY + 42);
    ctx.restore();

    // --- 4. Right Side Dynamic Equalizer Frequency Bars ---
    const eqY = artY + 110;
    ctx.save();
    const eqGrad = ctx.createLinearGradient(infoX, 0, infoX + rightW, 0);
    eqGrad.addColorStop(0, palette.main);
    eqGrad.addColorStop(1, palette.sec);
    ctx.fillStyle = eqGrad;

    for (let b = 0; b < 22; b++) {
      const bx = infoX + b * 13;
      const bh = Math.max(4, Math.floor(10 + 9 * Math.sin((position / 1000) * 2 + b * 0.5)));
      ctx.beginPath();
      ctx.roundRect(bx, eqY - bh, 5, bh, 2);
      ctx.fill();
    }
    ctx.restore();

    // --- 5. Right Side Progress Timeline & Scrubber Bar ---
    const barY = eqY + 24;
    const progress = isLive ? 1 : (duration > 0 ? Math.min(position / duration, 1) : 0);
    const fillW = Math.floor(rightW * progress);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(infoX, barY, rightW, 8, 4);
    ctx.fillStyle = 'rgba(40, 50, 70, 0.8)';
    ctx.fill();

    if (fillW > 0) {
      const pGrad = ctx.createLinearGradient(infoX, barY, infoX + fillW, barY);
      pGrad.addColorStop(0, palette.main);
      pGrad.addColorStop(1, palette.sec);
      ctx.beginPath();
      ctx.roundRect(infoX, barY, fillW, 8, 4);
      ctx.fillStyle = pGrad;
      ctx.fill();
    }

    // Scrubber Knob
    const knobX = infoX + fillW;
    ctx.shadowColor = palette.sec;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(knobX, barY + 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Timestamps
    const currentTimeStr = this.formatDuration(position);
    ctx.save();
    ctx.font = '14px "Inter Medium", sans-serif';
    ctx.fillStyle = palette.main;
    ctx.textAlign = 'left';
    ctx.fillText(currentTimeStr, infoX, barY + 28);

    ctx.fillStyle = '#a0b0c0';
    ctx.textAlign = 'right';
    ctx.fillText(totalTimeStr, infoX + rightW, barY + 28);
    ctx.restore();

    return canvas.toBuffer('image/png');
  }
}

module.exports = MusicCard;
