import hljs from 'highlight.js';
import { MessageType } from '../types';

// Use require for chalk to avoid ES module issues in Jest
const chalk = require('chalk');

/**
 * Options for input formatting and preview
 */
export interface InputFormatOptions {
  showLineNumbers?: boolean;
  enableSyntaxHighlighting?: boolean;
  maxPreviewLines?: number;
  indentSize?: number;
  showWhitespace?: boolean;
}

/**
 * Validation result for input content
 */
export interface InputValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Detected code block information
 */
export interface CodeBlock {
  language: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Handles input formatting, preview, and validation for multi-line input
 */
export class InputFormatter {
  private static readonly CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;
  private static readonly INLINE_CODE_REGEX = /`([^`]+)`/g;
  private static readonly MAX_LINE_LENGTH = 120;
  private static readonly MAX_TOTAL_LENGTH = 10000;

  /**
   * Create a formatted preview of multi-line input
   */
  public formatPreview(content: string, options: InputFormatOptions = {}): string {
    const {
      showLineNumbers = true,
      enableSyntaxHighlighting = true,
      maxPreviewLines = 50,
      indentSize = 2,
      showWhitespace = false
    } = options;

    if (!content.trim()) {
      return chalk.gray('(empty input)');
    }

    const lines = content.split('\n');
    const totalLines = lines.length;
    
    // Truncate if too many lines
    const displayLines = maxPreviewLines > 0 && lines.length > maxPreviewLines
      ? lines.slice(0, maxPreviewLines)
      : lines;

    const maxLineNumWidth = Math.max(totalLines.toString().length, 2);
    
    // Format each line
    const formattedLines = displayLines.map((line, index) => {
      let formattedLine = line;
      
      // Show whitespace characters if enabled
      if (showWhitespace) {
        formattedLine = formattedLine
          .replace(/\t/g, chalk.gray('→'))
          .replace(/ /g, chalk.gray('·'));
      }
      
      // Apply syntax highlighting if enabled
      if (enableSyntaxHighlighting) {
        formattedLine = this.applySyntaxHighlighting(formattedLine, index, lines);
      }
      
      // Add line numbers
      if (showLineNumbers) {
        const lineNum = (index + 1).toString().padStart(maxLineNumWidth, ' ');
        const lineNumColor = this.getLineNumberColor(line);
        return `${chalk.hex(lineNumColor)(lineNum)} ${chalk.gray('│')} ${formattedLine}`;
      }
      
      return formattedLine;
    });

    // Build the preview
    const previewLines = [
      chalk.cyan.bold('┌─ Input Preview ─────────────────────────────────────────────'),
      ...formattedLines,
    ];

    // Add truncation notice if needed
    if (maxPreviewLines > 0 && totalLines > maxPreviewLines) {
      previewLines.push(
        chalk.gray(`│ ... (${totalLines - maxPreviewLines} more lines)`),
      );
    }

    previewLines.push(
      chalk.cyan.bold('└─────────────────────────────────────────────────────────────')
    );

    return previewLines.join('\n');
  }

  /**
   * Apply syntax highlighting to a line of text
   */
  private applySyntaxHighlighting(line: string, lineIndex: number, allLines: string[]): string {
    // Check if this line is part of a code block
    const codeBlocks = this.detectCodeBlocks(allLines.join('\n'));
    const currentCodeBlock = codeBlocks.find(block => 
      lineIndex >= block.startLine && lineIndex <= block.endLine
    );

    if (currentCodeBlock) {
      // Apply language-specific highlighting
      return this.highlightCode(line, currentCodeBlock.language);
    }

    // Apply inline code highlighting
    return line.replace(InputFormatter.INLINE_CODE_REGEX, (match, code) => {
      return chalk.bgGray.white(` ${code} `);
    });
  }

  /**
   * Highlight code using highlight.js
   */
  private highlightCode(code: string, language: string): string {
    try {
      if (language && hljs.getLanguage(language)) {
        const highlighted = hljs.highlight(code, { language });
        return this.convertHighlightJsToChalk(highlighted.value);
      } else {
        // Auto-detect language
        const highlighted = hljs.highlightAuto(code);
        return this.convertHighlightJsToChalk(highlighted.value);
      }
    } catch (error) {
      // Fallback to no highlighting
      return code;
    }
  }

  /**
   * Convert highlight.js HTML output to chalk colors
   */
  private convertHighlightJsToChalk(html: string): string {
    return html
      .replace(/<span class="hljs-keyword">(.*?)<\/span>/g, chalk.magenta('$1'))
      .replace(/<span class="hljs-string">(.*?)<\/span>/g, chalk.green('$1'))
      .replace(/<span class="hljs-number">(.*?)<\/span>/g, chalk.yellow('$1'))
      .replace(/<span class="hljs-comment">(.*?)<\/span>/g, chalk.gray('$1'))
      .replace(/<span class="hljs-function">(.*?)<\/span>/g, chalk.blue('$1'))
      .replace(/<span class="hljs-variable">(.*?)<\/span>/g, chalk.cyan('$1'))
      .replace(/<span class="hljs-type">(.*?)<\/span>/g, chalk.blue('$1'))
      .replace(/<span class="hljs-built_in">(.*?)<\/span>/g, chalk.magenta('$1'))
      .replace(/<span class="hljs-literal">(.*?)<\/span>/g, chalk.yellow('$1'))
      .replace(/<span[^>]*>(.*?)<\/span>/g, '$1') // Remove any remaining spans
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  /**
   * Get appropriate color for line numbers based on line content
   */
  private getLineNumberColor(line: string): string {
    if (line.trim() === '') {
      return '#666666'; // Gray for empty lines
    }
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return '#888888'; // Darker gray for comments
    }
    return '#4A90E2'; // Blue for regular lines
  }

  /**
   * Detect code blocks in the input
   */
  public detectCodeBlocks(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');
    let match;

    // Reset regex
    InputFormatter.CODE_BLOCK_REGEX.lastIndex = 0;

    while ((match = InputFormatter.CODE_BLOCK_REGEX.exec(content)) !== null) {
      const language = match[1] || 'text';
      const blockContent = match[2];
      
      // Find line numbers for this block
      const beforeBlock = content.substring(0, match.index);
      const startLine = beforeBlock.split('\n').length - 1;
      const endLine = startLine + blockContent.split('\n').length + 1;

      blocks.push({
        language,
        content: blockContent,
        startLine,
        endLine
      });
    }

    return blocks;
  }

  /**
   * Validate input content and return validation results
   */
  public validateInput(content: string): InputValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if empty
    if (!content.trim()) {
      errors.push('Input cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Check total length
    if (content.length > InputFormatter.MAX_TOTAL_LENGTH) {
      errors.push(`Input is too long (${content.length} characters, max ${InputFormatter.MAX_TOTAL_LENGTH})`);
    }

    // Check for problematic characters
    const problematicChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    if (problematicChars.test(content)) {
      errors.push('Input contains invalid control characters');
    }

    // Check line lengths and provide warnings
    const lines = content.split('\n');
    const longLines = lines
      .map((line, index) => ({ line, index: index + 1 }))
      .filter(({ line }) => line.length > InputFormatter.MAX_LINE_LENGTH);

    if (longLines.length > 0) {
      warnings.push(`${longLines.length} line(s) exceed ${InputFormatter.MAX_LINE_LENGTH} characters`);
    }

    // Check for mixed line endings
    if (content.includes('\r\n') && content.includes('\n')) {
      warnings.push('Mixed line endings detected (CRLF and LF)');
    }

    // Check for trailing whitespace
    const linesWithTrailingSpace = lines.filter(line => line !== line.trimEnd()).length;
    if (linesWithTrailingSpace > 0) {
      warnings.push(`${linesWithTrailingSpace} line(s) have trailing whitespace`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Display validation results with appropriate formatting
   */
  public displayValidationResults(result: InputValidationResult): void {
    if (result.errors.length > 0) {
      console.log(chalk.red.bold('❌ Validation Errors:'));
      result.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    if (result.isValid && result.warnings.length === 0) {
      console.log(chalk.green('✅ Input validation passed'));
    }
  }

  /**
   * Format input with error highlighting
   */
  public formatWithErrorHighlighting(content: string, validationResult: InputValidationResult): string {
    if (validationResult.isValid && validationResult.warnings.length === 0) {
      return this.formatPreview(content);
    }

    const lines = content.split('\n');
    const formattedLines = lines.map((line, index) => {
      const lineNum = (index + 1).toString().padStart(2, ' ');
      let formattedLine = line;

      // Highlight long lines
      if (line.length > InputFormatter.MAX_LINE_LENGTH) {
        const normalPart = line.substring(0, InputFormatter.MAX_LINE_LENGTH);
        const excessPart = line.substring(InputFormatter.MAX_LINE_LENGTH);
        formattedLine = normalPart + chalk.bgRed.white(excessPart);
      }

      // Highlight trailing whitespace
      if (line !== line.trimEnd()) {
        const trimmed = line.trimEnd();
        const trailing = line.substring(trimmed.length);
        formattedLine = trimmed + chalk.bgYellow.black(trailing.replace(/ /g, '·'));
      }

      // Color line number based on issues
      let lineNumColor = '#4A90E2';
      if (line.length > InputFormatter.MAX_LINE_LENGTH) {
        lineNumColor = '#FF0000'; // Red for errors
      } else if (line !== line.trimEnd()) {
        lineNumColor = '#FFA500'; // Orange for warnings
      }

      return `${chalk.hex(lineNumColor)(lineNum)} ${chalk.gray('│')} ${formattedLine}`;
    });

    return [
      chalk.red.bold('┌─ Input Preview (with issues highlighted) ──────────────────'),
      ...formattedLines,
      chalk.red.bold('└─────────────────────────────────────────────────────────────')
    ].join('\n');
  }

  /**
   * Get statistics about the input content
   */
  public getInputStatistics(content: string): {
    lines: number;
    characters: number;
    words: number;
    codeBlocks: number;
    languages: string[];
  } {
    const lines = content.split('\n').length;
    const characters = content.length;
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const codeBlocks = this.detectCodeBlocks(content);
    const languages = [...new Set(codeBlocks.map(block => block.language))];

    return {
      lines,
      characters,
      words,
      codeBlocks: codeBlocks.length,
      languages
    };
  }
}