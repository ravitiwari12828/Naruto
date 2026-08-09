const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('../database/db');

const backupDir = path.join(__dirname, '../../data/backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Creates a clean local JSON snapshot of the master database state
 */
function createSnapshot() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `naruto_db_backup_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    const snapshotData = {
      timestamp: new Date().toISOString(),
      version: '1.0.3',
      data: db.data
    };

    fs.writeFileSync(filepath, JSON.stringify(snapshotData, null, 2), 'utf-8');
    
    // Maintain max 10 local backup snapshots
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('naruto_db_backup_') && f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a));

    if (files.length > 10) {
      for (let i = 10; i < files.length; i++) {
        try { fs.unlinkSync(path.join(backupDir, files[i])); } catch (e) {}
      }
    }

    return { success: true, filename, filepath, size: fs.statSync(filepath).size };
  } catch (err) {
    console.error('❌ [Snapshot Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Helper to get Google Drive Access Token using OAuth2 Refresh Token
 */
function getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString();

    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(parsed.error_description || 'Failed to refresh OAuth token'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Helper to get Google Drive Access Token using Service Account Key JSON
 */
function getAccessTokenFromServiceAccount(serviceAccountJson) {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto');
      const now = Math.floor(Date.now() / 1000);
      const claim = {
        iss: serviceAccountJson.client_email,
        scope: 'https://www.googleapis.com/auth/drive.file',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      const header = { alg: 'RS256', typ: 'JWT' };
      const base64UrlEncode = (str) => Buffer.from(str).toString('base64url');

      const encodedHeader = base64UrlEncode(JSON.stringify(header));
      const encodedClaim = base64UrlEncode(JSON.stringify(claim));
      const signatureInput = `${encodedHeader}.${encodedClaim}`;

      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signatureInput);
      const signature = signer.sign(serviceAccountJson.private_key, 'base64url');

      const jwt = `${signatureInput}.${signature}`;

      const postData = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }).toString();

      const req = https.request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.access_token) {
              resolve(parsed.access_token);
            } else {
              reject(new Error(parsed.error_description || 'Failed to obtain access token'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Uploads a file to Google Drive using multipart/related upload
 */
function uploadFileToDrive(accessToken, filepath, folderId = null) {
  return new Promise((resolve, reject) => {
    try {
      const filename = path.basename(filepath);
      const fileContent = fs.readFileSync(filepath);

      const metadata = {
        name: filename,
        mimeType: 'application/json'
      };
      if (folderId) metadata.parents = [folderId];

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelim = "\r\n--" + boundary + "--";

      let multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent.toString('utf-8') +
        closeDelim;

      const req = https.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': Buffer.byteLength(multipartRequestBody)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.id) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || 'Upload failed'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(multipartRequestBody);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Full Automated Backup Pipeline to Google Drive
 */
async function performDriveBackup() {
  const snapshotRes = createSnapshot();
  if (!snapshotRes.success) {
    return { success: false, error: 'Snapshot creation failed: ' + snapshotRes.error };
  }

  const credsEnv = process.env.GOOGLE_DRIVE_CREDENTIALS || process.env.GDRIVE_CREDENTIALS;
  const clientId = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

  if (!credsEnv && !(clientId && clientSecret && refreshToken)) {
    return {
      success: true,
      snapshotOnly: true,
      filename: snapshotRes.filename,
      filepath: snapshotRes.filepath,
      size: snapshotRes.size,
      message: 'Local snapshot created successfully! Add GOOGLE_DRIVE_CREDENTIALS in Render to upload directly to 5TB Google Drive.'
    };
  }

  try {
    let token = null;
    if (clientId && clientSecret && refreshToken) {
      token = await getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
    } else {
      const credsJson = JSON.parse(credsEnv);
      token = await getAccessTokenFromServiceAccount(credsJson);
    }

    const driveFile = await uploadFileToDrive(token, snapshotRes.filepath, folderId);

    return {
      success: true,
      driveUploaded: true,
      filename: snapshotRes.filename,
      driveFileId: driveFile.id,
      size: snapshotRes.size,
      message: `Uploaded snapshot ${snapshotRes.filename} to 5TB Google Drive (File ID: ${driveFile.id})!`
    };
  } catch (err) {
    console.error('⚠️ [Drive Backup Warning]:', err.message);
    return {
      success: true,
      driveError: err.message,
      filename: snapshotRes.filename,
      filepath: snapshotRes.filepath,
      size: snapshotRes.size,
      message: `Local snapshot saved, but Google Drive upload encountered error: ${err.message}`
    };
  }
}

// Automatically schedule daily backups (Every 24 Hours)
setInterval(() => {
  performDriveBackup().then(res => {
    if (res.success) {
      console.log(`📦 [Auto Backup] ${res.message}`);
    }
  });
}, 24 * 60 * 60 * 1000);

module.exports = {
  createSnapshot,
  performDriveBackup,
  getAccessTokenFromServiceAccount,
  getAccessTokenFromRefreshToken,
  uploadFileToDrive
};
