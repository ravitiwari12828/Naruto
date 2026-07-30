const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { buildVoiceHelpEmbed } = require('./voicemaster');

module.exports = {
  name: 'voice',
  description: 'Custom Voice Channels Suite: .vc help, .vc info, .vc name, .vc size, .vc lock, .vc unlock, .vc permit, .vc unpermit, .vc kick, .vc ban, .vc unban',
  aliases: [
    'vc', 'voicechannel',
    'vcdeafen', 'vcundeafen', 'vckick', 'vckickall',
    'vclist', 'vcmoveall', 'vcmute', 'vcmuteall',
    'vcpull', 'vcpullall', 'vcunmute', 'vcunmuteall'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked.startsWith('vc') && invoked !== 'vc' && invoked !== 'voice') {
      sub = invoked;
    }

    const author = message.author;
    const voiceState = message.member?.voice;
    const guild = message.guild;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 0. VOICE HELP COMMAND (.vc help / !voice help)
    if (sub === 'help' || !sub) {
      const helpEmbed = buildVoiceHelpEmbed(message.member);
      return message.channel.send({ embeds: [helpEmbed] });
    }

    // 1. .vc info / settings
    if (sub === 'info' || sub === 'settings') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const chan = voiceState.channel;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: 'Channel Settings', iconURL: author.displayAvatarURL({ dynamic: true }) })
        .setTitle(`🔊 ${chan.name}`)
        .setDescription(
          `• **Channel ID:** \`${chan.id}\`\n` +
          `• **User Limit:** \`${chan.userLimit || 'Unlimited'}\`\n` +
          `• **Connected Members:** \`${chan.members.size}\`\n` +
          `• **Bitrate:** \`${chan.bitrate / 1000} kbps\``
        )
        .setFooter({ text: `Requested by ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) });

      return message.channel.send({ embeds: [embed] });
    }

    // 2. .vc name <new_name>
    if (sub === 'name' || sub === 'rename') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const newName = args.slice(1).join(' ');
      if (!newName) return message.reply(`ℹ️ Usage: \`.vc name <new channel name>\``);
      await voiceState.channel.setName(newName);
      return message.reply(`${emojis.SUCCESS} Renamed your Voice Channel to **${newName}**.`);
    }

    // 3. .vc size <amount/unlimited>
    if (sub === 'size' || sub === 'limit') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const amountArg = args[1]?.toLowerCase();
      if (!amountArg) return message.reply(`ℹ️ Usage: \`.vc size <amount / unlimited>\``);

      let limit = 0;
      if (amountArg !== 'unlimited' && amountArg !== '0') {
        limit = parseInt(amountArg);
        if (isNaN(limit) || limit < 1 || limit > 99) return message.reply(`ℹ️ Enter a valid channel size limit between 1 and 99.`);
      }

      await voiceState.channel.setUserLimit(limit);
      return message.reply(`${emojis.SUCCESS} Set Voice Channel size limit to **${limit === 0 ? 'Unlimited' : limit}**.`);
    }

    // 4. .vc lock / unlock
    if (sub === 'lock') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      await voiceState.channel.permissionOverwrites.edit(guild.id, { Connect: false });
      return message.reply(`${emojis.LOCK} Locked **${voiceState.channel.name}** (Private).`);
    }

    if (sub === 'unlock') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      await voiceState.channel.permissionOverwrites.edit(guild.id, { Connect: null });
      return message.reply(`${emojis.UNLOCK} Unlocked **${voiceState.channel.name}** (Public).`);
    }

    // 5. .vc permit / allow @user
    if (sub === 'permit' || sub === 'allow') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`ℹ️ Usage: \`.vc permit @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
      return message.reply(`${emojis.SUCCESS} Allowed **${target.user.tag}** to join your Voice Channel.`);
    }

    // 6. .vc unpermit / revoke @user
    if (sub === 'unpermit' || sub === 'revoke') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`ℹ️ Usage: \`.vc unpermit @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: false });
      return message.reply(`${emojis.SUCCESS} Removed **${target.user.tag}** from the allowed list.`);
    }

    // 7. .vc kick @user
    if (sub === 'vckick' || sub === 'kick') {
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently connected to your Voice Channel!`);
      await target.voice.disconnect();
      return message.reply(`${emojis.SUCCESS} Disconnected **${target.user.tag}** from voice channel.`);
    }

    // 8. .vc ban / unban @user
    if (sub === 'ban') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`ℹ️ Usage: \`.vc ban @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
      if (target.voice?.channel?.id === voiceState.channel.id) {
        await target.voice.disconnect().catch(() => {});
      }
      return message.reply(`${emojis.SUCCESS} Banned **${target.user.tag}** from your Voice Channel.`);
    }

    if (sub === 'unban') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`ℹ️ Usage: \`.vc unban @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: null, ViewChannel: null });
      return message.reply(`${emojis.SUCCESS} Unbanned **${target.user.tag}** from your Voice Channel.`);
    }

    // Default: Voice Help Embed
    const helpEmbed = buildVoiceHelpEmbed(message.member);
    return message.channel.send({ embeds: [helpEmbed] });
  }
};
