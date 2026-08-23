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
      console.log('<a:wrong_animated:1537179702928875631> [Database Warning] MONGODB_URI is missing in environment variables! Data will reset on Render deploys until MONGODB_URI is added in Render Dashboard.');
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
    if (mongoose) {
      try {
        mongoose.set('bufferCommands', false);
      } catch (e) {}
    }

    const connectOptions = {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      family: 4
    };

    try {
      console.log('<a:leaf_animated:1537179616400375939> [MongoDB Cloud] Connecting to MongoDB Atlas database...');
      await mongoose.connect(uri, connectOptions);
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        this.useMongo = true;
        console.log('<a:accept_animated:1537177319603703969> [MongoDB Cloud] Connected successfully! Syncing cloud database state...');
      } else {
        throw new Error('Connection state not open');
      }
    } catch (err) {
      try {
        let directUri = uri;
        if (uri.includes('cluster0.v8w7x.mongodb.net')) {
          directUri = 'mongodb://botdatabase:NarutoBot2026SecurePass@cluster0-shard-00-00.v8w7x.mongodb.net:27017,cluster0-shard-00-01.v8w7x.mongodb.net:27017,cluster0-shard-00-02.v8w7x.mongodb.net:27017/narutobot?ssl=true&authSource=admin&retryWrites=true&w=majority';
        }
        await mongoose.connect(directUri, connectOptions);
        if (mongoose.connection && mongoose.connection.readyState === 1) {
          this.useMongo = true;
          console.log('<a:accept_animated:1537177319603703969> [MongoDB Cloud] Connected successfully via direct connection! Syncing cloud database state...');
        } else {
          throw new Error('Direct connection state not open');
        }
      } catch (retryErr) {
        this.useMongo = false;
        this.mongoReady = false;
        console.log('<a:wrong_animated:1537179702928875631> [MongoDB Atlas Connection Failure]:', retryErr?.message || err?.message || 'IP Not Whitelisted / Network Access Blocked');
        console.log('<a:infox_animated:1537177409428787251> [Local High-Speed Database Active] Running seamlessly on local JSON database.');
        return;
      }
    }

    if (!this.useMongo || !mongoose.connection || mongoose.connection.readyState !== 1) {
      this.useMongo = false;
      this.mongoReady = false;
      return;
    }

    try {
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
            } else if (key === 'guildLevels' && typeof cloudVal === 'object') {
              if (!this.data.guildLevels) this.data.guildLevels = {};
              for (const gId of Object.keys(cloudVal)) {
                if (!this.data.guildLevels[gId]) this.data.guildLevels[gId] = {};
                for (const uid of Object.keys(cloudVal[gId])) {
                  if (!this.data.guildLevels[gId][uid]) {
                    this.data.guildLevels[gId][uid] = cloudVal[gId][uid];
                  } else {
                    const local = this.data.guildLevels[gId][uid];
                    const cloud = cloudVal[gId][uid];
                    local.messages = Math.max(local.messages || 0, cloud.messages || 0);
                    local.xp = Math.max(local.xp || 0, cloud.xp || 0);
                    local.level = Math.max(local.level || 1, cloud.level || 1);
                    local.voiceSeconds = Math.max(local.voiceSeconds || 0, cloud.voiceSeconds || 0);
                    local.invites = Math.max(local.invites || 0, cloud.invites || 0);
                  }
                }
              }
            } else if (Array.isArray(cloudVal) ? cloudVal.length > 0 : Object.keys(cloudVal).length > 0) {
              this.data[key] = cloudVal;
            }
          }
        }
        console.log('<a:cloudcomputing_animated:1537177355766865940> [MongoDB Cloud] Successfully restored all guild data, levels, autoreacts & settings from cloud!');
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
      console.log('<a:cloudcomputing_animated:1537177355766865940> [MongoDB Cloud] Master cloud database backup active!');
    } catch (err) {
      console.error('<a:wrong_animated:1537179702928875631> [MongoDB Cloud Error] Failed to connect to MongoDB Atlas:', err.message);
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
    if (this.fileSaveTimeout) clearTimeout(this.fileSaveTimeout);
    this.fileSaveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(jsonDbPath, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (e) {}
    }, 1000);
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
        ).catch(err => console.error('<a:wrong_animated:1537179702928875631> [MongoDB Sync Error]:', err.message));
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


  // --- ANTINUKE PERSISTENCE ---
  getAntinuke(guildId) {
    if (!this.data.antinuke) this.data.antinuke = {};
    if (!this.data.antinuke[guildId]) {
      this.data.antinuke[guildId] = {
        enabled: false,
        panicmode: false,
        panicLevel: 1,
        whitelistedUsers: [],
        extraOwners: ['1420687548807905324'],
        bypassRoles: [],
        filters: {}
      };
    }
    return this.data.antinuke[guildId];
  }

  updateAntinuke(guildId, updateFn) {
    const config = this.getAntinuke(guildId);
    if (typeof updateFn === 'function') {
      updateFn(config);
    } else if (typeof updateFn === 'object') {
      Object.assign(config, updateFn);
    }
    this.data.antinuke[guildId] = config;
    this.saveJSON();
    return config;
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
          weeklyXp: 0,
          monthlyXp: 0,
          level: 1,
          rank: 'Academy Student',
          messages: 0,
          voiceSeconds: 0,
          _lastXpAt: 0,
          _lastReactionXpAt: 0,
          cardBg: null
        };
      }
      const gLvl = this.data.guildLevels[guildId][userId];

      return new Proxy(u, {
        get(target, prop) {
          if (['xp', 'weeklyXp', 'monthlyXp', 'level', 'rank', 'messages', 'voiceSeconds', '_lastXpAt', '_lastReactionXpAt', '_lastAnnouncedLevel', 'cardBg'].includes(prop)) {
            return gLvl[prop] !== undefined ? gLvl[prop] : (prop === 'level' ? 1 : prop === 'rank' ? 'Academy Student' : prop === 'cardBg' ? null : 0);
          }
          return target[prop];
        },
        set(target, prop, value) {
          if (['xp', 'weeklyXp', 'monthlyXp', 'level', 'rank', 'messages', 'voiceSeconds', '_lastXpAt', '_lastReactionXpAt', '_lastAnnouncedLevel', 'cardBg'].includes(prop)) {
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

  getLevelConfig(guildId) {
    if (!this.data.levelConfigs) this.data.levelConfigs = {};
    if (!this.data.levelConfigs[guildId]) {
      this.data.levelConfigs[guildId] = {
        enabled: true,
        channelId: null, // null = current channel, 'dm' = DM, 'none' = disabled
        message: null, // custom level up message
        cooldown: 120, // 2 minutes in seconds
        minXp: 15,
        maxXp: 40,
        reactionXpMin: 5,
        reactionXpMax: 15,
        voiceXpRate: 10, // XP per min
        roleRewardsMode: 'stack', // 'stack' or 'replace'
        roleRewards: [], // [{ level: 5, roleId: '...' }]
        ignoredChannels: [], // ['channelId']
        ignoredRoles: [], // ['roleId']
        multipliers: {}, // { 'roleId': 1.5 }
        channelMultipliers: {}, // { 'channelId': 2.0 }
        championRoleId: null, // #1 leaderboard role
        disableVoteBooster: false,
        leaderboardBanner: null
      };
    }
    const cfg = this.data.levelConfigs[guildId];
    if (cfg.enabled === undefined) cfg.enabled = true;
    if (cfg.cooldown === undefined) cfg.cooldown = 120;
    if (cfg.minXp === undefined) cfg.minXp = 15;
    if (cfg.maxXp === undefined) cfg.maxXp = 40;
    if (cfg.reactionXpMin === undefined) cfg.reactionXpMin = 5;
    if (cfg.reactionXpMax === undefined) cfg.reactionXpMax = 15;
    if (cfg.voiceXpRate === undefined) cfg.voiceXpRate = 10;
    if (!cfg.roleRewardsMode) cfg.roleRewardsMode = 'stack';
    if (!Array.isArray(cfg.roleRewards)) cfg.roleRewards = [];
    if (!Array.isArray(cfg.ignoredChannels)) cfg.ignoredChannels = [];
    if (!Array.isArray(cfg.ignoredRoles)) cfg.ignoredRoles = [];
    if (!cfg.multipliers) cfg.multipliers = {};
    if (!cfg.channelMultipliers) cfg.channelMultipliers = {};
    return cfg;
  }

  updateLevelConfig(guildId, updateFn) {
    const cfg = this.getLevelConfig(guildId);
    if (typeof updateFn === 'function') {
      updateFn(cfg);
    }
    this.saveJSON();
    return cfg;
  }

  resetGuildLevels(guildId, userId = null) {
    if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
      if (userId) {
        delete this.data.guildLevels[guildId][userId];
      } else {
        this.data.guildLevels[guildId] = {};
      }
      this.saveJSON();
      return true;
    }
    return false;
  }

  addMessage(userId, count = 1, guildId = null, memberRoleIds = [], channelId = null) {
    const user = this.getUser(userId, guildId);
    user.messages += count;

    let cfg = { cooldown: 120, minXp: 15, maxXp: 40, multipliers: {}, channelMultipliers: {}, ignoredChannels: [], ignoredRoles: [] };
    if (guildId) {
      cfg = this.getLevelConfig(guildId);
    }

    const now = Date.now();
    const cooldownMs = (cfg.cooldown || 120) * 1000;
    const lastXp = user._lastXpAt || 0;

    let gainedXp = 0;
    if (now - lastXp >= cooldownMs) {
      const min = cfg.minXp || 15;
      const max = cfg.maxXp || 40;
      let baseGain = (Math.floor(Math.random() * Math.max(1, max - min + 1)) + min) * count;

      // Apply role multipliers
      if (memberRoleIds && memberRoleIds.length > 0 && cfg.multipliers) {
        let maxMult = 1.0;
        for (const rId of memberRoleIds) {
          if (cfg.multipliers[rId] && cfg.multipliers[rId] > maxMult) {
            maxMult = cfg.multipliers[rId];
          }
        }
        baseGain = Math.round(baseGain * maxMult);
      }

      // Apply channel multipliers
      if (channelId && cfg.channelMultipliers && cfg.channelMultipliers[channelId]) {
        baseGain = Math.round(baseGain * cfg.channelMultipliers[channelId]);
      }

      user.xp = (user.xp || 0) + baseGain;
      user.weeklyXp = (user.weeklyXp || 0) + baseGain;
      user.monthlyXp = (user.monthlyXp || 0) + baseGain;
      user._lastXpAt = now;
      gainedXp = baseGain;
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
    return { user, leveledUp: user.level > oldLevel, gainedXp };
  }

  addReactionXP(userId, count = 1, guildId = null, memberRoleIds = [], channelId = null) {
    const user = this.getUser(userId, guildId);
    let cfg = { reactionXpMin: 5, reactionXpMax: 15, multipliers: {}, channelMultipliers: {} };
    if (guildId) cfg = this.getLevelConfig(guildId);

    const now = Date.now();
    const lastXp = user._lastReactionXpAt || 0;

    let gainedXp = 0;
    // 30-second cooldown between reaction XP gains
    if (now - lastXp >= 30000) {
      const min = cfg.reactionXpMin || 5;
      const max = cfg.reactionXpMax || 15;
      let baseGain = (Math.floor(Math.random() * Math.max(1, max - min + 1)) + min) * count;

      if (memberRoleIds && memberRoleIds.length > 0 && cfg.multipliers) {
        let maxMult = 1.0;
        for (const rId of memberRoleIds) {
          if (cfg.multipliers[rId] && cfg.multipliers[rId] > maxMult) maxMult = cfg.multipliers[rId];
        }
        baseGain = Math.round(baseGain * maxMult);
      }

      if (channelId && cfg.channelMultipliers && cfg.channelMultipliers[channelId]) {
        baseGain = Math.round(baseGain * cfg.channelMultipliers[channelId]);
      }

      user.xp = (user.xp || 0) + baseGain;
      user.weeklyXp = (user.weeklyXp || 0) + baseGain;
      user.monthlyXp = (user.monthlyXp || 0) + baseGain;
      user._lastReactionXpAt = now;
      gainedXp = baseGain;
    }

    const oldLevel = user.level;
    user.level = Math.max(1, Math.floor(0.1 * Math.sqrt(user.xp || 0)) + 1);
    user.rank = calculateRank(user.level);

    this.saveJSON();
    return { user, leveledUp: user.level > oldLevel, gainedXp };
  }

  addVoiceTime(userId, seconds, guildId = null) {
    const user = this.getUser(userId, guildId);
    user.voiceSeconds += seconds;

    let cfg = { voiceXpRate: 10 };
    if (guildId) cfg = this.getLevelConfig(guildId);

    const rate = cfg.voiceXpRate !== undefined ? cfg.voiceXpRate : 10;
    const gained = Math.floor(seconds / 60) * rate;

    user.xp = (user.xp || 0) + gained;
    user.weeklyXp = (user.weeklyXp || 0) + gained;
    user.monthlyXp = (user.monthlyXp || 0) + gained;

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

  getTopUsersByWeeklyXP(limit = 10, guildId = null) {
    let source = {};
    if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
      source = this.data.guildLevels[guildId];
    } else {
      source = this.data.users || {};
    }

    const allUsers = Object.entries(source).map(([id, u]) => ({
      userId: id,
      xp: u.weeklyXp || u.xp || 0,
      level: u.level || 1,
      rank: u.rank || calculateRank(u.level || 1),
      messages: u.messages || 0
    })).sort((a, b) => b.xp - a.xp);
    return allUsers.slice(0, limit);
  }

  getTopUsersByMonthlyXP(limit = 10, guildId = null) {
    let source = {};
    if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
      source = this.data.guildLevels[guildId];
    } else {
      source = this.data.users || {};
    }

    const allUsers = Object.entries(source).map(([id, u]) => ({
      userId: id,
      xp: u.monthlyXp || u.xp || 0,
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

    // Fallback: For lifetime query or if time-windowed events count is lower than stored user database totals,
    // merge cumulative database totals so numbers never reset!
    if (!windowMs || stats.messages === 0) {
      let cumulativeMsgs = 0;
      let cumulativeVoice = 0;
      let cumulativeInvs = 0;

      if (guildId && this.data.guildLevels && this.data.guildLevels[guildId]) {
        Object.values(this.data.guildLevels[guildId]).forEach(u => {
          cumulativeMsgs += (u.messages || 0);
          cumulativeVoice += (u.voiceSeconds || 0);
          cumulativeInvs += (u.invites || 0);
        });
      }

      if (cumulativeMsgs === 0 && this.data.users) {
        Object.values(this.data.users).forEach(u => {
          cumulativeMsgs += (u.messages || 0);
          cumulativeVoice += (u.voiceSeconds || 0);
          cumulativeInvs += (u.invites || 0);
        });
      }

      stats.messages = Math.max(stats.messages, cumulativeMsgs);
      stats.voiceSeconds = Math.max(stats.voiceSeconds, cumulativeVoice);
      stats.invites = Math.max(stats.invites, cumulativeInvs);
    }

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

  // --- USER UPDATE & DATA PERSISTENCE HELPERS ---
  updateUser(userId, dataOrFn, guildId = null) {
    const user = this.getUser(userId, guildId);
    if (typeof dataOrFn === 'function') {
      dataOrFn(user);
    } else if (typeof dataOrFn === 'object' && dataOrFn !== null) {
      Object.assign(user, dataOrFn);
    }
    this.saveJSON();
    return user;
  }

  saveAutomod(guildId, config) {
    if (!this.data.automod) this.data.automod = {};
    this.data.automod[guildId] = config;
    this.saveJSON();
    return config;
  }

  getGuildLevelingConfig(guildId) {
    return this.getLevelConfig(guildId);
  }

  clearMessages(userId, guildId = null) {
    const user = this.getUser(userId, guildId);
    user.messages = 0;
    this.saveJSON();
    return user;
  }

  clearVoiceTime(userId, guildId = null) {
    const user = this.getUser(userId, guildId);
    user.voiceSeconds = 0;
    this.saveJSON();
    return user;
  }
}

const db = new ResilientDatabase();
module.exports = db;
