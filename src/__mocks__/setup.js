// Jest setup file
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  clear: jest.fn()
};

// Mock process.exit
process.exit = jest.fn();

// Mock setTimeout and setInterval for tests
global.setTimeout = jest.fn((fn, delay) => {
  if (typeof fn === 'function') {
    fn();
  }
  return 1;
});

global.setInterval = jest.fn((fn, delay) => {
  if (typeof fn === 'function') {
    fn();
  }
  return 1;
});

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();