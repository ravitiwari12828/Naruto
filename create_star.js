const fs = require('fs');
try {
  fs.writeFileSync('*.js', "const v8 = require('v8'); try { v8.setFlagsFromString('--max_old_space_size=192'); } catch(e){} require('./src/index.js');\n");
  console.log('Created *.js entrypoint file!');
} catch (err) {}
