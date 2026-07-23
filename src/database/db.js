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
      settings: {}
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

    this.sqliteDb.all(`SELECT * FROM autoresponses`, [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          if (!this.data.autoresponses[r.guildId]) this.data.autoresponses[r.guildId] = [];
          this.data.autoresponses[r.guildId].push({ id: r.id, trigger: r.trigger, response: r.response });
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM autoreacts`, [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          if (!this.data.autoreacts[r.guildId]) this.data.autoreacts[r.guildId] = [];
          this.data.autoreacts[r.guildId].push({ id: r.id, trigger: r.trigger, emoji: r.emoji });
        });
      }
    });

    this.sqliteDb.all(`SELECT * FROM automod`, [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          this.data.automod[r.guildId] = {
            enabled: Boolean(r.enabled),
            profanity: Boolean(r.profanity),
            caps: Boolean(r.caps),
            mention: Boolean(r.mention),
            emoji: Boolean(r.emoji),
            punishment: r.punishment,
            whitelistedBots: JSON.parse(r.whitelistedBots || '[]'),
            ignoredChannels: JSON.parse(r.ignoredChannels || '[]')
          };
        });
      }
    });
  }

  // --- USER METHODS ---
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

      if (this.useSqlite && this.sqliteDb) {
        this.sqliteDb.run(
          `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, 0, 0, 0, 0, 1, 'Academy Student', 100, 500, JSON.stringify(['Rasengan', 'Shadow Clone Jutsu'])]
        );
      }
      this.saveJSON();
    }
    const user = this.data.users[userId];
    user.rank = calculateRank(user.level || 1);
    return user;
  }

  updateUser(userId, updateFn) {
    const user = this.getUser(userId);
    updateFn(user);
    user.rank = calculateRank(user.level || 1);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT OR REPLACE INTO users (id, messages, voiceSeconds, invites, xp, level, rank, chakra, ryo, jutsuList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, user.messages, user.voiceSeconds, user.invites, user.xp, user.level, user.rank, user.chakra, user.ryo, JSON.stringify(user.jutsuList)]
      );
    }
    this.saveJSON();
    return user;
  }

  addMessage(userId, count = 1) {
    return this.updateUser(userId, (u) => {
      u.messages += count;
      u.xp += count * 5;
      const nextLevelXp = u.level * 100;
      if (u.xp >= nextLevelXp) {
        u.level += 1;
        u.rank = calculateRank(u.level);
      }
    });
  }

  addInvites(userId, count = 1) {
    return this.updateUser(userId, (u) => {
      u.invites = Math.max(0, u.invites + count);
    });
  }

  // --- AUTOROLES ---
  getAutoroles(guildId) {
    if (!this.data.autoroles[guildId]) {
      this.data.autoroles[guildId] = { humans: [], bots: [] };
    }
    return this.data.autoroles[guildId];
  }

  setAutorole(guildId, targetType, roleId, action = 'add') {
    const config = this.getAutoroles(guildId);
    const list = config[targetType] || [];
    if (action === 'add') {
      if (!list.includes(roleId)) list.push(roleId);
    } else if (action === 'remove') {
      const idx = list.indexOf(roleId);
      if (idx > -1) list.splice(idx, 1);
    } else if (action === 'reset') {
      config[targetType] = [];
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

  // --- AUTORESPONDER ---
  getAutoresponses(guildId) {
    return this.data.autoresponses[guildId] || [];
  }

  addAutoresponse(guildId, trigger, response) {
    if (!this.data.autoresponses[guildId]) this.data.autoresponses[guildId] = [];
    const item = { id: Date.now().toString(36), trigger: trigger.toLowerCase(), response };
    this.data.autoresponses[guildId].push(item);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT INTO autoresponses (id, guildId, trigger, response) VALUES (?, ?, ?, ?)`,
        [item.id, guildId, item.trigger, item.response]
      );
    }
    this.saveJSON();
    return item;
  }

  deleteAutoresponse(guildId, triggerOrId) {
    if (!this.data.autoresponses[guildId]) return false;
    const initialLen = this.data.autoresponses[guildId].length;
    this.data.autoresponses[guildId] = this.data.autoresponses[guildId].filter(
      r => r.id !== triggerOrId && r.trigger !== triggerOrId.toLowerCase()
    );

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `DELETE FROM autoresponses WHERE guildId = ? AND (id = ? OR trigger = ?)`,
        [guildId, triggerOrId, triggerOrId.toLowerCase()]
      );
    }
    this.saveJSON();
    return this.data.autoresponses[guildId].length < initialLen;
  }

  // --- AUTOREACT ---
  getAutoreacts(guildId) {
    return this.data.autoreacts[guildId] || [];
  }

  addAutoreact(guildId, trigger, emoji) {
    if (!this.data.autoreacts[guildId]) this.data.autoreacts[guildId] = [];
    const item = { id: Date.now().toString(36), trigger: trigger.toLowerCase(), emoji };
    this.data.autoreacts[guildId].push(item);

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `INSERT INTO autoreacts (id, guildId, trigger, emoji) VALUES (?, ?, ?, ?)`,
        [item.id, guildId, item.trigger, item.emoji]
      );
    }
    this.saveJSON();
    return item;
  }

  removeAutoreact(guildId, triggerOrId) {
    if (!this.data.autoreacts[guildId]) return false;
    const initialLen = this.data.autoreacts[guildId].length;
    this.data.autoreacts[guildId] = this.data.autoreacts[guildId].filter(
      r => r.id !== triggerOrId && r.trigger !== triggerOrId.toLowerCase()
    );

    if (this.useSqlite && this.sqliteDb) {
      this.sqliteDb.run(
        `DELETE FROM autoreacts WHERE guildId = ? AND (id = ? OR trigger = ?)`,
        [guildId, triggerOrId, triggerOrId.toLowerCase()]
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
}

const db = new ResilientDatabase();
module.exports = db;
