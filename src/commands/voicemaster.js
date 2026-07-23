const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');

// Global VoiceMaster store (guildId -> { triggerChanId, categoryId, enabled, activeTempVCs: Map })
const voicemasterConfigs = new Map();

function getOrCreateVMConfig(guildId) {
  if (!voicemasterConfigs.has(guildId)) {
    voicemasterConfigs.set(guildId, {
      enabled: true,
      triggerChanId: null,
      activeTempVCs: new Set()
    });
  }
  return voicemasterConfigs.get(guildId);
}

module.exports = {
  name: 'voicemaster',
  description: 'VoiceMaster Commands: vctemp setup, vctemp disable, vctemp status, tempvc',
  aliases: ['vctemp', 'tempvc', 'vm'],
  voicemasterConfigs,

  async execute(message, args) {
    const invoked = message.content.slice(1).split(/ +/)[0].toLowerCase();
    let sub = args[0]?.toLowerCase();

    if (invoked === 'tempvc') sub = 'status';

    const author = message.author;
    const guild = message.guild;
    const config = getOrCreateVMConfig(guild.id);

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // .vctemp setup <#voiceChannel>
    if (sub === 'setup') {
      const vc = message.mentions.channels.first() || message.member?.voice?.channel;
      if (!vc || !vc.isVoiceBased()) {
        return message.reply(`${emojis.WARNING} Join or mention a Voice Channel to set as the **Join To Create** trigger channel!`);
      }

      config.triggerChanId = vc.id;
      config.enabled = true;
      voicemasterConfigs.set(guild.id, config);

      const embed = createStyledEmbed({
        title: `🎙️ VoiceMaster System Configured`,
        description: `Join-To-Create trigger channel set to **${vc.name}**!\nWhen members join this channel, a personal temporary VC will automatically be created.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // .vctemp disable
    if (sub === 'disable') {
      config.enabled = false;
      voicemasterConfigs.set(guild.id, config);
      return message.reply(`${emojis.SUCCESS} VoiceMaster temporary voice system disabled.`);
    }

    // .vctemp status / tempvc
    if (sub === 'status' || invoked === 'tempvc') {
      const embed = createStyledEmbed({
        title: `🎙️ VoiceMaster System Status`,
        fields: [
          { name: '⚙️ Status', value: config.enabled ? '`ENABLED ✅`' : '`DISABLED ❌`', inline: true },
          { name: '🔊 Trigger Channel', value: config.triggerChanId ? `<#${config.triggerChanId}>` : '*Not Configured*', inline: true },
          { name: '💬 Active Temp VCs', value: `\`${config.activeTempVCs.size}\` active`, inline: true }
        ],
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // Default VoiceMaster Help
    const embed = createStyledEmbed({
      title: `🎙️ VoiceMaster Commands`,
      description:
        `\`.vctemp setup\` — Set join-to-create voice channel\n` +
        `\`.vctemp disable\` — Disable temporary voice system\n` +
        `\`.vctemp status\` — Check VoiceMaster configuration status\n` +
        `\`.tempvc\` — View active temp voice channels`,
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
