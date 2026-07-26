/**
 * Dynamically builds monospaced codeblock boxes fitted to the exact content width of items.
 * Prevents border wrapping on Discord mobile and compact screens.
 * 
 * @param {string} title - Header title of the box
 * @param {Array<string | {key: string, value: any}>} items - Array of lines or key-value objects
 * @param {number} minWidth - Minimum inner content width (default: 20)
 * @returns {string} Formatted monospaced box string
 */
function createDynamicBox(title, items = [], minWidth = 20) {
  let maxContentLen = title ? title.length : 0;

  const parsedItems = items.map(item => {
    if (typeof item === 'string') {
      maxContentLen = Math.max(maxContentLen, item.length);
      return item;
    } else if (item && item.key !== undefined) {
      const lineStr = `${item.key} : ${item.value !== undefined ? item.value : ''}`;
      maxContentLen = Math.max(maxContentLen, lineStr.length);
      return lineStr;
    }
    const str = String(item);
    maxContentLen = Math.max(maxContentLen, str.length);
    return str;
  });

  // Calculate inner content width with 1 space margin on each side
  const contentWidth = Math.max(minWidth, maxContentLen);
  const borderRepeat = contentWidth + 2; // 1 space left, 1 space right

  const topBorder = '╭' + '─'.repeat(borderRepeat) + '╮';
  const divider = '├' + '─'.repeat(borderRepeat) + '┤';
  const bottomBorder = '╰' + '─'.repeat(borderRepeat) + '╯';

  const lines = [topBorder];

  if (title) {
    const pad = borderRepeat - title.length;
    const left = Math.floor(pad / 2);
    const right = pad - left;
    lines.push('│' + ' '.repeat(left) + title + ' '.repeat(right) + '│');
    lines.push(divider);
  }

  parsedItems.forEach(lineStr => {
    lines.push('│ ' + String(lineStr).padEnd(contentWidth, ' ') + ' │');
  });

  lines.push(bottomBorder);
  return lines.join('\n');
}

module.exports = { createDynamicBox };
