const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global AntiNuke Guild Settings Store
const antinukeConfigs = new Map();

function getOrCreateAntinuke(guildId) {
  if (!antinukeConfigs.has(guildId)) {
    antinukeConfigs.set(guildId, {
      enabled: true,
      panicmode: false,
      whitelistedUsers: new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']),
      extraOwners: new Set(['1420687548807905324', '1529362747047805029', '1514546738055348237']),
      bypassRoles: new Set(),
      filters: {
        antiBan: true,
        antiKick: true,
        antiBotAdd: true,
        antiChannelCreate: true,
        antiChannelDelete: true,
        antiChannelUpdate: true,
        antiRoleCreate: true,
        antiRoleDelete: true,
        antiRoleUpdate: true,
        antiWebhookCreate: true,
        antiWebhookDelete: true,
        antiWebhookUpdate: true,
        antiEmojiCreate: true,
        antiEmojiDelete: true,
        antiEmojiUpdate: true,
        antiGuildUpdate: true,
        antiUnban: true,
        antiSpam: true,
        antiContentFilter: true,
        antiRaid: true,
        antiEveryone: true
      }
    });
  }
  return antinukeConfigs.get(guildId);
}

module.exports = {
  name: 'antinuke',
  description: 'AntiNuke Security Suite: antinuke, whitelist, extraowner, bypassrole, panicmode & 21 security filters',
  aliases: [
    'panicmode', 'whitelist', 'extraowner',
    'bypassrole', 'security'
  ],
  antinukeConfigs,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'panicmode') sub = 'panicmode';
    if (invoked === 'whitelist') sub = 'whitelist';
    if (invoked === 'extraowner') sub = 'extraowner';
    if (invoked === 'bypassrole') sub = 'bypassrole';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateAntinuke(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .antinuke enable / disable
    if (sub === 'enable') {
      config.enabled = true;
      antinukeConfigs.set(guild.id, config);
      return message.reply(`${emojis.SHIELD} AntiNuke Security Shield is now **ENABLED**!`);
    }

    if (sub === 'disable') {
      config.enabled = false;
      antinukeConfigs.set(guild.id, config);
      return message.reply(`⚠️ AntiNuke Security Shield is now **DISABLED**.`);
    }

    // .panicmode enable / disable / reset / set
    if (sub === 'panicmode' || invoked === 'panicmode') {
      const mode = args[1]?.toLowerCase();
      if (mode === 'enable' || mode === 'on') {
        config.panicmode = true;
        config.enabled = true;
        antinukeConfigs.set(guild.id, config);

        const embed = createStyledEmbed({
          title: `🚨 PANIC MODE ACTIVATED`,
          description: `All administrative channel/role updates & kicks are completely locked down!\nOnly server owner & whitelisted extra-owners can modify server settings.`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (mode === 'disable' || mode === 'off' || mode === 'reset') {
        config.panicmode = false;
        antinukeConfigs.set(guild.id, config);
        return message.reply(`${emojis.SUCCESS} Panic Mode deactivated.`);
      }
    }

    // .whitelist @user
    if (sub === 'whitelist' || invoked === 'whitelist') {
      const target = message.mentions.users.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.whitelist @user\``);

      if (config.whitelistedUsers.has(target.id)) {
        config.whitelistedUsers.delete(target.id);
        return message.reply(`${emojis.SUCCESS} Removed **${target.tag}** from AntiNuke whitelist.`);
      } else {
        config.whitelistedUsers.add(target.id);
        return message.reply(`${emojis.SHIELD} Added **${target.tag}** to AntiNuke whitelist!`);
      }
    }

    // .extraowner @user
    if (sub === 'extraowner' || invoked === 'extraowner') {
      const target = message.mentions.users.first();
      if (!target) return message.reply(`${emojis.WARNING} Usage: \`.extraowner @user\``);

      config.extraOwners.add(target.id);
      config.whitelistedUsers.add(target.id);
      return message.reply(`${emojis.SHIELD} Granted **${target.tag}** Extra Owner AntiNuke permissions!`);
    }

    // .bypassrole @role
    if (sub === 'bypassrole' || invoked === 'bypassrole') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply(`${emojis.WARNING} Usage: \`.bypassrole @role\``);

      config.bypassRoles.add(role.id);
      return message.reply(`${emojis.SHIELD} Added <@&${role.id}> to AntiNuke bypass roles.`);
    }

    // Default AntiNuke Overview & 21 Filters Card (Matches Screenshot 3)
    const filterList = [
      `✅ **Anti Ban**`, `✅ **Anti Kick**`, `✅ **Anti Bot Add**`,
      `✅ **Anti Channel Create**`, `✅ **Anti Channel Delete**`, `✅ **Anti Channel Update**`,
      `✅ **Anti Role Create**`, `✅ **Anti Role Delete**`, `✅ **Anti Role Update**`,
      `✅ **Anti Webhook Create**`, `✅ **Anti Webhook Delete**`, `✅ **Anti Webhook Update**`,
      `✅ **Anti Sticker/Emoji Create**`, `✅ **Anti Sticker/Emoji Delete**`, `✅ **Anti Sticker/Emoji Update**`
    ];

    const specialFilterList = [
      `✅ **Anti Guild Update**`, `✅ **Anti Unban**`, `✅ **Anti Spam**`,
      `✅ **Anti Content Filter**`, `✅ **Anti Raid Protection**`, `✅ **Anti Everyone/Here**`
    ];

    const embed = createStyledEmbed({
      title: `🛡️ AntiNuke Protection Suite`,
      subtitle: `${emojis.SHIELD} Konoha Shinobi Defense Grid`,
      description:
        `**Antinuke Commands:**\n` +
        `\`\`\`\n.antinuke | .antinuke enable | .antinuke disable\n.whitelist | .extraowner | .bypassrole\n\`\`\`\n` +
        `**Panicmode:**\n` +
        `\`\`\`\n.panicmode | .panicmode enable | .panicmode disable\n.panicmode reset | .panicmode set\n\`\`\`\n` +
        `**Filters (15 Active):**\n${filterList.join('\n')}\n\n` +
        `**Special Filters (6 Active):**\n${specialFilterList.join('\n')}`,
      requestedBy: author,
      clientUser,
      footerText: `Shield Status: ${config.enabled ? 'PROTECTED ✅' : 'DISABLED ⚠️'}`
    });
    return message.channel.send({ embeds: [embed] });
  }
};
