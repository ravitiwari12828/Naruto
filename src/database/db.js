const fs = require('fs');
const path = require('path');
let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {}

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {}

const dbPath = path.join(dataDir, 'database.sqlite');
const jsonDbPath = path.join(dataDir, 'database.json');

// Mongoose Schema for Master Cloud Database Persistence
let BotDataModel = null;
if (mongoose) {
  const BotDataSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now }
  });
  BotDataModel = mongoose.models.BotData || mongoose.model('BotData', BotDataSchema);
}

function calculateRank(level) {
  if (level >= 81) return 'Hokage';
  if (level >= 71) return 'Shadow';
  if (level >= 51) return 'Sannin';
  if (level >= 36) return 'Anbu';
  if (level >= 21) return 'Jonin';
  if (level >= 11) return 'Chunin';
  if (level >= 6) return 'Genin';
  return 'Academy Student';
}

class ResilientDatabase {
  constructor() {
    this.sqliteDb = null;
    this.useSqlite = false;
    this.useMongo = false;
    this.mongoReady = false;
    this.mongoSaveTimeout = null;

    this.data = {
      users: {},
      autoroles: {},
      autoresponses: {},
      autoreacts: {},
      cases: {},
      automod: {},
      settings: {},
      analytics: [],
      reactionChannels: {},
      reactionVotes: {}
    };

    // 1. Initial Load from Local JSON
    this.loadJSON();

    // 2. Initialize MongoDB Cloud Connection if MONGODB_URI or MONGO_URI is provided
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri && mongoose) {
      this.initMongo(mongoUri);
    } else {
      console.log('⚠️ [Database Warning] MONGODB_URI is missing in environment variables! Data will reset on Render deploys until MONGODB_URI is added in Render Dashboard.');
      if (sqlite3) {
        try {
          this.sqliteDb = new sqlite3.Database(dbPath, (err) => {
            if (!err) {
              this.useSqlite = true;
              this.initTables();
            }
          });
        } catch (e) {}
      }
    }
  }

  async initMongo(uri) {
    try {
      console.log('🍃 [MongoDB Cloud] Connecting to MongoDB Atlas database...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000
      });
      this.useMongo = true;
      console.log('✅ [MongoDB Cloud] Connected successfully! Syncing cloud database state...');

      // Load master database state from MongoDB Atlas
      const doc = await BotDataModel.findOne({ key: 'master_database' });
      if (doc && doc.data && typeof doc.data === 'object') {
        // Smart merge: Merge cloud keys into memory, taking highest user message/XP stats
        for (const key of Object.keys(doc.data)) {
          const cloudVal = doc.data[key];
          if (cloudVal) {
            if (key === 'users' && typeof cloudVal === 'object') {
              for (const uid of Object.keys(cloudVal)) {
                if (!this.data.users[uid]) {
                  this.data.users[uid] = cloudVal[uid];
                } else {
                  this.data.users[uid].messages = Math.max(this.data.users[uid].messages || 0, cloudVal[uid].messages || 0);
                  this.data.users[uid].xp = Math.max(this.data.users[uid].xp || 0, cloudVal[uid].xp || 0);
                  this.data.users[uid].level = Math.max(this.data.users[uid].level || 1, cloudVal[uid].level || 1);
                  this.data.users[uid].voiceSeconds = Math.max(this.data.users[uid].voiceSeconds || 0, cloudVal[uid].voiceSeconds || 0);
                  this.data.users[uid].invites = Math.max(this.data.users[uid].invites || 0, cloudVal[uid].invites || 0);
                }
              }
            } else if (Array.isArray(cloudVal) ? cloudVal.length > 0 : Object.keys(cloudVal).length > 0) {
              this.data[key] = cloudVal;
            }
          }
        }
        console.log('☁️ [MongoDB Cloud] Successfully restored all guild data, levels, autoreacts & settings from cloud!');
        this.saveJSONFileOnly();
      }

      // Mark MongoDB Cloud sync as READY after restoring cloud state
      this.mongoReady = true;

      // Backup merged active memory data back to cloud
      await BotDataModel.findOneAndUpdate(
        { key: 'master_database' },
        { data: this.data, updatedAt: new Date() },
        { upsert: true }
      );
      console.log('☁️ [MongoDB Cloud] Master cloud database backup active!');
    } catch (err) {
      console.error('⚠️ [MongoDB Cloud Error] Failed to connect to MongoDB Atlas:', err.message);
    }
  }

  loadJSON() {
    try {
      if (fs.existsSync(jsonDbPath)) {
        const raw = fs.readFileSync(jsonDbPath, 'utf8');
        this.data = Object.assign(this.data, JSON.parse(raw));
        if (!this.data.analytics) this.data.analytics = [];
      } else {
        this.saveJSONFileOnly();
      }
    } catch (e) {}
  }

  saveJSONFileOnly() {
    try {
      fs.writeFileSync(jsonDbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {}
  }

  saveJSON() {
    this.saveJSONFileOnly();

    // Debounced MongoDB Cloud Sync (Only when mongoReady is true!)
    if (this.useMongo && this.mongoReady && BotDataModel) {
      if (this.mongoSaveTimeout) clearTimeout(this.mongoSaveTimeout);
      this.mongoSaveTimeout = setTimeout(() => {
        BotDataModel.findOneAndUpdate(
          { key: 'master_database' },
          { data: this.data, updatedAt: new Date() },
          { upsert: true }
        ).catch(err => console.error('⚠️ [MongoDB Sync Error]:', err.message));
      }, 500);
    }
  }

  initTables() {
    if (!this.sqliteDb) return;
    this.sqliteDb.serialize(() => {
      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        messages INTEGER DEFAULT 0,
        voiceSeconds INTEGER DEFAULT 0,
        invites INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        rank TEXT DEFAULT 'Academy Student',
        chakra INTEGER DEFAULT 100,
        ryo INTEGER DEFAULT 500,
        jutsuList TEXT DEFAULT '["Rasengan","Shadow Clone Jutsu"]'
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS autoroles (
        guildId TEXT PRIMARY KEY,
        humans TEXT DEFAULT '[]',
        bots TEXT DEFAULT '[]'
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS autoresponses (
        id TEXT PRIMARY KEY,
        guildId TEXT,
        trigger TEXT,
        response TEXT
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS autoreacts (
        id TEXT PRIMARY KEY,
        guildId TEXT,
        trigger TEXT,
        emoji TEXT
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS cases (
        caseId INTEGER,
        guildId TEXT,
        action TEXT,
        targetId TEXT,
        targetTag TEXT,
        executorId TEXT,
        executorTag TEXT,
        reason TEXT,
        timestamp INTEGER,
        PRIMARY KEY (guildId, caseId)
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS automod (
        guildId TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        profanity INTEGER DEFAULT 1,
        caps INTEGER DEFAULT 0,
        mention INTEGER DEFAULT 1,
        emoji INTEGER DEFAULT 0,
        punishment TEXT DEFAULT 'warn',
        whitelistedBots TEXT DEFAULT '[]',
        ignoredChannels TEXT DEFAULT '[]'
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS settings (
        guildId TEXT PRIMARY KEY,
        prefix TEXT DEFAULT '.'
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT,
        userId TEXT,
        eventType TEXT,
        value INTEGER DEFAULT 1,
        timestamp INTEGER
      )`);

      this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS log_channels (
        guildId TEXT,
        logType TEXT,
        channelId TEXT,
        PRIMARY KEY (guildId, logType)
      )`);

      this.loadFromSQLite();
    });
  }

  loadFromSQLite() {
    if (!this.sqliteDb) return;

    this.sqliteDb.all(`SELECT * FROM users`, [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          this.data.users[r.id] = {
            messages: r.messages,
            voiceSeconds: r.voiceSeconds,
            invites: r.invites,
            xp: r.xp,
            level: r.level,
            rank: calculateRank(r.level),
            chakra: r.chakra,
            ryo: r.ryo,
            jutsuList: JSON.parse(r.jutsuList || '["Rasengan","Shadow Clone Jutsu"]')
          };
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM autoroles`, [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          this.data.autoroles[r.guildId] = {
            humans: JSON.parse(r.humans || '[]'),
            bots: JSON.parse(r.bots || '[]')
          };
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM autoreacts`, [], (err, rows) => {
      if (!err && rows) {
        this.data.autoreacts = {};
        rows.forEach(r => {
          if (!this.data.autoreacts[r.guildId]) this.data.autoreacts[r.guildId] = [];
          this.data.autoreacts[r.guildId].push({ id: r.id, trigger: r.trigger, emoji: r.emoji });
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM autoresponses`, [], (err, rows) => {
      if (!err && rows) {
        this.data.autoresponses = {};
        rows.forEach(r => {
          if (!this.data.autoresponses[r.guildId]) this.data.autoresponses[r.guildId] = [];
          this.data.autoresponses[r.guildId].push({ id: r.id, trigger: r.trigger, response: r.response });
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM cases ORDER BY caseId ASC`, [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          if (!this.data.cases[r.guildId]) this.data.cases[r.guildId] = [];
          this.data.cases[r.guildId].push({
            caseId: r.caseId,
            guildId: r.guildId,
            action: r.action,
            targetId: r.targetId,
            targetTag: r.targetTag,
            executorId: r.executorId,
            executorTag: r.executorTag,
            reason: r.reason,
            timestamp: r.timestamp
          });
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM log_channels`, [], (err, rows) => {
      if (!err && rows) {
        if (!this.data.logChannels) this.data.logChannels = {};
        rows.forEach(r => {
          if (!this.data.logChannels[r.guildId]) this.data.logChannels[r.guildId] = {};
          this.data.logChannels[r.guildId][r.logType] = r.channelId;
        });
      }
    });
  }

  // --- USER XP, MESSAGES & VOICE TIMING ---
  getUser(userId, guildId = null) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        messages: 0,
        voiceSeconds: 0,
        invites: 0,
        xp: 0,
        level: 1,
        rank: 'Academy Student',
        chakra: 100,
        ryo: 500,
        clan: 'None',
        jutsuList: ['Rasengan', 'Shadow Clone Jutsu'],
        ninjaInventory: { kunai: 5, shuriken: 10, healthPotions: 2, chakraPills: 2, scrolls: 1 },
        ninjaStats: { wins: 0, losses: 0, battles: 0, missionsCompleted: 0 }
      };
    }
    const u = this.data.users[userId];
    if (!u.clan) u.clan = 'None';
    if (!u.ninjaInventory) u.ninjaInventory = { kunai: 5, shuriken: 10, healthPotions: 2, chakraPills: 2, scrolls: 1 };
    if (!u.ninjaStats) u.ninjaStats = { wins: 0, losses: 0, battles: 0, missionsCompleted: 0 };

    if (guildId) {
      if (!this.data.guildLevels) this.data.guildLevels = {};
      if (!this.data.guildLevels[guildId]) this.data.guildLevels[guildId] = {};
      if (!this.data.guildLevels[guildId][userId]) {
        this.data.guildLevels[guildId][userId] = {
          xp: 0,
          level: 1,
          rank: 'Academy Student',
          messages: 0,
          voiceSeconds: 0,
          _lastXpAt: 0
        };
      }
      const gLvl = this.data.guildLevels[guildId][userId];

      return new Proxy(u, {
        get(target, prop) {
          if (['xp', 'level', 'rank', 'messages', 'voiceSeconds', '_lastXpAt'].includes(prop)) {
            return gLvl[prop] !== undefined ? gLvl[prop] : (prop === 'level' ? 1 : prop === 'rank' ? 'Academy Student' : 0);
          }
          return target[prop];
        },
        set(target, prop, value) {
          if (['xp', 'level', 'rank', 'messages', 'voiceSeconds', '_lastXpAt'].includes(prop)) {
            gLvl[prop] = value;
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    }

    return u;
  }

  addMessage(userId, count = 1, guildId = null) {
    const user = this.getUser(userId, guildId);
    user.messages += count;

    // ProBot-style: 2-minute XP cooldown per user
    const now = Date.now();
    const lastXp = user._lastXpAt || 0;
    if (now - lastXp >= 120000) {
      // Random 15–40 XP per eligible message (ProBot range)
      const xpGain = (Math.floor(Math.random() * 26) + 15) * count;
      user.xp = (user.xp || 0) + xpGain;
      user._lastXpAt = now;
    }

    const oldLevel = user.level;
    // ProBot quadratic curve: level = floor(0.1 * sqrt(xp)) + 1
    user.level = Math.max(1, Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1);
    user.rank = calculateRank(user.level);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, user.messages, user.voiceSeconds, user.invites, user.xp, user.level, user.rank, user.chakra, user.ryo, JSON.stringify(user.jutsuList)]
      );
    }
    this.saveJSON();
    return { user, leveledUp: user.level > oldLevel };
  }

  addVoiceTime(userId, seconds, guildId = null) {
    const user = this.getUser(userId, guildId);
    user.voiceSeconds += seconds;
    // ProBot-style: 10 XP per minute of voice activity
    user.xp = (user.xp || 0) + Math.floor(seconds / 60) * 10;
    user.level = Math.max(1, Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1);
    user.rank = calculateRank(user.level);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, user.messages, user.voiceSeconds, user.invites, user.xp, user.level, user.rank, user.chakra, user.ryo, JSON.stringify(user.jutsuList)]
      );
    }
    this.saveJSON();
    return user;
  }

  clearMessages(userId = null, guildId = null) {
    if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
      if (userId && this.data.guildLevels[guildId][userId]) {
        this.data.guildLevels[guildId][userId].messages = 0;
      } else {
        for (const uid of Object.keys(this.data.guildLevels[guildId])) {
          if (this.data.guildLevels[guildId][uid]) this.data.guildLevels[guildId][uid].messages = 0;
        }
      }
    }
    if (userId) {
      const user = this.getUser(userId);
      user.messages = 0;
    } else {
      for (const uid of Object.keys(this.data.users)) {
        if (this.data.users[uid]) this.data.users[uid].messages = 0;
      }
    }
    this.saveJSON();
  }

  clearVoiceTime(userId = null, guildId = null) {
    if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
      if (userId && this.data.guildLevels[guildId][userId]) {
        this.data.guildLevels[guildId][userId].voiceSeconds = 0;
      } else {
        for (const uid of Object.keys(this.data.guildLevels[guildId])) {
          if (this.data.guildLevels[guildId][uid]) this.data.guildLevels[guildId][uid].voiceSeconds = 0;
        }
      }
    }
    if (userId) {
      const user = this.getUser(userId);
      user.voiceSeconds = 0;
    } else {
      for (const uid of Object.keys(this.data.users)) {
        if (this.data.users[uid]) this.data.users[uid].voiceSeconds = 0;
      }
    }
    this.saveJSON();
  }

  addInvites(userId, count = 1, guildId = null) {
    const user = this.getUser(userId, guildId);
    user.invites += count;
    user.xp = (user.xp || 0) + count * 15;
    user.level = Math.max(1, Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1);
    user.rank = calculateRank(user.level);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, user.messages, user.voiceSeconds, user.invites, user.xp, user.level, user.rank, user.chakra, user.ryo, JSON.stringify(user.jutsuList)]
      );
    }
    this.saveJSON();
    return user;
  }

  updateUser(userId, updateFn, guildId = null) {
    const user = this.getUser(userId, guildId);
    if (typeof updateFn === 'function') {
      updateFn(user);
    }
    user.level = Math.max(1, Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1);
    user.rank = calculateRank(user.level);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, user.messages, user.voiceSeconds, user.invites, user.xp, user.level, user.rank, user.chakra, user.ryo, JSON.stringify(user.jutsuList)]
      );
    }
    this.saveJSON();
    return user;
  }

  getTopUsersByXP(limit = 10, guildId = null) {
    let source = {};
    if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
      source = this.data.guildLevels[guildId];
    } else {
      source = this.data.users || {};
    }

    const allUsers = Object.entries(source).map(([id, u]) => ({
      userId: id,
      xp: u.xp || 0,
      level: u.level || 1,
      rank: u.rank || calculateRank(u.level || 1),
      messages: u.messages || 0
    })).sort((a, b) => b.xp - a.xp);
    return allUsers.slice(0, limit);
  }


  // --- TIME-WINDOWED ANALYTICS tracking ---
  recordAnalyticsEvent(guildId, userId, eventType, value = 1) {
    const now = Date.now();
    if (!this.data.analytics) this.data.analytics = [];

    const ev = { guildId, userId, eventType, value, timestamp: now };
    this.data.analytics.push(ev);

    // Keep memory cache within 60 days
    const maxAge = 60 * 86400 * 1000;
    if (this.data.analytics.length > 50000) {
      this.data.analytics = this.data.analytics.filter(e => (now - e.timestamp) < maxAge);
    }

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT INTO analytics_events (guildId, userId, eventType, value, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [guildId, userId, eventType, value, now]
      );
    }
    this.saveJSON();
  }

  getAnalyticsStats(guildId, windowMs = null) {
    const now = Date.now();
    const minTime = windowMs ? (now - windowMs) : 0;

    const events = (this.data.analytics || []).filter(e => (!guildId || e.guildId === guildId) && e.timestamp >= minTime);

    const stats = {
      messages: 0,
      voiceSeconds: 0,
      invites: 0,
      joins: 0,
      leaves: 0,
      commands: 0,
      ticketsCreated: 0,
      ticketsClosed: 0
    };

    events.forEach(e => {
      if (e.eventType === 'message') stats.messages += e.value;
      if (e.eventType === 'voice') stats.voiceSeconds += e.value;
      if (e.eventType === 'invite') stats.invites += e.value;
      if (e.eventType === 'join') stats.joins += e.value;
      if (e.eventType === 'leave') stats.leaves += e.value;
      if (e.eventType === 'command') stats.commands += e.value;
      if (e.eventType === 'ticket_created') stats.ticketsCreated += e.value;
      if (e.eventType === 'ticket_closed') stats.ticketsClosed += e.value;
    });

    return stats;
  }

  getUserAnalyticsStats(guildId, userId, windowMs = null) {
    const now = Date.now();
    const minTime = windowMs ? (now - windowMs) : 0;

    const events = (this.data.analytics || []).filter(e =>
      (!guildId || e.guildId === guildId) &&
      e.userId === userId &&
      e.timestamp >= minTime
    );

    const stats = {
      messages: 0,
      voiceSeconds: 0,
      invites: 0,
      commands: 0,
      ticketsCreated: 0,
      ticketsClosed: 0
    };

    events.forEach(e => {
      if (e.eventType === 'message') stats.messages += e.value;
      if (e.eventType === 'voice') stats.voiceSeconds += e.value;
      if (e.eventType === 'invite') stats.invites += e.value;
      if (e.eventType === 'command') stats.commands += e.value;
      if (e.eventType === 'ticket_created') stats.ticketsCreated += e.value;
      if (e.eventType === 'ticket_closed') stats.ticketsClosed += e.value;
    });

    return stats;
  }

  getTopLeaderboard(guildId, eventType, windowMs = null, limit = 10) {
    const now = Date.now();
    const minTime = windowMs ? (now - windowMs) : 0;

    const events = (this.data.analytics || []).filter(e =>
      (!guildId || e.guildId === guildId) &&
      e.eventType === eventType &&
      e.timestamp >= minTime
    );

    const userTotals = new Map();
    events.forEach(e => {
      if (!e.userId) return;
      const current = userTotals.get(e.userId) || 0;
      userTotals.set(e.userId, current + e.value);
    });

    let sorted = Array.from(userTotals.entries())
      .map(([userId, total]) => ({ userId, total }))
      .sort((a, b) => b.total - a.total);

    // Fallback to lifetime user database if no timeframe events match
    if (sorted.length === 0) {
      const allUsers = Object.entries(this.data.users || {}).map(([id, data]) => {
        let total = 0;
        if (eventType === 'message') total = data.messages || 0;
        if (eventType === 'voice') total = data.voiceSeconds || 0;
        if (eventType === 'invite') total = data.invites || 0;
        return { userId: id, total };
      }).filter(u => u.total > 0).sort((a, b) => b.total - a.total);

      sorted = allUsers;
    }

    return sorted.slice(0, limit);
  }

  // --- AUTOMOD & ANTIBOT ---
  getAutomod(guildId) {
    if (!this.data.automod[guildId]) {
      this.data.automod[guildId] = {
        enabled: true,
        profanity: true,
        caps: false,
        mention: true,
        emoji: false,
        antiSpam: true,
        inviteLinks: true,
        maliciousLinks: true,
        nsfwLinks: true,
        wordBlacklist: ['grabify', 'iplogger', 'discord-nitro'],
        linkBlacklist: [],
        punishment: 'warn',
        whitelistedBots: [],
        ignoredChannels: [],
        misc: {
          prefix: '.',
          logsChannelId: null,
          modlogsChannelId: null,
          quarantineRoleId: null,
          mainRoleId: null,
          displayPunishReason: true,
          autoPurgeMessages: false,
          moderatorConfirmation: true,
          alwaysDmPunished: true,
          hideStaffIdentity: false,
          defaultTimeoutMinutes: 2880,
          daysPurgedOnBan: 7
        }
      };
    }
    const config = this.data.automod[guildId];
    if (config.antiSpam === undefined) config.antiSpam = true;
    if (config.inviteLinks === undefined) config.inviteLinks = true;
    if (config.maliciousLinks === undefined) config.maliciousLinks = true;
    if (config.nsfwLinks === undefined) config.nsfwLinks = true;
    if (!config.wordBlacklist) config.wordBlacklist = [];
    if (!config.linkBlacklist) config.linkBlacklist = [];
    if (!config.customCategories) config.customCategories = {};
    if (!config.misc) {
      config.misc = {
        prefix: '.',
        logsChannelId: null,
        modlogsChannelId: null,
        quarantineRoleId: null,
        mainRoleId: null,
        displayPunishReason: true,
        autoPurgeMessages: false,
        moderatorConfirmation: true,
        alwaysDmPunished: true,
        hideStaffIdentity: false,
        defaultTimeoutMinutes: 2880,
        daysPurgedOnBan: 7
      };
    }
    return config;
  }

  updateAutomod(guildId, key, value) {
    const config = this.getAutomod(guildId);
    config[key] = value;
    this.data.automod[guildId] = config;

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO automod (guildId, enabled, profanity, caps, mention, emoji, punishment, whitelistedBots, ignoredChannels) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          guildId,
          config.enabled ? 1 : 0,
          config.profanity ? 1 : 0,
          config.caps ? 1 : 0,
          config.mention ? 1 : 0,
          config.emoji ? 1 : 0,
          config.punishment,
          JSON.stringify(config.whitelistedBots),
          JSON.stringify(config.ignoredChannels)
        ]
      );
    }
    this.saveJSON();
    return config;
  }

  // --- AUTOROLES PERSISTENCE ---
  getAutoroles(guildId) {
    if (!this.data.autoroles) this.data.autoroles = {};
    if (!this.data.autoroles[guildId]) {
      this.data.autoroles[guildId] = {
        humans: [],
        bots: []
      };
    }
    return this.data.autoroles[guildId];
  }

  setAutorole(guildId, target, roleId, action = 'add') {
    const config = this.getAutoroles(guildId);
    if (!config[target]) config[target] = [];

    if (action === 'reset') {
      config[target] = [];
    } else if (action === 'add' && roleId) {
      if (!config[target].includes(roleId)) {
        config[target].push(roleId);
      }
    } else if (action === 'remove' && roleId) {
      config[target] = config[target].filter(id => id !== roleId);
    }

    this.data.autoroles[guildId] = config;

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO autoroles (guildId, humans, bots) VALUES (?, ?, ?)`,
        [guildId, JSON.stringify(config.humans), JSON.stringify(config.bots)]
      );
    }
    this.saveJSON();
    return config;
  }

  getAutoresponses(guildId) {
    if (!this.data.autoresponses) this.data.autoresponses = {};
    return this.data.autoresponses[guildId] || [];
  }

  addAutoresponse(guildId, trigger, responseText) {
    if (!this.data.autoresponses[guildId]) this.data.autoresponses[guildId] = [];
    const id = Date.now().toString(36);
    const item = { id, trigger: trigger.toLowerCase().trim(), response: responseText };
    this.data.autoresponses[guildId].push(item);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO autoresponses (id, guildId, trigger, response) VALUES (?, ?, ?, ?)`,
        [id, guildId, item.trigger, item.response]
      );
    }
    this.saveJSON();
    return item;
  }

  deleteAutoresponse(guildId, triggerOrId) {
    if (!this.data.autoresponses[guildId]) return false;
    const target = triggerOrId.toLowerCase().trim();
    const initialLen = this.data.autoresponses[guildId].length;
    this.data.autoresponses[guildId] = this.data.autoresponses[guildId].filter(
      item => item.id !== target && item.trigger !== target
    );

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `DELETE FROM autoresponses WHERE guildId = ? AND (id = ? OR trigger = ?)`,
        [guildId, target, target]
      );
    }
    this.saveJSON();
    return this.data.autoresponses[guildId].length < initialLen;
  }

  getAutoreacts(guildId) {
    return this.data.autoreacts[guildId] || [];
  }

  addAutoreact(guildId, trigger, emoji) {
    if (!this.data.autoreacts[guildId]) this.data.autoreacts[guildId] = [];
    const cleanTrigger = trigger.toLowerCase().trim();
    this.data.autoreacts[guildId] = this.data.autoreacts[guildId].filter(item => item.trigger !== cleanTrigger);

    const id = Date.now().toString(36);
    const item = { id, trigger: cleanTrigger, emoji };
    this.data.autoreacts[guildId].push(item);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `DELETE FROM autoreacts WHERE guildId = ? AND trigger = ?`,
        [guildId, cleanTrigger]
      );
      this.sqliteDb.run(
        `INSERT INTO autoreacts (id, guildId, trigger, emoji) VALUES (?, ?, ?, ?)`,
        [id, guildId, item.trigger, item.emoji]
      );
    }
    this.saveJSON();
    return item;
  }

  removeAutoreact(guildId, triggerOrId) {
    if (!this.data.autoreacts[guildId]) return false;
    const target = triggerOrId.toLowerCase().trim();
    const initialLen = this.data.autoreacts[guildId].length;
    this.data.autoreacts[guildId] = this.data.autoreacts[guildId].filter(
      item => item.id !== target && item.trigger !== target
    );

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `DELETE FROM autoreacts WHERE guildId = ? AND (id = ? OR trigger = ?)`,
        [guildId, target, target]
      );
    }
    this.saveJSON();
    return this.data.autoreacts[guildId].length < initialLen;
  }

  resetAutoreact(guildId) {
    this.data.autoreacts[guildId] = [];
    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(`DELETE FROM autoreacts WHERE guildId = ?`, [guildId]);
    }
    this.saveJSON();
    return true;
  }

  // --- MODERATION CASES ---
  createCase(guildId, { action, targetId, targetTag, executorId, executorTag, reason }) {
    if (!this.data.cases) this.data.cases = {};
    if (!this.data.cases[guildId]) this.data.cases[guildId] = [];

    const caseId = this.data.cases[guildId].length + 1;
    const caseData = {
      caseId,
      guildId,
      action: (action || 'MODERATION').toUpperCase(),
      targetId: targetId || 'Unknown',
      targetTag: targetTag || 'Unknown User',
      executorId: executorId || 'Unknown',
      executorTag: executorTag || 'Unknown Mod',
      reason: reason || 'No reason provided',
      timestamp: Date.now()
    };

    this.data.cases[guildId].push(caseData);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO cases (caseId, guildId, action, targetId, targetTag, executorId, executorTag, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [caseId, guildId, caseData.action, caseData.targetId, caseData.targetTag, caseData.executorId, caseData.executorTag, caseData.reason, caseData.timestamp]
      );
    }
    this.saveJSON();
    return caseData;
  }

  getCases(guildId) {
    if (!this.data.cases) this.data.cases = {};
    return this.data.cases[guildId] || [];
  }

  getCase(guildId, caseId) {
    const cases = this.getCases(guildId);
    return cases.find(c => c.caseId === parseInt(caseId));
  }

  getUserCases(guildId, targetId) {
    const cases = this.getCases(guildId);
    return cases.filter(c => c.targetId === targetId);
  }

  // --- SERVER BACKUPS ---
  saveBackup(guildId, backupData) {
    if (!this.data.backups) this.data.backups = {};
    if (!this.data.backups[guildId]) this.data.backups[guildId] = {};

    this.data.backups[guildId][backupData.backupId] = backupData;
    this.saveJSON();
    return backupData;
  }

  getBackups(guildId) {
    if (!this.data.backups || !this.data.backups[guildId]) return {};
    return this.data.backups[guildId];
  }

  getBackup(guildId, backupId) {
    if (!this.data.backups || !this.data.backups[guildId]) return null;
    return this.data.backups[guildId][backupId] || null;
  }

  deleteBackup(guildId, backupId) {
    if (!this.data.backups || !this.data.backups[guildId]) return false;
    if (this.data.backups[guildId][backupId]) {
      delete this.data.backups[guildId][backupId];
      this.saveJSON();
      return true;
    }
    return false;
  }

  // --- FAVORITES SYSTEM ---
  getFavorites(userId) {
    if (!this.data.favorites) this.data.favorites = {};
    return this.data.favorites[userId] || [];
  }

  addFavorite(userId, track) {
    if (!this.data.favorites) this.data.favorites = {};
    if (!this.data.favorites[userId]) this.data.favorites[userId] = [];

    const existing = this.data.favorites[userId].find(t => t.uri === (track.info?.uri || track.uri) || t.title === (track.info?.title || track.title));
    if (existing) return { added: false, message: 'Track is already in your favorites!' };

    const favItem = {
      title: track.info?.title || track.title || 'Unknown Track',
      author: track.info?.author || track.author || 'Unknown Artist',
      uri: track.info?.uri || track.uri || '',
      duration: track.info?.duration || track.duration || 0
    };

    this.data.favorites[userId].unshift(favItem);
    if (this.data.favorites[userId].length > 50) this.data.favorites[userId].pop();
    this.saveJSON();
    return { added: true, favorite: favItem, total: this.data.favorites[userId].length };
  }

  removeFavorite(userId, index) {
    if (!this.data.favorites || !this.data.favorites[userId]) return false;
    if (index < 0 || index >= this.data.favorites[userId].length) return false;

    const removed = this.data.favorites[userId].splice(index, 1);
    this.saveJSON();
    return removed[0];
  }

  clearFavorites(userId) {
    if (!this.data.favorites) this.data.favorites = {};
    this.data.favorites[userId] = [];
    this.saveJSON();
    return true;
  }

  // --- LOG CHANNELS PERSISTENCE ---
  saveLogChannel(guildId, logType, channelId) {
    if (!this.data.logChannels) this.data.logChannels = {};
    if (!this.data.logChannels[guildId]) this.data.logChannels[guildId] = {};
    this.data.logChannels[guildId][logType] = channelId;

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO log_channels (guildId, logType, channelId) VALUES (?, ?, ?)`,
        [guildId, logType, channelId]
      );
    }
    this.saveJSON();
  }

  getLogChannels(guildId) {
    if (!this.data.logChannels || !this.data.logChannels[guildId]) return {};
    return this.data.logChannels[guildId];
  }

  // --- SINGLE REACTION MODE & REACTION CHANNELS ---
  getReactionChannel(guildId, channelId) {
    if (!this.data.reactionChannels || !this.data.reactionChannels[guildId]) return null;
    return this.data.reactionChannels[guildId][channelId] || null;
  }

  getAllReactionChannels(guildId) {
    if (!this.data.reactionChannels || !this.data.reactionChannels[guildId]) return [];
    return Object.values(this.data.reactionChannels[guildId]);
  }

  addReactionChannel(guildId, channelId, emoji, logChannelId = null) {
    if (!this.data.reactionChannels) this.data.reactionChannels = {};
    if (!this.data.reactionChannels[guildId]) this.data.reactionChannels[guildId] = {};
    const config = {
      guild_id: guildId,
      channel_id: channelId,
      emoji: emoji,
      enabled: true,
      log_channel_id: logChannelId
    };
    this.data.reactionChannels[guildId][channelId] = config;
    this.saveJSON();
    return config;
  }

  removeReactionChannel(guildId, channelId) {
    if (!this.data.reactionChannels || !this.data.reactionChannels[guildId]) return false;
    if (this.data.reactionChannels[guildId][channelId]) {
      delete this.data.reactionChannels[guildId][channelId];
      if (this.data.reactionVotes && this.data.reactionVotes[guildId]) {
        delete this.data.reactionVotes[guildId][channelId];
      }
      this.saveJSON();
      return true;
    }
    return false;
  }

  getReactionVote(guildId, channelId, userId) {
    if (!this.data.reactionVotes || !this.data.reactionVotes[guildId] || !this.data.reactionVotes[guildId][channelId]) return null;
    return this.data.reactionVotes[guildId][channelId][userId] || null;
  }

  setReactionVote(guildId, channelId, userId, messageId) {
    if (!this.data.reactionVotes) this.data.reactionVotes = {};
    if (!this.data.reactionVotes[guildId]) this.data.reactionVotes[guildId] = {};
    if (!this.data.reactionVotes[guildId][channelId]) this.data.reactionVotes[guildId][channelId] = {};
    const vote = { userId, messageId, timestamp: Date.now() };
    this.data.reactionVotes[guildId][channelId][userId] = vote;
    this.saveJSON();
    return vote;
  }

  economy(guildId, userId) {
    const key = `${guildId}:${userId}`;
    if (!this.data.economyStore) this.data.economyStore = {};
    if (!this.data.economyStore[key]) {
      const u = this.getUser(guildId, userId);
      this.data.economyStore[key] = {
        balance: u.balance !== undefined ? u.balance : 1000,
        bank: 0,
        bankLimit: 50000,
        gems: 10,
        inventory: {},
        lastDaily: 0,
        lastWeekly: 0,
        lastMonthly: 0,
        lastWork: 0,
        dailyStreak: 0,
        job: null,
        pets: [],
        stocks: {},
        cooldowns: {},
        stats: {},
        marry: null,
        quest: null
      };
    }
    return this.data.economyStore[key];
  }

  setEconomy(guildId, userId, ecoData) {
    const key = `${guildId}:${userId}`;
    if (!this.data.economyStore) this.data.economyStore = {};
    this.data.economyStore[key] = ecoData;
    if (ecoData.balance !== undefined) {
      const u = this.getUser(guildId, userId);
      u.balance = ecoData.balance;
    }
    this.saveJSON();
    return ecoData;
  }

  // --- PER-GUILD BOT APPEARANCE SUITE ---
  getGuildAppearance(guildId) {
    if (!this.data.botAppearances) this.data.botAppearances = {};
    if (!this.data.botAppearances[guildId]) {
      this.data.botAppearances[guildId] = {
        nickname: '',
        bio: '',
        avatar: null,
        banner: null
      };
    }
    return this.data.botAppearances[guildId];
  }

  setGuildAppearance(guildId, appearanceData) {
    if (!this.data.botAppearances) this.data.botAppearances = {};
    this.data.botAppearances[guildId] = Object.assign(this.getGuildAppearance(guildId), appearanceData);
    this.saveJSON();
    return this.data.botAppearances[guildId];
  }
}

const db = new ResilientDatabase();
module.exports = db;
