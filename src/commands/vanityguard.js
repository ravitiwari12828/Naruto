const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');

// Global VanityGuard Config Store (guildId -> { enabled: true, protectedVanity: 'radha' })
const vanityConfigs = new Map();

function getOrCreateVanityConfig(guildId) {
  if (!vanityConfigs.has(guildId)) {
    vanityConfigs.set(guildId, {
      enabled: true,
      protectedVanity: null,
      autoStealProtection: true
    });
  }
  return vanityConfigs.get(guildId);
}

module.exports = {
  name: 'vanityguard',
  description: 'High-Speed Server Vanity URL Protection & Theft Recovery System',
  aliases: ['vanityguard', 'vanityprotect', 'vanityshield', 'antivanity', 'vanity'],
  vanityConfigs,
  getOrCreateVanityConfig,

  async execute(message, args) {
    let sub = args[0]?.toLowerCase();
    if (['protection', 'protect'].includes(sub)) {
      sub = args[1]?.toLowerCase();
      // Shift args if 'protection' or 'protect' was used
      args = args.slice(1);
    }

    const guild = message.guild;
    const author = message.author;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    const extraOwners = ['1529362747047805029', '1420687548807905324', '1514546738055348237'];
    const isOwner = author.id === guild.ownerId || extraOwners.includes(author.id);

    if (!isOwner) {
      const embed = createStyledEmbed({
        title: `${emojis.WARNING} Permission Denied`,
        description: `Only the Server Owner or Bot Owners can manage VanityGuard.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    const config = getOrCreateVanityConfig(guild.id);
    if (!config.protectedVanity && guild.vanityURLCode) {
      config.protectedVanity = guild.vanityURLCode;
    }

    // .vanity protection enable / .vanity enable / .vanity protection on
    if (['enable', 'on', 'active'].includes(sub)) {
      config.enabled = true;
      if (guild.vanityURLCode) config.protectedVanity = guild.vanityURLCode;
      vanityConfigs.set(guild.id, config);

      const codeStr = config.protectedVanity ? 'discord.gg/' + config.protectedVanity : 'Not Set (Run .vanity set <code\>)';
      const boxLines = [
        '╭────────────────────────────────────╮',
        '│       VANITYGUARD PROTECTION       │',
        '├────────────────────────────────────┤',
        '│ Action     : ENABLED     │',
        '│ Vanity     : ' + ('.gg/' + (config.protectedVanity || 'None')).slice(0, 12).padEnd(12, ' ') + '│',
        '│ Reversion  : < 50ms      │',
        '│ Penalty    : BAN & LOCK  │',
        '╰────────────────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `${emojis.SHIELD || '🛡️'} Server Vanity Protection Enabled!`,
        description: `**Vanity URL Anti-Theft Guard is now ACTIVE!**\n\n` +
                     `Locks the current vanity URL. Anyone who tries to change it will be banned and the URL will be instantly reverted.\n\n` +
                     '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .vanity protection disable / .vanity disable / .vanity protection off
    if (['disable', 'off', 'deactivate'].includes(sub)) {
      config.enabled = false;
      vanityConfigs.set(guild.id, config);

      const boxLines = [
        '╭────────────────────────────────────╮',
        '│       VANITYGUARD PROTECTION       │',
        '├────────────────────────────────────┤',
        '│ Action     : DISABLED    │',
        '│ Status     : INACTIVE    │',
        '╰────────────────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `${emojis.WARNING || '⚠️'} Server Vanity Protection Disabled`,
        description: `Disables the vanity protection system.\n\n` +
                     '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .vanity set <vanityCode> / .vanity protection set <vanityCode>
    if (sub === 'set') {
      const code = args[1]?.replace('https://discord.gg/', '').replace('discord.gg/', '').trim();
      if (!code) {
        return message.reply(`${emojis.WARNING} Usage: \`.vanity set <vanityCode>\` (e.g. \`.vanity set radha\`)`);
      }

      config.protectedVanity = code;
      config.enabled = true;
      vanityConfigs.set(guild.id, config);

      const boxLines = [
        '╭────────────────────────────────────╮',
        '│        VANITY CODE LOCKED          │',
        '├────────────────────────────────────┤',
        '│ Code       : ' + ('.gg/' + code).slice(0, 12).padEnd(12, ' ') + '│',
        '│ Guard      : ACTIVE      │',
        '│ AutoReclaim: Immediate   │',
        '╰────────────────────────────────────╯'
      ];

      const embed = createStyledEmbed({
        title: `⚡ Protected Vanity URL Code Locked!`,
        description: `Successfully set and locked protected vanity code to \`discord.gg/${code}\`.\n\n` +
                     '```\n' + boxLines.join('\n') + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // DEFAULT / .vanity protection status / .vanity status / .vanity
    const codeStr = config.protectedVanity || guild.vanityURLCode || 'None';
    const boxMain = [
      '╭────────────────────────────────────╮',
      '│      VANITYGUARD CONTROL HUB       │',
      '├────────────────────────────────────┤',
      '│ Status     : ' + (config.enabled ? 'ACTIVE  [OK]' : 'DISABLED[X]') + '│',
      '│ Locked Code: ' + ('.gg/' + codeStr).slice(0, 12).padEnd(12, ' ') + '│',
      '│ Recovery   : < 50ms      │',
      '╰────────────────────────────────────╯'
    ];

    const description =
      `Secure your level 3 server custom invite URL (Vanity URL) from being stolen or changed.\n\n` +
      '```\n' + boxMain.join('\n') + '\n```\n\n' +
      `**🔗 Vanity Commands:**\n` +
      `\`\`\`\n` +
      `.vanity protection enable   - Locks current vanity URL & bans thieves\n` +
      `.vanity protection disable  - Disables vanity protection system\n` +
      `.vanity protection status   - Displays system status & locked URL\n` +
      `.vanity set <code\>          - Lock specific vanity URL code\n` +
      `\`\`\``;

    const embed = createStyledEmbed({
      title: `🔗 Server Vanity Protection — ${guild.name}`,
      subtitle: `Realtime Server Vanity URL Anti-Theft Guard`,
      description,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
