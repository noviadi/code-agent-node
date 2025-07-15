import { InputFormatter, InputFormatOptions, InputValidationResult, CodeBlock } from './input-formatter';

// Mock chalk to avoid color output in tests
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
  highlight: jest.fn((code, options) => ({
    value: `<span class="hljs-keyword">${code}</span>`
  })),
  highlightAuto: jest.fn((code) => ({
    value: `<span class="hljs-string">${code}</span>`
  })),
  getLanguage: jest.fn((lang) => lang === 'javascript' || lang === 'typescript')
}));

describe('InputFormatter', () => {
  let formatter: InputFormatter;

  beforeEach(() => {
    formatter = new InputFormatter();
    // Clear console.log mock calls
    jest.clearAllMocks();
  });

  describe('formatPreview', () => {
    it('should format empty input correctly', () => {
      const result = formatter.formatPreview('');
      expect(result).toContain('(empty input)');
    });

    it('should format single line input with line numbers', () => {
      const input = 'Hello world';
      const result = formatter.formatPreview(input);
      
      expect(result).toContain('┌─ Input Preview');
      expect(result).toContain('1 │ Hello world');
      expect(result).toContain('└─────────────');
    });

    it('should format multi-line input with line numbers', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = formatter.formatPreview(input);
      
      expect(result).toContain('1 │ Line 1');
      expect(result).toContain('2 │ Line 2');
      expect(result).toContain('3 │ Line 3');
    });

    it('should truncate long input when maxPreviewLines is set', () => {
      const input = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join('\n');
      const result = formatter.formatPreview(input, { maxPreviewLines: 5 });
      
      expect(result).toContain('1 │ Line 1');
      expect(result).toContain('5 │ Line 5');
      expect(result).toContain('... (5 more lines)');
      expect(result).not.toContain('6 │ Line 6');
    });

    it('should disable line numbers when showLineNumbers is false', () => {
      const input = 'Hello world';
      const result = formatter.formatPreview(input, { showLineNumbers: false });
      
      expect(result).not.toContain('1 │');
      expect(result).toContain('Hello world');
    });
  });

  describe('detectCodeBlocks', () => {
    it('should detect JavaScript code blocks', () => {
      const input = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const blocks = formatter.detectCodeBlocks(input);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[0].content).toBe('const x = 1;\nconsole.log(x);\n');
    });

    it('should detect multiple code blocks', () => {
      const input = '```javascript\nconst x = 1;\n```\n\nSome text\n\n```python\nprint("hello")\n```';
      const blocks = formatter.detectCodeBlocks(input);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[1].language).toBe('python');
    });

    it('should detect code blocks without language specification', () => {
      const input = '```\nsome code\n```';
      const blocks = formatter.detectCodeBlocks(input);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe('text');
    });

    it('should return empty array when no code blocks found', () => {
      const input = 'Just regular text without code blocks';
      const blocks = formatter.detectCodeBlocks(input);
      
      expect(blocks).toHaveLength(0);
    });
  });

  describe('validateInput', () => {
    it('should validate empty input as invalid', () => {
      const result = formatter.validateInput('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input cannot be empty');
    });

    it('should validate whitespace-only input as invalid', () => {
      const result = formatter.validateInput('   \n  \t  ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input cannot be empty');
    });

    it('should validate normal input as valid', () => {
      const result = formatter.validateInput('Hello world');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect input that is too long', () => {
      const longInput = 'a'.repeat(10001);
      const result = formatter.validateInput(longInput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input is too long (10001 characters, max 10000)');
    });

    it('should detect problematic control characters', () => {
      const inputWithControlChars = 'Hello\x00world\x07test';
      const result = formatter.validateInput(inputWithControlChars);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input contains invalid control characters');
    });

    it('should warn about long lines', () => {
      const longLine = 'a'.repeat(121);
      const result = formatter.validateInput(longLine);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('1 line(s) exceed 120 characters');
    });

    it('should warn about trailing whitespace', () => {
      const inputWithTrailing = 'Line 1  \nLine 2\t\nLine 3';
      const result = formatter.validateInput(inputWithTrailing);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('2 line(s) have trailing whitespace');
    });

    it('should warn about mixed line endings', () => {
      const inputWithMixedEndings = 'Line 1\r\nLine 2\nLine 3';
      const result = formatter.validateInput(inputWithMixedEndings);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Mixed line endings detected (CRLF and LF)');
    });
  });

  describe('getInputStatistics', () => {
    it('should calculate basic statistics correctly', () => {
      const input = 'Hello world\nThis is line 2\nAnd line 3';
      const stats = formatter.getInputStatistics(input);
      
      expect(stats.lines).toBe(3);
      expect(stats.characters).toBe(input.length);
      expect(stats.words).toBe(9); // "Hello", "world", "This", "is", "line", "2", "And", "line", "3"
      expect(stats.codeBlocks).toBe(0);
      expect(stats.languages).toHaveLength(0);
    });

    it('should count code blocks correctly', () => {
      const input = 'Some text\n```javascript\nconst x = 1;\n```\nMore text\n```python\nprint("hi")\n```';
      const stats = formatter.getInputStatistics(input);
      
      expect(stats.codeBlocks).toBe(2);
      expect(stats.languages).toContain('javascript');
      expect(stats.languages).toContain('python');
    });

    it('should handle empty input', () => {
      const stats = formatter.getInputStatistics('');
      
      expect(stats.lines).toBe(1);
      expect(stats.characters).toBe(0);
      expect(stats.words).toBe(0);
      expect(stats.codeBlocks).toBe(0);
    });

    it('should count words correctly with multiple spaces', () => {
      const input = 'Hello    world   test';
      const stats = formatter.getInputStatistics(input);
      
      expect(stats.words).toBe(3);
    });
  });

  describe('formatWithErrorHighlighting', () => {
    it('should format valid input normally', () => {
      const input = 'Valid input';
      const validationResult: InputValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };
      
      const result = formatter.formatWithErrorHighlighting(input, validationResult);
      expect(result).toContain('┌─ Input Preview');
    });

    it('should highlight errors when validation fails', () => {
      const input = 'a'.repeat(130); // Long line
      const validationResult: InputValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['1 line(s) exceed 120 characters']
      };
      
      const result = formatter.formatWithErrorHighlighting(input, validationResult);
      expect(result).toContain('Input Preview (with issues highlighted)');
    });
  });

  describe('displayValidationResults', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should display errors when validation fails', () => {
      const result: InputValidationResult = {
        isValid: false,
        errors: ['Input cannot be empty', 'Input is too long'],
        warnings: []
      };
      
      formatter.displayValidationResults(result);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Validation Errors:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Input cannot be empty'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Input is too long'));
    });

    it('should display warnings when present', () => {
      const result: InputValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Long lines detected', 'Trailing whitespace found']
      };
      
      formatter.displayValidationResults(result);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Warnings:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Long lines detected'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Trailing whitespace found'));
    });

    it('should display success message when validation passes', () => {
      const result: InputValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };
      
      formatter.displayValidationResults(result);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Input validation passed'));
    });
  });

  describe('edge cases', () => {
    it('should handle input with only newlines', () => {
      const input = '\n\n\n';
      const result = formatter.formatPreview(input);
      
      // Input with only newlines is considered empty and should show empty message
      expect(result).toContain('(empty input)');
    });

    it('should handle input with special characters', () => {
      const input = 'Hello 🌟 world! @#$%^&*()';
      const result = formatter.formatPreview(input);
      
      expect(result).toContain('Hello 🌟 world! @#$%^&*()');
    });

    it('should handle very long single line', () => {
      const input = 'a'.repeat(200);
      const result = formatter.validateInput(input);
      
      expect(result.warnings).toContain('1 line(s) exceed 120 characters');
    });

    it('should handle nested code blocks correctly', () => {
      const input = 'Text\n```markdown\nSome markdown with `inline code`\n```\nMore text';
      const blocks = formatter.detectCodeBlocks(input);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe('markdown');
    });
  });
});