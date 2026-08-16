const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

// 🍥 Naruto Shinobi Naruto Shinobi Palette
const THEME = {
  bgDark: '#080d19',
  cardBg: '#131b2e',
  chakraBlue: '#00f0ff',
  leafGreen: '#10b981',
  nineTailsOrange: '#ff6b00',
  akatsukiRed: '#ef4444',
  gold: '#f59e0b',
  textLight: '#ffffff',
  textMuted: '#94a3b8'
};

function drawKonohaCrest(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  // Spiral swirl circle
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();

  // Spiral center dot
  ctx.beginPath();
  ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Leaf Stem Line
  ctx.beginPath();
  ctx.moveTo(x + size * 0.7, y - size * 0.7);
  ctx.lineTo(x + size * 1.4, y - size * 1.4);
  ctx.stroke();
  ctx.restore();
}

function drawAkatsukiCloud(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(x + width * 0.3, y + height * 0.5, height * 0.35, 0, Math.PI * 2);
  ctx.arc(x + width * 0.5, y + height * 0.35, height * 0.45, 0, Math.PI * 2);
  ctx.arc(x + width * 0.7, y + height * 0.5, height * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * 🍥 Naruto Crash Rocket Visual Canvas Card
 */
async function renderCrashCard({ multiplier, status, bet, payout, isCrash, isWin, username }) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // Dark Canvas Surface
  const bgGrad = ctx.createLinearGradient(0, 0, 800, 420);
  bgGrad.addColorStop(0, '#060a12');
  bgGrad.addColorStop(1, '#111827');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 420);

  // Outer Nine-Tails / Chakra Border
  ctx.strokeStyle = isCrash ? THEME.akatsukiRed : isWin ? THEME.leafGreen : THEME.chakraBlue;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 776, 396);

  // Header Banner with Konoha Crest
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 22, 750, 60);

  drawKonohaCrest(ctx, 55, 52, 16, THEME.chakraBlue);

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = THEME.chakraBlue;
  ctx.fillText('KONOHA RASENGAN ROCKET', 90, 58);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.textAlign = 'right';
  ctx.fillText(`Shinobi: ${username.slice(0, 16)}`, 755, 58);

  // Graph Canvas Area
  const graphX = 35;
  const graphY = 100;
  const graphW = 490;
  const graphH = 280;

  ctx.fillStyle = '#0b1120';
  ctx.fillRect(graphX, graphY, graphW, graphH);

  // Rasengan Chakra Orbit Trajectory Line
  const curveGrad = ctx.createLinearGradient(graphX, graphY + graphH, graphX + graphW, graphY);
  curveGrad.addColorStop(0, '#00f0ff');
  curveGrad.addColorStop(0.5, '#3b82f6');
  curveGrad.addColorStop(1, isCrash ? '#ef4444' : '#10b981');

  const endX = graphX + Math.min(graphW - 20, (multiplier / 10) * graphW + 40);
  const endY = graphY + graphH - Math.min(graphH - 30, (multiplier / 10) * graphH + 30);

  ctx.beginPath();
  ctx.moveTo(graphX + 20, graphY + graphH - 20);
  ctx.quadraticCurveTo(graphX + graphW * 0.4, graphY + graphH - 30, endX, endY);
  ctx.strokeStyle = curveGrad;
  ctx.lineWidth = 7;
  ctx.stroke();

  // Rasengan Swirl Orbs along trajectory
  ctx.beginPath();
  ctx.arc(endX, endY, 18, 0, Math.PI * 2);
  ctx.fillStyle = isCrash ? '#ef4444' : THEME.chakraBlue;
  ctx.fill();

  if (isCrash) {
    drawAkatsukiCloud(ctx, graphX + graphW - 90, graphY + 30, 65, 45);
  }

  // Multiplier Callout
  ctx.textAlign = 'center';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillStyle = isCrash ? THEME.akatsukiRed : isWin ? THEME.leafGreen : THEME.chakraBlue;
  ctx.fillText(`${multiplier.toFixed(2)}x`, graphX + graphW / 2, graphY + graphH / 2 + 10);

  // Stats Column (Right Panel)
  const panelX = 545;
  const panelY = 100;
  const panelW = 230;
  const panelH = 280;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  ctx.textAlign = 'left';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('ROCKET STATUS', panelX + 20, panelY + 40);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = isCrash ? THEME.akatsukiRed : isWin ? THEME.leafGreen : THEME.nineTailsOrange;
  ctx.fillText(isCrash ? 'CRASHED 💥' : isWin ? 'CASHOUT 💰' : 'RISING 🚀', panelX + 20, panelY + 68);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('BET AMOUNT', panelX + 20, panelY + 125);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = THEME.textLight;
  ctx.fillText(`${bet} Ryo`, panelX + 20, panelY + 152);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('PAYOUT', panelX + 20, panelY + 210);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = isWin ? THEME.leafGreen : isCrash ? THEME.akatsukiRed : THEME.chakraBlue;
  ctx.fillText(`${payout} Ryo`, panelX + 20, panelY + 238);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'naruto-crash.png' });
}

/**
 * 🍥 Naruto Plinko Plunge Visual Canvas Card
 */
async function renderPlinkoCard({ path, slotIndex, multiplier, bet, payout, isWin, username }) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, 800, 420);

  // Outer Border
  ctx.strokeStyle = THEME.leafGreen;
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 776, 396);

  // Header Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 22, 750, 50);

  drawKonohaCrest(ctx, 55, 47, 14, THEME.leafGreen);

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = THEME.leafGreen;
  ctx.fillText('CHAKRA KUNAI PLINKO BOARD', 90, 53);

  // Peg Pyramid
  const centerX = 400;
  const startY = 95;
  const rowSpacing = 36;
  const pegSpacing = 45;

  for (let r = 0; r < 6; r++) {
    const count = r + 3;
    const startX = centerX - ((count - 1) * pegSpacing) / 2;
    for (let c = 0; c < count; c++) {
      const px = startX + c * pegSpacing;
      const py = startY + r * rowSpacing;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = THEME.chakraBlue;
      ctx.fill();
    }
  }

  // Multiplier Slots
  const mults = [10.0, 3.0, 1.5, 0.5, 1.5, 3.0, 10.0];
  const slotW = 85;
  const slotY = startY + 6 * rowSpacing + 10;

  mults.forEach((m, idx) => {
    const sx = 60 + idx * 95;
    const isLanded = idx === slotIndex;

    ctx.fillStyle = isLanded ? (isWin ? THEME.leafGreen : THEME.akatsukiRed) : '#334155';
    ctx.fillRect(sx, slotY, slotW, 40);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${m}x`, sx + slotW / 2, slotY + 25);
  });

  // Footer Result Line
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 355, 750, 45);

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = isWin ? THEME.leafGreen : THEME.akatsukiRed;
  ctx.fillText(isWin ? `WINNER! Multiplier: ${multiplier}x | +${payout} Ryo` : `Landed: ${multiplier}x | Payout: ${payout} Ryo`, 45, 383);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'naruto-plinko.png' });
}

/**
 * 🍥 Naruto Blackjack Visual Felt Card
 */
async function renderBlackjackCard({ dealerCards, playerCards, dealerScore, playerScore, bet, payout, status, username }) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // Nine-Tails Felt Surface
  const tableGrad = ctx.createRadialGradient(400, 210, 50, 400, 210, 450);
  tableGrad.addColorStop(0, '#064e3b');
  tableGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = tableGrad;
  ctx.fillRect(0, 0, 800, 420);

  // Nine-Tails Orange Border
  ctx.strokeStyle = THEME.nineTailsOrange;
  ctx.lineWidth = 6;
  ctx.strokeRect(15, 15, 770, 390);

  drawKonohaCrest(ctx, 50, 45, 14, THEME.nineTailsOrange);

  // Title Banner
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('NINJA BLACKJACK 21', 80, 52);

  // Dealer Area
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`DEALER HAND (Score: ${dealerScore})`, 40, 95);

  dealerCards.forEach((c, idx) => {
    const cx = 40 + idx * 85;
    const cy = 110;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx, cy, 70, 100);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = (c.includes('♥') || c.includes('♦')) ? '#dc2626' : '#000000';
    ctx.fillText(c, cx + 15, cy + 55);
  });

  // Player Area
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${username.toUpperCase()}'S HAND (Score: ${playerScore})`, 40, 250);

  playerCards.forEach((c, idx) => {
    const cx = 40 + idx * 85;
    const cy = 265;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx, cy, 70, 100);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = (c.includes('♥') || c.includes('♦')) ? '#dc2626' : '#000000';
    ctx.fillText(c, cx + 15, cy + 55);
  });

  // Status Badge Panel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(530, 130, 230, 190);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = THEME.nineTailsOrange;
  ctx.textAlign = 'center';
  ctx.fillText(status, 645, 200);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Bet: ${bet} Ryo`, 645, 245);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'naruto-blackjack.png' });
}


/**
 * 🍥 Naruto Roulette Visual Canvas Card
 */
async function renderRouletteCard({ winningNumber, color, bet, payout, isWin, username }) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // Dark Background
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, 800, 420);

  // Outer Border
  const colorHex = color === 'RED' ? '#ef4444' : color === 'BLACK' ? '#334155' : '#10b981';
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 776, 396);

  // Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 22, 750, 50);

  drawKonohaCrest(ctx, 55, 47, 14, colorHex);

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = colorHex;
  ctx.fillText('KONOHA SHINOBI ROULETTE WHEEL', 90, 53);

  // Roulette Wheel Circle Representation
  const cx = 300;
  const cy = 230;
  const radius = 110;

  // Outer Wheel Rim
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Winning Number Central Badge
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(winningNumber), cx, cy + 18);

  // Right Side Stats Panel
  const panelX = 480;
  const panelY = 95;
  const panelW = 295;
  const panelH = 270;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  ctx.textAlign = 'left';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('WINNING SLOT', panelX + 25, panelY + 40);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = colorHex;
  ctx.fillText(`${winningNumber} (${color})`, panelX + 25, panelY + 70);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('BET AMOUNT', panelX + 25, panelY + 125);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = THEME.textLight;
  ctx.fillText(`${bet} Ryo`, panelX + 25, panelY + 152);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('PAYOUT WON', panelX + 25, panelY + 205);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = isWin ? THEME.leafGreen : THEME.akatsukiRed;
  ctx.fillText(`${payout} Ryo`, panelX + 25, panelY + 235);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'naruto-roulette.png' });
}

/**
 * 🍥 Naruto Dice Roller Visual Canvas Card
 */
async function renderDiceCard({ userRoll, dealerRoll, target, bet, payout, isWin, username }) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, 800, 420);

  ctx.strokeStyle = isWin ? THEME.leafGreen : THEME.akatsukiRed;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 776, 396);

  // Header Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 22, 750, 50);

  drawKonohaCrest(ctx, 55, 47, 14, THEME.nineTailsOrange);

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = THEME.nineTailsOrange;
  ctx.fillText('KUNAI 3D DICE ROLLER', 90, 53);

  // Dice 1 (User Roll)
  const d1X = 140;
  const d1Y = 130;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(d1X, d1Y, 140, 140);
  ctx.strokeStyle = THEME.chakraBlue;
  ctx.lineWidth = 4;
  ctx.strokeRect(d1X, d1Y, 140, 140);

  ctx.textAlign = 'center';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(String(userRoll), d1X + 70, d1Y + 95);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('YOUR ROLL', d1X + 70, d1Y + 175);

  // VS Divider
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = THEME.nineTailsOrange;
  ctx.fillText('VS', 350, 215);

  // Dice 2 (Dealer Roll / Target)
  const d2X = 420;
  const d2Y = 130;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(d2X, d2Y, 140, 140);
  ctx.strokeStyle = THEME.akatsukiRed;
  ctx.lineWidth = 4;
  ctx.strokeRect(d2X, d2Y, 140, 140);

  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(String(dealerRoll), d2X + 70, d2Y + 95);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('DEALER ROLL', d2X + 70, d2Y + 175);

  // Result Footer Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 345, 750, 55);

  ctx.textAlign = 'left';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = isWin ? THEME.leafGreen : THEME.akatsukiRed;
  ctx.fillText(isWin ? `WINNER! You rolled ${userRoll} vs ${dealerRoll}! (+${payout} Ryo)` : `LOST! You rolled ${userRoll} vs ${dealerRoll}! (-${bet} Ryo)`, 45, 380);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'naruto-dice.png' });
}

/**
 * 🍥 Naruto Higher/Lower Visual Canvas Card
 */
async function renderHigherLowerCard({ currentCard, nextCard, guess, bet, payout, isWin, username }) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, 800, 420);

  ctx.strokeStyle = isWin ? THEME.leafGreen : THEME.akatsukiRed;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 776, 396);

  // Header Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 22, 750, 50);

  drawKonohaCrest(ctx, 55, 47, 14, THEME.chakraBlue);

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = THEME.chakraBlue;
  ctx.fillText('SHINOBI HIGHER OR LOWER', 90, 53);

  // Current Card
  const c1X = 160;
  const c1Y = 110;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(c1X, c1Y, 110, 160);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = (currentCard.includes('♥') || currentCard.includes('♦')) ? '#dc2626' : '#000000';
  ctx.textAlign = 'center';
  ctx.fillText(currentCard, c1X + 55, c1Y + 95);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('BASE CARD', c1X + 55, c1Y + 195);

  // Guess Arrow Indicator
  ctx.font = 'bold 42px sans-serif';
  ctx.fillStyle = THEME.gold;
  ctx.fillText(guess === 'HIGHER' ? '⬆️ HIGHER' : '⬇️ LOWER', 400, 200);

  // Next Drawn Card
  const c2X = 530;
  const c2Y = 110;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(c2X, c2Y, 110, 160);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = (nextCard.includes('♥') || nextCard.includes('♦')) ? '#dc2626' : '#000000';
  ctx.fillText(nextCard, c2X + 55, c2Y + 95);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText('DRAWN CARD', c2X + 55, c2Y + 195);

  // Footer Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(25, 345, 750, 55);

  ctx.textAlign = 'left';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = isWin ? THEME.leafGreen : THEME.akatsukiRed;
  ctx.fillText(isWin ? `WINNER! Guessed ${guess} correctly! (+${payout} Ryo)` : `WRONG! Guessed ${guess}! (-${bet} Ryo)`, 45, 380);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'naruto-higherlower.png' });
}

module.exports = {
  renderCrashCard,
  renderPlinkoCard,
  renderBlackjackCard,
  renderRouletteCard,
  renderDiceCard,
  renderHigherLowerCard
};

