const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Register fonts
let fontsReady = false;
function initFonts() {
  if (fontsReady) return;
  try {
    const fontDir = path.join(__dirname, '..', 'fonts');
    const fonts = [
      { file: 'Inter-Bold.ttf', family: 'Inter Bold' },
      { file: 'Inter-SemiBold.ttf', family: 'Inter SemiBold' },
      { file: 'Inter-Medium.ttf', family: 'Inter Medium' },
      { file: 'Inter-Regular.ttf', family: 'Inter' }
    ];
    for (const f of fonts) {
      const fullPath = path.join(fontDir, f.file);
      if (fs.existsSync(fullPath)) {
        GlobalFonts.registerFromPath(fullPath, f.family);
      }
    }
    fontsReady = true;
  } catch (e) {}
}

initFonts();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

const hex2rgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

async function renderPingCard({
  botName = 'Naruto',
  avatarUrl = null,
  gatewayPing = 16,
  restPing = 87,
  dbPing = 1,
  lavalinkPing = 33,
  uptimeStr = '1d 0h 11m',
  serverCount = '4',
  memberCount = '2,450',
  nodeStatus = 'Online'
}) {
  const width = 1000;
  const height = 560;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Outer container clipping
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.clip();

  // 1. Background
  let bgLoaded = false;
  const possibleBgs = [
    path.join(__dirname, '..', 'assets', 'ping_bg.png'),
    path.join(__dirname, '..', '..', 'assets', 'ping_bg.png'),
    path.join(__dirname, '..', '..', 'assets', 'ping_bg.jpg'),
    path.join(__dirname, '..', 'assets', 'economy_suite_banner.jpg')
  ];

  for (const bgPath of possibleBgs) {
    if (fs.existsSync(bgPath)) {
      try {
        const bgImg = await loadImage(bgPath);
        ctx.save();
        ctx.filter = 'blur(7px)';
        // Draw slightly larger to avoid edge artifacts from blur
        ctx.drawImage(bgImg, -20, -20, width + 40, height + 40);
        ctx.restore();
        bgLoaded = true;
        break;
      } catch (e) {}
    }
  }

  if (!bgLoaded) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0c0f17');
    bgGrad.addColorStop(0.5, '#151922');
    bgGrad.addColorStop(1, '#0a0d14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Dark translucent overlay for crisp contrast
  ctx.fillStyle = 'rgba(10, 13, 20, 0.82)';
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient glow
  const glow = ctx.createRadialGradient(250, 100, 10, 250, 100, 400);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 1, 1, width - 2, height - 2, 24);
  ctx.stroke();

  // 2. Header
  // Avatar
  const avatarX = 35;
  const avatarY = 32;
  const avatarSize = 44;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let avatarLoaded = false;
  if (avatarUrl) {
    try {
      const aImg = await loadImage(avatarUrl);
      ctx.drawImage(aImg, avatarX, avatarY, avatarSize, avatarSize);
      avatarLoaded = true;
    } catch (e) {}
  }
  if (!avatarLoaded) {
    const botAvatarPath = path.join(__dirname, '..', '..', 'assets', 'naruto_one_bot_avatar.png');
    if (fs.existsSync(botAvatarPath)) {
      try {
        const bImg = await loadImage(botAvatarPath);
        ctx.drawImage(bImg, avatarX, avatarY, avatarSize, avatarSize);
        avatarLoaded = true;
      } catch (e) {}
    }
  }
  if (!avatarLoaded) {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Inter Bold", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(botName.charAt(0), avatarX + avatarSize / 2, avatarY + 30);
  }
  ctx.restore();

  // Avatar ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Bot Title & Subtitle
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px "Inter Bold", Inter, sans-serif';
  ctx.fillText(botName, 92, 51);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px "Inter SemiBold", Inter, sans-serif';
  ctx.fillText('LIVE SYSTEM MONITOR', 92, 67);

  // Live badge
  const liveX = 890;
  const liveY = 36;
  ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
  roundRect(ctx, liveX, liveY, 75, 30, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(liveX + 16, liveY + 15, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 12px "Inter Bold", Inter, sans-serif';
  ctx.fillText('LIVE', liveX + 27, liveY + 19);

  // 3. Main Title Section
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Inter Bold", Inter, sans-serif';
  ctx.fillText('Real-time Latency Report', 35, 126);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px "Inter", Inter, sans-serif';
  ctx.fillText('Everything the bot is measuring, right now.', 35, 149);

  // 4. The 4 Metric Cards
  const cardData = [
    {
      title: 'GATEWAY',
      value: `${gatewayPing}ms`,
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.12)',
      icon: 'wifi',
      points: [0.35, 0.85, 0.45, 0.6, 0.52, 0.55, 0.62, 0.45]
    },
    {
      title: 'RESPONSE',
      value: `${restPing}ms`,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      icon: 'chat',
      points: [0.65, 0.4, 0.75, 0.45, 0.55, 0.7, 0.3, 0.6]
    },
    {
      title: 'DATABASE',
      value: `${dbPing}ms`,
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.12)',
      icon: 'database',
      points: [0.5, 0.7, 0.8, 0.35, 0.55, 0.45, 0.48, 0.3]
    },
    {
      title: 'LAVALINK',
      value: `${lavalinkPing}ms`,
      color: '#c084fc',
      bgColor: 'rgba(192, 132, 252, 0.12)',
      icon: 'server',
      points: [0.8, 0.25, 0.45, 0.7, 0.75, 0.72, 0.68, 0.35]
    }
  ];

  const cardY = 175;
  const cardW = 219;
  const cardH = 232;
  const cardGap = 18;
  const startX = 35;

  for (let i = 0; i < 4; i++) {
    const c = cardData[i];
    const cX = startX + i * (cardW + cardGap);

    // Card background
    ctx.fillStyle = 'rgba(20, 24, 33, 0.75)';
    roundRect(ctx, cX, cardY, cardW, cardH, 16);
    ctx.fill();

    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top icon circle
    const iconCenterX = cX + 40;
    const iconCenterY = cardY + 38;
    const iconR = 17;
    ctx.fillStyle = c.bgColor;
    ctx.beginPath();
    ctx.arc(iconCenterX, iconCenterY, iconR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw Vector Icon
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (c.icon === 'wifi') {
      ctx.beginPath();
      ctx.arc(iconCenterX, iconCenterY + 4, 10, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(iconCenterX, iconCenterY + 4, 6, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(iconCenterX, iconCenterY + 3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.icon === 'chat') {
      ctx.beginPath();
      roundRect(ctx, iconCenterX - 8, iconCenterY - 7, 16, 11, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(iconCenterX - 3, iconCenterY + 4);
      ctx.lineTo(iconCenterX - 6, iconCenterY + 7);
      ctx.lineTo(iconCenterX, iconCenterY + 4);
      ctx.stroke();
    } else if (c.icon === 'database') {
      const dw = 14;
      const dh = 5;
      for (let d = -4; d <= 4; d += 4) {
        ctx.beginPath();
        ctx.ellipse(iconCenterX, iconCenterY + d, dw / 2, dh / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (c.icon === 'server') {
      roundRect(ctx, iconCenterX - 8, iconCenterY - 7, 16, 14, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(iconCenterX - 8, iconCenterY);
      ctx.lineTo(iconCenterX + 8, iconCenterY);
      ctx.stroke();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(iconCenterX - 4, iconCenterY - 3.5, 1.5, 0, Math.PI * 2);
      ctx.arc(iconCenterX - 4, iconCenterY + 3.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Metric Label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Inter Bold", Inter, sans-serif';
    ctx.fillText(c.title, cX + 22, cardY + 84);

    // Big Latency Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Inter Bold", Inter, sans-serif';
    ctx.fillText(c.value, cX + 20, cardY + 125);

    // Sparkline Graph
    const graphX = cX + 20;
    const graphW = cardW - 40;
    const graphY = cardY + 142;
    const graphH = 34;

    const coords = c.points.map((pt, idx) => {
      const px = graphX + (idx / (c.points.length - 1)) * graphW;
      const py = graphY + graphH - pt * graphH;
      return { x: px, y: py };
    });

    // Area Fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, graphY + graphH);
    for (const pt of coords) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(coords[coords.length - 1].x, graphY + graphH);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, graphY, 0, graphY + graphH);
    fillGrad.addColorStop(0, hex2rgba(c.color, 0.28));
    fillGrad.addColorStop(1, hex2rgba(c.color, 0.0));
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let j = 1; j < coords.length; j++) {
      ctx.lineTo(coords[j].x, coords[j].y);
    }
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Node dots
    for (const pt of coords) {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Health pill at bottom
    const valNum = parseInt(c.value) || 0;
    const isHealthy = valNum < 300;
    const pillX = cX + 20;
    const pillY = cardY + 192;
    ctx.fillStyle = isHealthy ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    roundRect(ctx, pillX, pillY, 78, 24, 12);
    ctx.fill();
    ctx.strokeStyle = isHealthy ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isHealthy ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(pillX + 13, pillY + 12, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isHealthy ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 10px "Inter Bold", Inter, sans-serif';
    ctx.fillText(isHealthy ? 'HEALTHY' : 'SLOW', pillX + 22, pillY + 16);
  }

  // 5. Bottom Info Bar
  const barX = 35;
  const barY = 428;
  const barW = 930;
  const barH = 96;

  ctx.fillStyle = 'rgba(20, 24, 33, 0.65)';
  roundRect(ctx, barX, barY, barW, barH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const cols = [
    { label: 'UPTIME', val: uptimeStr, dotColor: '#f97316' },
    { label: 'SERVERS', val: serverCount, dotColor: '#f97316' },
    { label: 'MEMBERS', val: memberCount, dotColor: '#f97316' },
    { label: 'NODE STATUS', val: nodeStatus, dotColor: '#22c55e' }
  ];

  const colW = barW / 4;
  for (let i = 0; i < 4; i++) {
    const colCenterX = barX + i * colW + colW / 2;
    const col = cols[i];

    ctx.textAlign = 'center';

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "Inter Bold", Inter, sans-serif';
    ctx.fillText(col.label, colCenterX, barY + 30);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Inter Bold", Inter, sans-serif';
    ctx.fillText(col.val, colCenterX, barY + 58);

    // Small Accent Dot
    ctx.fillStyle = col.dotColor;
    ctx.beginPath();
    ctx.arc(colCenterX, barY + 74, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderPingCard
};
