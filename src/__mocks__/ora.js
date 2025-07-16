// Mock ora for Jest testing
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  text: '',
  color: 'cyan',
  isSpinning: false
};

const mockOra = jest.fn((options) => {
  if (typeof options === 'string') {
    mockSpinner.text = options;
  } else if (options && typeof options === 'object') {
    Object.assign(mockSpinner, options);
  }
  return mockSpinner;
});

module.exports = mockOra;