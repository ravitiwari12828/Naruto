const { EmbedBuilder, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const { createDynamicBox } = require('../utils/boxBuilder');
const { performDriveBackup, createSnapshot } = require('../utils/gdriveBackup');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'gdrive',
  aliases: ['drivebackup', 'cloudbackup', 'gdrivebackup'],
  description: 'Manage 5TB Google Drive automated database backups & snapshots',
  category: 'system',
  usage: '.gdrive [backup/list/download/setup]',

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Only administrators can manage Google Drive database backups.');
    }

    const sub = args[0] ? args[0].toLowerCase() : 'status';

    // 1. .gdrive backup - Trigger instant backup
    if (sub === 'backup' || sub === 'now' || sub === 'create') {
      const statusMsg = await message.reply('⏳ Creating master database snapshot & sync to Google Drive...');
      const res = await performDriveBackup();

      if (!res.success) {
        return statusMsg.edit(`❌ **Backup Failed**: ${res.error}`);
      }

      const box = createDynamicBox('5TB DRIVE BACKUP REPORT', [
        `Status        : SUCCESS`,
        `Snapshot File : ${res.filename}`,
        `Size          : ${(res.size / 1024).toFixed(2)} KB`,
        `Drive Upload  : ${res.driveUploaded ? 'CONNECTED (5TB)' : 'LOCAL SNAPSHOT ONLY'}`
      ]);

      const embed = new EmbedBuilder()
        .setColor(0x00E5FF)
        .setTitle('<a:cloudcomputing_animated:1537177355766865940> 5TB Google Drive Backup Completed')
        .setDescription('```\n' + box + '\n```\n>>> ' + res.message)
        .setFooter({ text: 'Automated 24h cloud backup active • Naruto Suite' });

      if (res.filepath && fs.existsSync(res.filepath)) {
        const attachment = new AttachmentBuilder(res.filepath, { name: res.filename });
        return statusMsg.edit({ content: '✅ **Backup Snapshot Completed!**', embeds: [embed], files: [attachment] });
      }

      return statusMsg.edit({ content: '✅ **Backup Completed!**', embeds: [embed] });
    }

    // 2. .gdrive setup - Guide on setting up Google Drive Service Account
    if (sub === 'setup' || sub === 'config' || sub === 'guide') {
      const setupBox = createDynamicBox('GOOGLE DRIVE 5TB INTEGRATION SETUP', [
        '1. Go to Google Cloud Console (console.cloud.google.com)',
        '2. Enable Google Drive API',
        '3. Create Service Account & Download JSON Key',
        '4. Share your 5TB Google Drive Folder with the Service Account email',
        '5. Add GOOGLE_DRIVE_CREDENTIALS in Render Environment Variables'
      ]);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛠️ 5TB Google Drive Integration Guide')
        .setDescription(
          '```\n' + setupBox + '\n```\n\n' +
          '**Need Help?**\n' +
          'Even without Google Drive API keys, the bot creates **Automated Local Snapshots** and allows `.gdrive backup` to download instant JSON backup files anytime!'
        );

      return message.reply({ embeds: [embed] });
    }

    // Default Status Panel (.gdrive)
    const backupDir = path.join(__dirname, '../../data/backups');
    let localSnapshots = 0;
    let totalBytes = 0;

    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('naruto_db_backup_'));
      localSnapshots = files.length;
      totalBytes = files.reduce((acc, f) => acc + (fs.statSync(path.join(backupDir, f)).size || 0), 0);
    }

    const driveStatus = (process.env.GOOGLE_DRIVE_CREDENTIALS || process.env.GDRIVE_CREDENTIALS) ? 'CONNECTED (5TB Drive)' : 'LOCAL SNAPSHOT ENGINE ACTIVE';

    const infoBox = createDynamicBox('5TB CLOUD BACKUP DASHBOARD', [
      `Cloud Engine     : ${driveStatus}`,
      `Local Snapshots  : ${localSnapshots} Saved`,
      `Total Space Used : ${(totalBytes / 1024).toFixed(2)} KB / 5,000 GB`,
      `Auto Schedule    : Every 24 Hours (Active)`
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x00E5FF)
      .setTitle('<a:cloudcomputing_animated:1537177355766865940> 5TB Google Drive Automated Backup Dashboard')
      .setDescription(
        '```\n' + infoBox + '\n```\n\n' +
        '**Available Commands:**\n' +
        '• `.gdrive backup`  - Create instant snapshot & download backup file\n' +
        '• `.gdrive setup`   - View 5TB Google Drive Service Account setup guide'
      )
      .setFooter({ text: 'Naruto Suite • 5TB Cloud Storage Integration' });

    return message.reply({ embeds: [embed] });
  }
};
