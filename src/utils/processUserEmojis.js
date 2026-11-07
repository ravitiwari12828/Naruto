const fs = require('fs');
const path = require('path');
const https = require('https');

const rawList = `
🎰
🃏
🎲
💍
❤️
🏆
🌙
⛔
🟢
👥
➕
✅
🗑️
⚔️
➡️
🛠️
♯
💻
☁️
🕒
🎁
🇨
✔️
💬
🚫
💎
🧏
👑
❤️
#️⃣
🕶️
🎮
📄
📥
💵
👑
👢
📜
ℹ️
🖼️
🏠
❓
🚪
🍥
🔒
🔴
🔗
🌐
📁
🚪
🔇
🎵
💰
🎤
👤
▶️
🔑
✏️
⏯️
⏸️
🎨
🔍
🤖
❌
➖
⏺️
⚡
🐍
⛓️
🌐
📶
🏪
⚙️
⚖️
🛡️
🛠️
🔓
🔘
🎫
🌐
📶
🪝
🔊
💿
`;

const desktopDir = 'C:\\Users\\ravit\\OneDrive\\Desktop\\User_Custom_Animated_Emojis';
if (!fs.existsSync(desktopDir)) {
  fs.mkdirSync(desktopDir, { recursive: true });
}

const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
let match;
const parsedList = [];

while ((match = emojiRegex.exec(rawList)) !== null) {
  const isAnimated = match[1] === 'a';
  const name = match[2];
  const id = match[3];
  const fullStr = match[0];
  parsedList.push({ name, id, isAnimated, fullStr });
}

console.log(`Parsed ${parsedList.length} custom emojis from user request!`);

function downloadFile(url, filepath) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const stream = fs.createWriteStream(filepath);
        res.pipe(stream);
        stream.on('finish', () => { stream.close(); resolve(true); });
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function processAll() {
  let downloaded = 0;
  for (const item of parsedList) {
    const ext = item.isAnimated ? '.gif' : '.png';
    const filename = `${item.name}_${item.id}${ext}`;
    const url = `https://cdn.discordapp.com/emojis/${item.id}${ext}`;
    const filepath = path.join(desktopDir, filename);

    const ok = await downloadFile(url, filepath);
    if (ok) {
      downloaded++;
      console.log(`✅ Downloaded: ${filename}`);
    } else {
      console.log(`❌ Failed/404: ${filename}`);
    }
  }
  console.log(`🎉 Downloaded ${downloaded}/${parsedList.length} custom emojis to Desktop: ${desktopDir}`);
}

processAll();
