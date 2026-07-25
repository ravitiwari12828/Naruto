const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

function renderAutomodFiltersEmbed(config, guild, author, clientUser) {
  const f = config;

  return createStyledEmbed({
    title: `🛡️ AutoMod Security Control Hub — ${guild.name}`,
    subtitle: `Interactive Content Guard & Link Protection Suite`,
    description: `Select a category from the dropdown menu below or click the compact emoji buttons to toggle filters!`,
    fields: [
      {
        name: `💬 ANTI SPAM`,
        value: `Target message, mention, attachment spam & rapid chats.\nStatus: ${f.antiSpam ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: true
      },
      {
        name: `📢 INVITE LINKS`,
        value: `Target Discord invites sent by advertisers.\nStatus: ${f.inviteLinks ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: true
      },
      {
        name: `🛡️ MALICIOUS LINKS`,
        value: `Target phishing/scam websites.\nStatus: ${f.maliciousLinks ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: true
      },
      {
        name: `🔞 NSFW LINKS`,
        value: `Target NSFW websites in SFW channels.\nStatus: ${f.nsfwLinks ? '`ENABLED` ✅' : '`DISABLED` ❌'}`,
        inline: true
      },
      {
        name: `🔤 WORD BLACKLIST`,
        value: `Target profanity & custom words.\nStatus: ${f.profanity ? '`ENABLED` ✅' : '`DISABLED` ❌'} | Words: \`${(f.wordBlacklist || []).length}\``,
        inline: true
      },
      {
        name: `🔗 LINK BLACKLIST`,
        value: `Target custom blacklisted URL domains.\nStatus: ${f.linkBlacklist && f.linkBlacklist.length > 0 ? '`ACTIVE` ✅' : '`EMPTY` ❌'} | Links: \`${(f.linkBlacklist || []).length}\``,
        inline: true
      }
    ],
    requestedBy: author,
    clientUser
  });
}

function renderMiscSettingsEmbed(config, guild, author, clientUser) {
  const m = config.misc || {};

  const logsChan = m.logsChannelId ? `<#${m.logsChannelId}>` : '`Not Set`';
  const modlogsChan = m.modlogsChannelId ? `<#${m.modlogsChannelId}>` : '`Not Set`';
  const quarRole = m.quarantineRoleId ? `<@&${m.quarantineRoleId}>` : '`Quarantine`';

  return createStyledEmbed({
    title: `⚙️ Miscellaneous & Moderation Config — ${guild.name}`,
    subtitle: `Global Bot Settings, Log Channels & Punishment Policies`,
    fields: [
      { name: `⚙️ Prefix`, value: `\`${m.prefix || '.'}\``, inline: true },
      { name: `📜 Logs Channel`, value: logsChan, inline: true },
      { name: `🛡️ ModLogs Channel`, value: modlogsChan, inline: true },
      { name: `☣️ Quarantine Role`, value: quarRole, inline: true },
      { name: `📝 Confirm Msgs`, value: m.moderatorConfirmation !== false ? '`YES` ✅' : '`NO` ❌', inline: true },
      { name: `📬 Always DM`, value: m.alwaysDmPunished !== false ? '`YES` ✅' : '`NO` ❌', inline: true },
      { name: `🎭 Anon Staff`, value: m.hideStaffIdentity ? '`ENABLED` ✅' : '`DISABLED` ❌', inline: true },
      { name: `⏰ Default Timeout`, value: `\`${m.defaultTimeoutMinutes || 2880}m\``, inline: true },
      { name: `🔨 Ban Purge Days`, value: `\`${m.daysPurgedOnBan || 7} days\``, inline: true }
    ],
    requestedBy: author,
    clientUser
  });
}

function buildAutomodInteractiveComponents(config, activeTab = 'filters') {
  const f = config;
  const m = config.misc || {};

  // 1. Help-Menu Style Interactive Select Menu Dropdown
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('automod_category_select')
    .setPlaceholder('🏷️ Select AutoMod / Miscellaneous Category...')
    .addOptions([
      {
        label: 'AutoMod Filters Suite',
        value: 'tab_filters',
        description: 'AntiSpam, Invite Links, Malicious Links & NSFW Links',
        emoji: '🛡️',
        default: activeTab === 'filters'
      },
      {
        label: 'Word & Link Blacklists',
        value: 'tab_blacklists',
        description: 'Profanity filter, custom word & URL domain blacklists',
        emoji: '🔤',
        default: activeTab === 'blacklists'
      },
      {
        label: 'Miscellaneous Settings',
        value: 'tab_misc',
        description: 'Log channels, prefix, timeout duration, DM settings',
        emoji: '⚙️',
        default: activeTab === 'misc'
      },
      {
        label: 'AntiBot Security',
        value: 'tab_antibot',
        description: 'Whitelisted bots & join protection',
        emoji: '🤖',
        default: activeTab === 'antibot'
      }
    ]);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  // 2. Compact Pure-Emoji Secondary Buttons (Mobile Friendly)
  const buttonRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_btn_spam').setEmoji('💬').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_invites').setEmoji('📢').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_malicious').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_nsfw').setEmoji('🔞').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_words').setEmoji('🔤').setStyle(ButtonStyle.Secondary)
  );

  const buttonRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('am_btn_confirm').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_dm').setEmoji('📬').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_anon').setEmoji('🎭').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_purge').setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('am_btn_refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  return [selectRow, buttonRow1, buttonRow2];
}

module.exports = {
  name: 'automod',
  description: 'Interactive AutoMod Filters & Miscellaneous Suite with Select Menu Dropdown & Compact Buttons',
  aliases: ['antibot', 'moderation', 'filter', 'filters', 'misc', 'miscellaneous'],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (['misc', 'miscellaneous'].includes(invoked)) sub = 'misc';
    if (invoked === 'antibot') sub = 'antibot';
    if (invoked === 'filter' || invoked === 'filters') sub = 'filters';

    const author = message.author;
    const guild = message.guild;
    const config = db.getAutomod(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Permission Check
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply(`${emojis.WARNING || '⚠️'} You need **Manage Server** permission to configure AutoMod & Miscellaneous settings.`);
    }

    // Default Interactive Panel
    const embed = sub === 'misc' ? renderMiscSettingsEmbed(config, guild, author, clientUser) : renderAutomodFiltersEmbed(config, guild, author, clientUser);
    const components = buildAutomodInteractiveComponents(config, sub === 'misc' ? 'misc' : 'filters');

    const msg = await message.channel.send({ embeds: [embed], components });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (interaction) => {
      // Permission Check for interaction
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: `⚠️ Only Server Managers can edit AutoMod configuration.`, flags: 64 });
      }

      // Handle Dropdown Select Menu
      if (interaction.isStringSelectMenu() && interaction.customId === 'automod_category_select') {
        const val = interaction.values[0];

        if (val === 'tab_misc') {
          const mEmbed = renderMiscSettingsEmbed(config, guild, author, clientUser);
          const mRows = buildAutomodInteractiveComponents(config, 'misc');
          return interaction.update({ embeds: [mEmbed], components: mRows });
        }

        if (val === 'tab_blacklists') {
          const words = (config.wordBlacklist || []).join(', ') || 'None';
          const links = (config.linkBlacklist || []).join(', ') || 'None';
          const bEmbed = createStyledEmbed({
            title: `🔤 Word & Link Blacklists — ${guild.name}`,
            description:
              `**Active Blacklisted Words:**\n\`\`\`${words}\`\`\`\n` +
              `**Active Blacklisted Link Domains:**\n\`\`\`${links}\`\`\`\n\n` +
              `**To Add/Remove Words:**\n\`\`\`.automod blacklist add <word>\`\`\`\n\`\`\`.automod blacklist remove <word>\`\`\``,
            requestedBy: author,
            clientUser
          });
          const bRows = buildAutomodInteractiveComponents(config, 'blacklists');
          return interaction.update({ embeds: [bEmbed], components: bRows });
        }

        if (val === 'tab_antibot') {
          const wl = (config.whitelistedBots || []).map(id => `<@${id}>`).join(', ') || '*None*';
          const abEmbed = createStyledEmbed({
            title: `🤖 AntiBot Security Status — ${guild.name}`,
            description: `**Whitelisted Authorized Bots:**\n${wl}\n\n**To Whitelist Bot:**\n\`\`\`.antibot wl <@bot>\`\`\``,
            requestedBy: author,
            clientUser
          });
          const abRows = buildAutomodInteractiveComponents(config, 'antibot');
          return interaction.update({ embeds: [abEmbed], components: abRows });
        }

        // Default Filters tab
        const fEmbed = renderAutomodFiltersEmbed(config, guild, author, clientUser);
        const fRows = buildAutomodInteractiveComponents(config, 'filters');
        return interaction.update({ embeds: [fEmbed], components: fRows });
      }

      // Handle Compact Emoji Buttons with Ephemeral Feedback
      if (interaction.isButton()) {
        const id = interaction.customId;
        let responseMsg = '';

        if (id === 'am_btn_spam') {
          config.antiSpam = !config.antiSpam;
          db.updateAutomod(guild.id, 'antiSpam', config.antiSpam);
          responseMsg = `💬 **AntiSpam Filter** is now **${config.antiSpam ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_invites') {
          config.inviteLinks = !config.inviteLinks;
          db.updateAutomod(guild.id, 'inviteLinks', config.inviteLinks);
          responseMsg = `📢 **Invite Links Filter** is now **${config.inviteLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_malicious') {
          config.maliciousLinks = !config.maliciousLinks;
          db.updateAutomod(guild.id, 'maliciousLinks', config.maliciousLinks);
          responseMsg = `🛡️ **Malicious Links Filter** is now **${config.maliciousLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_nsfw') {
          config.nsfwLinks = !config.nsfwLinks;
          db.updateAutomod(guild.id, 'nsfwLinks', config.nsfwLinks);
          responseMsg = `🔞 **NSFW Links Filter** is now **${config.nsfwLinks ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_words') {
          config.profanity = !config.profanity;
          db.updateAutomod(guild.id, 'profanity', config.profanity);
          responseMsg = `🔤 **Word Blacklist Filter** is now **${config.profanity ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_confirm') {
          config.misc.moderatorConfirmation = !config.misc.moderatorConfirmation;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `📝 **Moderator Confirmation Messages** are now **${config.misc.moderatorConfirmation ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_dm') {
          config.misc.alwaysDmPunished = !config.misc.alwaysDmPunished;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `📬 **Always DM Punished Members** is now **${config.misc.alwaysDmPunished ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_anon') {
          config.misc.hideStaffIdentity = !config.misc.hideStaffIdentity;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `🎭 **Anonymous Staff Mode** is now **${config.misc.hideStaffIdentity ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_purge') {
          config.misc.autoPurgeMessages = !config.misc.autoPurgeMessages;
          db.updateAutomod(guild.id, 'misc', config.misc);
          responseMsg = `🗑️ **Auto Purge Messages of Punished Member** is now **${config.misc.autoPurgeMessages ? 'ENABLED' : 'DISABLED'}**.`;
        } else if (id === 'am_btn_refresh') {
          responseMsg = `🔄 AutoMod Settings Refreshed!`;
        }

        const newEmbed = renderAutomodFiltersEmbed(config, guild, author, clientUser);
        const newRows = buildAutomodInteractiveComponents(config, 'filters');
        await msg.edit({ embeds: [newEmbed], components: newRows }).catch(() => {});

        return interaction.reply({ content: responseMsg, flags: 64 });
      }
    });
  }
};


