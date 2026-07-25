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
  description: 'Automated 1-Click Support Server Architecture Builder with Shinobi & Olympus themes',
  aliases: ['createsupportserver', 'buildsupportserver', 'supportserversetup'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;
    const theme = args[0]?.toLowerCase() || 'shinobi';

    // Admin check
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING} Only Server Owners and Administrators can execute support server setup.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const statusMsg = await message.channel.send(`⏳ **Building Support Server Architecture (Theme: ${theme.toUpperCase()})...**`);

    try {
      // ─────────────────────────────────────────
      // 1. CREATE ALL SPECIAL ROLES
      // ─────────────────────────────────────────
      let ownerRole = guild.roles.cache.find(r => r.name === 'Hokage Owner' || r.name === 'Owner');
      if (!ownerRole) {
        ownerRole = await guild.roles.create({
          name: theme === 'shinobi' ? 'Hokage Owner' : 'Owner',
          color: 0xFFD700, // Gold
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let staffRole = guild.roles.cache.find(r => r.name === 'ANBU Staff' || r.name === 'Staff');
      if (!staffRole) {
        staffRole = await guild.roles.create({
          name: theme === 'shinobi' ? 'ANBU Staff' : 'Staff',
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

      let vipRole = guild.roles.cache.find(r => r.name === 'Sanin VIP' || r.name === 'VIP');
      if (!vipRole) {
        vipRole = await guild.roles.create({
          name: theme === 'shinobi' ? 'Sanin VIP' : 'VIP',
          color: 0xFF4081, // Pink Gold
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let premiumRole = guild.roles.cache.find(r => r.name === 'Chakra Premium' || r.name === 'Premium User');
      if (!premiumRole) {
        premiumRole = await guild.roles.create({
          name: theme === 'shinobi' ? 'Chakra Premium' : 'Premium User',
          color: 0xAA00FF, // Purple
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let noPrefixRole = guild.roles.cache.find(r => r.name === 'Minato No-Prefix' || r.name === 'No Prefix User');
      if (!noPrefixRole) {
        noPrefixRole = await guild.roles.create({
          name: theme === 'shinobi' ? 'Minato No-Prefix' : 'No Prefix User',
          color: 0xFF6D00, // Vibrant Orange
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      const readOnlyOverwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ];

      let infoCatName = theme === 'shinobi' ? '「 🍥 · HOKAGE MANDATE 」' : '★━━━━✦ INFORMATIONS ✦━━━━★';
      let updateCatName = theme === 'shinobi' ? '「 📰 · NINJA SCROLLS & NEWS 」' : '★━━━━✦ UPDATES & NEWS ✦━━━━★';
      let generalCatName = theme === 'shinobi' ? '「 ⛩️ · KONOHA PLAZA 」' : '★━━━━✦ GENERAL AREA ✦━━━━★';
      let supportCatName = theme === 'shinobi' ? '「 🏮 · ANBU SUPPORT DESK 」' : '★━━━━✦ SUPPORT CENTRE ✦━━━━★';
      let techCatName = theme === 'shinobi' ? '「 ⚡ · SHINOBI DACT LABS 」' : '★━━━━✦ TECHNICIANS AREA ✦━━━━★';
      let vipCatName = theme === 'shinobi' ? '「 💎 · SANIN & VIP VAULT 」' : '★━━━━✦ VIP & PREMIUM LOUNGE ✦━━━━★';
      let staffCatName = theme === 'shinobi' ? '「 👑 · HOKAGE & ANBU COUNCIL 」' : '★━━━━✦ STAFF AREA ✦━━━━★';
      let voiceCatName = theme === 'shinobi' ? '「 🎧 · RAMEN SHOP VC AREA 」' : '★━━━━✦ VOICE & LOGS AREA ✦━━━━★';
      let logsCatName = theme === 'shinobi' ? '「 🛡️ · ANBU AUDIT LOGS 」' : '★━━━━✦ BOT LOGS AREA ✦━━━━★';

      // ─────────────────────────────────────────
      // 2. CATEGORY 1: INFORMATIONS
      // ─────────────────────────────────────────
      const infoCat = await guild.channels.create({ name: infoCatName, type: ChannelType.GuildCategory });

      const aboutChan = await guild.channels.create({
        name: theme === 'shinobi' ? '📜・shinobi-rules' : '📋-about-naruto',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({
        name: theme === 'shinobi' ? '📢・village-verification' : '📢-verification',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const aboutPremium = await guild.channels.create({
        name: theme === 'shinobi' ? '💎・chakra-premium' : '💎-about-premium',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({
        name: theme === 'shinobi' ? '👑・hokage-team-info' : '👑-team-information',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({
        name: theme === 'shinobi' ? '⚡・rasengan-noprefix' : '⚡-no-prefix',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      // ─────────────────────────────────────────
      // 3. CATEGORY 2: UPDATES & NEWS
      // ─────────────────────────────────────────
      const updateCat = await guild.channels.create({ name: updateCatName, type: ChannelType.GuildCategory });

      await guild.channels.create({ name: theme === 'shinobi' ? '📢・anbu-announcements' : '📢-announcements', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: theme === 'shinobi' ? '🚀・jutsu-bot-updates' : '🚀-updates', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: theme === 'shinobi' ? '🟢・konoha-status' : '🟢-status', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: theme === 'shinobi' ? '📜・patch-changelogs' : '📜-changelogs', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: theme === 'shinobi' ? '🎉・ryo-giveaways' : '🎉-giveaways', type: ChannelType.GuildText, parent: updateCat.id });

      // ─────────────────────────────────────────
      // 4. CATEGORY 3: GENERAL AREA
      // ─────────────────────────────────────────
      const generalCat = await guild.channels.create({ name: generalCatName, type: ChannelType.GuildCategory });

      await guild.channels.create({ name: theme === 'shinobi' ? '💬・ninja-lounge' : '💬-chat', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🖼️・scroll-art-media' : '🖼️-media', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🤖・jutsu-commands' : '🤖-commands', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🎶・bijuu-music-playground' : '🎶-music-commands', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🎮・shinobi-rpg-games' : '🎮-owo', type: ChannelType.GuildText, parent: generalCat.id });

      // ─────────────────────────────────────────
      // 5. CATEGORY 4: SUPPORT CENTRE & TICKETS
      // ─────────────────────────────────────────
      const supportCat = await guild.channels.create({ name: supportCatName, type: ChannelType.GuildCategory });

      const ticketChan = await guild.channels.create({
        name: theme === 'shinobi' ? '🎟️・request-assistance' : '🎟️-tickets',
        type: ChannelType.GuildText,
        parent: supportCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({ name: theme === 'shinobi' ? '🐛・bug-scrolls' : '🐛-bug-reports', type: ChannelType.GuildText, parent: supportCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '❓・ninja-faq' : '❓-faq', type: ChannelType.GuildText, parent: supportCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: theme === 'shinobi' ? '💡・hokage-suggestions' : '💡-feedback', type: ChannelType.GuildText, parent: supportCat.id });

      // ─────────────────────────────────────────
      // 6. CATEGORY 5: TECHNICIANS LABS
      // ─────────────────────────────────────────
      const techCat = await guild.channels.create({ name: techCatName, type: ChannelType.GuildCategory });

      await guild.channels.create({ name: theme === 'shinobi' ? '🐍・python-jutsu' : '🌐-python', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🛡️・cyber-defense' : '🌐-cyber-security', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '⚡・javascript-jutsu' : '🌐-javascript', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '⚙️・java-jutsu' : '🌐-java', type: ChannelType.GuildText, parent: techCat.id });

      // ─────────────────────────────────────────
      // 7. CATEGORY 6: VIP & PREMIUM AREA (LOCKED)
      // ─────────────────────────────────────────
      const vipCat = await guild.channels.create({
        name: vipCatName,
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

      await guild.channels.create({ name: theme === 'shinobi' ? '⭐・sanin-vip-lounge' : '⭐-vip-lounge', type: ChannelType.GuildText, parent: vipCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '💎・kyuubi-premium-vault' : '💎-premium-lounge', type: ChannelType.GuildText, parent: vipCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '⚡・minato-noprefix-sanctuary' : '⚡-no-prefix-lounge', type: ChannelType.GuildText, parent: vipCat.id });

      // ─────────────────────────────────────────
      // 8. CATEGORY 7: STAFF & OWNER AREA (LOCKED)
      // ─────────────────────────────────────────
      const staffCat = await guild.channels.create({
        name: staffCatName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      await guild.channels.create({ name: theme === 'shinobi' ? '🔒・anbu-staff-headquarters' : '🔒-staff-chat', type: ChannelType.GuildText, parent: staffCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '👑・hokage-owner-sanctuary' : '👑-owner-lounge', type: ChannelType.GuildText, parent: staffCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🔒 ANBU Command VC' : '🔒 Staff VC', type: ChannelType.GuildVoice, parent: staffCat.id });

      // ─────────────────────────────────────────
      // 9. CATEGORY 8: VOICE & LOGS AREA
      // ─────────────────────────────────────────
      const voiceCat = await guild.channels.create({ name: voiceCatName, type: ChannelType.GuildCategory });

      await guild.channels.create({ name: theme === 'shinobi' ? '🎧 Nine-Tails Music VC' : '🎧 Music Lounge VC', type: ChannelType.GuildVoice, parent: voiceCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🔊 Ichiraku Ramen VC' : '🔊 General VC', type: ChannelType.GuildVoice, parent: voiceCat.id });

      const logsCat = await guild.channels.create({
        name: logsCatName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      await guild.channels.create({ name: theme === 'shinobi' ? '📢・noprefix-audit-logs' : '📢-np-add-logs', type: ChannelType.GuildText, parent: logsCat.id });
      await guild.channels.create({ name: theme === 'shinobi' ? '🛡️・security-defense-logs' : '🛡️-security-logs', type: ChannelType.GuildText, parent: logsCat.id });

      // ─────────────────────────────────────────
      // POPULATE EMBEDS & TICKET PANEL
      // ─────────────────────────────────────────
      const rulesEmbed = createStyledEmbed({
        title: `📜 Konoha Shinobi Support Headquarters Rules`,
        subtitle: `Official Village Directives & Community Guidelines`,
        description:
          `1. **Respect Fellow Shinobi**: Courtesy is mandatory across all channels.\n` +
          `2. **No Command Spam**: Keep bot commands in designated command channels.\n` +
          `3. **No Unsolicited DMs**: Use <#${ticketChan.id}> or ModMail for support.\n` +
          `4. **No Advertising**: External invite links are blocked automatically by AutoMod.\n\n` +
          `🔗 **Official Server Link**: ${SUPPORT_SERVER_INVITE}`,
        requestedBy: author,
        clientUser
      });
      await aboutChan.send({ embeds: [rulesEmbed] });

      const ticketPanelEmbed = createStyledEmbed({
        title: `🎟️ Naruto One Support Ticket Portal`,
        subtitle: `Get Instant 24/7 Assistance from ANBU Support Staff`,
        description:
          `Need assistance with AntiNuke, JoinGate, AutoMod, VoiceMaster, or Custom Emojis?\n\n` +
          `• Click **Create Ticket** below to open a private assistance thread.\n` +
          `• ANBU Staff <@&${staffRole.id}> & <@&${ticketStaffRole.id}> will be automatically notified!\n` +
          `• Support priority defaults to **Low** so staff can assist smoothly!`,
        requestedBy: author,
        clientUser
      });

      const ticketBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create_default')
          .setLabel('Create Support Ticket')
          .setEmoji('🎟️')
          .setStyle(ButtonStyle.Primary)
      );

      await ticketChan.send({ embeds: [ticketPanelEmbed], components: [ticketBtn] });

      // Final Success Message
      const completeEmbed = createStyledEmbed({
        title: `🎉 ${theme === 'shinobi' ? 'Konoha Shinobi' : 'Olympus'} Support Server Built Successfully!`,
        subtitle: `9 Categories, 25+ Styled Channels & 6 Custom Roles Deployed`,
        description:
          `**Custom Created Roles:**\n` +
          `• <@&${ownerRole.id}> | <@&${staffRole.id}> | <@&${ticketStaffRole.id}>\n` +
          `• <@&${vipRole.id}> | <@&${premiumRole.id}> | <@&${noPrefixRole.id}>\n\n` +
          `**Deployed Sections:**\n` +
          `• 📜 <#${aboutChan.id}> & <#${aboutPremium.id}>\n` +
          `• 🎟️ <#${ticketChan.id}> with live Interactive Support Ticket Panel\n` +
          `• ⭐ Locked VIP, Premium & No-Prefix Sanctuary\n` +
          `• 🔒 Locked Staff & Owner Headquarters`,
        requestedBy: author,
        clientUser
      });

      return statusMsg.edit({ content: `✅ ${theme.toUpperCase()} Support Server Setup Complete!`, embeds: [completeEmbed] });
    } catch (e) {
      return statusMsg.edit(`❌ Support server setup failed: ${e.message}`);
    }
  }
};
