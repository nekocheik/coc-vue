/**
 * Jest configuration for coc-vue
 * This file contains the main test configuration
 */

module.exports = {
  // Test environment configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'vue'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/../helper-test/jest.setup.js'
  ],
  
  // Important: This section handles known issues
  // If a test consistently fails for known reasons, we can add it here
  testFailureExitCode: 1,
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,vue}',
    '!src/**/*.d.ts',
    '!src/types/**/*'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'json-summary'
  ],
  coverageDirectory: '<rootDir>/coverage',
  
  // Project configuration
  projects: [
    
  ],
  
  // Global timeout configuration
  testTimeout: 30000,
  
  // Verbose output for debugging
  verbose: true
};
