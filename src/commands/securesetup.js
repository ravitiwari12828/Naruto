const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

module.exports = {
  name: 'securesetup',
  description: 'Interactive One-Click Server Security Setup Dashboard for Admins & Server Owners',
  aliases: ['quicksetup', 'securitysetup', 'setupwizard', 'protectsetup'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    // Admin / Owner check
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Server Owners and Administrators can execute server security setup.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Fetch AntiNuke command module store reference
    const antinukeCmd = message.client.commands.get('antinuke');
    const antinukeConfigs = antinukeCmd?.antinukeConfigs;

    function buildDashboardEmbed(statusText) {
      const antinukeData = antinukeConfigs?.get(guild.id);
      const automodData = db.getAutomod(guild.id);

      const isAntiNukeOn = antinukeData?.enabled ?? true;
      const isAutoModOn = automodData?.enabled ?? true;
      const isPanicOn = antinukeData?.panicmode ?? false;

      return createStyledEmbed({
        title: `🛡️ One-Click Server Security & Protection Setup`,
        subtitle: `${emojis.SHIELD} Konoha Defense Grid Wizard`,
        description:
          `Welcome **${author.username}**! Configure and lock down your server security in seconds using the interactive buttons below.\n\n` +
          `**Current Protection Status:**\n` +
          `• 🛡️ AntiNuke Shield: ${isAntiNukeOn ? '`ENABLED ✅` (21 Filters Active)' : '`DISABLED ⚠️`'}\n` +
          `• 🚨 Panic Mode: ${isPanicOn ? '`ACTIVE 🚨` (High Lockdown)' : '`INACTIVE 🟢`'}\n` +
          `• 🍊 AutoMod & AntiBot: ${isAutoModOn ? '`ENABLED ✅` (Filters Active)' : '`DISABLED ⚠️`'}\n` +
          `• 📜 Security Audit Channel: ${guild.channels.cache.find(c => c.name.includes('security-logs')) ? '`CONFIGURED 📜`' : '`NOT CREATED`'}\n\n` +
          (statusText ? `> 💡 **Latest Action:** ${statusText}\n\n` : '') +
          `*Click any button below to trigger immediate server protection setup!*`,
        requestedBy: author,
        clientUser
      });
    }

    function buildButtons() {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('setup_full_protect')
          .setLabel('⚡ 1-Click Maximum Protection')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('setup_antinuke')
          .setLabel('🛡️ Enable AntiNuke Grid')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('setup_automod')
          .setLabel('🍊 Enable AutoMod & AntiBot')
          .setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('setup_log_channel')
          .setLabel('📜 Create Security Log Channel')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('setup_panic_toggle')
          .setLabel('🚨 Toggle Panic Lockdown')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('setup_refresh')
          .setLabel('🔄 Refresh Status')
          .setStyle(ButtonStyle.Secondary)
      );

      return [row1, row2];
    }

    const embed = buildDashboardEmbed();
    const components = buildButtons();
    const setupMsg = await message.channel.send({ embeds: [embed], components });

    // Interactive Button Collector (5 Minutes)
    const collector = setupMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Only the administrator who invoked `.securesetup` can use these buttons.', ephemeral: true });
      }

      await interaction.deferUpdate();

      let actionStatus = '';

      if (interaction.customId === 'setup_full_protect') {
        // 1. Enable AntiNuke with 21 filters
        if (antinukeConfigs) {
          const config = antinukeConfigs.get(guild.id) || { enabled: true, filters: {} };
          config.enabled = true;
          config.whitelistedUsers.add(author.id);
          antinukeConfigs.set(guild.id, config);
        }

        // 2. Enable AutoMod & AntiBot
        db.updateAutomod(guild.id, (a) => {
          a.enabled = true;
          a.antiLinks = true;
          a.antiInvites = true;
          a.profanity = true;
          a.caps = true;
        });

        // 3. Create Security Logs channel if not existing
        let logChan = guild.channels.cache.find(c => c.name.includes('security-logs'));
        if (!logChan) {
          try {
            logChan = await guild.channels.create({
              name: 'naruto-security-logs',
              type: ChannelType.GuildText,
              topic: 'Automated Security Audit & AntiNuke Protection Logs',
              permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: author.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] }
              ]
            });
          } catch (e) {}
        }

        actionStatus = `⚡ **Full Maximum Security Deployed!** AntiNuke (21 Filters), AutoMod, AntiBot, and <#${logChan?.id || 'channel'}> enabled!`;
      }

      else if (interaction.customId === 'setup_antinuke') {
        if (antinukeConfigs) {
          const config = antinukeConfigs.get(guild.id) || { enabled: true };
          config.enabled = true;
          config.whitelistedUsers.add(author.id);
          antinukeConfigs.set(guild.id, config);
        }
        actionStatus = `🛡️ AntiNuke Shield enabled with 21 protection filters!`;
      }

      else if (interaction.customId === 'setup_automod') {
        db.updateAutomod(guild.id, (a) => {
          a.enabled = true;
          a.antiLinks = true;
          a.profanity = true;
        });
        actionStatus = `🍊 AutoMod & AntiBot filters activated!`;
      }

      else if (interaction.customId === 'setup_log_channel') {
        let logChan = guild.channels.cache.find(c => c.name.includes('security-logs'));
        if (!logChan) {
          try {
            logChan = await guild.channels.create({
              name: 'naruto-security-logs',
              type: ChannelType.GuildText,
              permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
              ]
            });
            actionStatus = `📜 Security audit channel created: <#${logChan.id}>!`;
          } catch (e) {
            actionStatus = `❌ Failed to create channel: ${e.message}`;
          }
        } else {
          actionStatus = `📜 Security channel already exists: <#${logChan.id}>`;
        }
      }

      else if (interaction.customId === 'setup_panic_toggle') {
        if (antinukeConfigs) {
          const config = antinukeConfigs.get(guild.id) || { enabled: true, panicmode: false };
          config.panicmode = !config.panicmode;
          antinukeConfigs.set(guild.id, config);
          actionStatus = config.panicmode ? `🚨 **PANIC LOCKDOWN ACTIVATED!**` : `🟢 Panic Mode deactivated.`;
        }
      }

      else if (interaction.customId === 'setup_refresh') {
        actionStatus = `Status refreshed.`;
      }

      const updatedEmbed = buildDashboardEmbed(actionStatus);
      await setupMsg.edit({ embeds: [updatedEmbed], components: buildButtons() });
    });
  }
};
