#!/usr/bin/env node
/**
 * Script to generate an HTML coverage report from coverage summary
 * 
 * Usage: node generate-coverage-report.js <coverage-summary> <output-html>
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const coverageSummaryFile = process.argv[2];
const outputHtmlFile = process.argv[3];

if (!coverageSummaryFile || !outputHtmlFile) {
  console.error('Usage: node generate-coverage-report.js <coverage-summary> <output-html>');
  process.exit(1);
}

// Read coverage summary
const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryFile, 'utf8'));

// Generate HTML report
const html = generateHtml(coverageSummary);

// Write HTML report
fs.writeFileSync(outputHtmlFile, html);

console.log(`HTML coverage report written to ${outputHtmlFile}`);

/**
 * Generate HTML coverage report
 * @param {Object} summary Coverage summary
 * @returns {string} HTML report
 */
function generateHtml(summary) {
  const coverageColor = getCoverageColor(summary.coverage_percent);
  
  // Create HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VADER Test Coverage Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .coverage-bar {
      height: 24px;
      background: #e0e0e0;
      border-radius: 12px;
      margin: 15px 0;
      overflow: hidden;
      position: relative;
    }
    .coverage-progress {
      height: 100%;
      transition: width 0.5s;
    }
    .coverage-label {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 24px;
      line-height: 24px;
      text-align: center;
      color: white;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .file-link {
      color: #3498db;
      text-decoration: none;
    }
    .file-link:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 0.8em;
      font-weight: bold;
    }
    .badge-success { background-color: #2ecc71; }
    .badge-warning { background-color: #f39c12; }
    .badge-danger { background-color: #e74c3c; }
    .timestamp {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>VADER Test Coverage Report</h1>
  <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
  
  <div class="summary">
    <h2>Coverage Summary</h2>
    <p>
      <strong>Total Coverage:</strong> 
      <span class="badge badge-${getCoverageBadgeClass(summary.coverage_percent)}">
        ${summary.coverage_percent}%
      </span>
    </p>
    <p><strong>Lines:</strong> ${summary.covered_lines} / ${summary.total_lines}</p>
    
    <div class="coverage-bar">
      <div class="coverage-progress" style="width: ${summary.coverage_percent}%; background-color: ${coverageColor};"></div>
      <div class="coverage-label">${summary.coverage_percent}%</div>
    </div>
  </div>
  
  <h2>File Coverage</h2>
  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Coverage</th>
        <th>Lines</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${summary.files.map(file => {
        const fileColor = getCoverageColor(file.coverage_percent);
        const badgeClass = getCoverageBadgeClass(file.coverage_percent);
        
        return `<tr>
          <td><span class="file-link">${file.file}</span></td>
          <td>
            <div class="coverage-bar" style="margin: 0; height: 16px;">
              <div class="coverage-progress" style="width: ${file.coverage_percent}%; background-color: ${fileColor};"></div>
            </div>
          </td>
          <td>${file.covered_lines} / ${file.total_lines}</td>
          <td><span class="badge badge-${badgeClass}">${file.coverage_percent}%</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  
  <h2>Next Steps to Improve Coverage</h2>
  <ul>
    ${getNextSteps(summary).map(step => `<li>${step}</li>`).join('')}
  </ul>
  
  <div class="footer">
    <p>Generated by the VADER Test Coverage Tool</p>
  </div>
</body>
</html>`;
}

/**
 * Get color for coverage percentage
 * @param {number} percent Coverage percentage
 * @returns {string} CSS color
 */
function getCoverageColor(percent) {
  if (percent >= 80) return '#2ecc71'; // Green
  if (percent >= 50) return '#f39c12'; // Orange
  return '#e74c3c'; // Red
}

/**
 * Get badge class for coverage percentage
 * @param {number} percent Coverage percentage
 * @returns {string} Badge class
 */
function getCoverageBadgeClass(percent) {
  if (percent >= 80) return 'success';
  if (percent >= 50) return 'warning';
  return 'danger';
}

/**
 * Get next steps to improve coverage
 * @param {Object} summary Coverage summary
 * @returns {string[]} Array of next steps
 */
function getNextSteps(summary) {
  const steps = [];
  
  // Find files with no coverage
  const noCoverageFiles = summary.files.filter(file => file.coverage_percent === 0);
  if (noCoverageFiles.length > 0) {
    steps.push(`Add tests for ${noCoverageFiles.length} files with no coverage, starting with: ${noCoverageFiles.slice(0, 3).map(f => path.basename(f.file)).join(', ')}...`);
  }
  
  // Find files with low coverage
  const lowCoverageFiles = summary.files.filter(file => file.coverage_percent > 0 && file.coverage_percent < 50);
  if (lowCoverageFiles.length > 0) {
    steps.push(`Improve tests for ${lowCoverageFiles.length} files with low coverage (<50%), starting with: ${lowCoverageFiles.slice(0, 3).map(f => path.basename(f.file)).join(', ')}...`);
  }
  
  // Overall recommendation
  if (summary.coverage_percent < 80) {
    steps.push(`Aim to increase overall coverage from ${summary.coverage_percent}% to at least 80% by focusing on the files with lowest coverage first.`);
  } else {
    steps.push(`Maintain the good coverage of ${summary.coverage_percent}% by adding tests for any new code.`);
  }
  
  return steps;
}
