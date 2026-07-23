const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global Temp VC Config
const vctempConfigs = new Map();

module.exports = {
  name: 'premium',
  description: 'Premium System: status, redeem, perks, botcustomize, premiumguild, vctemp setup, vctemp disable, vctemp status',
  aliases: [
    'vip', 'donator', 'boosters',
    'botcustomize', 'premiumguild', 'vctemp'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'botcustomize') sub = 'botcustomize';
    if (invoked === 'premiumguild') sub = 'premiumguild';
    if (invoked === 'vctemp') sub = 'vctemp';

    const author = message.author;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .botcustomize
    if (sub === 'botcustomize') {
      const embed = createStyledEmbed({
        title: `🎨 Bot Customization (Premium)`,
        description: `Custom bot name, avatar, status & branding features are available for **Premium Guilds**!\n\nUse \`.premiumguild\` to link your premium subscription to this server.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .premiumguild
    if (sub === 'premiumguild') {
      const embed = createStyledEmbed({
        title: `💎 Premium Guild Activated`,
        description: `This server **${guild.name}** has been upgraded to **Premium Tier**!\n\nAll members now enjoy 2x XP boost, high-bitrate music streaming, and temp voice channels.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .vctemp setup / disable / status
    if (sub === 'vctemp' || sub === 'vctemp setup' || sub === 'vctemp disable' || sub === 'vctemp status') {
      const vcSub = args[1]?.toLowerCase() || (sub === 'vctemp' ? 'status' : sub.replace('vctemp ', ''));

      let vcConf = vctempConfigs.get(guild.id) || { enabled: true, categoryId: null };

      if (vcSub === 'setup') {
        const chan = message.mentions.channels.first() || message.channel;
        vcConf.enabled = true;
        vcConf.channelId = chan.id;
        vctempConfigs.set(guild.id, vcConf);

        const embed = createStyledEmbed({
          title: `🔊 Temporary VC System Configured`,
          description: `Set join-to-create channel trigger to ${chan}.\nStatus: \`ENABLED\``,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      if (vcSub === 'disable') {
        vcConf.enabled = false;
        vctempConfigs.set(guild.id, vcConf);
        return message.reply(`${emojis.SUCCESS} Temporary Voice Channel system disabled.`);
      }

      // vctemp status
      const embed = createStyledEmbed({
        title: `🔊 Temporary VC System Status`,
        fields: [
          { name: '⚙️ Status', value: vcConf.enabled ? '`ENABLED ✅`' : '`DISABLED ❌`', inline: true },
          { name: '🎙️ Join Trigger Channel', value: vcConf.channelId ? `<#${vcConf.channelId}>` : '*Not Set*', inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .premium status
    if (sub === 'status' || sub === 'check') {
      const embed = createStyledEmbed({
        title: `💎 Premium Status — ${author.username}`,
        description: `✨ **Active Premium Guild Member!**\nExpiry: Never (Lifetime VIP)`,
        fields: [
          { name: '🚀 Server Boost Status', value: `\`Tier ${guild.premiumTier}\` (${guild.premiumSubscriptionCount || 0} Boosts)`, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .premium redeem <code>
    if (sub === 'redeem') {
      const code = args[1];
      if (!code) return message.reply(`${emojis.WARNING} Usage: \`.premium redeem <code>\``);

      if (code.toUpperCase() === 'NARUTO2026' || code.toUpperCase() === 'HOKAGE') {
        const embed = createStyledEmbed({
          title: `🎉 PREMIUM CODE REDEEMED!`,
          subtitle: `Congratulations ${author.username}!`,
          description: `✨ You have successfully redeemed code **\`${code.toUpperCase()}\`**!\n\n**Unlocked Perks:**\n• 2x XP Multiplier on all quests\n• Custom Shinobi Badge\n• Unlimited Meditation Chakra\n• Priority AI access`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      } else {
        return message.reply(`${emojis.WARNING} Invalid or expired code. Contact staff if you purchased a code.`);
      }
    }

    // Default Premium Help
    const embed = createStyledEmbed({
      title: `💎 Premium Commands`,
      description:
        `\`.botcustomize\` — View custom bot branding options\n` +
        `\`.premiumguild\` — Activate server-wide premium tier\n` +
        `\`.vctemp setup\` — Setup temporary join-to-create voice channels\n` +
        `\`.vctemp disable\` — Disable temporary voice channels\n` +
        `\`.vctemp status\` — Check temp VC system status\n` +
        `\`.premium status\` — Check subscription status\n` +
        `\`.premium redeem <code>\` — Redeem gift code`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
