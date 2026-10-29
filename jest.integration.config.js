const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
}

module.exports = createJestConfig(customJestConfig)
