const antinuke = require('./antinuke');

module.exports = {
  name: 'whitelist',
  description: 'AntiNuke Whitelist Dashboard & Granular Permissions Suite (Olympus Layout)',
  aliases: ['whitelisted', 'wl'],

  async execute(message, args) {
    return antinuke.execute(message, ['whitelist', ...args]);
  }
};
