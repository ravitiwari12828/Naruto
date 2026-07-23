const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const db = require('../database/db');

module.exports = {
  name: 'voice',
  description: 'Voice Management Suite: vcdeafen, vckick, vckickall, vclist, vcmoveall, vcmute, vcmuteall, vcpull, vcpullall, vcundeafen, vcunmute, vcunmuteall',
  aliases: [
    'vc', 'voicechannel',
    'vcdeafen', 'vcundeafen', 'vckick', 'vckickall',
    'vclist', 'vcmoveall', 'vcmute', 'vcmuteall',
    'vcpull', 'vcpullall', 'vcunmute', 'vcunmuteall'
  ],

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (sub === 'setup' || sub === 'setupvc' || sub === 'vcsetup') {
      const vmCmd = message.client.commands.get('voicemaster');
      if (vmCmd) return vmCmd.execute(message, args);
    }

    // Directly handle top-level command invocations like .vcmute, .vckick, etc.
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

    // 1. vcdeafen @user
    if (sub === 'vcdeafen' || sub === 'deafen') {
      const target = message.mentions.members?.first();
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently in a Voice Channel!`);
      await target.voice.setDeaf(true);
      return message.reply(`🔇 Server deafened **${target.user.tag}** in VC.`);
    }

    // 2. vcundeafen @user
    if (sub === 'vcundeafen' || sub === 'undeafen') {
      const target = message.mentions.members?.first();
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently in a Voice Channel!`);
      await target.voice.setDeaf(false);
      return message.reply(`🔊 Undeafened **${target.user.tag}**.`);
    }

    // 3. vckick @user
    if (sub === 'vckick') {
      const target = message.mentions.members?.first();
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently in a Voice Channel!`);
      await target.voice.disconnect();
      return message.reply(`👢 Disconnected **${target.user.tag}** from voice channel.`);
    }

    // 4. vckickall
    if (sub === 'vckickall') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel!`);
      const members = voiceState.channel.members;
      let count = 0;
      for (const [_, member] of members) {
        if (!member.user.bot) {
          await member.voice.disconnect().catch(() => {});
          count++;
        }
      }
      return message.reply(`👢 Disconnected **${count}** members from **${voiceState.channel.name}**.`);
    }

    // 5. vclist
    if (sub === 'vclist') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel!`);
      const members = Array.from(voiceState.channel.members.values());
      const lines = members.map((m, i) => `\`${i + 1}.\` **${m.user.tag}** ${m.voice.mute ? '🔇' : '🎙️'} ${m.voice.deaf ? '🎧' : ''}`);

      const embed = createStyledEmbed({
        title: `🔊 Members in ${voiceState.channel.name} (${members.length})`,
        description: lines.join('\n') || '*No members*',
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 6. vcmoveall <#targetChannel>
    if (sub === 'vcmoveall') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel!`);
      const targetChan = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
      if (!targetChan || !targetChan.isVoiceBased()) return message.reply(`${emojis.WARNING} Mention a valid target Voice Channel!`);

      const members = voiceState.channel.members;
      let count = 0;
      for (const [_, member] of members) {
        await member.voice.setChannel(targetChan).catch(() => {});
        count++;
      }
      return message.reply(`🚚 Moved **${count}** members from **${voiceState.channel.name}** to **${targetChan.name}**.`);
    }

    // 7. vcmute @user
    if (sub === 'vcmute') {
      const target = message.mentions.members?.first();
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently in a Voice Channel!`);
      await target.voice.setMute(true);
      return message.reply(`🔇 Server muted **${target.user.tag}** in VC.`);
    }

    // 8. vcmuteall
    if (sub === 'vcmuteall') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel!`);
      let count = 0;
      for (const [_, member] of voiceState.channel.members) {
        if (!member.user.bot) {
          await member.voice.setMute(true).catch(() => {});
          count++;
        }
      }
      return message.reply(`🔇 Muted **${count}** members in **${voiceState.channel.name}**.`);
    }

    // 9. vcunmute @user
    if (sub === 'vcunmute') {
      const target = message.mentions.members?.first();
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently in a Voice Channel!`);
      await target.voice.setMute(false);
      return message.reply(`🎙️ Server unmuted **${target.user.tag}**.`);
    }

    // 10. vcunmuteall
    if (sub === 'vcunmuteall') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel!`);
      let count = 0;
      for (const [_, member] of voiceState.channel.members) {
        await member.voice.setMute(false).catch(() => {});
        count++;
      }
      return message.reply(`🎙️ Unmuted **${count}** members in **${voiceState.channel.name}**.`);
    }

    // 11. vcpull @user
    if (sub === 'vcpull') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel to pull someone!`);
      const target = message.mentions.members?.first();
      if (!target || !target.voice?.channel) return message.reply(`${emojis.WARNING} Mention a member currently connected to another VC!`);

      await target.voice.setChannel(voiceState.channel);
      return message.reply(`🧲 Pulled **${target.user.tag}** into **${voiceState.channel.name}**.`);
    }

    // 12. vcpullall
    if (sub === 'vcpullall') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel!`);
      let count = 0;
      for (const [_, chan] of guild.channels.cache.filter(c => c.isVoiceBased() && c.id !== voiceState.channel.id)) {
        for (const [_, member] of chan.members) {
          await member.voice.setChannel(voiceState.channel).catch(() => {});
          count++;
        }
      }
      return message.reply(`🧲 Pulled **${count}** members from all voice channels into **${voiceState.channel.name}**!`);
    }

    // Voice Stats / Lock / Unlock / Permit / Reject / Limit
    if (sub === 'stats' || sub === 'profile') {
      const targetUser = message.mentions.users.first() || author;
      const userData = db.getUser(targetUser.id);
      const seconds = userData.voiceSeconds || 0;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      const embed = createStyledEmbed({
        title: `🔊 Voice Activity — ${targetUser.username}`,
        fields: [
          { name: '⏱️ Total Voice Time', value: `\`${hours}h ${minutes}m\` (${seconds} seconds)`, inline: true },
          { name: '🎙️ Voice Status', value: voiceState?.channel ? `Connected to **${voiceState.channel.name}**` : '*Not connected to VC*', inline: false }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    if (sub === 'lock') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel to lock it!`);
      await voiceState.channel.permissionOverwrites.edit(guild.id, { Connect: false });
      return message.reply(`🔒 Locked **${voiceState.channel.name}**.`);
    }

    if (sub === 'unlock') {
      if (!voiceState?.channel) return message.reply(`${emojis.WARNING} You must be in a Voice Channel to unlock it!`);
      await voiceState.channel.permissionOverwrites.edit(guild.id, { Connect: null });
      return message.reply(`🔓 Unlocked **${voiceState.channel.name}**.`);
    }

    // Default Voice Help Panel matching screenshot
    const { renderModuleHelpPanel } = require('../utils/panelRenderer');
    return renderModuleHelpPanel(message, 'voice');
  }
};
