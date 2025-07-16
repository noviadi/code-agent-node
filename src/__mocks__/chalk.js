// Mock chalk for Jest testing
const createChainableMock = (prefix) => {
  const fn = jest.fn((text) => `${prefix}:${text}`);
  
  // Add common chainable methods
  fn.bold = jest.fn((text) => `BOLD-${prefix}:${text}`);
  fn.dim = jest.fn((text) => `DIM-${prefix}:${text}`);
  fn.italic = jest.fn((text) => `ITALIC-${prefix}:${text}`);
  fn.underline = jest.fn((text) => `UNDERLINE-${prefix}:${text}`);
  fn.white = jest.fn((text) => `${prefix}-WHITE:${text}`);
  fn.black = jest.fn((text) => `${prefix}-BLACK:${text}`);
  fn.red = jest.fn((text) => `${prefix}-RED:${text}`);
  fn.green = jest.fn((text) => `${prefix}-GREEN:${text}`);
  fn.blue = jest.fn((text) => `${prefix}-BLUE:${text}`);
  fn.yellow = jest.fn((text) => `${prefix}-YELLOW:${text}`);
  fn.cyan = jest.fn((text) => `${prefix}-CYAN:${text}`);
  fn.magenta = jest.fn((text) => `${prefix}-MAGENTA:${text}`);
  fn.gray = jest.fn((text) => `${prefix}-GRAY:${text}`);
  
  return fn;
};

const mockChalk = {
  hex: jest.fn((color) => {
    const colorFn = jest.fn((text) => `COLOR[${color}]:${text}`);
    colorFn.bold = jest.fn((text) => `BOLD[${color}]:${text}`);
    return colorFn;
  }),
  red: createChainableMock('RED'),
  green: createChainableMock('GREEN'),
  blue: createChainableMock('BLUE'),
  yellow: createChainableMock('YELLOW'),
  cyan: createChainableMock('CYAN'),
  magenta: createChainableMock('MAGENTA'),
  white: createChainableMock('WHITE'),
  gray: createChainableMock('GRAY'),
  black: createChainableMock('BLACK'),
  bold: createChainableMock('BOLD'),
  dim: createChainableMock('DIM'),
  italic: createChainableMock('ITALIC'),
  underline: createChainableMock('UNDERLINE'),
  bgRed: createChainableMock('BG-RED'),
  bgGreen: createChainableMock('BG-GREEN'),
  bgBlue: createChainableMock('BG-BLUE'),
  bgYellow: createChainableMock('BG-YELLOW'),
  bgCyan: createChainableMock('BG-CYAN'),
  bgMagenta: createChainableMock('BG-MAGENTA'),
  bgWhite: createChainableMock('BG-WHITE'),
  bgBlack: createChainableMock('BG-BLACK')
};

module.exports = mockChalk;