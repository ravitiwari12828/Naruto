const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const {
  CATEGORIES,
  buildCategoryEmbed,
  buildDropdownMenu,
  buildNavigationButtons
} = require('../utils/panelRenderer');

function buildMainEmbed(message, botUser, botAvatar, devPortalBanner) {
  const totalCommands = message.client.commands && message.client.commands.size > 0 ? message.client.commands.size : 285;

  const embed = new EmbedBuilder()
    .setColor(0x00E5FF)
    .setAuthor({ name: 'Naruto Help Panel', iconURL: botAvatar })
    .setThumbnail(botAvatar)
    .setDescription(
      `A feature-packed All-In-One Discord bot built with a **Naruto Shinobi** theme!\n\n` +
      `\`\`\`\n` +
      `Server Prefix  :  .\n` +
      `Total Commands :  ${totalCommands}+\n` +
      `Active Modules :  ${CATEGORIES.length}\n` +
      `\`\`\`\n\n` +
      `**📦 All Modules**\n` +
      CATEGORIES.map(cat => {
        return `${cat.unicodeFallback || '✨'} » **${cat.label}**`;
      }).join('\n') +
      `\n\n**Links**\n` +
      `[Invite Bot](https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands) | [Support Server](https://discord.gg/) | [Vote](https://top.gg/bot/${message.client.user.id})`
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
          content: '❌ Only the user who ran `.help` can use this menu.',
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
