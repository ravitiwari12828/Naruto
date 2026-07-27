const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const emojis = require('../../utils/emojis');
const items = require('../../config/items');

module.exports = {
  name: 'job',
  description: 'Choose a job — it changes your !work flavor text and pay range.',
  usage: '!job',
  cooldown: 3000,
  async execute(message) {
    const eco = db.economy(message.guild.id, message.author.id);
    const menu = new StringSelectMenuBuilder()
      .setCustomId('job_select')
      .setPlaceholder(eco.job ? `Current job: ${items.JOBS[eco.job]?.name}` : 'Choose a job')
      .addOptions(Object.entries(items.JOBS).map(([key, job]) => ({
        label: job.name, value: key, emoji: job.emoji, description: `${job.payMin}-${job.payMax} coins per shift`,
      })));
    const row = new ActionRowBuilder().addComponents(menu);
    const sent = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(config.embedColor).setTitle(`${emojis.work} Career Center`).setDescription('Pick a job to boost your `!work` earnings.')],
      components: [row],
    });
    const collector = sent.createMessageComponentCollector({ time: 30000, max: 1, filter: (i) => i.user.id === message.author.id });
    collector.on('collect', async (i) => {
      const job = items.JOBS[i.values[0]];
      eco.job = i.values[0];
      db.setEconomy(message.guild.id, message.author.id, eco);
      await i.update({
        embeds: [new EmbedBuilder().setColor(config.successColor).setTitle(`${job.emoji} You're now a ${job.name}!`).setDescription(`Use \`!work\` to earn ${job.payMin}-${job.payMax} coins per shift.`)],
        components: [],
      });
    });
    collector.on('end', (collected) => { if (!collected.size) sent.edit({ components: [] }).catch(() => {}); });
  },
};
