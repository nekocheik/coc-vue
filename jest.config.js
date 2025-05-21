/**
 * Jest configuration for coc-vue TypeScript tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/helper-test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^coc\\.nvim$': '<rootDir>/helper-test/mocks/coc.mock.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/helper-test/jest.setup.js'],
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
