const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../database/db');

function formatIST(timestamp) {
  if (!timestamp) return 'N/A';
  const d = new Date(timestamp);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
}

module.exports = {
  name: 'invitedetails',
  description: 'View detailed recruiter member logs, joins, leaves, fakes, and rejoins with IST timestamps',
  aliases: [],

  async execute(message, args) {
    const guild = message.guild;
    const author = message.author;

    // Resolve target user (mention, ID, or self)
    const mentionOrId = args[0]?.replace(/[<@!>]/g, '');
    let targetUser = message.mentions.users.first();
    if (!targetUser && mentionOrId && /^\d{17,20}$/.test(mentionOrId)) {
      targetUser = await message.client.users.fetch(mentionOrId).catch(() => null);
    }
    if (!targetUser) targetUser = author;

    const targetMember = guild.members.cache.get(targetUser.id) || await guild.members.fetch(targetUser.id).catch(() => null);
    const targetDisplayName = targetMember?.displayName || targetUser.displayName || targetUser.username;

    // Auto-sync active Discord guild invites if needed so existing recruiter stats are fresh
    try {
      const activeInvites = await guild.invites.fetch().catch(() => null);
      if (activeInvites) {
        db.syncGuildInvitesFromApi(guild.id, activeInvites);
      }
    } catch (e) {}

    const recruiterData = db.getRecruiterData(guild.id, targetUser.id);
    const allMembers = recruiterData.members || [];

    // Filter categories
    const invitedList = allMembers;
    const rejoinsList = allMembers.filter(m => m.isRejoin);
    const fakesList = allMembers.filter(m => m.isFake);
    const leavesList = allMembers.filter(m => m.leftAt);

    const counts = {
      invited: invitedList.length || recruiterData.joins || 0,
      rejoins: rejoinsList.length || recruiterData.rejoins || 0,
      fake: fakesList.length || recruiterData.fakes || 0,
      leaves: leavesList.length || recruiterData.leaves || 0
    };

    function buildOverviewEmbed() {
      const desc =
        `What would you like to see for 👤 <@${targetUser.id}> (**${targetDisplayName}**)?\n` +
        `Select an option from the dropdown menu below to view detailed member logs and IST timestamps.\n\n` +
        `⚙️ **Dropdown Categories**\n` +
        `⚙️ **1. Invited Members ( ${counts.invited} )**\n` +
        `➡️ Shows all invited members along with their **Join Date** timestamp.\n` +
        `⚙️ **2. Rejoins Members ( ${counts.rejoins} )**\n` +
        `➡️ Shows only members who rejoined, with both **Join Date** and **Leave Date** timestamps.\n` +
        `⚙️ **3. Fake Members ( ${counts.fake} )**\n` +
        `➡️ Shows only flagged fake accounts along with their **Join Date** timestamp.\n` +
        `⚙️ **4. Leave Members ( ${counts.leaves} )**\n` +
        `➡️ Shows only members who left the server, with both **Join Date** and **Leave Date** timestamps.`;

      return new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle(`Invite Details - ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(desc)
        .setFooter({ text: `Requested by ${author.username} | Times shown in IST` })
        .setTimestamp();
    }

    function buildCategoryEmbed(category) {
      let title = `Invite Details - ${targetUser.username}`;
      let list = [];
      let formatFn = null;

      if (category === 'cat_invited') {
        title += ` [Invited Members]`;
        list = invitedList;
        formatFn = (m) => `• <@${m.userId}> (\`${m.tag || m.userId}\`) — Joined: **${formatIST(m.joinedAt)}**`;
      } else if (category === 'cat_rejoins') {
        title += ` [Rejoins Members]`;
        list = rejoinsList;
        formatFn = (m) => `• <@${m.userId}> (\`${m.tag || m.userId}\`) — Joined: **${formatIST(m.joinedAt)}**${m.leftAt ? ` | Left: **${formatIST(m.leftAt)}**` : ''}`;
      } else if (category === 'cat_fake') {
        title += ` [Fake Members]`;
        list = fakesList;
        formatFn = (m) => `• <@${m.userId}> (\`${m.tag || m.userId}\`) — Joined: **${formatIST(m.joinedAt)}** [Flagged: New Account]`;
      } else if (category === 'cat_leaves') {
        title += ` [Leave Members]`;
        list = leavesList;
        formatFn = (m) => `• <@${m.userId}> (\`${m.tag || m.userId}\`) — Joined: **${formatIST(m.joinedAt)}** | Left: **${formatIST(m.leftAt)}**`;
      }

      let contentStr = '';
      if (list.length === 0) {
        contentStr = `*No members recorded under this category yet for <@${targetUser.id}>.*`;
      } else {
        contentStr = list.slice(0, 25).map(formatFn).join('\n');
        if (list.length > 25) {
          contentStr += `\n*...and ${list.length - 25} more members.*`;
        }
      }

      const desc =
        `Showing **${category.replace('cat_', '').toUpperCase()}** for 👤 <@${targetUser.id}> (**${targetDisplayName}**):\n\n` +
        contentStr + '\n\n' +
        `*Select "Overview" in dropdown to return to main menu.*`;

      return new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle(title)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(desc)
        .setFooter({ text: `Requested by ${author.username} | Times shown in IST` })
        .setTimestamp();
    }

    function buildComponents() {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`invdetails_${targetUser.id}`)
        .setPlaceholder('Select what you would like to see...')
        .addOptions([
          {
            label: '1. Invited Members',
            value: 'cat_invited',
            description: `Shows all invited members (${counts.invited}) with join timestamp`,
            emoji: '⚙️'
          },
          {
            label: '2. Rejoins Members',
            value: 'cat_rejoins',
            description: `Shows only members who rejoined (${counts.rejoins})`,
            emoji: '⚙️'
          },
          {
            label: '3. Fake Members',
            value: 'cat_fake',
            description: `Shows flagged fake accounts (${counts.fake})`,
            emoji: '⚙️'
          },
          {
            label: '4. Leave Members',
            value: 'cat_leaves',
            description: `Shows members who left the server (${counts.leaves})`,
            emoji: '⚙️'
          },
          {
            label: 'Overview',
            value: 'cat_overview',
            description: 'Return to the main category overview',
            emoji: '📋'
          }
        ]);

      return [new ActionRowBuilder().addComponents(selectMenu)];
    }

    const initialMsg = await message.channel.send({
      embeds: [buildOverviewEmbed()],
      components: buildComponents()
    });

    const collector = initialMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === author.id,
      time: 300000
    });

    collector.on('collect', async (interaction) => {
      const selected = interaction.values[0];

      if (selected === 'cat_overview') {
        await interaction.update({
          embeds: [buildOverviewEmbed()],
          components: buildComponents()
        }).catch(() => {});
      } else {
        await interaction.update({
          embeds: [buildCategoryEmbed(selected)],
          components: buildComponents()
        }).catch(() => {});
      }
    });

    collector.on('end', () => {
      initialMsg.edit({ components: [] }).catch(() => {});
    });
  }
};
