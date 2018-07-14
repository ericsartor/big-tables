const fs = require('fs');

// keyword used in the JavaScript block comment to signify an import statement
const IMPORT_KEYWORD = '( *)//( *)IMPORT::';

// regexp that finds JavaScript block comment import statements
const importRegExp = new RegExp(
  `${IMPORT_KEYWORD}[\.\\/A-Za-z\-\_0-9 ]+\.js`
);

// regexp that finds the spaces at the beginning of an import statement
const indentationSizeRegExp = new RegExp(`^( *)`);

// parse out the file from an import statement
function getFileNameFromImportStatement(importStatement) {
  return importStatement.replace(new RegExp(IMPORT_KEYWORD), '');
}

// parse out the spaces from the beginning of an import statement
function getIndentationFromImportStatement(importStatement) {
  return importStatement.match(indentationSizeRegExp)[0];
}

function getLastIndexOfSlash(str) {
  return Math.max(str.lastIndexOf('\\'), str.lastIndexOf('/'));
}

function pathIsAbsolute(path) {
  return ['\\', '/'].includes(path[0]);
}

// take a relative filepath, parse out the directory structure and append it to
// the absolute directory
function updateAbsolutePathFromRelativePath(relativePath) {
  if (['\\', '/'].includes(relativePath[0])) {
    // relative path is actually an absolute path from root, return path as is
    // to overwrite the current directory
    
    return relativePath;
  } else if (/\/|\\/.test(relativePath)) {
    // relative path contains sub-folders, parse out that structure

    // return the file path without the file
    const lastIndexOfSlash = getLastIndexOfSlash(relativePath);
    return relativePath.slice(0, lastIndexOfSlash + 1);
  } else {
    // relative path is a file in the current directory, return nothing
    // as no update is required

    return '';
  }
}

function getFolderStructureFromPath(filePath) {
  return filePath.slice(0, getLastIndexOfSlash(filePath) + 1);
}

function getFileNameFromPath(filePath) {
  const lastIndexOfSlash = getLastIndexOfSlash(filePath);

  if (lastIndexOfSlash !== -1) {
    // file path has sub-directories, chop them off and only return file name

    return filePath.slice(lastIndexOfSlash + 1);
  } else {
    // file path is in current directory, return as is

    return filePath;
  }
}

// this will be an array of absolute directory paths from root, used in the
// recurisive function below
const folderHistory = [];

// recursive function that will go through files and replace any import
// statements with the code from the import file WITHOUT modifying the
// file contents, read only, returns the file with all replacements as an array
// of string lines
function findImportStatementsAndReplace(filePath) {
  // determine what the absolute directory of the current file is
  let currentDirectory = (() => {
    // this would be the path that the file importing the filePath is located in
    // unless this is a top level file, in which case this is undefined
    const mostRecentPath = folderHistory[folderHistory.length - 1];

    // the relative or absolute file path without the file
    const folderPathToFile = getFolderStructureFromPath(filePath);

    if (pathIsAbsolute(folderPathToFile)) {
      return folderPathToFile;
    } else if (!mostRecentPath) {
      return __dirname + '/' + folderPathToFile;
    } else {
      return mostRecentPath + folderPathToFile;
    }
  })();

  // store this folder in the folder history so we can go back to it after
  // we've finished resolving the import statements within this file
  folderHistory.push(currentDirectory);

  const fileName = getFileNameFromPath(filePath);
  
  // initialize a "new file" string array so we can replace the import
  // statements within it without modifying the file contents
  let newFileContents = (() => {
    try {
      return fs.readFileSync(currentDirectory + fileName, {encoding:'utf8'})
        .split('\r\n');
    } catch (error) {
      console.log(error);
      throw new Error(`Could not find file ${currentDirectory + fileName}` +
        ` during assembly.`);
    }
  })();

  // array of import statements found in the file contents
  const importStatementMatches = newFileContents.filter((line) => {
    return importRegExp.test(line);
  });

  // loop through the import statements and run findImportStatementsAndReplace()
  // on them to generate their replaced file contents
  (importStatementMatches || []).forEach((importStatement) => {
    // get all the information for the file we're trying to import
    const importFilePath = getFileNameFromImportStatement(importStatement);
    const indentationSpaces = getIndentationFromImportStatement(importStatement);
    const importFileContents = findImportStatementsAndReplace(importFilePath);

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
  });

  // once we've reached this point, we won't be importing anything else into
  // this file, so we can get rid of it's folder from the folder history
  folderHistory.pop();

  return newFileContents;
}

// generate the assembled JavaScript and write it to a file
const generatedFileAsArray = findImportStatementsAndReplace('src/main.js');
const generatedFileAsString = generatedFileAsArray.join('\r\n')
fs.writeFileSync('./big-tables.js', generatedFileAsString);
fs.writeFileSync('./docs/big-tables.js', generatedFileAsString);