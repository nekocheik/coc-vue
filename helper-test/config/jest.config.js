/**
 * Main Jest configuration for the COC-Vue project
 * Robust configuration optimized for unit and integration tests
 */
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/../config/tsconfig.json',
      diagnostics: {
        warnOnly: true
      }
    }],
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'vue'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,vue}',
    '!src/**/*.d.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  setupFilesAfterEnv: ['<rootDir>/utils/jest-setup.js']
};

// Configuration for unit tests
const unitConfig = {
  ...baseConfig,
  displayName: 'UNIT',
  testMatch: ['<rootDir>/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^coc.nvim$': '<rootDir>/mocks/coc.ts',
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^../bridge/core$': '<rootDir>/mocks/bridge-core.ts',
    '^../../src/bridge/core$': '<rootDir>/mocks/bridge-core.ts',
    '^../components/vim-component$': '<rootDir>/mocks/vim-component.ts',
    '^../../src/components/vim-component$': '<rootDir>/mocks/vim-component.ts'
  }
};

// Configuration for integration tests
const integrationConfig = {
  ...baseConfig,
  displayName: 'INTEGRATION',
  testMatch: ['<rootDir>/integration/**/*.test.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/utils/jest-setup.js',
    '<rootDir>/utils/integration-setup.js'
  ]
};

// Export configurations
module.exports = {
  projects: [
    unitConfig,
    integrationConfig
  ]
};
