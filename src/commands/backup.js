const { createStyledEmbed } = require('../utils/embedBuilder');
const emojis = require('../utils/emojis');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const db = require('../database/db');

function isOwner(authorId, guildOwnerId) {
  const extraOwners = ['1420687548807905324', '1529362747047805029', '1514546738055348237'];
  return authorId === guildOwnerId || extraOwners.includes(authorId);
}

module.exports = {
  name: 'backup',
  description: 'Full Server Backup & Restore Suite (Roles, Channels, Categories, Settings)',
  aliases: ['backup', 'serverbackup', 'backupsave', 'backuprestore', 'bk'],

  async execute(message, args) {
    const guild = message.guild;
    const author = message.author;
    const subCmd = args[0] ? args[0].toLowerCase() : 'list';

    let clientUser = message.client.user;
    try {
      clientUser = await message.client.users.fetch(message.client.user.id, { force: true });
    } catch (e) {}

    // Security Check: Only Bot Owner / Server Owner can use Backup System
    if (!isOwner(author.id, guild.ownerId)) {
      const embed = createStyledEmbed({
        title: `${emojis.WARNING} Permission Denied`,
        description: `Only the Server Owner or Bot Owners can manage server backups.`,
        requestedBy: author,
        clientUser
      });
      return message.channel.send({ embeds: [embed] });
    }

    // 📦 1. CREATE BACKUP (.backup create / .backup save)
    if (['create', 'save', 'new'].includes(subCmd)) {
      const backupId = `bk-${Date.now().toString(36)}`;
      const loadingMsg = await message.channel.send(`${emojis.LOADING || '⏳'} Generating server snapshot (Roles, Channels, Categories, Settings)...`);

      try {
        // Collect Roles
        const roles = guild.roles.cache
          .filter(r => r.name !== '@everyone' && !r.managed)
          .sort((a, b) => b.position - a.position)
          .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            hoist: r.hoist,
            position: r.position,
            permissions: r.permissions.bitfield.toString(),
            mentionable: r.mentionable
          }));

        // Collect Channels & Categories
        const channels = guild.channels.cache.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          topic: c.topic || null,
          nsfw: c.nsfw || false,
          bitrate: c.bitrate || undefined,
          userLimit: c.userLimit || undefined,
          parentId: c.parentId || null,
          position: c.position,
          permissionOverwrites: c.permissionOverwrites ? c.permissionOverwrites.cache.map(o => ({
            id: o.id,
            type: o.type,
            allow: o.allow.bitfield.toString(),
            deny: o.deny.bitfield.toString()
          })) : []
        }));

        const backupData = {
          backupId,
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.iconURL({ dynamic: true, size: 512 }),
          createdAt: Date.now(),
          createdBy: author.id,
          createdTag: author.tag,
          rolesCount: roles.length,
          channelsCount: channels.length,
          guildSettings: {
            verificationLevel: guild.verificationLevel,
            explicitContentFilter: guild.explicitContentFilter,
            defaultMessageNotifications: guild.defaultMessageNotifications
          },
          roles,
          channels
        };

        db.saveBackup(guild.id, backupData);
        await loadingMsg.delete().catch(() => {});

        const embed = createStyledEmbed({
          title: `📦 Server Snapshot Saved Successfully!`,
          subtitle: `Full Server Backup ID: [ ${backupId} ]`,
          fields: [
            { name: '🆔 Backup ID', value: `\`${backupId}\``, inline: true },
            { name: '🎭 Roles Backed Up', value: `\`${roles.length}\` Roles`, inline: true },
            { name: '📁 Channels Backed Up', value: `\`${channels.length}\` Channels`, inline: true },
            { name: '📅 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
            { name: '💡 Restoration Command', value: `Type \`.backup restore ${backupId}\` to restore this snapshot!`, inline: false }
          ],
          thumbnailUrl: guild.iconURL({ dynamic: true, size: 512 }),
          requestedBy: author,
          clientUser
        });

        return message.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Backup creation error:', err);
        await loadingMsg.delete().catch(() => {});
        return message.reply(`${emojis.WARNING} Failed to create backup snapshot: ${err.message}`);
      }
    }

    // 📋 2. LIST BACKUPS (.backup list)
    if (['list', 'all', 'ls'].includes(subCmd)) {
      const backups = db.getBackups(guild.id);
      const backupKeys = Object.keys(backups);

      if (backupKeys.length === 0) {
        const embed = createStyledEmbed({
          title: `📦 Server Backups`,
          description: `No backups found for **${guild.name}**.\n\nType \`.backup create\` to generate your first server snapshot!`,
          requestedBy: author,
          clientUser
        });
        return message.channel.send({ embeds: [embed] });
      }

      const listText = backupKeys.map((id, index) => {
        const b = backups[id];
        return `**${index + 1}. \`${b.backupId}\`** — Created <t:${Math.floor(b.createdAt / 1000)}:R>\n` +
               `└ \`${b.rolesCount}\` Roles | \`${b.channelsCount}\` Channels | By: <@${b.createdBy}>`;
      }).join('\n\n');

      const embed = createStyledEmbed({
        title: `📦 Saved Server Backups [ ${backupKeys.length} ]`,
        subtitle: `Server Snapshots for ${guild.name}`,
        description: listText + `\n\n💡 *Restore any backup using \`.backup restore <backupId>\`*`,
        requestedBy: author,
        clientUser
      });

      return message.channel.send({ embeds: [embed] });
    }

    // 🔄 3. RESTORE BACKUP (.backup restore <id>)
    if (['restore', 'load', 'apply'].includes(subCmd)) {
      const backupId = args[1];
      if (!backupId) {
        return message.reply(`${emojis.WARNING} Please specify a backup ID! Usage: \`.backup restore <backupId>\``);
      }

      const backup = db.getBackup(guild.id, backupId);
      if (!backup) {
        return message.reply(`${emojis.WARNING} Backup snapshot \`${backupId}\` not found for this server.`);
      }

      // Strictly Owner Confirmation
      if (!isOwner(author.id, guild.ownerId)) {
        return message.reply(`${emojis.WARNING} Only the Server Owner can execute a full server restoration!`);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_restore_${backupId}`)
          .setLabel('Confirm Restore')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel_restore_${backupId}`)
          .setLabel('Cancel')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Secondary)
      );

      const confirmEmbed = createStyledEmbed({
        title: `🚨 WARNING: SERVER RESTORE CONFIRMATION`,
        subtitle: `Restoring Backup ID: [ ${backupId} ]`,
        description: `**Restoring this snapshot will recreate missing roles, channels, and categories to their exact saved state!**\n\n` +
                     `• **Backup Created:** <t:${Math.floor(backup.createdAt / 1000)}:F>\n` +
                     `• **Saved Roles:** \`${backup.rolesCount}\`\n` +
                     `• **Saved Channels:** \`${backup.channelsCount}\`\n\n` +
                     `⚠️ *Click **Confirm Restore** below to initiate restoration.*`,
        requestedBy: author,
        clientUser
      });

      const promptMsg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

      const collector = promptMsg.createMessageComponentCollector({ time: 60000 });
      collector.on('collect', async (i) => {
        if (i.user.id !== author.id) {
          return i.reply({ content: 'Only the prompt author can interact with this confirmation.', ephemeral: true });
        }

        if (i.customId.startsWith('cancel_restore_')) {
          await i.update({ content: '❌ Backup restoration cancelled.', embeds: [], components: [] });
          return;
        }

        if (i.customId.startsWith('confirm_restore_')) {
          await i.update({ content: `${emojis.LOADING || '⏳'} Initiating full server restoration from snapshot \`${backupId}\`...`, embeds: [], components: [] });

          try {
            // Restore Server Name
            if (backup.guildName && guild.name !== backup.guildName) {
              await guild.setName(backup.guildName, 'AntiNuke Server Backup Restoration').catch(() => {});
            }

            // Restore Roles
            const roleMap = new Map();
            for (const rData of backup.roles) {
              let existingRole = guild.roles.cache.find(r => r.name === rData.name);
              if (!existingRole) {
                try {
                  existingRole = await guild.roles.create({
                    name: rData.name,
                    color: rData.color,
                    hoist: rData.hoist,
                    mentionable: rData.mentionable,
                    permissions: BigInt(rData.permissions),
                    reason: 'Backup Restoration'
                  });
                } catch (e) {}
              }
              if (existingRole) roleMap.set(rData.id, existingRole.id);
            }

            // Restore Categories First
            const categoryMap = new Map();
            const categoriesData = backup.channels.filter(c => c.type === ChannelType.GuildCategory);
            for (const catData of categoriesData) {
              let existingCat = guild.channels.cache.find(c => c.name === catData.name && c.type === ChannelType.GuildCategory);
              if (!existingCat) {
                try {
                  existingCat = await guild.channels.create({
                    name: catData.name,
                    type: ChannelType.GuildCategory,
                    reason: 'Backup Restoration'
                  });
                } catch (e) {}
              }
              if (existingCat) categoryMap.set(catData.id, existingCat.id);
            }

            // Restore Text & Voice Channels
            const nonCatData = backup.channels.filter(c => c.type !== ChannelType.GuildCategory);
            for (const chanData of nonCatData) {
              let existingChan = guild.channels.cache.find(c => c.name === chanData.name && c.type === chanData.type);
              if (!existingChan) {
                try {
                  const parentId = chanData.parentId ? categoryMap.get(chanData.parentId) : undefined;
                  existingChan = await guild.channels.create({
                    name: chanData.name,
                    type: chanData.type,
                    topic: chanData.topic || undefined,
                    parent: parentId,
                    reason: 'Backup Restoration'
                  });
                } catch (e) {}
              }
            }

            const successEmbed = createStyledEmbed({
              title: `✅ Server Backup Restored Successfully!`,
              subtitle: `Restoration Complete for [ ${backupId} ]`,
              description: `All missing roles, categories, and channels have been recreated and synchronized!`,
              requestedBy: author,
              clientUser
            });

            await message.channel.send({ embeds: [successEmbed] });
          } catch (err) {
            console.error('Restoration error:', err);
            await message.channel.send(`${emojis.WARNING} Restoration encountered an issue: ${err.message}`);
          }
        }
      });

      return;
    }

    // 🗑️ 4. DELETE BACKUP (.backup delete <id>)
    if (['delete', 'del', 'remove'].includes(subCmd)) {
      const backupId = args[1];
      if (!backupId) return message.reply(`${emojis.WARNING} Usage: \`.backup delete <backupId>\``);

      const deleted = db.deleteBackup(guild.id, backupId);
      if (deleted) {
        return message.reply(`✅ Backup snapshot \`${backupId}\` deleted successfully.`);
      } else {
        return message.reply(`${emojis.WARNING} Backup snapshot \`${backupId}\` not found.`);
      }
    }

    // DEFAULT: HELP MENU FOR BACKUP
    const embed = createStyledEmbed({
      title: `📦 Server Backup & Recovery Suite`,
      subtitle: `Full Server Snapshot & Disaster Recovery`,
      fields: [
        { name: '📦 `.backup create`', value: 'Generates a full snapshot of all channels, categories, roles & settings.', inline: false },
        { name: '📋 `.backup list`', value: 'Displays all saved backups for this server.', inline: false },
        { name: '🔄 `.backup restore <id>`', value: 'Restores a server snapshot (Server Owner only).', inline: false },
        { name: '🗑️ `.backup delete <id>`', value: 'Deletes a saved backup snapshot.', inline: false }
      ],
      requestedBy: author,
      clientUser
    });
    return message.channel.send({ embeds: [embed] });
  }
};
