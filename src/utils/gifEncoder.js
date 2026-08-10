const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

/**
 * Minimal & Ultra-Fast Pure JS GIF Encoder for Canvas Frames
 */
class SimpleGIFEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
    this.delay = 100; // ms per frame
  }

  setDelay(ms) {
    this.delay = ms;
  }

  addFrame(ctx) {
    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    this.frames.push(Buffer.from(imgData.data));
  }

  // Encodes canvas frames into a animated GIF buffer
  finish() {
    // Basic GIF header & logical screen descriptor
    const header = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      this.width & 0xFF, (this.width >> 8) & 0xFF,
      this.height & 0xFF, (this.height >> 8) & 0xFF,
      0xF7, // Global Color Table (256 colors)
      0x00, 0x00
    ]);

    // Build Global Palette (256 colors) from frame colors or standard web palette
    const palette = Buffer.alloc(768);
    for (let i = 0; i < 256; i++) {
      palette[i * 3] = i;       // R
      palette[i * 3 + 1] = i;   // G
      palette[i * 3 + 2] = i;   // B
    }

    // Netscape Application Extension for Looping
    const loopExt = Buffer.from([
      0x21, 0xFF, 0x0B, 0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00
    ]);

    const parts = [header, palette, loopExt];

    const delayHundredths = Math.round(this.delay / 10);

    for (let f = 0; f < this.frames.length; f++) {
      const frameBuf = this.frames[f];

      // Graphic Control Extension
      const gce = Buffer.from([
        0x21, 0xF9, 0x04,
        0x04, // Disposal method: restore to background
        delayHundredths & 0xFF, (delayHundredths >> 8) & 0xFF,
        0x00, // Transparent color index
        0x00
      ]);

      // Image Descriptor
      const imgDesc = Buffer.from([
        0x2C,
        0x00, 0x00, 0x00, 0x00, // Left, Top
        this.width & 0xFF, (this.width >> 8) & 0xFF,
        this.height & 0xFF, (this.height >> 8) & 0xFF,
        0x00 // Local color table flag
      ]);

      // Simple LZW Uncompressed / Indexed Data Block
      const pixels = new Uint8Array(this.width * this.height);
      for (let i = 0; i < pixels.length; i++) {
        const r = frameBuf[i * 4];
        const g = frameBuf[i * 4 + 1];
        const b = frameBuf[i * 4 + 2];
        // Convert RGB to 256 grayscale/palette index
        pixels[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }

      // LZW Minimum Code Size = 8
      const lzwData = [];
      lzwData.push(0x08);

      let subBlock = [0x80]; // Clear code
      for (let i = 0; i < pixels.length; i++) {
        subBlock.push(pixels[i]);
        if (subBlock.length === 254) {
          lzwData.push(subBlock.length);
          lzwData.push(...subBlock);
          subBlock = [];
        }
      }
      if (subBlock.length > 0) {
        lzwData.push(subBlock.length);
        lzwData.push(...subBlock);
      }
      lzwData.push(0x01, 0x81); // End code
      lzwData.push(0x00); // Block terminator

      parts.push(gce, imgDesc, Buffer.from(lzwData));
    }

    // GIF Trailer
    parts.push(Buffer.from([0x3B]));

    return Buffer.concat(parts);
  }
}

module.exports = SimpleGIFEncoder;
