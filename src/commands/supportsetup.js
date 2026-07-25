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
  description: 'Automated 1-Click Support Server Setup & Architecture Builder',
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

    const statusMsg = await message.channel.send(`⏳ **Initializing Naruto Support Server Architecture Build...**`);

    try {
      // 1. CREATE SUPPORT ROLES
      let staffRole = guild.roles.cache.find(r => r.name === 'Ticket Staff');
      if (!staffRole) {
        staffRole = await guild.roles.create({
          name: 'Ticket Staff',
          color: 0x00E5FF,
          reason: 'Support Server Auto Setup'
        });
      }

      let supportTeamRole = guild.roles.cache.find(r => r.name === 'Support Team');
      if (!supportTeamRole) {
        supportTeamRole = await guild.roles.create({
          name: 'Support Team',
          color: 0xFF9100,
          reason: 'Support Server Auto Setup'
        });
      }

      // 2. CATEGORY 1: INFORMATION & ANNOUNCEMENTS
      const infoCat = await guild.channels.create({
        name: '📌 INFORMATION & ANNOUNCEMENTS',
        type: ChannelType.GuildCategory
      });

      const rulesChan = await guild.channels.create({
        name: '📜-rules-and-info',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      const announceChan = await guild.channels.create({
        name: '📢-announcements',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      const statusChan = await guild.channels.create({
        name: '🟢-bot-status',
        type: ChannelType.GuildText,
        parent: infoCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      // 3. CATEGORY 2: COMMUNITY CHATS
      const commCat = await guild.channels.create({
        name: '💬 SHINOBI COMMUNITY',
        type: ChannelType.GuildCategory
      });

      const genChan = await guild.channels.create({
        name: '💬-general-chat',
        type: ChannelType.GuildText,
        parent: commCat.id
      });

      const cmdChan = await guild.channels.create({
        name: '🤖-bot-commands',
        type: ChannelType.GuildText,
        parent: commCat.id
      });

      const loungeChan = await guild.channels.create({
        name: '🍥-naruto-lounge',
        type: ChannelType.GuildText,
        parent: commCat.id
      });

      // 4. CATEGORY 3: SUPPORT & TICKETS
      const supportCat = await guild.channels.create({
        name: '🎟️ SUPPORT & TICKETS',
        type: ChannelType.GuildCategory
      });

      const ticketChan = await guild.channels.create({
        name: '🎟️-create-ticket',
        type: ChannelType.GuildText,
        parent: supportCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      const modmailChan = await guild.channels.create({
        name: '📬-modmail-guide',
        type: ChannelType.GuildText,
        parent: supportCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      // 5. CATEGORY 4: BOT MODULE GUIDES
      const guideCat = await guild.channels.create({
        name: '🤖 BOT MODULE GUIDES',
        type: ChannelType.GuildCategory
      });

      const antinukeGuide = await guild.channels.create({
        name: '🛡️-antinuke-setup',
        type: ChannelType.GuildText,
        parent: guideCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      const automodGuide = await guild.channels.create({
        name: '🍊-automod-setup',
        type: ChannelType.GuildText,
        parent: guideCat.id,
        permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }]
      });

      // 6. POPULATE EMBEDS & PANELS

      // Rules Embed
      const rulesEmbed = createStyledEmbed({
        title: `📜 Official Support Server Rules & Guidelines`,
        subtitle: `Welcome to Naruto One Official Community Headquarters`,
        description:
          `1. **Be Respectful**: Treat all members and staff with courtesy.\n` +
          `2. **No Spamming**: Keep bot commands in <#${cmdChan.id}>.\n` +
          `3. **No Unsolicited DMs**: Do not DM members or staff for support; use <#${ticketChan.id}> or ModMail.\n` +
          `4. **No Advertising**: Invites and promotional links are automatically blocked by AutoMod.\n` +
          `5. **Follow Discord ToS**: Adhere strictly to Discord Community Guidelines.\n\n` +
          `🔗 **Official Server Invite Link**: ${SUPPORT_SERVER_INVITE}`,
        requestedBy: author,
        clientUser
      });
      await rulesChan.send({ embeds: [rulesEmbed] });

      // Ticket Panel Embed in #create-ticket
      const ticketPanelEmbed = createStyledEmbed({
        title: `🎟️ Naruto One Support Ticket Portal`,
        subtitle: `Get 24/7 Assistance from Support Staff`,
        description:
          `Need help with bot configuration, AntiNuke setup, VoiceMaster, or custom emojis?\n\n` +
          `Click the button below to open a private support ticket thread!\n` +
          `• Staff role <@&${staffRole.id}> will be automatically notified.\n` +
          `• Priority defaults to **Low** so staff can assist smoothly!`,
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

      // ModMail Guide Embed in #modmail-guide
      const modmailEmbed = createStyledEmbed({
        title: `📬 Direct ModMail Support System`,
        subtitle: `Contact Support Staff Privately via DM`,
        description:
          `Prefer to message support staff privately?\n\n` +
          `1. Send a direct message (DM) to <@${clientUser.id}>.\n` +
          `2. Type your question or support issue.\n` +
          `3. Staff will receive your ModMail ticket and respond directly to your DMs!\n\n` +
          `*ModMail supports text, images, and full HTML transcripts!*`,
        requestedBy: author,
        clientUser
      });
      await modmailChan.send({ embeds: [modmailEmbed] });

      // AntiNuke Setup Guide in #antinuke-setup
      const antinukeEmbed = createStyledEmbed({
        title: `🛡️ Wick-Grade AntiNuke & JoinGate Guide`,
        subtitle: `Protect Your Server Against Nukers & Rogue Admins`,
        description:
          `• **Open Control Hub**: Type \`.antinuke\` in any channel.\n` +
          `• **JoinGate Config**: \`.antinuke joingate\` (Anti-Bot, No Avatar, Advertising Name & Acc Age).\n` +
          `• **Auto-Quarantine**: \`.antinuke quarantine\` (reverts \`@everyone\` admin perms & locks rogue admins).\n` +
          `• **Rate Heat Limits**: \`.antinuke limits\` (Kick/Ban/Role/Channel heat limits).\n` +
          `• **Whitelist User**: \`.whitelist add @user\` or \`.whitelist perms @user +ban -role\`.`,
        requestedBy: author,
        clientUser
      });
      await antinukeGuide.send({ embeds: [antinukeEmbed] });

      // Final Completion Message
      const completeEmbed = createStyledEmbed({
        title: `🎉 Support Server Architecture Successfully Built!`,
        subtitle: `All Categories, Channels, Roles & Ticket Panels Deployed`,
        description:
          `**Created Support Categories & Channels:**\n` +
          `• 📌 **Information**: <#${rulesChan.id}>, <#${announceChan.id}>, <#${statusChan.id}>\n` +
          `• 💬 **Community**: <#${genChan.id}>, <#${cmdChan.id}>, <#${loungeChan.id}>\n` +
          `• 🎟️ **Support & Tickets**: <#${ticketChan.id}>, <#${modmailChan.id}>\n` +
          `• 🤖 **Bot Guides**: <#${antinukeGuide.id}>, <#${automodGuide.id}>\n\n` +
          `**Created Support Roles:**\n` +
          `• <@&${staffRole.id}>\n` +
          `• <@&${supportTeamRole.id}>`,
        requestedBy: author,
        clientUser
      });

      return statusMsg.edit({ content: `✅ Support Server Setup Completed!`, embeds: [completeEmbed] });
    } catch (e) {
      return statusMsg.edit(`❌ Support server setup failed: ${e.message}`);
    }
  }
};
