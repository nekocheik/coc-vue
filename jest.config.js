/**
 * Jest configuration for coc-vue TypeScript tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/helper-test'],
  // ── pick up .ts **and** .tsx in any sub-directory ────────────────────
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',      // all unit tests
  ],

  // ── tell ts-jest to compile .tsx as well ─────────────────────────────
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
    }],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { statements: 80, branches: 60, functions: 75, lines: 80 }
  },
  // optional – include template folder in coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'template/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^coc\\.nvim$': '<rootDir>/helper-test/mocks/coc.mock.ts'
  },
  setupFilesAfterEnv: [
    '<rootDir>/helper-test/jest.setup.js',
    '<rootDir>/__tests__/jest.setup.coc.nvim.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.legacy_ts_tests/'
  ],
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  moduleDirectories: ['node_modules', 'src', 'helper-test'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
