const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { createDynamicBox } = require('../utils/boxBuilder');

// Import individual setup execution helpers
const advLogSetupCmd = require('./advlogsetup');
const logSetupCmd = require('./logsetup');
const automodCmd = require('./automod');
const welcomeCmd = require('./welcome');
const ticketCmd = require('./tickets');
const modmailCmd = require('./modmail');
const levelCmd = require('./level');
const autoroleCmd = require('./autorole');
const antinukeCmd = require('./antinuke');
const antidoxCmd = require('./antidox');
const stickyCmd = require('./sticky');
const counterCmd = require('./counter');
const autoresponderCmd = require('./autoresponder');

module.exports = {
  name: 'setup',
  description: 'Master All-In-One Server Setup & Configuration Suite for Administrators',
  aliases: ['serversetup', 'configure', 'config', 'serverconfig', 'setups'],

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== author.id) {
      return message.reply(`${emojis.WARNING || '⚠️'} Only Administrators and Server Owners can access the Master Server Setup Suite.`);
    }

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const sub = args[0]?.toLowerCase();

    // ── DIRECT SUBCOMMAND ROUTING ──
    if (['logs', 'advlogs', 'advlog', 'log', 'auditlogs'].includes(sub)) {
      return advLogSetupCmd.execute(message, args.slice(1));
    }
    if (['automod', 'am'].includes(sub)) {
      return automodCmd.execute(message, args.slice(1));
    }
    if (['welcome', 'join', 'greetings'].includes(sub)) {
      return welcomeCmd.execute(message, args.slice(1));
    }
    if (['ticket', 'tickets'].includes(sub)) {
      return ticketCmd.execute(message, args.slice(1));
    }
    if (['modmail', 'mm'].includes(sub)) {
      return modmailCmd.execute(message, args.slice(1));
    }
    if (['level', 'leveling', 'xp'].includes(sub)) {
      return levelCmd.execute(message, ['setup', ...args.slice(1)]);
    }
    if (['autorole', 'arole'].includes(sub)) {
      return autoroleCmd.execute(message, args.slice(1));
    }
    if (['antinuke', 'nuke', 'security'].includes(sub)) {
      return antinukeCmd.execute(message, args.slice(1));
    }
    if (['antidox', 'dox', 'privacy'].includes(sub)) {
      return antidoxCmd.execute(message, args.slice(1));
    }
    if (['sticky'].includes(sub)) {
      return stickyCmd.execute(message, args.slice(1));
    }
    if (['counter', 'stats'].includes(sub)) {
      return counterCmd.execute(message, args.slice(1));
    }
    if (['autoresponder', 'ar', 'trigger'].includes(sub)) {
      return autoresponderCmd.execute(message, args.slice(1));
    }

    // ── MASTER DASHBOARD VIEW ──
    const moduleList = [
      `1. Audit & Event Logs  : .setup logs     (Deploy 15+ Audit Channels)`,
      `2. Security & AntiNuke  : .setup antinuke (Protect Guild & Whitelists)`,
      `3. Anti-Dox Privacy     : .setup antidox  (PII Masking & Privacy Shield)`,
      `4. AutoMod System       : .setup automod  (Anti-Spam, Links, Invites)`,
      `5. Welcome Greetings    : .setup welcome  (Join Cards & Greetings)`,
      `6. Support Tickets      : .setup ticket   (Deploy Ticket System)`,
      `7. ModMail Inbox        : .setup modmail  (Deploy Private ModMail)`,
      `8. Leveling & Shinobi XP: .setup level    (Level Up Channel & Roles)`,
      `9. Member AutoRole      : .setup autorole (Auto-Assign Roles on Join)`,
      `10. Channel Counter     : .setup counter  (Member & Voice Stats)`,
      `11. Sticky Messages     : .setup sticky   (Auto-reposting Notices)`,
      `12. AutoResponder       : .setup ar       (Custom Text Triggers)`
    ];

    const box = createDynamicBox('AVAILABLE SERVER SETUP MODULES', moduleList);

    const embed = createStyledEmbed({
      title: `${emojis.SETTINGS || '<a:settings_animated:1537177506170404905>'} Master Server Setup & Configuration Suite`,
      subtitle: `All-In-One Guild Management Module for ${guild.name}`,
      description:
        `Configure and deploy all Naruto Bot systems for **${guild.name}** in one central location.\n\n` +
        '```\n' + box + '\n```\n' +
        `**Quick Usage:** Type \`.setup <module>\` (e.g. \`.setup logs\`, \`.setup antinuke\`, \`.setup welcome\`) or select a module below!`,
      requestedBy: author,
      clientUser
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('server_setup_menu')
      .setPlaceholder('⚡ Select a Server Setup Module to Configure...')
      .addOptions([
        { label: 'Audit & Event Logging', value: 'setup_logs', description: 'Deploy 15+ dedicated event audit log channels', emoji: '📜' },
        { label: 'Security & AntiNuke', value: 'setup_antinuke', description: 'Protect server from unauthorized mass bans, kicks & deletions', emoji: '🛡️' },
        { label: 'Anti-Dox Privacy Shield', value: 'setup_antidox', description: 'Mask phone numbers, IPs, and PII in chat', emoji: '👁️' },
        { label: 'AutoMod Filters', value: 'setup_automod', description: 'Configure Anti-Spam, Anti-Link, Anti-Invite & Bad Words', emoji: '⚙️' },
        { label: 'Welcome & Greetings', value: 'setup_welcome', description: 'Set up welcome greetings, join cards & auto-roles', emoji: '👋' },
        { label: 'Support Ticket System', value: 'setup_ticket', description: 'Deploy ticket category, embed panel & transcript logs', emoji: '🎟️' },
        { label: 'ModMail Inbox', value: 'setup_modmail', description: 'Deploy private DM support inbox for members', emoji: '📬' },
        { label: 'Leveling & Shinobi XP', value: 'setup_level', description: 'Configure level-up announcements & chakra roles', emoji: '🍥' },
        { label: 'AutoRole Settings', value: 'setup_autorole', description: 'Auto-assign default roles to new members on join', emoji: '🎭' }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const menuMsg = await message.reply({ embeds: [embed], components: [row] });

    const filter = (i) => i.user.id === author.id && i.customId === 'server_setup_menu';
    const collector = menuMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate().catch(() => {});
      const val = interaction.values[0];

      if (val === 'setup_logs') return advLogSetupCmd.execute(message, []);
      if (val === 'setup_antinuke') return antinukeCmd.execute(message, []);
      if (val === 'setup_antidox') return antidoxCmd.execute(message, []);
      if (val === 'setup_automod') return automodCmd.execute(message, []);
      if (val === 'setup_welcome') return welcomeCmd.execute(message, []);
      if (val === 'setup_ticket') return ticketCmd.execute(message, []);
      if (val === 'setup_modmail') return modmailCmd.execute(message, []);
      if (val === 'setup_level') return levelCmd.execute(message, ['setup']);
      if (val === 'setup_autorole') return autoroleCmd.execute(message, []);
    });
  }
};
