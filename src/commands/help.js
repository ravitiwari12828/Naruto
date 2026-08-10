const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const {
  CATEGORIES,
  buildCategoryEmbed,
  buildDropdownMenu,
  buildNavigationButtons
} = require('../utils/panelRenderer');

const EMOJI_MAP = {
  analytics: '<a:rapid_animated:1536260523501424650>',
  modmail: '<a:infox_animated:1536260601339322409>',
  ticket: '<a:tickety_animated:1536260490865545226>',
  voice: '<a:microphone_animated:1536260559950061578>',
  music: '<a:musicplayer_animated:1536260565855371304>',
  antinuke: '<a:security_animated:1536260500797521970>',
  level: '<:rank:1532489533952626688>',
  fun: '<a:gamecontroller_animated:1536260619832008804>',
  giveaway: '<a:gift:1535296210804416634>',
  info: '<a:infox_animated:1536260601339322409>',
  mod: '<a:kick_animated:1536260606846435398>',
  ninja: '🍥',
  economy: '<a:money:1532492249286312048>',
  channel: '<a:hashtag_animated:1536260624525430845>',
  autorole: '<a:settings_animated:1536260507646951534>',
  autoresponder: '<a:code_animated:1536260655861207091>',
  automod: '<a:robot_animated:1536260536587653200>',
  priority: '<a:rapid_animated:1536260523501424650>',
  reactionrole: '<a:add_animated:1536260677537243257>',
  stickynote: '<a:pencil_animated:1536260549271355412>',
  profile: '<a:membercard_animated:1536260557789728828>',
  roles: '<a:crown_animated:1536260629395021834>',
  welcome: '<a:home_animated:1536260596184383588>',
  backup: '<a:cloudcomputing_animated:1536260652514025594>'
};

function buildMainEmbed(messageOrInteraction, botUser, botAvatar, devPortalBanner) {
  const clientObj = messageOrInteraction.client;
  const userObj = messageOrInteraction.author || messageOrInteraction.user;

  let totalRegistered = 545;
  if (clientObj.commands && clientObj.commands.size > 0) {
    const uniqueCmds = new Set(clientObj.commands.values());
    const aliasCount = Array.from(uniqueCmds).reduce((acc, c) => acc + (c.aliases && Array.isArray(c.aliases) ? c.aliases.length : 0), 0);
    totalRegistered = Math.max(517, uniqueCmds.size + aliasCount);
  }

  const moduleLines = CATEGORIES.slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(cat => {
      const customEmoji = EMOJI_MAP[cat.value] || cat.unicodeFallback || '✨';
      return `# ${customEmoji}  »  **${cat.label}**`;
    })
    .join('\n'); // Discord H1 headers (#) render extra-large animated emojis & high-visibility bold headers

  const { createDynamicBox } = require('../utils/boxBuilder');

  const metricsBox = createDynamicBox('SYSTEM METRICS', [
    `Server Prefix  : .`,
    `Total Commands : ${totalRegistered}+`,
    `Active Modules : ${CATEGORIES.length}`
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: 'Naruto Help Panel', iconURL: botAvatar })
    .setThumbnail(botAvatar)
    .setDescription(
      `A feature-packed All-In-One Discord bot built with a **Naruto Shinobi** theme!\n\n` +
      '```\n' + metricsBox + '\n```\n\n' +
      `## 💃 All Modules\n` +
      `${moduleLines}\n\n` +
      `### 🔗 **Quick Links**\n` +

      `[Invite Bot](https://discord.com/api/oauth2/authorize?client_id=${clientObj.user.id}&permissions=8&scope=bot%20applications.commands) • [Support Server](https://discord.gg/ZPKcPreUMT) • [Vote Top.gg](https://top.gg/bot/${clientObj.user.id})`
    )

    .setFooter({
      text: `Developed with ❤️ by Synn • Select a module below`,
      iconURL: botAvatar
    });

  if (devPortalBanner) embed.setImage(devPortalBanner);
  return embed;
}


module.exports = {
  name: 'help',
  description: 'Interactive Multi-Module Help Panel with Dropdown Menu & Category Navigator',
  aliases: [],

  async execute(message, args) {
    try {
      const author = message.author;
      let botUser = message.client.user;

      try {
        botUser = await message.client.users.fetch(message.client.user.id, { force: true });
      } catch (e) {}

      const botAvatar = botUser.displayAvatarURL({ dynamic: true, size: 512 });
      const devPortalBanner = message.client.botBannerURL || null;

      if (args[0]) {
        const search = args[0].toLowerCase();
        const cat = CATEGORIES.find(c => c.value === search || c.label.toLowerCase() === search);
        if (cat) {
          const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
          return message.channel.send({
            embeds: [catEmbed],
            components: [buildDropdownMenu(), buildNavigationButtons()]
          });
        }
      }

      const mainEmbed = buildMainEmbed(message, botUser, botAvatar, devPortalBanner);
      const dropdownRow = buildDropdownMenu();
      const navRow = buildNavigationButtons();

      let helpMessage = null;
      try {
        helpMessage = await message.channel.send({
          embeds: [mainEmbed],
          components: [dropdownRow, navRow]
        });
      } catch (sendErr) {
        flushLog(`⚠️ [Help Panel Send Warning]: ${sendErr.message} - Retrying with fallback reply...`, true);
        helpMessage = await message.reply({ embeds: [mainEmbed] }).catch(err => {
          flushLog(`❌ [Help Panel Fallback Failed]: ${err.message}`, true);
          return null;
        });
      }

      if (!helpMessage) return;

      const collector = helpMessage.createMessageComponentCollector({
        time: 300000
      });

    collector.on('collect', async (interaction) => {
      try {
        if (interaction.user.id !== author.id) {
          return interaction.reply({
            content: `${emojis.DISABLED} Only the user who ran \`.help\` can use this menu.`,
            flags: 64
          }).catch(() => {});
        }

        if (interaction.customId === 'help_home') {
          return interaction.update({
            embeds: [buildMainEmbed(message, botUser, botAvatar, devPortalBanner)],
            components: [buildDropdownMenu(), buildNavigationButtons()]
          }).catch(() => {});
        }

        if (interaction.customId === 'help_delete') {
          return helpMessage.delete().catch(() => {});
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
          const selectedValue = interaction.values[0];
          const cat = CATEGORIES.find(c => c.value === selectedValue);

          if (cat) {
            const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
            return interaction.update({
              embeds: [catEmbed],
              components: [buildDropdownMenu(), buildNavigationButtons()]
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[Help Interaction Error]', err);
      }
    });

    collector.on('end', () => {
      helpMessage.edit({ components: [] }).catch(() => {});
    });
    } catch (err) {
      console.error('[Help Command Error]', err);
      return message.channel.send({ content: `⚠️ Failed to send help menu: ${err.message}` }).catch(() => {});
    }
  }
},
module.exports.buildMainEmbed = buildMainEmbed;
