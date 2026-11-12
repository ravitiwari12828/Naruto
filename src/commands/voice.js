const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { buildVoiceHelpEmbed } = require('./voicemaster');
const { verifyPermit, checkTargetHierarchy, isPermitBypass } = require('../utils/modPermits');

function isTempVcOwner(message, voiceChan) {
  if (!voiceChan || !message.guild) return false;
  const vmCmd = message.client.commands.get('voicemaster');
  const cfg = vmCmd ? vmCmd.getOrCreateVMConfig(message.guild.id) : null;
  const vcData = cfg?.activeTempVCs?.get(voiceChan.id);
  return Boolean(vcData && vcData.ownerId === message.author.id);
}

async function resolveTargetMember(message, rawArg) {
  const mentioned = message.mentions.members?.first();
  if (mentioned) return mentioned;
  if (!rawArg) return null;
  const cleanId = rawArg.replace(/[<@!>]/g, '');
  if (!/^\d{17,21}$/.test(cleanId)) return null;
  return message.guild.members.cache.get(cleanId) || await message.guild.members.fetch(cleanId).catch(() => null);
}

function resolveVoiceChannel(guild, rawArg, message) {
  const mentioned = message.mentions.channels?.first();
  if (mentioned && (mentioned.type === ChannelType.GuildVoice || mentioned.type === ChannelType.GuildStageVoice)) {
    return mentioned;
  }
  if (!rawArg) return null;
  const cleanId = rawArg.replace(/[<#>]/g, '');
  const byId = guild.channels.cache.get(cleanId);
  if (byId && (byId.type === ChannelType.GuildVoice || byId.type === ChannelType.GuildStageVoice)) {
    return byId;
  }
  const lower = rawArg.toLowerCase();
  return guild.channels.cache.find(
    c => (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice) &&
         c.name.toLowerCase() === lower
  ) || null;
}

module.exports = {
  name: 'voice',
  description: 'Voice Channels & VC Moderation Suite: .vc help/lock/kick/ban, .vcmute, .vcdeafen, .vckick, .vcmove, .vcpull, .vclist, mass VC commands',
  aliases: [
    'voicechannel',
    'vcdeafen', 'vcundeafen', 'vckick', 'vckickall',
    'vclist', 'vcmove', 'vcmoveall', 'vcmute', 'vcmuteall',
    'vcpull', 'vcpullall', 'vcunmute', 'vcunmuteall'
  ],

  async execute(message, args) {
    const rawFirstWord = message.content.trim().split(/ +/)[0] || '';
    const invoked = rawFirstWord.replace(/^[^a-zA-Z0-9]+/, '').toLowerCase();
    const isTopLevelVc = invoked.startsWith('vc') && invoked !== 'vc' && invoked !== 'voice';
    const sub = isTopLevelVc ? invoked : args[0]?.toLowerCase();
    const cmdArgs = isTopLevelVc ? args : args.slice(1);

    const author = message.author;
    const voiceState = message.member?.voice;
    const guild = message.guild;
    const botMember = guild.members.me;

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // 0. VOICE HELP COMMAND (.vc help / .voice)
    if (sub === 'help' || !sub) {
      const helpEmbed = buildVoiceHelpEmbed(message.member);
      return message.channel.send({ embeds: [helpEmbed] });
    }

    // ====================================================
    // TIER 1 VC PERMIT COMMANDS (vc_mute_deafen)
    // ====================================================

    // .vclist [optional #vc]
    if (sub === 'vclist') {
      const perm = await verifyPermit(message, 'vc_mute_deafen', 'vclist');
      if (!perm.allowed) return;

      const targetVc = resolveVoiceChannel(guild, cmdArgs[0], message) || voiceState?.channel;
      if (!targetVc) {
        // Show server-wide active voice overview
        const activeVcs = guild.channels.cache
          .filter(c => (c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice) && c.members.size > 0);
        if (activeVcs.size === 0) {
          return message.reply(`${emojis.INFO || 'ℹ️'} No members are currently connected to any Voice Channel.`);
        }
        const summary = activeVcs
          .map(vc => `🔊 **${vc.name}** (\`${vc.members.size}\` connected)`)
          .slice(0, 20)
          .join('\n');
        const embed = createStyledEmbed({
          title: `🔊 Active Voice Channels`,
          description: summary,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const members = [...targetVc.members.values()];
      const listText = members.length > 0
        ? members.slice(0, 30).map(m => {
            const flags = [
              m.voice.serverMute ? '🔇 Server Muted' : (m.voice.selfMute ? '🎙️ Self Muted' : ''),
              m.voice.serverDeaf ? '🔕 Server Deafened' : (m.voice.selfDeaf ? '🎧 Self Deafened' : '')
            ].filter(Boolean).join(' • ');
            return `• <@${m.id}> (\`${m.user.tag}\`)${flags ? ` — *${flags}*` : ''}`;
          }).join('\n')
        : '*Channel is empty.*';

      const embed = createStyledEmbed({
        title: `🔊 Voice Members — ${targetVc.name}`,
        description: listText,
        requestedBy: author,
        clientUser,
        footerText: `Connected: ${members.length}${targetVc.userLimit ? ` / ${targetVc.userLimit}` : ''}`
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .vcmute / .vcunmute @user
    if (sub === 'vcmute' || sub === 'vcunmute') {
      const perm = await verifyPermit(message, 'vc_mute_deafen', sub);
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Mute Members** permission to do that.`);
      }

      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.WARNING || '⚠️'} Usage: \`.${sub} @user [reason]\``);
      if (!target.voice?.channel) return message.reply(`${emojis.WARNING || '⚠️'} <@${target.id}> is not connected to a Voice Channel.`);
      if (!(await checkTargetHierarchy(message, target, sub === 'vcmute' ? 'VC mute' : 'VC unmute'))) return;

      const doMute = sub === 'vcmute';
      const reason = cmdArgs.slice(1).join(' ') || `${doMute ? 'VC Muted' : 'VC Unmuted'} by ${author.tag}`;
      await target.voice.setMute(doMute, reason);
      return message.reply(`${emojis.SUCCESS || '✅'} ${doMute ? '🔇 Server-muted' : '🔊 Server-unmuted'} **${target.user.tag}** in **${target.voice.channel.name}**.`);
    }

    // .vcdeafen / .vcundeafen @user
    if (sub === 'vcdeafen' || sub === 'vcundeafen') {
      const perm = await verifyPermit(message, 'vc_mute_deafen', sub);
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.DeafenMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Deafen Members** permission to do that.`);
      }

      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.WARNING || '⚠️'} Usage: \`.${sub} @user [reason]\``);
      if (!target.voice?.channel) return message.reply(`${emojis.WARNING || '⚠️'} <@${target.id}> is not connected to a Voice Channel.`);
      if (!(await checkTargetHierarchy(message, target, sub === 'vcdeafen' ? 'VC deafen' : 'VC undeafen'))) return;

      const doDeaf = sub === 'vcdeafen';
      const reason = cmdArgs.slice(1).join(' ') || `${doDeaf ? 'VC Deafened' : 'VC Undeafened'} by ${author.tag}`;
      await target.voice.setDeaf(doDeaf, reason);
      return message.reply(`${emojis.SUCCESS || '✅'} ${doDeaf ? '🔕 Server-deafened' : '🎧 Server-undeafened'} **${target.user.tag}** in **${target.voice.channel.name}**.`);
    }

    // ====================================================
    // TIER 3 VC PERMIT COMMANDS (vc_move_pull)
    // ====================================================

    // .vcmove @user <#channel | vcId | channelName>
    if (sub === 'vcmove') {
      const perm = await verifyPermit(message, 'vc_move_pull', 'vcmove');
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Move Members** permission to move users.`);
      }

      const target = await resolveTargetMember(message, cmdArgs[0]);
      const destVc = resolveVoiceChannel(guild, cmdArgs.slice(1).join(' '), message);
      if (!target || !destVc) {
        return message.reply(`${emojis.WARNING || '⚠️'} Usage: \`.vcmove @user <#voiceChannel | channelId>\``);
      }
      if (!target.voice?.channel) return message.reply(`${emojis.WARNING || '⚠️'} <@${target.id}> is not connected to any Voice Channel.`);
      if (!(await checkTargetHierarchy(message, target, 'VC move'))) return;

      await target.voice.setChannel(destVc, `Moved by ${author.tag}`);
      return message.reply(`${emojis.SUCCESS || '✅'} Moved **${target.user.tag}** to **${destVc.name}**.`);
    }

    // .vcpull @user
    if (sub === 'vcpull') {
      const perm = await verifyPermit(message, 'vc_move_pull', 'vcpull');
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Move Members** permission to pull users.`);
      }
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING || '⚠️'} You must be connected to a Voice Channel first!`);

      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.WARNING || '⚠️'} Usage: \`.vcpull @user\``);
      if (!target.voice?.channel) return message.reply(`${emojis.WARNING || '⚠️'} <@${target.id}> is not connected to any Voice Channel.`);
      if (!(await checkTargetHierarchy(message, target, 'VC pull'))) return;

      await target.voice.setChannel(voiceState.channel, `Pulled by ${author.tag}`);
      return message.reply(`${emojis.SUCCESS || '✅'} Pulled **${target.user.tag}** into **${voiceState.channel.name}**.`);
    }

    // ====================================================
    // TIER 4 MASS VC PERMIT COMMANDS (vc_mass_control)
    // ====================================================

    // .vcmuteall / .vcunmuteall
    if (sub === 'vcmuteall' || sub === 'vcunmuteall') {
      const perm = await verifyPermit(message, 'vc_mass_control', sub);
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Mute Members** permission to do that.`);
      }

      const targetVc = resolveVoiceChannel(guild, cmdArgs[0], message) || voiceState?.channel;
      if (!targetVc) return message.reply(`${emojis.WARNING || '⚠️'} Join or specify a Voice Channel first!`);

      const doMute = sub === 'vcmuteall';
      const bypass = isPermitBypass(message.member);
      let count = 0;

      for (const member of targetVc.members.values()) {
        if (member.id === author.id) continue;
        if (!bypass && (isPermitBypass(member) || member.roles.highest.position >= message.member.roles.highest.position)) continue;
        await member.voice.setMute(doMute, `Mass VC ${doMute ? 'mute' : 'unmute'} by ${author.tag}`).then(() => count++).catch(() => {});
      }

      return message.reply(`${emojis.SUCCESS || '✅'} ${doMute ? 'Muted' : 'Unmuted'} **${count}** member(s) in **${targetVc.name}**.`);
    }

    // .vckickall
    if (sub === 'vckickall') {
      const perm = await verifyPermit(message, 'vc_mass_control', 'vckickall');
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Move Members** permission to disconnect users.`);
      }

      const targetVc = resolveVoiceChannel(guild, cmdArgs[0], message) || voiceState?.channel;
      if (!targetVc) return message.reply(`${emojis.WARNING || '⚠️'} Join or specify a Voice Channel first!`);

      const bypass = isPermitBypass(message.member);
      let count = 0;

      for (const member of targetVc.members.values()) {
        if (member.id === author.id) continue;
        if (!bypass && (isPermitBypass(member) || member.roles.highest.position >= message.member.roles.highest.position)) continue;
        await member.voice.disconnect(`Mass VC kick by ${author.tag}`).then(() => count++).catch(() => {});
      }

      return message.reply(`${emojis.SUCCESS || '✅'} Disconnected **${count}** member(s) from **${targetVc.name}**.`);
    }

    // .vcmoveall <#destVC | vcId>
    if (sub === 'vcmoveall') {
      const perm = await verifyPermit(message, 'vc_mass_control', 'vcmoveall');
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Move Members** permission to move users.`);
      }
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING || '⚠️'} Connect to the source Voice Channel first!`);

      const destVc = resolveVoiceChannel(guild, cmdArgs.join(' '), message);
      if (!destVc) return message.reply(`${emojis.WARNING || '⚠️'} Usage: \`.vcmoveall <#destinationVC | channelId>\``);

      const bypass = isPermitBypass(message.member);
      let count = 0;

      for (const member of voiceState.channel.members.values()) {
        if (!bypass && member.id !== author.id && (isPermitBypass(member) || member.roles.highest.position >= message.member.roles.highest.position)) continue;
        await member.voice.setChannel(destVc, `Mass VC move by ${author.tag}`).then(() => count++).catch(() => {});
      }

      return message.reply(`${emojis.SUCCESS || '✅'} Moved **${count}** member(s) from **${voiceState.channel.name}** to **${destVc.name}**.`);
    }

    // .vcpullall <#sourceVC | vcId>
    if (sub === 'vcpullall') {
      const perm = await verifyPermit(message, 'vc_mass_control', 'vcpullall');
      if (!perm.allowed) return;
      if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need the **Move Members** permission to pull users.`);
      }
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING || '⚠️'} Connect to the destination Voice Channel first!`);

      const sourceVc = resolveVoiceChannel(guild, cmdArgs.join(' '), message);
      if (!sourceVc) return message.reply(`${emojis.WARNING || '⚠️'} Usage: \`.vcpullall <#sourceVC | channelId>\``);

      const bypass = isPermitBypass(message.member);
      let count = 0;

      for (const member of sourceVc.members.values()) {
        if (!bypass && member.id !== author.id && (isPermitBypass(member) || member.roles.highest.position >= message.member.roles.highest.position)) continue;
        await member.voice.setChannel(voiceState.channel, `Mass VC pull by ${author.tag}`).then(() => count++).catch(() => {});
      }

      return message.reply(`${emojis.SUCCESS || '✅'} Pulled **${count}** member(s) from **${sourceVc.name}** into **${voiceState.channel.name}**.`);
    }

    // ====================================================
    // TEMP-VC / VC MANAGEMENT COMMANDS (TempVC Owner OR Mod Permit)
    // ====================================================

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
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc name');
        if (!perm.allowed) return;
      }
      const newName = cmdArgs.join(' ');
      if (!newName) return message.reply(`${emojis.INFO} Usage: \`.vc name <new channel name>\``);
      await voiceState.channel.setName(newName);
      return message.reply(`${emojis.SUCCESS} Renamed your Voice Channel to **${newName}**.`);
    }

    // 3. .vc size <amount/unlimited>
    if (sub === 'size' || sub === 'limit') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc size');
        if (!perm.allowed) return;
      }
      const amountArg = cmdArgs[0]?.toLowerCase();
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
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc lock');
        if (!perm.allowed) return;
      }
      await voiceState.channel.permissionOverwrites.edit(guild.id, { Connect: false });
      return message.reply(`${emojis.LOCK} Locked **${voiceState.channel.name}** (Private).`);
    }

    if (sub === 'unlock') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc unlock');
        if (!perm.allowed) return;
      }
      await voiceState.channel.permissionOverwrites.edit(guild.id, { Connect: null });
      return message.reply(`${emojis.UNLOCK} Unlocked **${voiceState.channel.name}** (Public).`);
    }

    // 5. .vc ghost / unghost
    if (sub === 'ghost' || sub === 'hide') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc ghost');
        if (!perm.allowed) return;
      }
      await voiceState.channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
      return message.reply(`${emojis.SUCCESS} Hidden **${voiceState.channel.name}** from the channel sidebar.`);
    }

    if (sub === 'unghost' || sub === 'unhide' || sub === 'reveal') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc unghost');
        if (!perm.allowed) return;
      }
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
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc transfer');
        if (!perm.allowed) return;
      }
      const target = await resolveTargetMember(message, cmdArgs[0]);
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
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc permit');
        if (!perm.allowed) return;
      }
      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc permit @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true });
      return message.reply(`${emojis.SUCCESS} Allowed **${target.user.tag}** to join your Voice Channel.`);
    }

    // 9. .vc unpermit / revoke @user
    if (sub === 'unpermit' || sub === 'revoke') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to your Voice Channel!`);
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_normal', 'vc unpermit');
        if (!perm.allowed) return;
      }
      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc unpermit @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: false });
      return message.reply(`${emojis.SUCCESS} Removed **${target.user.tag}** from the allowed list.`);
    }

    // 10. .vckick @user | .vc kick @user
    if (sub === 'vckick' || sub === 'kick') {
      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target || !target.voice?.channel) {
        return message.reply(`${emojis.WARNING} Mention a member currently connected to a Voice Channel!`);
      }

      const ownerInSameVc = isTempVcOwner(message, target.voice.channel) && voiceState?.channel?.id === target.voice.channel.id;
      if (!ownerInSameVc) {
        const perm = await verifyPermit(message, 'vc_normal', 'vckick');
        if (!perm.allowed) return;
        if (!(await checkTargetHierarchy(message, target, 'VC kick'))) return;
      }

      if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
        return message.reply(`${emojis.WARNING || '⚠️'} I need **Move Members** permission to disconnect users.`);
      }

      await target.voice.disconnect(`VC Kick by ${author.tag}`);
      return message.reply(`${emojis.SUCCESS} Disconnected **${target.user.tag}** from **${target.voice.channel.name}**.`);
    }

    // 11. .vc ban / unban @user
    if (sub === 'ban') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to a Voice Channel!`);
      const isOwner = isTempVcOwner(message, voiceState.channel);
      if (!isOwner) {
        const perm = await verifyPermit(message, 'vc_mass_control', 'vc ban');
        if (!perm.allowed) return;
      }
      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc ban @user\``);
      if (!isOwner && !(await checkTargetHierarchy(message, target, 'VC ban'))) return;

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
      if (target.voice?.channel?.id === voiceState.channel.id) {
        await target.voice.disconnect().catch(() => {});
      }
      return message.reply(`${emojis.SUCCESS} Banned **${target.user.tag}** from **${voiceState.channel.name}**.`);
    }

    if (sub === 'unban') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be connected to a Voice Channel!`);
      if (!isTempVcOwner(message, voiceState.channel)) {
        const perm = await verifyPermit(message, 'vc_mass_control', 'vc unban');
        if (!perm.allowed) return;
      }
      const target = await resolveTargetMember(message, cmdArgs[0]);
      if (!target) return message.reply(`${emojis.INFO} Usage: \`.vc unban @user\``);

      await voiceState.channel.permissionOverwrites.edit(target.id, { Connect: null, ViewChannel: null });
      return message.reply(`${emojis.SUCCESS} Unbanned **${target.user.tag}** from **${voiceState.channel.name}**.`);
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
