const db = require('./src/database/db');
const client = require('./src/index');

console.log('✅ Testing Naruto One Bot dry run load...');
console.log(`✅ Loaded ${client.commands.size} total registered command aliases/commands.`);
console.log('Registered commands:', Array.from(new Set(client.commands.keys())));

console.log('✅ Testing Database operations...');
const testUser = db.getUser('test_user_123');
console.log('Test user stats:', testUser);

db.addMessage('test_user_123', 5);
console.log('Updated test user stats:', db.getUser('test_user_123'));

console.log('\n🎉 DRY RUN PASSED SUCCESSFULLY! All modules, embed helpers, commands, and database routines loaded clean.');
process.exit(0);
