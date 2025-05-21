#!/usr/bin/env node
/**
 * Script to refactor VADER tests to align with TypeScript test structure
 * 
 * This script:
 * 1. Scans for all VADER test files
 * 2. Parses their structure
 * 3. Refactors them to align with TypeScript test structure
 * 4. Saves the refactored tests
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

// Configuration
const VADER_TEST_DIR = path.resolve(__dirname, '../helper-test/vader');
const REFACTORED_TEST_DIR = path.resolve(__dirname, '../helper-test/vader-refactored');
const TEMPLATE_FILE = path.resolve(__dirname, '../helper-test/templates/vader-test.template.vader');

// Ensure the output directory exists
if (!fs.existsSync(REFACTORED_TEST_DIR)) {
  fs.mkdirSync(REFACTORED_TEST_DIR, { recursive: true });
}

/**
 * Find all VADER test files in a directory
 * @param {string} dir Directory to search
 * @returns {Promise<string[]>} Array of file paths
 */
async function findVaderFiles(dir) {
  const files = await readdir(dir);
  const vaderFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      const nestedFiles = await findVaderFiles(filePath);
      vaderFiles.push(...nestedFiles);
    } else if (file.endsWith('.vader')) {
      vaderFiles.push(filePath);
    }
  }

  return vaderFiles;
}

/**
 * Parse a VADER test file into sections
 * @param {string} filePath Path to the VADER test file
 * @returns {Promise<Object>} Parsed test structure
 */
async function parseVaderFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  
  const sections = [];
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    if (line.startsWith('Execute (') || line.startsWith('Then (')) {
      // Save previous section if it exists
      if (currentSection) {
        sections.push({
          type: currentSection.type,
          name: currentSection.name,
          content: currentContent.join('\n')
        });
      }
      
      // Start new section
      const match = line.match(/^(Execute|Then) \((.*)\):$/);
      if (match) {
        currentSection = {
          type: match[1],
          name: match[2]
        };
        currentContent = [];
      }
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  // Add the last section
  if (currentSection) {
    sections.push({
      type: currentSection.type,
      name: currentSection.name,
      content: currentContent.join('\n')
    });
  }
  
  return {
    filename: path.basename(filePath),
    sections
  };
}

/**
 * Refactor a VADER test file to align with TypeScript structure
 * @param {Object} parsedTest Parsed test structure
 * @returns {string} Refactored test content
 */
function refactorVaderTest(parsedTest) {
  const { filename, sections } = parsedTest;
  
  // Extract component name from filename
  const componentName = path.basename(filename, '.vader');
  
  // Group sections into test suites
  const testSuites = {};
  
  for (const section of sections) {
    // Skip empty sections
    if (!section.content.trim()) continue;
    
    // Determine which test suite this section belongs to
    let suiteName = 'Misc';
    
    if (section.name.toLowerCase().includes('creat')) {
      suiteName = 'Component Creation';
    } else if (section.name.toLowerCase().includes('render')) {
      suiteName = 'Component Rendering';
    } else if (section.name.toLowerCase().includes('focus')) {
      suiteName = 'Component Focus';
    } else if (section.name.toLowerCase().includes('click') || section.name.toLowerCase().includes('event')) {
      suiteName = 'Component Events';
    } else if (section.name.toLowerCase().includes('updat')) {
      suiteName = 'Component Updates';
    } else if (section.name.toLowerCase().includes('destruct') || section.name.toLowerCase().includes('destroy')) {
      suiteName = 'Component Destruction';
    }
    
    if (!testSuites[suiteName]) {
      testSuites[suiteName] = [];
    }
    
    testSuites[suiteName].push(section);
  }
  
  // Build the refactored test content
  let refactoredContent = `# ${componentName} Component Test (Refactored)
# Aligned with TypeScript test structure

# Global Setup - Similar to beforeAll in Jest
Execute (Global Setup):
  " Configure test environment
  let g:test_${componentName}_id = 'test_${componentName}_' . strftime('%s')
  lua require('vue-ui').setup({debug = true, log_events = true})
  lua require('vue-ui').clear_event_log()
`;

  // Add each test suite
  for (const [suiteName, suiteSections] of Object.entries(testSuites)) {
    refactoredContent += `
# Test Suite: ${suiteName}
Execute (Test Suite: ${suiteName}):
  " Test suite setup code
`;

    // Add each test case in the suite
    for (const section of suiteSections) {
      // Convert section name to a more descriptive test case name
      let testCaseName = section.name;
      
      // If it's not already in the "should X" format, convert it
      if (!testCaseName.toLowerCase().startsWith('should')) {
        testCaseName = `Should ${testCaseName.toLowerCase()}`;
      }
      
      refactoredContent += `
# Test Case: ${testCaseName}
Execute (Test Case: ${testCaseName}):
  " Arrange, Act, Assert pattern
${section.content}
`;
    }
  }
  
  // Add global teardown
  refactoredContent += `
# Global Teardown - Similar to afterAll in Jest
Execute (Global Teardown):
  " Teardown code that runs once after all tests
  lua local component = require('vue-ui.utils.event_bridge').get_component(vim.g.test_${componentName}_id)
  lua if component then component:destroy() end
  lua require('vue-ui').save_event_log('${componentName}_test')
`;

  return refactoredContent;
}

/**
 * Main function to refactor all VADER tests
 */
async function refactorAllVaderTests() {
  try {
    console.log('Starting VADER test refactoring...');
    
    // Find all VADER test files
    const vaderFiles = await findVaderFiles(VADER_TEST_DIR);
    console.log(`Found ${vaderFiles.length} VADER test files`);
    
    // Process each file
    for (const filePath of vaderFiles) {
      const filename = path.basename(filePath);
      console.log(`Processing ${filename}...`);
      
      // Parse the file
      const parsedTest = await parseVaderFile(filePath);
      
      // Refactor the test
      const refactoredContent = refactorVaderTest(parsedTest);
      
      // Save the refactored test
      const outputPath = path.join(REFACTORED_TEST_DIR, filename);
      await writeFile(outputPath, refactoredContent, 'utf8');
      
      console.log(`Refactored ${filename} saved to ${outputPath}`);
    }
    
    console.log('VADER test refactoring completed successfully!');
  } catch (error) {
    console.error('Error refactoring VADER tests:', error);
    process.exit(1);
  }
}

// Run the refactoring
refactorAllVaderTests();
