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
  description: 'Automated 1-Click Support Server Architecture Builder with Konoha Shinobi Theme',
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

    const statusMsg = await message.channel.send(`⏳ **Building Konoha Shinobi Support Server Architecture...**`);

    try {
      // ─────────────────────────────────────────
      // 1. CREATE ALL SPECIAL ROLES
      // ─────────────────────────────────────────
      let ownerRole = guild.roles.cache.find(r => r.name === 'Hokage Owner');
      if (!ownerRole) {
        ownerRole = await guild.roles.create({
          name: 'Hokage Owner',
          color: 0xFFD700, // Gold
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let staffRole = guild.roles.cache.find(r => r.name === 'ANBU Staff');
      if (!staffRole) {
        staffRole = await guild.roles.create({
          name: 'ANBU Staff',
          color: 0x7E0808,
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

      let vipRole = guild.roles.cache.find(r => r.name === 'Sanin VIP');
      if (!vipRole) {
        vipRole = await guild.roles.create({
          name: 'Sanin VIP',
          color: 0xFF4081, // Pink Gold
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let premiumRole = guild.roles.cache.find(r => r.name === 'Chakra Premium');
      if (!premiumRole) {
        premiumRole = await guild.roles.create({
          name: 'Chakra Premium',
          color: 0xAA00FF, // Purple
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      let noPrefixRole = guild.roles.cache.find(r => r.name === 'Minato No-Prefix');
      if (!noPrefixRole) {
        noPrefixRole = await guild.roles.create({
          name: 'Minato No-Prefix',
          color: 0xFF6D00, // Vibrant Orange
          hoist: true,
          reason: 'Support Server Auto Setup'
        });
      }

      const readOnlyOverwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ];

      // ─────────────────────────────────────────
      // 2. CATEGORY 1: HOKAGE MANDATE (INFORMATION)
      // ─────────────────────────────────────────
      const infoCat = await guild.channels.create({ name: '「 🍥 · HOKAGE MANDATE 」', type: ChannelType.GuildCategory });

      const aboutChan = await guild.channels.create({
        name: '📜・shinobi-rules',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({
        name: '📢・village-verification',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      const aboutPremium = await guild.channels.create({
        name: '💎・chakra-premium',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({
        name: '👑・hokage-team-info',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({
        name: '⚡・rasengan-noprefix',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      // ─────────────────────────────────────────
      // 3. CATEGORY 2: NINJA SCROLLS & NEWS
      // ─────────────────────────────────────────
      const updateCat = await guild.channels.create({ name: '「 📰 · NINJA SCROLLS & NEWS 」', type: ChannelType.GuildCategory });

      await guild.channels.create({ name: '📢・anbu-announcements', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: '🚀・jutsu-bot-updates', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: '🟢・konoha-status', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: '📜・patch-changelogs', type: ChannelType.GuildText, parent: updateCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: '🎉・ryo-giveaways', type: ChannelType.GuildText, parent: updateCat.id });

      // ─────────────────────────────────────────
      // 4. CATEGORY 3: KONOHA PLAZA (GENERAL AREA)
      // ─────────────────────────────────────────
      const generalCat = await guild.channels.create({ name: '「 ⛩️ · KONOHA PLAZA 」', type: ChannelType.GuildCategory });

      await guild.channels.create({ name: '💬・ninja-lounge', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: '🖼️・scroll-art-media', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: '🤖・jutsu-commands', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: '🎶・bijuu-music-playground', type: ChannelType.GuildText, parent: generalCat.id });
      await guild.channels.create({ name: '🎮・shinobi-rpg-games', type: ChannelType.GuildText, parent: generalCat.id });

      // ─────────────────────────────────────────
      // 5. CATEGORY 4: ANBU SUPPORT DESK (TICKETS)
      // ─────────────────────────────────────────
      const supportCat = await guild.channels.create({ name: '「 🏮 · ANBU SUPPORT DESK 」', type: ChannelType.GuildCategory });

      const ticketChan = await guild.channels.create({
        name: '🎟️・request-assistance',
        type: ChannelType.GuildText,
        parent: supportCat.id,
        permissionOverwrites: readOnlyOverwrites
      });

      await guild.channels.create({ name: '🐛・bug-scrolls', type: ChannelType.GuildText, parent: supportCat.id });
      await guild.channels.create({ name: '❓・ninja-faq', type: ChannelType.GuildText, parent: supportCat.id, permissionOverwrites: readOnlyOverwrites });
      await guild.channels.create({ name: '💡・hokage-suggestions', type: ChannelType.GuildText, parent: supportCat.id });

      // ─────────────────────────────────────────
      // 6. CATEGORY 5: TECHNICIANS DACT LABS
      // ─────────────────────────────────────────
      const techCat = await guild.channels.create({ name: '「 ⚡ · SHINOBI DACT LABS 」', type: ChannelType.GuildCategory });

      await guild.channels.create({ name: '🐍・python-jutsu', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: '🛡️・cyber-defense', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: '⚡・javascript-jutsu', type: ChannelType.GuildText, parent: techCat.id });
      await guild.channels.create({ name: '⚙️・java-jutsu', type: ChannelType.GuildText, parent: techCat.id });

      // ─────────────────────────────────────────
      // 7. CATEGORY 6: SANIN & VIP VAULT (LOCKED)
      // ─────────────────────────────────────────
      const vipCat = await guild.channels.create({
        name: '「 💎 · SANIN & VIP VAULT 」',
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

      await guild.channels.create({ name: '⭐・sanin-vip-lounge', type: ChannelType.GuildText, parent: vipCat.id });
      await guild.channels.create({ name: '💎・kyuubi-premium-vault', type: ChannelType.GuildText, parent: vipCat.id });
      await guild.channels.create({ name: '⚡・minato-noprefix-sanctuary', type: ChannelType.GuildText, parent: vipCat.id });

      // ─────────────────────────────────────────
      // 8. CATEGORY 7: HOKAGE & ANBU COUNCIL (LOCKED)
      // ─────────────────────────────────────────
      const staffCat = await guild.channels.create({
        name: '「 👑 · HOKAGE & ANBU COUNCIL 」',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      await guild.channels.create({ name: '🔒・anbu-staff-headquarters', type: ChannelType.GuildText, parent: staffCat.id });
      await guild.channels.create({ name: '👑・hokage-owner-sanctuary', type: ChannelType.GuildText, parent: staffCat.id });
      await guild.channels.create({ name: '🔒 ANBU Command VC', type: ChannelType.GuildVoice, parent: staffCat.id });

      // ─────────────────────────────────────────
      // 9. CATEGORY 8: RAMEN SHOP VC & LOGS
      // ─────────────────────────────────────────
      const voiceCat = await guild.channels.create({ name: '「 🎧 · RAMEN SHOP VC AREA 」', type: ChannelType.GuildCategory });

      await guild.channels.create({ name: '🎧 Nine-Tails Music VC', type: ChannelType.GuildVoice, parent: voiceCat.id });
      await guild.channels.create({ name: '🔊 Ichiraku Ramen VC', type: ChannelType.GuildVoice, parent: voiceCat.id });

      const logsCat = await guild.channels.create({
        name: '「 🛡️ · ANBU AUDIT LOGS 」',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      await guild.channels.create({ name: '📢・noprefix-audit-logs', type: ChannelType.GuildText, parent: logsCat.id });
      await guild.channels.create({ name: '🛡️・security-defense-logs', type: ChannelType.GuildText, parent: logsCat.id });

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

      const { StringSelectMenuBuilder } = require('discord.js');
      const ticketCmd = message.client.commands.get('ticket');
      const ticketConfig = ticketCmd ? ticketCmd.getOrCreateTicketConfig(guild.id) : null;

      // Register staffRole in ticket config so notifications work
      if (ticketConfig) {
        ticketConfig.staffRoles.add(ticketStaffRole.id);
        ticketConfig.staffRoles.add(staffRole.id);
        ticketConfig.panelChanId = ticketChan.id;
      }

      const ticketCategories = ticketConfig ? ticketConfig.categories : [
        { id: 'cat_support', name: 'General Support', emoji: '🎫', description: 'Need help or general assistance?' },
        { id: 'cat_promo', name: 'Promotion', emoji: '📢', description: 'Inquire about promotional deals' },
        { id: 'cat_report', name: 'Report', emoji: '🚨', description: 'Report a user or server violation' },
        { id: 'cat_reward', name: 'Reward', emoji: '🎁', description: 'Claim your event or activity rewards' },
        { id: 'cat_staff', name: 'Staff Apply', emoji: '💼', description: 'Apply for staff position' },
        { id: 'cat_server_promo', name: 'Server Promo', emoji: '🌐', description: 'Request server cross-promotions' }
      ];

      const ticketPanelEmbed = new EmbedBuilder()
        .setColor(0x00FFBB)
        .setTitle(`🎟️ ${guild.name} Private Support Desk`)
        .setDescription(
          `Welcome to **${guild.name}** Support Center!\n\n` +
          `Select a category from the dropdown menu below to open a private support ticket.\n\n` +
          `**Available Support Categories:**\n` +
          ticketCategories.map(c => `• ${c.emoji || '🎫'} **${c.name}** — ${c.description}`).join('\n') + `\n\n` +
          `**Support Staff:** <@&${staffRole.id}> & <@&${ticketStaffRole.id}>`
        )
        .setFooter({ text: 'Naruto Ticket System • Fast Private Support' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('🏷️ Select a support category...')
        .addOptions(
          ticketCategories.map(c => ({
            label: c.name,
            value: c.id,
            description: c.description,
            emoji: c.emoji
          }))
        );

      const ticketBtn = new ActionRowBuilder().addComponents(selectMenu);

      await ticketChan.send({ embeds: [ticketPanelEmbed], components: [ticketBtn] });

      // Final Success Message
      const completeEmbed = createStyledEmbed({
        title: `🎉 Konoha Shinobi Support Server Built Successfully!`,
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

      return statusMsg.edit({ content: `✅ Konoha Shinobi Support Server Setup Complete!`, embeds: [completeEmbed] });
    } catch (e) {
      return statusMsg.edit(`❌ Support server setup failed: ${e.message}`);
    }
  }
};
