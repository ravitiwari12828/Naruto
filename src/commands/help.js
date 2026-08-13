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
  analytics: '<a:chart_animated:1537179539514462308>',
  antinuke: '<a:security_animated:1537177499862171741>',
  autorole: '<a:settings_animated:1537177506170404905>',
  automod: '<a:robot_animated:1537177494183088199>',
  autoresponder: '<a:code_animated:1537177358912725033>',
  backup: '<a:cloudcomputing_animated:1537177355766865940>',
  channel: '<a:hashtag_animated:1537177395537248276>',
  economy: '<a:money_animated:1537177442672709707>',
  fun: '<a:gamecontroller_animated:1537177388725706802>',
  giveaway: '<a:gift_animated:1537179583064055931>',
  info: '<a:infox_animated:1537177409428787251>',
  level: '<a:rank_animated:1537179656090943538>',
  mod: '<a:kick_animated:1537177415552602223>',
  modmail: '<a:openeddooraperture_animated:1537177450411462766>',
  music: '<a:musicplayer_animated:1537177445428633762>',
  ninja: '<a:naruto_animated:1537179622024814733>',
  priority: '<a:rocket_animated:1537179661371707402>',
  profile: '<a:membercard_animated:1537177436146638993>',
  reactionrole: '<a:add_animated:1537177324435283998>',
  roles: '<a:crown_animated:1537177361093500968>',
  stickynote: '<a:pencil_animated:1537177465829724181>',
  ticket: '<a:tickety_animated:1537177533961732106>',
  voice: '<a:microphone_animated:1537177439527112755>',
  welcome: '<a:welcome_animated:1537179700349243402>'
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
      const customEmoji = cat.customEmoji || EMOJI_MAP[cat.value] || cat.unicodeFallback || '<a:sparkles_animated:1537179684175872171>';
      return `## ${customEmoji} **${cat.label}**`;
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
      `## <a:flantic_dance_animated:1537179577518919811> All Modules\n` +
      `${moduleLines}\n\n` +
      `### <a:linkx_animated:1537177423324512327> **Quick Links**\n` +

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
        console.log(`<a:wrong_animated:1537179702928875631> [Help Panel Send Warning]: ${sendErr.message} - Retrying with fallback reply...`);
        helpMessage = await message.reply({ embeds: [mainEmbed] }).catch(err => {
          console.log(`<a:wrong_animated:1537179702928875631> [Help Panel Fallback Failed]: ${err.message}`);
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
      return message.channel.send({ content: `<a:wrong_animated:1537179702928875631> Failed to send help menu: ${err.message}` }).catch(() => {});
    }
  }
},
module.exports.buildMainEmbed = buildMainEmbed;
