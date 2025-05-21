/**
 * Script to update all test files to use the new mocking approach
 */
const fs = require('fs');
const path = require('path');

// Function to find all test files
function findTestFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.legacy_ts_tests')) {
      findTestFiles(filePath, fileList);
    } else if (file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to update a test file
function updateTestFile(filePath) {
  console.log(`Updating ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import for cocMock
  content = content.replace(/import cocMock from ['"].*\/mocks\/coc\.mock['"];?\n/g, '');
  
  // Replace the jest.mock call
  content = content.replace(/jest\.mock\(['"]coc\.nvim['"], \(\) => cocMock\);/g, 'jest.mock(\'coc.nvim\');');
  
  // Add the require statement if it doesn't exist
  if (!content.includes('const coc = require(\'coc.nvim\');')) {
    const importSection = content.match(/import.*from.*;\n\n/g);
    if (importSection && importSection.length > 0) {
      const lastImport = content.lastIndexOf(importSection[importSection.length - 1]) + importSection[importSection.length - 1].length;
      content = content.slice(0, lastImport) + '// Get the mocked coc module\nconst coc = require(\'coc.nvim\');\n\n' + content.slice(lastImport);
    }
  }
  
  // Replace all occurrences of cocMock with coc
  content = content.replace(/cocMock\./g, 'coc.');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

// Main function
function main() {
  const srcDir = path.resolve(__dirname, '../src');
  const testFiles = findTestFiles(srcDir);
  
  console.log(`Found ${testFiles.length} test files to update`);
  
  testFiles.forEach(file => {
    updateTestFile(file);
  });
  
  console.log('All test files updated successfully!');
}

main();
