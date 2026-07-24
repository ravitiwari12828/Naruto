const fs = require('fs');
try {
  fs.writeFileSync('*.js', "require('./src/index.js');\n");
  console.log('Created *.js entrypoint file!');
} catch (err) {
  console.error('Could not write *.js file on Windows:', err.message);
}
