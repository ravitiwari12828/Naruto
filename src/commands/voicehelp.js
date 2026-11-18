const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const emojis = require('../utils/emojis');

// Anti-spam cooldown map: userId -> timestamp
const voiceHelpCooldowns = new Map();
const COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

module.exports = {
  name: 'voicehelp',
  description: 'Request immediate staff assistance in your current voice channel',
  aliases: ['vchelp', 'callstaff', 'voiceassist', 'vchelpdesk'],

  async execute(message, args) {
    const author = message.author;
    const member = message.member;
    const guild = message.guild;

    // 1. User must be in a Voice Channel
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply(`⚠️ **You must be connected to a Voice Channel to request voice assistance!**`);
    }

    // 2. Cooldown Check (60 seconds)
    const now = Date.now();
    const lastUsed = voiceHelpCooldowns.get(author.id) || 0;
    if (now - lastUsed < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      return message.reply(`⏳ **Please wait ${remainingSec}s before requesting voice assistance again!**`);
    }
    voiceHelpCooldowns.set(author.id, now);

    // 3. Build exact UI matching screenshot
    const embed = new EmbedBuilder()
      .setColor(0xFEE75C) // Golden Warning Yellow
      .setTitle('⚠️ | Voice Assistance Requested')
      .setDescription(
        `👤 **User:** <@${author.id}>\n` +
        `🔊 **VC Name:** \`${voiceChannel.name}\`\n` +
        `📢 **Alert:** @here (Staff Notification)\n` +
        `🔊 **Voice Channel:** <#${voiceChannel.id}>`
      )
      .setFooter({ text: `Requested by ${author.tag || author.username}` })
      .setTimestamp();

    // Direct Join Voice Channel Link Button
    const directVcUrl = `https://discord.com/channels/${guild.id}/${voiceChannel.id}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Voice Channel')
        .setStyle(ButtonStyle.Link)
        .setURL(directVcUrl)
        .setEmoji('↗️')
    );

    // Delete trigger message for clean chat if permitted
    message.delete().catch(() => {});

    // Send alert message in current channel
    await message.channel.send({
      content: `🔔 **Staff have been notified!**`,
      embeds: [embed],
      components: [row]
    });

    // Optional: Also dispatch alert to staff modlogs channel if available
    try {
      const { dispatchLog } = require('../utils/logger');
      dispatchLog(guild, 'modlogs', embed);
    } catch (e) {}
  }
};
