module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '^chalk$': '<rootDir>/src/__mocks__/chalk.js',
    '^ora$': '<rootDir>/src/__mocks__/ora.js',
    '^inquirer$': '<rootDir>/src/__mocks__/inquirer.js'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__mocks__/setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.d.ts',
    '!src/__mocks__/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage'
};