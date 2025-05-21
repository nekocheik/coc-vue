#!/usr/bin/env node
/**
 * Script to combine multiple coverage files into a single summary
 * 
 * Usage: node combine-coverage.js <coverage-dir> <output-file>
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const coverageDir = process.argv[2];
const outputFile = process.argv[3];

if (!coverageDir || !outputFile) {
  console.error('Usage: node combine-coverage.js <coverage-dir> <output-file>');
  process.exit(1);
}

// Find all coverage files
const coverageFiles = fs.readdirSync(coverageDir)
  .filter(file => file.endsWith('_coverage.json'))
  .map(file => path.join(coverageDir, file));

console.log(`Found ${coverageFiles.length} coverage files`);

// Initialize combined coverage data
const combinedCoverage = {
  files: {},
  functions: {},
  lines: {},
  branches: {}
};

// Process each coverage file
coverageFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const coverage = JSON.parse(content);
    
    // Merge file coverage
    if (coverage.files) {
      Object.entries(coverage.files).forEach(([filename, fileData]) => {
        if (!combinedCoverage.files[filename]) {
          combinedCoverage.files[filename] = { lines: {} };
        }
        
        // Merge line coverage
        if (fileData.lines) {
          Object.entries(fileData.lines).forEach(([line, count]) => {
            if (!combinedCoverage.files[filename].lines[line]) {
              combinedCoverage.files[filename].lines[line] = 0;
            }
            combinedCoverage.files[filename].lines[line] += count;
          });
        }
      });
    }
    
    // Merge function coverage
    if (coverage.functions) {
      Object.entries(coverage.functions).forEach(([filename, funcData]) => {
        if (!combinedCoverage.functions[filename]) {
          combinedCoverage.functions[filename] = {};
        }
        
        Object.entries(funcData).forEach(([funcName, count]) => {
          if (!combinedCoverage.functions[filename][funcName]) {
            combinedCoverage.functions[filename][funcName] = 0;
          }
          combinedCoverage.functions[filename][funcName] += count;
        });
      });
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
});

// Calculate coverage metrics
const filesCoverage = [];
let totalLines = 0;
let coveredLines = 0;

// Get source files to analyze
const sourceFiles = getSourceFiles();

// For each source file, calculate coverage
sourceFiles.forEach(file => {
  const moduleName = file.replace(/\.lua$/, '').replace(/\//g, '.');
  
  // If we have coverage data for this file
  if (combinedCoverage.files[moduleName]) {
    const fileLines = getFileLines(file);
    const coveredLinesInFile = Object.keys(combinedCoverage.files[moduleName].lines).length;
    const totalLinesInFile = fileLines.length;
    
    totalLines += totalLinesInFile;
    coveredLines += coveredLinesInFile;
    
    filesCoverage.push({
      file: file,
      total_lines: totalLinesInFile,
      covered_lines: coveredLinesInFile,
      coverage_percent: Math.round((coveredLinesInFile / totalLinesInFile) * 100) || 0
    });
  } else {
    // No coverage data for this file
    const fileLines = getFileLines(file);
    totalLines += fileLines.length;
    
    filesCoverage.push({
      file: file,
      total_lines: fileLines.length,
      covered_lines: 0,
      coverage_percent: 0
    });
  }
});

// Sort files by coverage percentage (ascending)
filesCoverage.sort((a, b) => a.coverage_percent - b.coverage_percent);

// Create coverage summary
const coverageSummary = {
  total_lines: totalLines,
  covered_lines: coveredLines,
  coverage_percent: Math.round((coveredLines / totalLines) * 100) || 0,
  files: filesCoverage
};

// Write summary to file
fs.writeFileSync(outputFile, JSON.stringify(coverageSummary, null, 2));

console.log(`Coverage summary written to ${outputFile}`);
console.log(`Overall coverage: ${coverageSummary.coverage_percent}%`);

/**
 * Get all source files to analyze
 * @returns {string[]} Array of file paths
 */
function getSourceFiles() {
  // Look for Lua files in the vue-ui directory
  const sourceDir = path.resolve(__dirname, '../lua/vue-ui');
  
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Source directory ${sourceDir} not found`);
    return [];
  }
  
  return findFiles(sourceDir, '.lua');
}

/**
 * Find files with a specific extension in a directory (recursive)
 * @param {string} dir Directory to search
 * @param {string} ext File extension to find
 * @returns {string[]} Array of file paths
 */
function findFiles(dir, ext) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, ext));
    } else if (file.endsWith(ext)) {
      results.push(filePath);
    }
  }
  
  return results;
}

/**
 * Get the lines of a file
 * @param {string} file File path
 * @returns {string[]} Array of lines
 */
function getFileLines(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.split('\n');
  } catch (error) {
    console.error(`Error reading ${file}: ${error.message}`);
    return [];
  }
}
