const fs = require('fs');
const path = require('path');
const https = require('https');

const rawList = `
<:9_slot_machine_icon:1536273778315894845>
<:8_cards_icon:1536273775266504766>
<:7_dice_icon:1536273772842188860>
<:6_diamond_ring_icon:1536273769767632906>
<:5_single_heart_icon:1536273758099210301>
<:4_trophy_icon:1536273755393884180>
<:3_idle_icon:1536273753200398396>
<:2_dnd_icon:1536273750335684630>
<:1_online_icon:1536273747621707826>
<a:adduser_animated:1536260680175452160>
<a:add_animated:1536260677537243257>
<a:accept_animated:1536260675276640336>
<a:bin_animated:1536260672780763146>
<a:battle_animated:1536260669404352594>
<a:arrowright_animated:1536260663402438726>
<a:adminpanel_animated:1536260661229789316>
<a:csharp_animated:1536260658406891540>
<a:code_animated:1536260655861207091>
<a:cloudcomputing_animated:1536260652514025594>
<a:clock_animated:1536260650253418577>
<a:claim_animated:1536260647824654366>
<a:c_animated:1536260643064254484>
<a:check_animated:1536260645887025203>
<a:discord_animated:1536260640837206096>
<a:disabled_animated:1536260636814876732>
<a:dimond_animated:1536260634105094205>
<a:Deafan_animated:1536260631580254259>
<a:crown_animated:1536260629395021834>
<a:heart_animated:1536260626580512821>
<a:hashtag_animated:1536260624525430845>
<a:hacker_animated:1536260622302453811>
<a:gamecontroller_animated:1536260619832008804>
<a:file_animated:1536260617579532328>
<a:downloadx_animated:1536260615432052796>
<a:dollar_animated:1536260613037101136>
<a:king_animated:1536260610348683384>
<a:kick_animated:1536260606846435398>
<a:javascript_animated:1536260603704770610>
<a:infox_animated:1536260601339322409>
<a:image_animated:1536260598323478599>
<a:home_animated:1536260596184383588>
<a:help_animated:1536260593189920838>
<a:logout_animated:1536260590580797462>
<a:logo_animated:1536260588064350259>
<a:lockx_animated:1536260584818081895>
<a:live_animated:1536260582137663500>
<a:linkx_animated:1536260579331936308>
<a:language_animated:1536260576324620349>
<a:openfolder_animated:1536260573052932166>
<a:openeddooraperture_white_animate:1536260570552999946>
<a:mute_animated:1536260568225157140>
<a:musicplayer_animated:1536260565855371304>
<a:money_animated:1536260563079004160>
<a:microphone_animated:1536260559950061578>
<a:membercard_animated:1536260557789728828>
<a:playbuttton_animated:1536260555587985468>
<a:permission_animated:1536260551833944165>
<a:pencil_animated:1536260549271355412>
<a:pauseplay_animated:1536260546825945108>
<a:pause_animated:1536260544346988574>
<a:paint_animated:1536260541746511872>
<a:scan_animated:1536260539486052362>
<a:robot_animated:1536260536587653200>
<a:removex_animated:1536260532020183111>
<a:remove_animated:1536260528320548876>
<a:recordbutton_animated:1536260525657428068>
<a:rapid_animated:1536260523501424650>
<a:python_animated:1536260520762679408>
<a:prisoner_animated:1536260518367461426>
<a:socialmediax_animated:1536260515557277737>
<a:signal_animated:1536260512965206067>
<a:shopx_animated:1536260510390165554>
<a:settings_animated:1536260507646951534>
<a:selfregulation_animated:1536260503616360531>
<a:security_animated:1536260500797521970>
<a:utility_animated:1536260498515820654>
<a:unlock_animated:1536260495693062196>
<a:toggle_animated:1536260493214228551>
<a:tickety_animated:1536260490865545226>
<a:socialmedia_animated:1536260487757701121>
<a:wifi_animated:1536260485672996905>
<a:webhook_animated:1536260483160473630>
<a:volumeup_animated:1536260480367071283>
<a:vinyl_animated:1536260476906901504>
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
      console.log(`⚠️ Failed/404: ${filename}`);
    }
  }
  console.log(`🎉 Downloaded ${downloaded}/${parsedList.length} custom emojis to Desktop: ${desktopDir}`);
}

processAll();
