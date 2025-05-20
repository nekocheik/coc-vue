module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/../src/', '<rootDir>/../test/', '<rootDir>/../__tests__/'],
  moduleNameMapper: {
    '^coc.nvim$': '<rootDir>/../__tests__/mocks/coc.ts',
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^../bridge/core$': '<rootDir>/../__tests__/mocks/bridge-core.ts',
    '^../../src/bridge/core$': '<rootDir>/../__tests__/mocks/bridge-core.ts',
    '^../components/vim-component$': '<rootDir>/../__tests__/mocks/vim-component.ts',
    '^../../src/components/vim-component$': '<rootDir>/../__tests__/mocks/vim-component.ts'
  },
  transform: {
    '^.+\.tsx?$': 'ts-jest',
    '^.+\.vue$': '@vue/vue3-jest'
  },
  testRegex: '(/__tests__/.*|(\.|/)(test|spec))\.(tsx?|vue)$',
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
  // Important: Cette section permet de gérer les problèmes connus
  // Si un test échoue de manière répétée pour des raisons connues, nous pouvons l'ajouter ici
  bail: false,
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/../src/jest-setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/../lib/'],
  globals: {
    'vue-jest': {
      experimentalCSSCompile: true
    },
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: {
        warnOnly: true
      }
    }
  }
};
