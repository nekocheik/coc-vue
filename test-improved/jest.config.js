/**
 * Configuration Jest principale pour le projet COC-Vue
 * Cette configuration est utilisée pour tous les tests
 */
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'vue'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,vue}',
    '!src/**/*.d.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  bail: false,
  verbose: false, // Réduire la verbosité par défaut
  setupFilesAfterEnv: ['<rootDir>/utils/jest-setup.js'],
  globals: {
    'vue-jest': {
      experimentalCSSCompile: true
    },
    'ts-jest': {
      tsconfig: '<rootDir>/../config/tsconfig.json',
      diagnostics: {
        warnOnly: true
      }
    }
  }
};

// Configuration pour les tests unitaires
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

// Configuration pour les tests d'intégration
const integrationConfig = {
  ...baseConfig,
  displayName: 'INTEGRATION',
  testMatch: ['<rootDir>/integration/**/*.test.ts'],
  testTimeout: 30000, // Augmenter le timeout pour les tests d'intégration
  setupFilesAfterEnv: [
    '<rootDir>/utils/jest-setup.js',
    '<rootDir>/utils/integration-setup.js'
  ]
};

// Exporter les configurations
module.exports = {
  projects: [
    unitConfig,
    integrationConfig
  ]
};
