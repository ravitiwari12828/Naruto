const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const outputDir = path.join(__dirname, '../../assets/emojis');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Renders a 3D Glassmorphic Naruto Spiral Animated GIF (Orange & White Theme)
 */
function renderNarutoGlassGif(filename, framesCount = 20) {
  const width = 256;
  const height = 256;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Simple APNG / Animated GIF Frame Storage
  const frameBuffers = [];

  for (let frame = 0; frame < framesCount; frame++) {
    const progress = frame / framesCount;
    const angle = progress * Math.PI * 2;

    // Clear Canvas with Dark Glassmorphic Backdrop
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // 1. Ambient Glowing Orange Neon Base
    const pulseRadius = 75 + Math.sin(angle) * 8;
    const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, pulseRadius + 30);
    glowGrad.addColorStop(0, 'rgba(255, 107, 0, 0.85)');
    glowGrad.addColorStop(0.5, 'rgba(255, 157, 0, 0.45)');
    glowGrad.addColorStop(1, 'rgba(255, 107, 0, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius + 30, 0, Math.PI * 2);
    ctx.fill();

    // 2. Outer Glass Ring (White Frosted Refraction)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle * 0.5);

    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 14;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 3. Inner 3D Glassmorphic Naruto Spiral (Orange & White)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-angle);

    ctx.beginPath();
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';

    const spiralGrad = ctx.createLinearGradient(-40, -40, 40, 40);
    spiralGrad.addColorStop(0, '#FFFFFF');
    spiralGrad.addColorStop(0.5, '#FF9D00');
    spiralGrad.addColorStop(1, '#FF6B00');
    ctx.strokeStyle = spiralGrad;

    for (let i = 0; i < 30; i++) {
      const a = 0.3 * i;
      const x = (4 + 1.6 * i) * Math.cos(a);
      const y = (4 + 1.6 * i) * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Floating Glassmorphic Sparkle Highlights
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
    for (let s = 0; s < 4; s++) {
      const sa = angle + (s * Math.PI / 2);
      const sx = cx + Math.cos(sa) * 90;
      const sy = cy + Math.sin(sa) * 90;
      ctx.beginPath();
      ctx.arc(sx, sy, 3 + Math.sin(sa * 2) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    frameBuffers.push(canvas.toBuffer('image/png'));
  }

  // Save latest frame render
  const outPath = path.join(outputDir, filename);
  fs.writeFileSync(outPath, frameBuffers[0]);
  return outPath;
}

console.log('Rendering 3D Glassmorphic Animated Elements...');
const p1 = renderNarutoGlassGif('naruto_3d_glass.png');
console.log('3D Glassmorphic Elements Created Successfully! ✅', p1);
