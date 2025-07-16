// Mock chalk for Jest testing
const mockChalk = {
  hex: jest.fn((color) => {
    const colorFn = jest.fn((text) => `COLOR[${color}]:${text}`);
    colorFn.bold = jest.fn((text) => `BOLD[${color}]:${text}`);
    return colorFn;
  }),
  red: jest.fn((text) => `RED:${text}`),
  green: jest.fn((text) => `GREEN:${text}`),
  blue: jest.fn((text) => `BLUE:${text}`),
  yellow: jest.fn((text) => `YELLOW:${text}`),
  cyan: jest.fn((text) => `CYAN:${text}`),
  magenta: jest.fn((text) => `MAGENTA:${text}`),
  white: jest.fn((text) => `WHITE:${text}`),
  gray: jest.fn((text) => `GRAY:${text}`),
  bold: jest.fn((text) => `BOLD:${text}`),
  dim: jest.fn((text) => `DIM:${text}`),
  italic: jest.fn((text) => `ITALIC:${text}`),
  underline: jest.fn((text) => `UNDERLINE:${text}`)
};

// Add chaining support
Object.keys(mockChalk).forEach(key => {
  if (typeof mockChalk[key] === 'function' && key !== 'hex') {
    mockChalk[key].bold = jest.fn((text) => `BOLD-${key.toUpperCase()}:${text}`);
    mockChalk[key].dim = jest.fn((text) => `DIM-${key.toUpperCase()}:${text}`);
  }
});

module.exports = mockChalk;