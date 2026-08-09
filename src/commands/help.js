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
  analytics: '📊',
  modmail: '📬',
  ticket: '🎟️',
  voice: '🔊',
  music: '🎶',
  antinuke: '🛡️',
  level: '⭐',
  fun: '🎭',
  giveaway: '🎁',
  info: '📊',
  mod: '🔨',
  ninja: '🍥',
  economy: '🪙',
  channel: '💬',
  autorole: '⚙️',
  autoresponder: '💬',
  automod: '🤖',
  priority: '⚡',
  reactionrole: '🎭',
  stickynote: '📌',
  profile: '👤',
  roles: '👑',
  welcome: '👋',
  backup: '💾'
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
