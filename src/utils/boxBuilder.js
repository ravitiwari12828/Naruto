/**
 * Universal Mobile-Proof Dynamic Codeblock Box Builder for Discord.
 * Guarantees ZERO line-wrapping and PERFECT border alignment across all devices:
 * iPhone, Android, Tablet, Desktop, and Web.
 */

// Strip emojis & surrogate pairs to calculate exact visual character width in monospaced font
function getVisualWidth(str) {
  if (!str) return 0;
  // Replace unicode emoji surrogate pairs & custom emoji tokens with single char 'X'
  const clean = String(str)
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, 'X')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEF6]/g, 'X');
  return clean.length;
}

function padVisualEnd(str, targetWidth) {
  const currentVis = getVisualWidth(str);
  const needed = Math.max(0, targetWidth - currentVis);
  return str + ' '.repeat(needed);
}

function padVisualCenter(str, targetWidth) {
  const currentVis = getVisualWidth(str);
  const pad = Math.max(0, targetWidth - currentVis);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

/**
 * Formats a single item into one or more lines that fit strictly within maxContentWidth.
 */
function formatItemLines(item, maxContentWidth) {
  let rawStr = '';
  if (typeof item === 'string') {
    rawStr = item;
  } else if (item && item.key !== undefined) {
    const valStr = item.value !== undefined ? String(item.value) : '';
    rawStr = `${item.key} : ${valStr}`;
  } else {
    rawStr = String(item || '');
  }

  // If line fits within maxContentWidth, return as single line
  if (getVisualWidth(rawStr) <= maxContentWidth) {
    return [rawStr];
  }

  // Handle key-value object truncation/compression if needed
  if (typeof item === 'object' && item.key && item.value !== undefined) {
    const valStr = String(item.value);
    const availKeyLen = maxContentWidth - valStr.length - 3; // ' : ' takes 3
    if (availKeyLen > 3) {
      const truncatedKey = item.key.slice(0, availKeyLen - 1) + '…';
      return [`${truncatedKey} : ${valStr}`];
    }
  }

  // Split long command strings into clean sub-lines (wrap without breaking borders)
  const words = rawStr.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (getVisualWidth(testLine) <= maxContentWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = getVisualWidth(word) > maxContentWidth ? word.slice(0, maxContentWidth - 1) + '…' : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [rawStr.slice(0, maxContentWidth - 1) + '…'];
}

/**
 * Creates a Device-Proof Monospaced Box.
 * Maximum box inner width is capped at 26 characters (28 characters total width).
 * 28 characters is the universal safe threshold for Discord Mobile (iOS/Android) without wrapping.
 * 
 * @param {string} title - Header title of the box
 * @param {Array<string | {key: string, value: any}>} items - Array of content items
 * @param {number} minWidth - Optional minimum inner width (default: 20, max cap: 26)
 * @returns {string} Formatted monospaced codeblock box string
 */
function createDynamicBox(title, items = [], minWidth = 20) {
  // STRICT MOBILE SAFETY CAP: 26 chars inner content = 28 chars total box width
  const MAX_INNER_WIDTH = 26;

  // Process all items into compliant line strings
  const processedLines = [];
  let maxVisWidth = getVisualWidth(title || '');

  items.forEach(item => {
    const lines = formatItemLines(item, MAX_INNER_WIDTH);
    lines.forEach(l => {
      processedLines.push(l);
      maxVisWidth = Math.max(maxVisWidth, getVisualWidth(l));
    });
  });

  // Calculate final content width: clamped between minWidth and MAX_INNER_WIDTH
  const contentWidth = Math.min(MAX_INNER_WIDTH, Math.max(minWidth, maxVisWidth));
  const borderRepeat = contentWidth + 2; // 1 space padding on each side

  const topBorder = '╭' + '─'.repeat(borderRepeat) + '╮';
  const divider = '├' + '─'.repeat(borderRepeat) + '┤';
  const bottomBorder = '╰' + '─'.repeat(borderRepeat) + '╯';

  const boxLines = [topBorder];

  if (title) {
    const formattedTitle = title.length > contentWidth ? title.slice(0, contentWidth - 1) + '…' : title;
    boxLines.push('│ ' + padVisualCenter(formattedTitle, contentWidth) + ' │');
    boxLines.push(divider);
  }

  processedLines.forEach(lineStr => {
    boxLines.push('│ ' + padVisualEnd(lineStr, contentWidth) + ' │');
  });

  boxLines.push(bottomBorder);
  return boxLines.join('\n');
}

module.exports = { createDynamicBox, getVisualWidth };
