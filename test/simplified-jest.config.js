/**
 * Configuration Jest simplifiée pour le projet COC-Vue
 * Cette configuration est optimisée pour les tests avec mocks
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
  setupFilesAfterEnv: ['<rootDir>/utils/jest-setup.js'],
  // Définir les variables d'environnement pour tous les tests
  globals: {
    MOCK_NEOVIM: true
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
  setupFilesAfterEnv: [
    '<rootDir>/utils/jest-setup.js',
    '<rootDir>/utils/simplified-integration-setup.js'
  ]
};

// Exporter les configurations
module.exports = {
  projects: [
    unitConfig,
    integrationConfig
  ]
};
