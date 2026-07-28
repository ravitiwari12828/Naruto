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

function buildMainEmbed(message, botUser, botAvatar, devPortalBanner) {
  let totalRegistered = 545;
  if (message.client.commands && message.client.commands.size > 0) {
    const uniqueCmds = new Set(message.client.commands.values());
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

  const embed = new EmbedBuilder()
    .setColor(0x7E0808)
    .setAuthor({ name: 'Naruto Help Panel', iconURL: botAvatar })
    .setThumbnail(botAvatar)
    .setDescription(
      `A feature-packed All-In-One Discord bot built with a **Naruto Shinobi** theme!\n\n` +
      `\`\`\`\n` +
      `Server Prefix  :  .\n` +
      `Total Commands :  ${totalRegistered}+\n` +
      `Active Modules :  ${CATEGORIES.length}\n` +
      `\`\`\`\n\n` +
      `## ${emojis.DANCE || '<a:Flantic_qt_dance:1530521741263245333>'} All Modules\n` +
      `${moduleLines}\n\n` +
      `### ${emojis.QUICK_LINKS || '<a:quick_links:1530949796884512810>'} **Quick Links**\n` +

      `[Invite Bot](https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands) • [Support Server](https://discord.gg/ZPKcPreUMT) • [Vote Top.gg](https://top.gg/bot/${message.client.user.id})`
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
  aliases: ['h', 'menu', 'commands'],

  async execute(message, args) {
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

    const helpMessage = await message.channel.send({
      embeds: [mainEmbed],
      components: [dropdownRow, navRow]
    });

    const collector = helpMessage.createMessageComponentCollector({
      time: 300000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({
          content: `${emojis.DISABLED} Only the user who ran \`.help\` can use this menu.`,
          flags: 64
        });
      }

      await interaction.deferUpdate();

      if (interaction.customId === 'help_home') {
        return helpMessage.edit({
          embeds: [buildMainEmbed(message, botUser, botAvatar, devPortalBanner)],
          components: [buildDropdownMenu(), buildNavigationButtons()]
        });
      }

      if (interaction.customId === 'help_delete') {
        return helpMessage.delete().catch(() => {});
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
        const selectedValue = interaction.values[0];
        const cat = CATEGORIES.find(c => c.value === selectedValue);

        if (cat) {
          const catEmbed = buildCategoryEmbed(message, cat, botUser, botAvatar, devPortalBanner);
          return helpMessage.edit({
            embeds: [catEmbed],
            components: [buildDropdownMenu(), buildNavigationButtons()]
          });
        }
      }
    });

    collector.on('end', () => {
      helpMessage.edit({ components: [] }).catch(() => {});
    });
  }
};
