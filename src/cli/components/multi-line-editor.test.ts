import { MultiLineEditor } from './multi-line-editor';

// Mock chalk to avoid ES module issues in tests
jest.mock('chalk', () => ({
  cyan: { bold: jest.fn((text) => text) },
  gray: jest.fn((text) => text),
  hex: jest.fn(() => jest.fn((text) => text)),
  red: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
  yellow: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
  green: jest.fn((text) => text),
  magenta: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  bgGray: { white: jest.fn((text) => text) },
  bgRed: { white: jest.fn((text) => text) },
  bgYellow: { black: jest.fn((text) => text) }
}));

// Mock highlight.js
jest.mock('highlight.js', () => ({
  default: {
    highlight: jest.fn((code, options) => ({
      value: `<span class="hljs-keyword">${code}</span>`
    })),
    highlightAuto: jest.fn((code) => ({
      value: `<span class="hljs-string">${code}</span>`
    })),
    getLanguage: jest.fn((lang) => lang === 'javascript' || lang === 'typescript')
  }
}));

describe('MultiLineEditor', () => {
  let editor: MultiLineEditor;

  beforeEach(() => {
    editor = new MultiLineEditor();
  });

  afterEach(() => {
    // Cleanup handled by the class itself
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(editor).toBeInstanceOf(MultiLineEditor);
    });
  });

  describe('formatPreview', () => {
    it('should return (empty input) for empty content', () => {
      const result = editor.formatPreview('');
      expect(result).toContain('(empty input)');
    });

    it('should return (empty input) for whitespace-only content', () => {
      const result = editor.formatPreview('   \n  \t  ');
      expect(result).toContain('(empty input)');
    });

    it('should format single line with enhanced preview', () => {
      const content = 'Hello world';
      const result = editor.formatPreview(content);
      
      expect(result).toContain('┌─ Input Preview');
      expect(result).toContain('1 │ Hello world');
      expect(result).toContain('└─────────────');
    });

    it('should format multiple lines with proper line numbers', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = editor.formatPreview(content);
      
      expect(result).toContain('1 │ Line 1');
      expect(result).toContain('2 │ Line 2');
      expect(result).toContain('3 │ Line 3');
    });
  });

  describe('basic functionality', () => {
    it('should have required methods', () => {
      expect(typeof editor.formatPreview).toBe('function');
      expect(typeof editor.startEditing).toBe('function');
      expect(typeof editor.openExternalEditor).toBe('function');
    });
  });
});