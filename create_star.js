const fs = require('fs');
try {
  if (!fs.existsSync('.git')) fs.mkdirSync('.git');
  fs.writeFileSync('entry.js', "const v8 = require('v8'); try { v8.setFlagsFromString('--max_old_space_size=512'); } catch(e){} require('./src/index.js');\n");
  console.log('Created entry.js entrypoint file!');
} catch (err) {}
