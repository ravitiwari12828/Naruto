const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');
const { buildVoiceHelpEmbed } = require('./voicemaster');

module.exports = {
  name: 'voice',
  description: 'Custom Voice Channels Suite: .vc help, .vc info, .vc name, .vc size, .vc lock, .vc unlock, .vc ghost, .vc unghost, .vc claim, .vc transfer, .vc permit, .vc unpermit, .vc kick, .vc ban, .vc unban, .vc activity',
  aliases: [
    'voicechannel',
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
      if (!newName) return message.reply(`${emojis.INFO} Usage: \`.vc name <new channel name>\``);
      await voiceState.channel.setName(newName);
      return message.reply(`${emojis.SUCCESS} Renamed your Voice Channel to **${newName}**.`);
    }

    // 3. .vc size <amount/unlimited>
    if (sub === 'size' || sub === 'limit') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const amountArg = args[1]?.toLowerCase();
      if (!amountArg) return message.reply(`${emojis.INFO} Usage: \`.vc size <amount / unlimited>\``);

      let limit = 0;
      if (amountArg !== 'unlimited' && amountArg !== '0') {
        limit = parseInt(amountArg);
        if (isNaN(limit) || limit < 1 || limit > 99) return message.reply(`${emojis.INFO} Enter a valid channel size limit between 1 and 99.`);
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

    // 5. .vc ghost / unghost
    if (sub === 'ghost' || sub === 'hide') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      await voiceState.channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
      return message.reply(`${emojis.SUCCESS} Hidden **${voiceState.channel.name}** from the channel sidebar.`);
    }

    if (sub === 'unghost' || sub === 'unhide' || sub === 'reveal') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      await voiceState.channel.permissionOverwrites.edit(guild.id, { ViewChannel: null });
      return message.reply(`${emojis.SUCCESS} Revealed **${voiceState.channel.name}** in the channel sidebar.`);
    }

    // 6. .vc claim
    if (sub === 'claim') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to the Voice Channel you want to claim!`);
      const vmCmd = message.client.commands.get('voicemaster');
      const cfg = vmCmd ? vmCmd.getOrCreateVMConfig(guild.id) : null;
      const vcData = cfg?.activeTempVCs?.get(voiceState.channel.id);

      if (!vcData) return message.reply(`${emojis.WARNING} This is not a temporary Voice Channel!`);

      const currentOwner = guild.members.cache.get(vcData.ownerId);
      if (currentOwner && currentOwner.voice?.channel?.id === voiceState.channel.id && currentOwner.id !== author.id) {
        return message.reply(`${emojis.WARNING} The channel owner **${currentOwner.user.tag}** is currently connected to this VC!`);
      }

      vcData.ownerId = author.id;
      await voiceState.channel.permissionOverwrites.edit(author.id, {
        ManageChannels: true, MoveMembers: true, MuteMembers: true, DeafenMembers: true
      });
      return message.reply(`${emojis.SUCCESS} Claimed ownership of **${voiceState.channel.name}**!`);
    }

    // 7. .vc transfer @user
    if (sub === 'transfer') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target || !target.voice?.channel) return message.reply(`${emojis.INFO} Mention a member connected to your VC to transfer ownership!`);

      const vmCmd = message.client.commands.get('voicemaster');
      const cfg = vmCmd ? vmCmd.getOrCreateVMConfig(guild.id) : null;
      const vcData = cfg?.activeTempVCs?.get(voiceState.channel.id);

      if (vcData) vcData.ownerId = target.id;
      await voiceState.channel.permissionOverwrites.edit(target.id, {
        ManageChannels: true, MoveMembers: true, MuteMembers: true, DeafenMembers: true
      });
      return message.reply(`${emojis.SUCCESS} Transferred channel ownership to **${target.user.tag}**.`);
    }

    // 8. .vc permit / allow @user
    if (sub === 'permit' || sub === 'allow') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc permit @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
      return message.reply(`${emojis.SUCCESS} Allowed **${target.user.tag}** to join your Voice Channel.`);
    }

    // 9. .vc unpermit / revoke @user
    if (sub === 'unpermit' || sub === 'revoke') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc unpermit @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: false });
      return message.reply(`${emojis.SUCCESS} Removed **${target.user.tag}** from the allowed list.`);
    }

    // 10. .vc kick @user
    if (sub === 'vckick' || sub === 'kick') {
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently connected to your Voice Channel!`);
      await target.voice.disconnect();
      return message.reply(`${emojis.SUCCESS} Disconnected **${target.user.tag}** from voice channel.`);
    }

    // 11. .vc ban / unban @user
    if (sub === 'ban') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc ban @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
      if (target.voice?.channel?.id === voiceState.channel.id) {
        await target.voice.disconnect().catch(() => {});
      }
      return message.reply(`${emojis.SUCCESS} Banned **${target.user.tag}** from your Voice Channel.`);
    }

    if (sub === 'unban') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      const target = message.mentions.members?.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc unban @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: null, ViewChannel: null });
      return message.reply(`${emojis.SUCCESS} Unbanned **${target.user.tag}** from your Voice Channel.`);
    }

    // 12. .vc activity
    if (sub === 'activity') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to a Voice Channel!`);
      return message.reply(`🎮 Open Discord Voice Controls to launch YouTube Watch Together, Poker, or Chess in **${voiceState.channel.name}**!`);
    }

    // Default: Voice Help Embed
    const helpEmbed = buildVoiceHelpEmbed(message.member);
    return message.channel.send({ embeds: [helpEmbed] });
  }
};
