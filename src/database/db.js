const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('[Database Warning] Native sqlite3 module blocked or uncompiled. Using resilient fallback persistence.');
}

const dbPath = path.join(dataDir, 'database.sqlite');
const jsonDbPath = path.join(dataDir, 'database.json');

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

    this.data = {
      users: {},
      autoroles: {},
      autoresponses: {},
      autoreacts: {},
      automod: {},
      settings: {},
      analytics: []
    };

    if (sqlite3) {
      try {
        this.sqliteDb = new sqlite3.Database(dbPath, (err) => {
          if (!err) {
            this.useSqlite = true;
            this.initTables();
          } else {
            this.loadJSON();
          }
        });
      } catch (e) {
        this.loadJSON();
      }
    } else {
      this.loadJSON();
    }
  }

  loadJSON() {
    try {
      if (fs.existsSync(jsonDbPath)) {
        const raw = fs.readFileSync(jsonDbPath, 'utf8');
        this.data = Object.assign(this.data, JSON.parse(raw));
        if (!this.data.analytics) this.data.analytics = [];
      } else {
        this.saveJSON();
      }
    } catch (e) {}
  }

  saveJSON() {
    try {
      fs.writeFileSync(jsonDbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {}
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
  }

  // --- USER XP, MESSAGES & VOICE TIMING ---
  getUser(userId) {
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
        jutsuList: ['Rasengan', 'Shadow Clone Jutsu']
      };
    }
    return this.data.users[userId];
  }

  addMessage(userId, count = 1) {
    const user = this.getUser(userId);
    user.messages += count;
    user.xp += count * 5;
    const oldLevel = user.level;
    user.level = Math.floor(0.1 * Math.sqrt(user.xp)) + 1;
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

  addVoiceTime(userId, seconds) {
    const user = this.getUser(userId);
    user.voiceSeconds += seconds;
    user.xp += Math.floor(seconds / 60) * 10;
    user.level = Math.floor(0.1 * Math.sqrt(user.xp)) + 1;
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

  addInvites(userId, count = 1) {
    const user = this.getUser(userId);
    user.invites += count;
    user.xp += count * 15;

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, user.messages, user.voiceSeconds, user.invites, user.xp, user.level, user.rank, user.chakra, user.ryo, JSON.stringify(user.jutsuList)]
      );
    }
    this.saveJSON();
    return user;
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
        punishment: 'warn',
        whitelistedBots: [],
        ignoredChannels: []
      };
    }
    return this.data.automod[guildId];
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

  getAutoresponses(guildId) {
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
    const id = Date.now().toString(36);
    const item = { id, trigger: trigger.toLowerCase().trim(), emoji };
    this.data.autoreacts[guildId].push(item);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO autoreacts (id, guildId, trigger, emoji) VALUES (?, ?, ?, ?)`,
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
}

const db = new ResilientDatabase();
module.exports = db;
