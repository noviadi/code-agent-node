import { MultiLineEditor } from './multi-line-editor';

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
    it('should return (empty) for empty content', () => {
      const result = editor.formatPreview('');
      expect(result).toBe('(empty)');
    });

    it('should return (empty) for whitespace-only content', () => {
      const result = editor.formatPreview('   \n  \t  ');
      expect(result).toBe('(empty)');
    });

    it('should format single line with line numbers', () => {
      const content = 'Hello world';
      const result = editor.formatPreview(content);
      
      expect(result).toContain('--- Preview ---');
      expect(result).toContain('1 | Hello world');
      expect(result).toContain('--- End Preview ---');
    });

    it('should format multiple lines with proper line numbers', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = editor.formatPreview(content);
      
      expect(result).toContain('1 | Line 1');
      expect(result).toContain('2 | Line 2');
      expect(result).toContain('3 | Line 3');
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