const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { dispatchLog } = require('../utils/logger');
const { createDynamicBox } = require('../utils/boxBuilder');

// Anti-Dox Config Store in DB (guildId -> { enabled, antiIp, antiPhone, antiLinks, timeoutMin })
function getOrCreateAntidox(guildId) {
  if (!db.data.antidox) db.data.antidox = {};
  if (!db.data.antidox[guildId]) {
    db.data.antidox[guildId] = {
      enabled: true,
      antiIp: true,
      antiPhone: true,
      antiLinks: true,
      timeoutMinutes: 10
    };
  }
  const cfg = db.data.antidox[guildId];
  if (cfg.enabled === undefined) cfg.enabled = true;
  if (cfg.antiIp === undefined) cfg.antiIp = true;
  if (cfg.antiPhone === undefined) cfg.antiPhone = true;
  if (cfg.antiLinks === undefined) cfg.antiLinks = true;
  if (cfg.timeoutMinutes === undefined) cfg.timeoutMinutes = 10;
  return cfg;
}

function updateAntidox(guildId, fn) {
  const cfg = getOrCreateAntidox(guildId);
  if (typeof fn === 'function') fn(cfg);
  db.saveJSON();
  return cfg;
}

// Regex Detectors for PII Data
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
const PHONE_REGEX = /(?:\+91[\-\s]?)?[6-9]\d{9}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const LEAK_LINK_REGEX = /(doxbin\.(org|cc|me|com)|ghostbin\.(co|me)|rentry\.(co|org)|iplogger\.(org|com|ru)|grabify\.(link|net)|shorturl\.at|pastebin\.com\/raw)/gi;

// Safe IP Exclusions (localhost, zero, DNS, common local IPs)
const EXCLUDED_IPS = ['127.0.0.1', '0.0.0.0', '1.1.1.1', '8.8.8.8', '8.8.4.4', '255.255.255.255'];

// Sliding Window Cross-Message Cache (User Key -> Array of { msgId, content, timestamp })
const userRecentMsgCache = new Map();

async function checkMessageForDox(message) {
  if (!message || !message.guild || message.author.bot) return false;

  const config = getOrCreateAntidox(message.guild.id);
  if (!config.enabled) return false;

  // Bypass for Server Owner & AntiNuke Whitelisted Extra Owners
  if (message.author.id === message.guild.ownerId) return false;
  const antinukeCmd = message.client.commands?.get('antinuke');
  if (antinukeCmd && antinukeCmd.getOrCreateAntinuke) {
    const antiConfig = antinukeCmd.getOrCreateAntinuke(message.guild.id);
    if (antinukeCmd.isUserWhitelistedForFeature(antiConfig, message.author.id, 'antiSpam')) return false;
  }

  const content = message.content || '';

  // Cross-Message Sliding Window History (90 seconds window)
  const userKey = `${message.guild.id}:${message.channel.id}:${message.author.id}`;
  const now = Date.now();
  let userHistory = userRecentMsgCache.get(userKey) || [];
  userHistory = userHistory.filter(m => (now - m.timestamp) < 90000);
  if (content) {
    userHistory.push({ msgId: message.id, content: content, timestamp: now });
  }
  userRecentMsgCache.set(userKey, userHistory);

  const rawCombinedText = userHistory.map(m => m.content).join(' ');

  // Strip Discord Mentions, Channel Tags, Custom Emojis, and 17-20 Digit Snowflake IDs
  const cleanContent = content
    .replace(/<@!?\d+>/g, '')
    .replace(/<#\d+>/g, '')
    .replace(/<@&\d+>/g, '')
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '')
    .replace(/\b\d{17,20}\b/g, '');

  const cleanCombinedText = rawCombinedText
    .replace(/<@!?\d+>/g, '')
    .replace(/<#\d+>/g, '')
    .replace(/<@&\d+>/g, '')
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '')
    .replace(/\b\d{17,20}\b/g, '');

  let violationRule = null;
  let detectedType = '';

  // 1. IP Address Leak Check (Direct + Obfuscated + Cross-Message)
  if (config.antiIp && !violationRule) {
    const normalizedIpContent = cleanCombinedText.replace(/\[dot\]|\(dot\)|\bdot\b|,/gi, '.').replace(/\s+/g, '');
    const ipMatches = normalizedIpContent.match(IPV4_REGEX) || cleanContent.match(IPV4_REGEX);
    if (ipMatches) {
      const realIp = ipMatches.find(ip => !EXCLUDED_IPS.includes(ip) && !ip.startsWith('192.168.') && !ip.startsWith('10.'));
      if (realIp) {
        violationRule = 'IP Address Leak Guard';
        detectedType = 'IPv4 Address (Cross-Message/Obfuscated)';
      }
    }
  }

  // 2. Phone Number Leak Check (Direct + Obfuscated + Cross-Message Multi-Send)
  if (config.antiPhone && !violationRule) {
    const directPhoneMatches = cleanContent.match(PHONE_REGEX);

    // Strip non-digits from cleaned combined text
    const combinedDigits = cleanCombinedText.replace(/\D/g, '');
    const obfuscatedPhoneMatch = (combinedDigits.length >= 10 && combinedDigits.length <= 13) &&
                                 /(?:91|0)?[6-9]\d{9}/.test(combinedDigits);

    if ((directPhoneMatches && directPhoneMatches.length > 0) || obfuscatedPhoneMatch) {
      violationRule = 'Phone Number Leak Guard';
      detectedType = 'Mobile Phone Number (Cross-Message Split Leak)';
    }
  }

  // 3. Email Address Leak Check (Direct + Obfuscated)
  if ((config.antiEmail !== false) && !violationRule) {
    const normalizedEmailContent = combinedText.replace(/\[at\]|\(at\)|\bat\b/gi, '@').replace(/\[dot\]|\(dot\)|\bdot\b/gi, '.').replace(/\s+/g, '');
    const emailMatches = normalizedEmailContent.match(EMAIL_REGEX) || content.match(EMAIL_REGEX);
    if (emailMatches && emailMatches.length > 0) {
      violationRule = 'Email Address Leak Guard';
      detectedType = 'Private Email Address (Direct/Obfuscated)';
    }
  }

  // 3. Doxbin & Leak Link Blocker
  if (config.antiLinks && !violationRule) {
    const linkMatches = combinedText.match(LEAK_LINK_REGEX);
    if (linkMatches && linkMatches.length > 0) {
      violationRule = 'Doxbin & IP Logger Link Guard';
      detectedType = 'Doxbin / IP Logger URL';
    }
  }

  if (violationRule) {
    // 1. Instant Multi-Message Deletion (Deletes ALL messages that contributed to the split leak!)
    for (const item of userHistory) {
      if (item.msgId === message.id) {
        await message.delete().catch(() => {});
      } else {
        const cachedMsg = message.channel.messages?.cache?.get(item.msgId);
        if (cachedMsg) await cachedMsg.delete().catch(() => {});
        else await message.channel.messages?.delete(item.msgId).catch(() => {});
      }
    }
    userRecentMsgCache.delete(userKey);

    // 2. Auto-Timeout Violator (default 10 mins)
    const timeoutMs = (config.timeoutMinutes || 10) * 60 * 1000;
    if (message.member) {
      await message.member.timeout(timeoutMs, `Anti-Dox Security Violation: ${violationRule}`).catch(() => {});
    }

    // 3. Send 5-second Chat Warning
    message.channel.send(
      `<a:wrong_animated:1537179702928875631> <@${message.author.id}>, **Anti-Dox Security Intercepted:** Your message was blocked to protect user privacy (\`Rule: ${violationRule}\`).`
    ).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});

    // 4. Dispatch Masked Log Alert
    const infoBox = createDynamicBox('ANTI-DOX SECURITY INTERCEPTED', [
      `User     : ${message.author.username}`,
      `ID       : ${message.author.id}`,
      `Channel  : #${message.channel.name}`,
      `Rule     : ${violationRule}`,
      `Action   : ${config.timeoutMinutes}m Timeout`
    ]);

    const logEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`<a:security_animated:1537177499862171741> Anti-Dox Protection Alert in #${message.channel.name}`)
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        `• **Sender:** <@${message.author.id}> (\`${message.author.tag}\`)\n` +
        `• **Channel:** <#${message.channel.id}>\n` +
        `• **Violation Type:** \`${detectedType}\`\n` +
        `• **Action Taken:** Message deleted & **${config.timeoutMinutes} Minutes Timeout** applied!\n\n` +
        `*Notice: Personal privacy leak attempts are strictly monitored by Naruto Anti-Dox Security.*`
      )
      .setTimestamp();

    dispatchLog(message.guild, 'automod', logEmbed);
    dispatchLog(message.guild, 'antinuke', logEmbed);
    return true;
  }

  return false;
}

module.exports = {
  name: 'antidox',
  description: 'Anti-Dox & Leak Guard Protection Suite (IP, Phone Number, Doxbin & IP Logger Links)',
  aliases: ['doxguard', 'doxprotect', 'antidoxguard', 'dox'],
  getOrCreateAntidox,
  updateAntidox,
  checkMessageForDox,

  async execute(message, args) {
    const author = message.author;
    const guild = message.guild;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply(`${emojis.WARNING} Only Administrators can configure Anti-Dox security.`);
    }

    const sub = args[0]?.toLowerCase();
    const config = getOrCreateAntidox(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    if (sub === 'enable' || sub === 'on') {
      updateAntidox(guild.id, c => { c.enabled = true; });
      return message.reply(`<a:security_animated:1537177499862171741> **Anti-Dox Security** is now **ENABLED** for ${guild.name}!`);
    }

    if (sub === 'disable' || sub === 'off') {
      updateAntidox(guild.id, c => { c.enabled = false; });
      return message.reply(`<a:wrong_animated:1537179702928875631> **Anti-Dox Security** has been **DISABLED**.`);
    }

    if (sub === 'ip') {
      const mode = args[1]?.toLowerCase();
      const newState = mode === 'on' || mode === 'enable' ? true : mode === 'off' || mode === 'disable' ? false : !config.antiIp;
      updateAntidox(guild.id, c => { c.antiIp = newState; });
      return message.reply(`🛡️ IP Address Leak Guard is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
    }

    if (sub === 'phone') {
      const mode = args[1]?.toLowerCase();
      const newState = mode === 'on' || mode === 'enable' ? true : mode === 'off' || mode === 'disable' ? false : !config.antiPhone;
      updateAntidox(guild.id, c => { c.antiPhone = newState; });
      return message.reply(`🛡️ Phone Number Leak Guard is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
    }

    if (sub === 'links') {
      const mode = args[1]?.toLowerCase();
      const newState = mode === 'on' || mode === 'enable' ? true : mode === 'off' || mode === 'disable' ? false : !config.antiLinks;
      updateAntidox(guild.id, c => { c.antiLinks = newState; });
      return message.reply(`🛡️ Doxbin & IP Logger Link Blocker is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
    }

    // Default: Status & Configuration Panel
    const box = createDynamicBox('ANTI-DOX SECURITY STATUS', [
      `System Status   : ${config.enabled ? 'ENABLED (ACTIVE)' : 'DISABLED'}`,
      `IP Leak Guard   : ${config.antiIp ? 'ENABLED' : 'DISABLED'}`,
      `Phone Guard     : ${config.antiPhone ? 'ENABLED' : 'DISABLED'}`,
      `Dox Link Block  : ${config.antiLinks ? 'ENABLED' : 'DISABLED'}`,
      `Auto Timeout    : ${config.timeoutMinutes} Minutes`
    ]);

    const embed = createStyledEmbed({
      title: `<a:security_animated:1537177499862171741> Anti-Dox Privacy Guard Panel — ${guild.name}`,
      subtitle: `Real-Time PII Leak Protection & IP/Phone Blocker`,
      description:
        '```\n' + box + '\n```\n\n' +
        `**Commands & Sub-Controls:**\n` +
        `• \`.antidox enable\` — Turn ON Anti-Dox Security\n` +
        `• \`.antidox disable\` — Turn OFF Anti-Dox Security\n` +
        `• \`.antidox ip <on|off>\` — Toggle IP Address Leak Filter\n` +
        `• \`.antidox phone <on|off>\` — Toggle Phone Number Leak Filter\n` +
        `• \`.antidox links <on|off>\` — Toggle Doxbin/IP Logger Link Blocker`,
      requestedBy: author,
      clientUser
    });

    return message.channel.send({ embeds: [embed] });
  }
};
