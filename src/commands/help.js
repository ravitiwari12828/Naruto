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
  analytics: emojis.ANALYTICS_ZAP || '<a:analytics:1530942545893265518>',
  modmail: emojis.MODMAIL_ENVELOPE || '<a:modmail:1530942601497284731>',
  ticket: emojis.TICKETS || '<a:tickets:1530942645223030794>',
  voice: emojis.VOICE || '<a:voice:1530942650411389088>',
  music: emojis.MUSIC || '<a:music:1531159640967090227>',
  antinuke: emojis.ANTINUKE || '<a:antinuke:1530942558635556904>',
  level: emojis.LEVEL || '<a:levels:1530942594404847757>',
  fun: emojis.FUN || '<a:fun:1530942586876068003>',
  giveaway: emojis.GIVEAWAY || '<a:giveaway:1530942590307012839>',
  info: emojis.STATS_NEW || emojis.ANALYTICS_ZAP || '<a:analytics:1530942545893265518>',
  mod: emojis.MOD || '<a:moderation:1530942596812116058>',
  ninja: emojis.NINJUTSU || '<a:naruto_rpg:1530942612419248158>',
  economy: emojis.PRIORITY || '<a:an_star:1531155980753174598>',
  channel: emojis.CHANNEL_MOD || '<:channel_mod:1530942581217689731>',
  autorole: emojis.GEAR || '<a:an_bot:1530948362784870510>',
  autoresponder: emojis.AUTORESPOND || '<a:autoresponder:1530942573705822409>',
  automod: emojis.AUTOMOD || '<a:automod:1530942568970326219>',
  priority: emojis.PRIORITY || '<a:an_sparkles:1531061484170383511>',
  reactionrole: emojis.REACTIONROLES || '<a:reaction_roles:1530942623303335966>',
  stickynote: emojis.STICKY || '<a:sticky:1530942641016144043>',
  profile: emojis.PROFILE || '<a:profile:1530942618585006364>',
  roles: emojis.ROLES || emojis.SPECIAL_ROLES || '<a:roles_sleek_premium:1530937146502807552>',
  welcome: emojis.WELCOME || '<a:welcome:1530942654530064394>',
  backup: emojis.BACKUP || '<a:backup:1530942578260840568>'
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
      return `### ${customEmoji}  »  ${cat.label}`;
    })
    .join('\n'); // Discord H3 headers naturally add clean vertical spacing & larger font size

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
      `## ${emojis.DANCE || '<a:Flantic_qt_dance:1530521741263245333>'} All Modules\n` +
      `${moduleLines}\n\n` +
      `### ${emojis.QUICK_LINKS || '<a:quick_links:1530949796884512810>'} **Quick Links**\n` +

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
