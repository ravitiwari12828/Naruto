const fs = require('fs');
const path = require('path');
const https = require('https');

const desktopFolder = 'C:\\Users\\ravit\\OneDrive\\Desktop\\Previous_Bot_Animated_Emojis';
if (!fs.existsSync(desktopFolder)) {
  fs.mkdirSync(desktopFolder, { recursive: true });
}

// Master list of all 72+ Animated GIFs & PNGs used in previous bot versions
const emojiList = [
  { name: 'naruto_chakra', id: '1530942603816603839', animated: true },
  { name: 'scroll_ninja', id: '1529377747804106965', animated: true },
  { name: 'idea_bulb', id: '1530937135891349544', animated: true },
  { name: 'question_mark', id: '1530937139158777997', animated: true },
  { name: 'owner_crown', id: '1529377699116814470', animated: true },
  { name: 'modmail_envelope', id: '1530942601497284731', animated: true },
  { name: 'analytics_zap', id: '1530942545893265518', animated: true },
  { name: 'boost_gif', id: '1532470412217159790', animated: true },
  { name: 'member_count', id: '1532478957591466164', animated: true },
  { name: 'invitelink_gif', id: '1532489591796400228', animated: true },
  { name: 'rank_badge', id: '1532489533952626688', animated: false },
  { name: 'money_spin', id: '1532492249286312048', animated: true },
  { name: 'shop_cart', id: '1532492727126593668', animated: false },
  { name: 'buy_gif', id: '1532492678430855332', animated: true },
  { name: 'sell_tag', id: '1532492613427663009', animated: false },
  { name: 'apex_bitcoin', id: '1532492214167539723', animated: true },
  { name: 'pickaxe_mine', id: '1532492395860725922', animated: true },
  { name: 'rulers_card', id: '1532492294056448093', animated: true },
  { name: 'buildcoin', id: '1532494657693679678', animated: false },

  // AntiNuke Control Panel Animated GIFs
  { name: 'an_whitelist', id: '1530948424273362974', animated: true },
  { name: 'an_webhook', id: '1530948419164569721', animated: true },
  { name: 'an_spam', id: '1530948412646490234', animated: true },
  { name: 'an_shield', id: '1530948408011915335', animated: true },
  { name: 'an_role', id: '1530948402244874312', animated: true },
  { name: 'an_raid', id: '1530948398495207435', animated: true },
  { name: 'an_quarantine', id: '1530948395328339998', animated: true },
  { name: 'an_panic', id: '1530948389548724457', animated: true },
  { name: 'an_kick', id: '1530948383286362242', animated: true },
  { name: 'an_joingate', id: '1530948378391740417', animated: true },
  { name: 'an_guild', id: '1530948372670713917', animated: true },
  { name: 'an_channel', id: '1530948367954182184', animated: true },
  { name: 'an_bot', id: '1530948362784870510', animated: true },
  { name: 'an_ban', id: '1530948356392620133', animated: true },

  // Music Player Suite Animated GIFs
  { name: 'an_volume', id: '1531156037703303350', animated: true },
  { name: 'an_stop', id: '1531156026978598922', animated: true },
  { name: 'an_star', id: '1531155980753174598', animated: true },
  { name: 'an_skip', id: '1531155967201640529', animated: true },
  { name: 'an_shuffle', id: '1531155956799508500', animated: true },
  { name: 'an_prev', id: '1531155944111738980', animated: true },
  { name: 'an_lyrics', id: '1531155931218702336', animated: true },
  { name: 'an_favorite', id: '1531155919013281862', animated: true },
  { name: 'an_autoplay', id: '1531155905188851722', animated: true },
  { name: 'an_clear', id: '1531155891393663026', animated: true },
  { name: 'an_loop', id: '1531155877862703114', animated: true },
  { name: 'an_vaporwave', id: '1531155864197992520', animated: true },
  { name: 'an_reset_filter', id: '1531155850935341257', animated: true },
  { name: 'an_nightcore', id: '1531155837694087178', animated: true },
  { name: 'an_bassboost', id: '1531155823521665044', animated: true },
  { name: 'an_8d_audio', id: '1531155809772605553', animated: true },

  // Help Module Suite Animated GIFs
  { name: 'refresh_sleek', id: '1530937141675294730', animated: true },
  { name: 'all_modules', id: '1530942542562869400', animated: true },
  { name: 'module_antinuke', id: '1530942549240447036', animated: true },
  { name: 'module_automod', id: '1530942553011032155', animated: true },
  { name: 'module_autorespond', id: '1530942556550758501', animated: true },
  { name: 'module_backup', id: '1530942559797284984', animated: true },
  { name: 'module_channel_mod', id: '1530942563375005856', animated: true },
  { name: 'module_giveaway', id: '1530942590307012839', animated: true },
  { name: 'module_levels', id: '1530942594404847757', animated: true },
  { name: 'module_moderation', id: '1530942596812116058', animated: true },
  { name: 'module_music', id: '1531159640967090227', animated: true },
  { name: 'module_ninjutsu', id: '1530942603816603839', animated: true },
  { name: 'module_priority', id: '1530942607599996968', animated: true },
  { name: 'module_profile', id: '1530942611689201704', animated: true },
  { name: 'module_reactionroles', id: '1530942615468277861', animated: true },
  { name: 'module_special_roles', id: '1530942618953744434', animated: true },
  { name: 'module_sticky', id: '1530942622619439245', animated: true },
  { name: 'module_tickets', id: '1530942626243186830', animated: true },
  { name: 'module_voice', id: '1530942630005473431', animated: true },
  { name: 'module_welcome', id: '1530942633855778846', animated: true },

  // Status Icons
  { name: 'emoji_green_enabled', id: '1529377708012732506', animated: false },
  { name: 'emoji_red_disabled', id: '1529377739302506516', animated: false },
  { name: 'emoji_warning_alert', id: '1529377755735527465', animated: false }
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      } else {
        // Fallback to png if gif 404s or vice versa
        const fallbackUrl = url.endsWith('.gif') ? url.replace('.gif', '.png') : url.replace('.png', '.gif');
        const fallbackPath = filepath.endsWith('.gif') ? filepath.replace('.gif', '.png') : filepath.replace('.png', '.gif');
        https.get(fallbackUrl, (res2) => {
          if (res2.statusCode === 200) {
            const fileStream = fs.createWriteStream(fallbackPath);
            res2.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve(true);
            });
          } else {
            resolve(false);
          }
        }).on('error', resolve);
      }
    }).on('error', resolve);
  });
}

async function startDownload() {
  console.log(`<a:rocket_animated:1537179661371707402> Starting download of ${emojiList.length} previous bot animated emojis to Desktop...`);
  let downloadedCount = 0;

  for (const item of emojiList) {
    const ext = item.animated ? '.gif' : '.png';
    const filename = `${item.name}_${item.id}${ext}`;
    const url = `https://cdn.discordapp.com/emojis/${item.id}${ext}`;
    const filepath = path.join(desktopFolder, filename);

    const ok = await downloadFile(url, filepath);
    if (ok) {
      downloadedCount++;
      console.log(`✅ Downloaded: ${filename}`);
    } else {
      console.log(`⚠️ Skipped/404: ${filename}`);
    }
  }

  console.log(`🎉 Finished downloading ${downloadedCount} animated GIFs to Desktop: ${desktopFolder}`);
}

startDownload();
