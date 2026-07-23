const { createStyledEmbed, formatCodePills } = require('../utils/embedBuilder');
const db = require('../database/db');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'automod',
  description: 'Automated content moderation, filter management, and anti-bot protection',
  aliases: ['antibot', 'moderation', 'filter'],

  async execute(message, args) {
    const isAntibot = message.content.toLowerCase().startsWith('.antibot');
    const sub = args[0] ? args[0].toLowerCase() : null;

    if (isAntibot) {
      if (!sub || sub === 'help') {
        const antibotCmds = [
          '.antibot', '.antibot add', '.antibot remove',
          '.antibot wl', '.antibot config', '.antibot reset'
        ];
        const embed = createStyledEmbed({
          title: 'Naruto Help Menu',
          subtitle: `${emojis.SHIELD} AntiBot Protection`,
          description: `**Antibot**\n` + formatCodePills(antibotCmds),
          requestedBy: message.author,
          footerText: 'Antibot overview'
        });
        return message.channel.send({ embeds: [embed] });
      }

      const automodData = db.getAutomod(message.guild.id);

      if (sub === 'add' || sub === 'wl') {
        const botUser = message.mentions.users.first() || (args[1] ? { id: args[1] } : null);
        if (!botUser) return message.reply(`${emojis.WARNING} Please mention or specify a bot ID to whitelist! \`.antibot wl <@bot|id>\``);
        if (!automodData.whitelistedBots.includes(botUser.id)) {
          automodData.whitelistedBots.push(botUser.id);
          db.updateAutomod(message.guild.id, 'whitelistedBots', automodData.whitelistedBots);
        }
        return message.reply(`${emojis.SUCCESS} Whitelisted bot <@${botUser.id}> for server join protection.`);
      }

      if (sub === 'remove') {
        const botUser = message.mentions.users.first() || (args[1] ? { id: args[1] } : null);
        if (!botUser) return message.reply(`${emojis.WARNING} Usage: \`.antibot remove <@bot|id>\``);
        automodData.whitelistedBots = automodData.whitelistedBots.filter(id => id !== botUser.id);
        db.updateAutomod(message.guild.id, 'whitelistedBots', automodData.whitelistedBots);
        return message.reply(`${emojis.REMOVE} Removed <@${botUser.id}> from antibot whitelist.`);
      }

      if (sub === 'config') {
        const wl = automodData.whitelistedBots.map(id => `<@${id}>`).join(', ') || '*None*';
        const embed = createStyledEmbed({
          title: 'AntiBot Security Status',
          subtitle: `${emojis.SHIELD} Protection: **ENABLED**`,
          fields: [
            { name: `${emojis.BOT} Whitelisted Authorized Bots`, value: wl, inline: false }
          ],
          requestedBy: message.author
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (sub === 'reset') {
        db.updateAutomod(message.guild.id, 'whitelistedBots', []);
        return message.reply(`${emojis.RESET} Antibot whitelist reset successfully.`);
      }
    }

    // Main AutoMod commands
    if (!sub || sub === 'help') {
      const automodCmds = [
        '.automod', '.automod enable', '.automod disable',
        '.automod punishment', '.automod profanity', '.automod caps',
        '.automod mention', '.automod emoji', '.automod config',
        '.automod logging', '.automod ignore', '.automod unignore'
      ];
      const antibotCmds = [
        '.antibot', '.antibot add', '.antibot remove',
        '.antibot wl', '.antibot config', '.antibot reset'
      ];

      const embed = createStyledEmbed({
        title: 'Naruto Help Menu',
        subtitle: `${emojis.SHIELD} Automod & Security System`,
        description: `**AutoMod**\n` + formatCodePills(automodCmds) + `\n\n` +
          `**Antibot**\n` + formatCodePills(antibotCmds),
        requestedBy: message.author,
        footerText: 'Automod overview'
      });
      return message.channel.send({ embeds: [embed] });
    }

    const config = db.getAutomod(message.guild.id);

    if (sub === 'enable' || sub === 'disable') {
      const state = sub === 'enable';
      db.updateAutomod(message.guild.id, 'enabled', state);
      return message.reply(`${emojis.SHIELD} AutoMod has been **${state ? 'ENABLED' : 'DISABLED'}**.`);
    }

    if (['profanity', 'caps', 'mention', 'emoji'].includes(sub)) {
      const newState = !config[sub];
      db.updateAutomod(message.guild.id, sub, newState);
      return message.reply(`${emojis.GEAR} AutoMod filter **${sub.toUpperCase()}** is now **${newState ? 'ON' : 'OFF'}**.`);
    }

    if (sub === 'punishment') {
      const p = args[1] ? args[1].toLowerCase() : null;
      if (!['warn', 'mute', 'kick', 'ban'].includes(p)) {
        return message.reply(`${emojis.WARNING} Valid punishments: \`warn\`, \`mute\`, \`kick\`, \`ban\``);
      }
      db.updateAutomod(message.guild.id, 'punishment', p);
      return message.reply(`${emojis.PUNISHMENT} AutoMod punishment updated to **${p.toUpperCase()}**.`);
    }

    if (sub === 'config') {
      const embed = createStyledEmbed({
        title: 'AutoMod Server Settings',
        subtitle: `${emojis.GEAR} ${message.guild.name} Configuration`,
        fields: [
          { name: 'System Status', value: config.enabled ? `${emojis.ENABLED} Enabled` : `${emojis.DISABLED} Disabled`, inline: true },
          { name: 'Punishment', value: `\`${config.punishment.toUpperCase()}\``, inline: true },
          { name: 'Profanity Filter', value: config.profanity ? `${emojis.SUCCESS} On` : `${emojis.DISABLED} Off`, inline: true },
          { name: 'Caps Filter', value: config.caps ? `${emojis.SUCCESS} On` : `${emojis.DISABLED} Off`, inline: true },
          { name: 'Mass Mention', value: config.mention ? `${emojis.SUCCESS} On` : `${emojis.DISABLED} Off`, inline: true },
          { name: 'Emoji Spam', value: config.emoji ? `${emojis.SUCCESS} On` : `${emojis.DISABLED} Off`, inline: true }
        ],
        requestedBy: message.author
      });
      return message.channel.send({ embeds: [embed] });
    }
  }
};
