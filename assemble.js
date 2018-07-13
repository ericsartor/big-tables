// const files = ['style', 'Utils', 'sorting-algorithms',
//  'BigTable', 'initialize-and-validate'];

// const fs = require('fs');

// const codeFromFiles = files.map((file) => {
//   return fs.readFileSync(`./src/${file}.js`, {encoding:'utf8'});
// })
// .join('\r\n');

// fs.writeFileSync('./big-tables.js', `const BigTable = (function() {${codeFromFiles}})();`, {encoding:'utf8'});
// fs.writeFileSync('./docs/big-tables.js', `const BigTable = (function() {${codeFromFiles}})();`, {encoding:'utf8'});

const fs = require('fs');

// keyword used in the JavaScript block comment to signify an import statement
const IMPORT_KEYWORD = 'IMPORT::';

// regexp that finds JavaScript block comment import statements
const importRegExp = new RegExp(
  ` +.. ${IMPORT_KEYWORD}[\./A-Za-z\-\_0-9]+\.js ..`, 
  'g'
);

// regexp that finds the spaces at the beginning of an import statement
const indentationSizeRegExp = new RegExp(`^[ ]+`);

// parse out the file from an import statement
function getFileNameFromImportStatement(importStatement) {
  return importStatement
    .replace('/*', '')
    .replace('*/', '')
    .replace(/ /g, '')
    .replace(IMPORT_KEYWORD, '');
}

// parse out the spaces from the beginning of an import statement
function getIndentationFromImportStatement(importStatement) {
  return importStatement.match(indentationSizeRegExp)[0];
}

// recursive function that will go through files and replace any import
// statements with the code from the import file WITHOUT modifying the
// file contents, read only, returns the file with all replacements as an array
// of string lines
function findImportStatementsAndReplace(fileName) {
  // initialize a "new file" string array so we can replace the import
  // statements within it without modifying the file contents
  let newFileContents = fs.readFileSync(fileName, {encoding:'utf8'})
    .split('\r\n');

  // array of import statements found in the file contents
  const importStatementMatches = newFileContents.filter((line) => {
    return importRegExp.test(line);
  });

  // loop through the import statements and run findImportStatementsAndReplace()
  // on them to generate their replaced file contents
  (importStatementMatches || []).forEach((importStatement) => {
    // get all the information for the file we're trying to import
    const importFileName = getFileNameFromImportStatement(importStatement);
    const indentationSpaces = getIndentationFromImportStatement(importStatement);
    const importFileContents = findImportStatementsAndReplace(importFileName);

    // array of the import file's contents with the indentation added and
    // with all of it's import statements already replaced
    const indentedImportFileContents = importFileContents
      .map((line) => indentationSpaces + line);
    
    // find the index of the current import statement in the file array so we
    //  know where to insert the imported files lines
    const indexToInsertAt = newFileContents.indexOf(importStatement);

    // remove the import statement
    newFileContents.splice(indexToInsertAt, 1);

    // insert the import file's lines where the import statement was which
    // must be done in reverse because we are always inserting at the same index
    // and if we insert the lines in regular order, they would end up backwards
    indentedImportFileContents.reverse().forEach((line) => {
      newFileContents.splice(indexToInsertAt, 0, line);
    });
    
    // newFileContents = newFileContents.replace(importStatement, indentedImportFileContents);
  });

  return newFileContents;
}

// generate the assembled JavaScript and write it to a file
const generatedFileAsArray = findImportStatementsAndReplace('./src/main.js');
const generatedFileAsString = generatedFileAsArray.join('\r\n')
fs.writeFileSync('./big-tables.js', generatedFileAsString);
fs.writeFileSync('./docs/big-tables.js', generatedFileAsString);