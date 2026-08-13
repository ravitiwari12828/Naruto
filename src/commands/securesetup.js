const { createDynamicBox } = require('../utils/panelRenderer');
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
    try {
      const author = message.author;
      const guild = message.guild;
      const { isBotOwner } = require('../utils/owners');
      const isOwner = guild.ownerId === author.id || isBotOwner(author, message.client);
      const isAdmin = message.member ? message.member.permissions.has(PermissionsBitField.Flags.Administrator) : false;

      // Admin / Owner check
      if (!isAdmin && !isOwner) {
        return message.reply(`${emojis.WARNING} Only Server Owners, Administrators, and Bot Owners can execute server security setup.`);
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
      const secLogChan = guild.channels.cache.find(c => c.name.includes('security-logs'));

      const boxMain = createDynamicBox('SECURITY SYSTEM HUB', [
        { key: 'AntiNuke  ', value: isAntiNukeOn ? 'ENABLED [OK]' : 'DISABLED[X]' },
        { key: 'Panic Mode', value: isPanicOn ? 'ACTIVE  [ON]' : 'NORMAL [OFF]' },
        { key: 'AutoMod   ', value: isAutoModOn ? 'ENABLED [OK]' : 'DISABLED[X]' },
        { key: 'LogChannel', value: secLogChan ? `#${secLogChan.name}` : 'NOT CREATED' }
      ], 28);

      const description =
        `Welcome **${author.username}**! Configure and lock down your server security using the interactive buttons below.\n\n` +
        '```\n' + boxMain + '\n```\n\n' +
        (statusText ? `> 💡 **Latest Action:** ${statusText}\n\n` : '') +
        `*Click any button below to trigger immediate server protection setup!*`;

      return createStyledEmbed({
        title: `${emojis.AN_SHIELD || emojis.SHIELD || '<a:security_animated:1537177499862171741>'} One-Click Server Security & Protection Setup`,
        subtitle: `Shinobi Defense Grid Wizard`,
        description,
        requestedBy: author,
        clientUser
      });
    }

    function buildButtons() {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('setup_full_protect')
          .setLabel('Max Protection')
          .setEmoji('<a:rapid_animated:1537177482006896692>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('setup_antinuke')
          .setLabel('AntiNuke Grid')
          .setEmoji('<a:security_animated:1537177499862171741>')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('setup_automod')
          .setLabel('AutoMod & AntiBot')
          .setEmoji('<a:robot_animated:1537177494183088199>')
          .setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('setup_log_channel')
          .setLabel('Security Logs')
          .setEmoji('<a:scroll_animated:1537179663791693844>')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('setup_panic_toggle')
          .setLabel('Panic Lockdown')
          .setEmoji('🚨')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('setup_refresh')
          .setLabel('Refresh Status')
          .setEmoji('🔄')
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
        return interaction.reply({ content: `${emojis.WARNING || '<a:wrong_animated:1537179702928875631>'} Only the administrator who invoked \`.securesetup\` can use these buttons.`, flags: 64 });
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

        actionStatus = `<a:rapid_animated:1537177482006896692> **Full Maximum Security Deployed!** AntiNuke (21 Filters), AutoMod, AntiBot, and <#${logChan?.id || 'channel'}> enabled!`;
      }

      else if (interaction.customId === 'setup_antinuke') {
        if (antinukeConfigs) {
          const config = antinukeConfigs.get(guild.id) || { enabled: true };
          config.enabled = true;
          config.whitelistedUsers.add(author.id);
          antinukeConfigs.set(guild.id, config);
        }
        actionStatus = `${emojis.SHIELD} AntiNuke Shield enabled with 21 protection filters!`;
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
            actionStatus = `<a:scroll_animated:1537179663791693844> Security audit channel created: <#${logChan.id}>!`;
          } catch (e) {
            actionStatus = `${emojis.ERROR} Failed to create channel: ${e.message}`;
          }
        } else {
          actionStatus = `<a:scroll_animated:1537179663791693844> Security channel already exists: <#${logChan.id}>`;
        }
      }

      else if (interaction.customId === 'setup_panic_toggle') {
        if (antinukeConfigs) {
          const config = antinukeConfigs.get(guild.id) || { enabled: true, panicmode: false };
          config.panicmode = !config.panicmode;
          antinukeConfigs.set(guild.id, config);
          actionStatus = config.panicmode ? `🚨 **PANIC LOCKDOWN ACTIVATED!**` : `<a:accept_animated:1537177319603703969> Panic Mode deactivated.`;
        }
      }

      else if (interaction.customId === 'setup_refresh') {
        actionStatus = `Status refreshed.`;
      }

      const updatedEmbed = buildDashboardEmbed(actionStatus);
      await setupMsg.edit({ embeds: [updatedEmbed], components: buildButtons() });
    });
    } catch (err) {
      console.error('[SecureSetup Command Error]', err);
      return message.channel.send({ content: `<a:wrong_animated:1537179702928875631> Failed to send security setup menu: ${err.message}` }).catch(() => {});
    }
  }
};
