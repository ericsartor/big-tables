const files = ['style', 'Utils', 'BigTable', 'initialize-and-validate'];

const fs = require('fs');

const codeFromFiles = files.map((file) => {
  return fs.readFileSync(`./src/${file}.js`, {encoding:'utf8'});
})
.join('\r\n');

fs.writeFileSync('./big-tables.js', `const BigTable = (function() {${codeFromFiles}})();`, {encoding:'utf8'});
fs.writeFileSync('./docs/big-tables.js', `const BigTable = (function() {${codeFromFiles}})();`, {encoding:'utf8'});