const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

const SUPPORT_SERVER_INVITE = 'https://discord.gg/ZPKcPreUMT';

module.exports = {
  name: 'supportsetup',
  description: 'Automated 1-Click Support Server Architecture & Channels Builder matching Olympus layout',
  aliases: ['createsupportserver', 'buildsupportserver', 'supportserversetup'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    // Admin check
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Server Owners and Administrators can execute support server setup.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const statusMsg = await message.channel.send(`⏳ **Building Complete Naruto Support Server Architecture...**`);

    try {
      // ─────────────────────────────────────────
      // 1. CREATE ALL SPECIAL ROLES
      // ─────────────────────────────────────────
      let ownerRole = guild.roles.cache.find(r => r.name === 'Owner');
      if (!ownerRole) {
        ownerRole = await guild.roles.create({
          name: 'Owner',
          color: 0xFFD700, // Gold
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let staffRole = guild.roles.cache.find(r => r.name === 'Staff');
      if (!staffRole) {
        staffRole = await guild.roles.create({
          name: 'Staff',
          color: 0x00E5FF, // Cyan
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let ticketStaffRole = guild.roles.cache.find(r => r.name === 'Ticket Staff');
      if (!ticketStaffRole) {
        ticketStaffRole = await guild.roles.create({
          name: 'Ticket Staff',
          color: 0x00B0FF,
          reason: 'Support Server Auto Setup'
        });
      }

      let vipRole = guild.roles.cache.find(r => r.name === 'VIP');
      if (!vipRole) {
        vipRole = await guild.roles.create({
          name: 'VIP',
          color: 0xFF4081, // Pink Gold
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let premiumRole = guild.roles.cache.find(r => r.name === 'Premium User');
      if (!premiumRole) {
        premiumRole = await guild.roles.create({
          name: 'Premium User',
          color: 0xAA00FF, // Purple
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let noPrefixRole = guild.roles.cache.find(r => r.name === 'No Prefix User');
      if (!noPrefixRole) {
        noPrefixRole = await guild.roles.create({
          name: 'No Prefix User',
          color: 0xFF6D00, // Vibrant Orange
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      // Read-only permission overwrite for public info channels
      const readOnlyOverwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ];

      // ─────────────────────────────────────────
      // 2. CATEGORY 1: INFORMATION
      // ─────────────────────────────────────────
      const infoCat = await guild.channels.create({
        name: '★━━━━✦ INFORMATIONS ✦━━━━★',
        type: ChannelType.GuildCategory
      });

      const aboutNaruto = await guild.channels.create({
        name: '📋-about-naruto',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const verificationChan = await guild.channels.create({
        name: '📢-verification',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const aboutPremium = await guild.channels.create({
        name: '💎-about-premium',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const teamInfo = await guild.channels.create({
        name: '👑-team-information',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const noPrefixInfo = await guild.channels.create({
        name: '⚡-no-prefix',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      // ─────────────────────────────────────────
      // 3. CATEGORY 2: ANNOUNCEMENTS & UPDATES
      // ─────────────────────────────────────────
      const updateCat = await guild.channels.create({
        name: '★━━━━✦ UPDATES & NEWS ✦━━━━★',
        type: ChannelType.GuildCategory
      });

      const announceChan = await guild.channels.create({
        name: '📢-announcements',
        type: ChannelType.GuildText,
        parent: updateCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const updatesChan = await guild.channels.create({
        name: '🚀-updates',
        type: ChannelType.GuildText,
        parent: updateCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const statusChan = await guild.channels.create({
        name: '🟢-status',
        type: ChannelType.GuildText,
        parent: updateCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const changelogsChan = await guild.channels.create({
        name: '📜-changelogs',
        type: ChannelType.GuildText,
        parent: updateCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const giveawaysChan = await guild.channels.create({
        name: '🎉-giveaways',
        type: ChannelType.GuildText,
        parent: updateCat.id
      });

      // ─────────────────────────────────────────
      // 4. CATEGORY 3: GENERAL AREA
      // ─────────────────────────────────────────
      const generalCat = await guild.channels.create({
        name: '★━━━━✦ GENERAL AREA ✦━━━━★',
        type: ChannelType.GuildCategory
      });

      const genChat = await guild.channels.create({
        name: '💬-chat',
        type: ChannelType.GuildText,
        parent: generalCat.id
      });

      const mediaChan = await guild.channels.create({
        name: '🖼️-media',
        type: ChannelType.GuildText,
        parent: generalCat.id
      });

      const cmdChan = await guild.channels.create({
        name: '🤖-commands',
        type: ChannelType.GuildText,
        parent: generalCat.id
      });

      const musicCmdChan = await guild.channels.create({
        name: '🎶-music-commands',
        type: ChannelType.GuildText,
        parent: generalCat.id
      });

      const owoChan = await guild.channels.create({
        name: '🎮-owo',
        type: ChannelType.GuildText,
        parent: generalCat.id
      });

      // ─────────────────────────────────────────
      // 5. CATEGORY 4: SUPPORT CENTRE
      // ─────────────────────────────────────────
      const supportCat = await guild.channels.create({
        name: '★━━━━✦ SUPPORT CENTRE ✦━━━━★',
        type: ChannelType.GuildCategory
      });

      const ticketChan = await guild.channels.create({
        name: '🎟️-tickets',
        type: ChannelType.GuildText,
        parent: supportCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const bugReports = await guild.channels.create({
        name: '🐛-bug-reports',
        type: ChannelType.GuildText,
        parent: supportCat.id
      });

      const faqChan = await guild.channels.create({
        name: '❓-faq',
        type: ChannelType.GuildText,
        parent: supportCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const feedbackChan = await guild.channels.create({
        name: '💡-feedback',
        type: ChannelType.GuildText,
        parent: supportCat.id
      });

      const suggestionsChan = await guild.channels.create({
        name: '📝-suggestions',
        type: ChannelType.GuildText,
        parent: supportCat.id
      });

      // ─────────────────────────────────────────
      // 6. CATEGORY 5: TECHNICIANS AREA
      // ─────────────────────────────────────────
      const techCat = await guild.channels.create({
        name: '★━━━━✦ TECHNICIANS AREA ✦━━━━★',
        type: ChannelType.GuildCategory
      });

      await guild.channels.create({ name: '🌐-python', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: '🌐-cyber-security', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: '🌐-javascript', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: '🌐-java', type: ChannelType.GuildText, parent: techCat.id });

      // ─────────────────────────────────────────
      // 7. CATEGORY 6: VIP & PREMIUM AREA (LOCKED)
      // ─────────────────────────────────────────
      const vipCat = await guild.channels.create({
        name: '★━━━━✦ VIP & PREMIUM LOUNGE ✦━━━━★',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: vipRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: premiumRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: noPrefixRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const vipLounge = await guild.channels.create({ name: '⭐-vip-lounge', type: ChannelType.GuildText, parent: vipCat.id });
      const premiumLounge = await guild.channels.create({ name: '💎-premium-lounge', type: ChannelType.GuildText, parent: vipCat.id });
      const noprefixLounge = await guild.channels.create({ name: '⚡-no-prefix-lounge', type: ChannelType.GuildText, parent: vipCat.id });

      // ─────────────────────────────────────────
      // 8. CATEGORY 7: STAFF & OWNER AREA (LOCKED)
      // ─────────────────────────────────────────
      const staffCat = await guild.channels.create({
        name: '★━━━━✦ STAFF AREA ✦━━━━★',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const staffChat = await guild.channels.create({ name: '🔒-staff-chat', type: ChannelType.GuildText, parent: staffCat.id });
      const ownerLounge = await guild.channels.create({ name: '👑-owner-lounge', type: ChannelType.GuildText, parent: staffCat.id });
      await guild.channels.create({ name: '🔒 Staff VC', type: ChannelType.GuildVoice, parent: staffCat.id });

      // ─────────────────────────────────────────
      // 9. CATEGORY 8: VOICE & LOGS AREA
      // ─────────────────────────────────────────
      const voiceCat = await guild.channels.create({
        name: '★━━━━✦ VOICE & LOGS AREA ✦━━━━★',
        type: ChannelType.GuildCategory
      });

      await guild.channels.create({ name: '🎧 Music Lounge VC', type: ChannelType.GuildVoice, parent: voiceCat.id });
      await guild.channels.create({ name: '🔊 General VC', type: ChannelType.GuildVoice, parent: voiceCat.id });

      const logsCat = await guild.channels.create({
        name: '★━━━━✦ BOT LOGS AREA ✦━━━━★',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      await guild.channels.create({ name: '📢-np-add-logs', type: ChannelType.GuildText, parent: logsCat.id });
      await guild.channels.create({ name: '📢-np-remove-logs', type: ChannelType.GuildText, parent: logsCat.id });
      await guild.channels.create({ name: '🛡️-security-logs', type: ChannelType.GuildText, parent: logsCat.id });

      // ─────────────────────────────────────────
      // POPULATE TICKET PANEL EMBED IN #tickets
      // ─────────────────────────────────────────
      const ticketPanelEmbed = createStyledEmbed({
        title: `🎟️ Naruto One Support Ticket Center`,
        subtitle: `Get 24/7 Priority Assistance from Staff`,
        description:
          `Welcome to the official support desk for Naruto One Bot!\n\n` +
          `• Click **Create Ticket** below to open a private thread.\n` +
          `• Staff roles <@&${staffRole.id}> and <@&${ticketStaffRole.id}> will be automatically alerted.\n` +
          `• Support priority defaults to **Low** so every inquiry is handled smoothly!`,
        requestedBy: author,
        clientUser
      });

      const ticketBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create_default')
          .setLabel('Create Ticket')
          .setEmoji('🎟️')
          .setStyle(ButtonStyle.Primary)
      );

      await ticketChan.send({ embeds: [ticketPanelEmbed], components: [ticketBtn] });

      // Final Success Embed
      const completeEmbed = createStyledEmbed({
        title: `🎉 Olympus-Style Support Server Setup Completed!`,
        subtitle: `9 Categories, 25+ Channels & 6 Special Roles Successfully Built`,
        description:
          `**Created Special Roles:**\n` +
          `• <@&${ownerRole.id}> | <@&${staffRole.id}> | <@&${ticketStaffRole.id}>\n` +
          `• <@&${vipRole.id}> | <@&${premiumRole.id}> | <@&${noPrefixRole.id}>\n\n` +
          `**Key Deployed Sections:**\n` +
          `• 📋 <#${aboutNaruto.id}> & <#${aboutPremium.id}>\n` +
          `• 🎟️ <#${ticketChan.id}> with live Interactive Ticket Panel\n` +
          `• ⭐ Exclusive VIP, Premium & No-Prefix Lounge\n` +
          `• 🔒 Dedicated Staff Chat & VC Area`,
        requestedBy: author,
        clientUser
      });

      return statusMsg.edit({ content: `✅ Olympus-Style Support Server Setup Complete!`, embeds: [completeEmbed] });
    } catch (e) {
      return statusMsg.edit(`❌ Support server setup failed: ${e.message}`);
    }
  }
};
