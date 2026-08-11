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
  analytics: '<a:rapid_animated_15362605235014246:1536620962039210115>',
  modmail: '<a:infox_animated_15362606013393224:1536620879457288252>',
  ticket: '<a:tickety_animated_153626049086554:1536620995161628692>',
  voice: '<a:microphone_animated_153626055995:1536620908024701028>',
  music: '<a:musicplayer_animated_15362605658:1536620919013900378>',
  antinuke: '<a:security_animated_15362605007975:1536620975532154990>',
  level: '<a:rank:1536620959363112991>',
  fun: '<a:gamecontroller_animated_15362606:1536620859903442974>',
  giveaway: '<a:gift:1536620862709702677>',
  info: '<a:infox_animated_15362606013393224:1536620879457288252>',
  mod: '<a:kick_animated_153626060684643539:1536620883878223922>',
  ninja: '🍥',
  economy: '<a:money_animated_15362605630790041:1536620914500698142>',
  channel: '<a:hashtag_animated_153626062452543:1536620867495272448>',
  autorole: '<a:settings_animated_15362605076469:1536620980162662461>',
  autoresponder: '<a:code_animated_153626065586120709:1536620828232523806>',
  automod: '<a:robot_animated_15362605365876532:1536620971237187615>',
  priority: '<a:rapid_animated_15362605235014246:1536620962039210115>',
  reactionrole: '📌',
  stickynote: '<a:pencil_animated_1536260549271355:1536620936122339358>',
  profile: '<a:file_animated_153626061757953232:1536620854631342100>',
  roles: '<a:crown_animated_15362606293950218:1536620833332793364>',
  welcome: '<a:home_animated_153626059618438358:1536620874646421574>',
  backup: '<a:cloudcomputing_animated_15362606:1536620825795498124>'
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
      const customEmoji = cat.customEmoji || EMOJI_MAP[cat.value] || cat.unicodeFallback || '✨';
      return `### ${customEmoji}  »  **${cat.label}**`;
    })
    .join('\n'); // Discord H3 headers (###) render medium sleek emojis & bold titles

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
        console.log(`⚠️ [Help Panel Send Warning]: ${sendErr.message} - Retrying with fallback reply...`);
        helpMessage = await message.reply({ embeds: [mainEmbed] }).catch(err => {
          console.log(`❌ [Help Panel Fallback Failed]: ${err.message}`);
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
