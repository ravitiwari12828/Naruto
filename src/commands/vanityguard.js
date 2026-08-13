const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { PermissionsBitField } = require('discord.js');
const { createDynamicBox } = require('../utils/boxBuilder');

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

    const extraOwners = ['1529362747047805029', '1420687548807905324', ];
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

      const box = createDynamicBox('VANITYGUARD PROTECTION', [
        { key: 'Action', value: 'ENABLED' },
        { key: 'Vanity', value: '.gg/' + (config.protectedVanity || 'None') },
        { key: 'Reversion', value: '< 50ms' },
        { key: 'Penalty', value: 'BAN & LOCK' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.AN_SHIELD} Server Vanity Protection Enabled!`,
        description: `**Vanity URL Anti-Theft Guard is now ACTIVE!**\n\n` +
                     `Locks the current vanity URL. Anyone who tries to change it will be banned and the URL will be instantly reverted.\n\n` +
                     '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .vanity protection disable / .vanity disable / .vanity protection off
    if (['disable', 'off', 'deactivate'].includes(sub)) {
      config.enabled = false;
      vanityConfigs.set(guild.id, config);

      const box = createDynamicBox('VANITYGUARD PROTECTION', [
        { key: 'Action', value: 'DISABLED' },
        { key: 'Status', value: 'INACTIVE' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.AN_PANIC} Server Vanity Protection Disabled`,
        description: `Disables the vanity protection system.\n\n` +
                     '```\n' + box + '\n```',
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

      const box = createDynamicBox('VANITY CODE LOCKED', [
        { key: 'Code', value: '.gg/' + code },
        { key: 'Guard', value: 'ACTIVE' },
        { key: 'AutoReclaim', value: 'Immediate' }
      ]);

      const embed = createStyledEmbed({
        title: `${emojis.AN_SHIELD} Protected Vanity URL Code Locked!`,
        description: `Successfully set and locked protected vanity code to \`discord.gg/${code}\`.\n\n` +
                     '```\n' + box + '\n```',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // DEFAULT / .vanity protection status / .vanity status / .vanity
    const codeStr = config.protectedVanity || guild.vanityURLCode || 'None';
    const boostStatus = config.boostLost ? 'SAVED — WAITING FOR BOOST' : (config.enabled ? 'ACTIVE [OK]' : 'DISABLED[X]');

    const boxMain = createDynamicBox('VANITYGUARD CONTROL HUB', [
      { key: 'Status', value: config.enabled ? 'ACTIVE [OK]' : 'DISABLED[X]' },
      { key: 'Locked Code', value: '.gg/' + codeStr },
      { key: 'Boost Guard', value: boostStatus },
      { key: 'Recovery', value: '< 50ms' }
    ]);

    const cmdBox = createDynamicBox('VANITY COMMANDS', [
      '.vanity protection enable',
      '.vanity protection disable',
      '.vanity protection status',
      '.vanity set <code>'
    ]);

    const decoyExplain =
      `**${emojis.AN_SHIELD} How Decoy System Works:**\n` +
      `> Your real vanity \`discord.gg/${codeStr}\` is **LOCKED** in bot memory.\n` +
      `> If any admin tries to change it — what they set becomes a **DECOY** and is instantly rejected.\n` +
      `> Bot reclaims \`discord.gg/${codeStr}\` in **< 50ms**.\n` +
      `> If server loses **Level 3 boost** — vanity code is saved & **auto-reclaimed** when boost returns!\n`;

    const description =
      `Secure your level 3 server vanity URL from theft.\n\n` +
      '```\n' + boxMain + '\n```\n' +
      decoyExplain + '\n' +
      '```\n' + cmdBox + '\n```';

    const embed = createStyledEmbed({
      title: `${emojis.AN_GUILD} Server Vanity Protection — ${guild.name}`,
      subtitle: `Realtime Server Vanity URL Anti-Theft Guard`,
      description,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};

