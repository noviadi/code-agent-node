import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import inquirer from 'inquirer';

/**
 * Options for multi-line editing
 */
export interface MultiLineOptions {
  showLineNumbers?: boolean;
  enableExternalEditor?: boolean;
  prompt?: string;
  placeholder?: string;
}

/**
 * Handles multi-line input editing with advanced features
 */
export class MultiLineEditor {
  private content: string[] = [];
  private currentLine: number = 0;
  private isEditing: boolean = false;
  private tempFilePath: string = '';

  constructor() {
    this.tempFilePath = path.join(os.tmpdir(), `cli-editor-${Date.now()}.txt`);
  }

  /**
   * Start multi-line editing session
   */
  async startEditing(options: MultiLineOptions = {}): Promise<string> {
    const {
      showLineNumbers = true,
      enableExternalEditor = true,
      prompt = 'Enter your multi-line input (Shift+Enter for new line, Ctrl+E for external editor):',
      placeholder = 'Type your message here...'
    } = options;

    this.content = [];
    this.currentLine = 0;
    this.isEditing = true;

    console.log(prompt);
    
    if (enableExternalEditor) {
      console.log('Press Ctrl+E to open in external editor, or continue typing below:');
    }

    return this.collectInput(showLineNumbers, placeholder);
  }

  /**
   * Collect multi-line input with line numbers and editing support
   */
  private async collectInput(showLineNumbers: boolean, placeholder: string): Promise<string> {
    let currentInput = '';
    
    while (this.isEditing) {
      const lineNumber = showLineNumbers ? `${this.currentLine + 1}. ` : '';
      const promptText = this.currentLine === 0 ? placeholder : 'Continue...';
      
      try {
        const { line } = await inquirer.prompt([{
          type: 'input',
          name: 'line',
          message: `${lineNumber}${promptText}`,
          default: currentInput
        }]);

        // Handle special key combinations (simulated through text commands)
        if (line.trim() === '\\e' || line.trim() === '\\editor') {
          // Simulate Ctrl+E - open external editor
          const externalContent = await this.openExternalEditor();
          if (externalContent) {
            return externalContent;
          }
          continue;
        }

        if (line.trim() === '\\done' || line.trim() === '\\end') {
          // Finish editing
          break;
        }

        if (line.trim() === '\\cancel') {
          // Cancel editing
          this.content = [];
          return '';
        }

        // Add line to content
        this.content.push(line);
        this.currentLine++;
        currentInput = '';

        // Check if user wants to continue (empty line ends input)
        if (line.trim() === '' && this.content.length > 1) {
          const { continueEditing } = await inquirer.prompt([{
            type: 'confirm',
            name: 'continueEditing',
            message: 'Continue adding lines?',
            default: false
          }]);

          if (!continueEditing) {
            break;
          }
        }

      } catch (error) {
        console.error('Error during input collection:', error);
        break;
      }
    }

    this.isEditing = false;
    const result = this.content.join('\n');
    return result;
  }

  /**
   * Open external editor for complex input
   */
  async openExternalEditor(): Promise<string> {
    try {
      // Write current content to temp file
      const initialContent = this.content.join('\n');
      fs.writeFileSync(this.tempFilePath, initialContent, 'utf8');

      // Determine editor command
      const editor = process.env.EDITOR || process.env.VISUAL || this.getDefaultEditor();
      
      console.log(`Opening ${editor}...`);
      
      // Spawn editor process
      const editorProcess = spawn(editor, [this.tempFilePath], {
        stdio: 'inherit',
        shell: true
      });

      return new Promise((resolve, reject) => {
        editorProcess.on('close', (code) => {
          if (code === 0) {
            try {
              // Read the edited content
              const editedContent = fs.readFileSync(this.tempFilePath, 'utf8');
              // Clean up temp file
              fs.unlinkSync(this.tempFilePath);
              resolve(editedContent);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`Editor exited with code ${code}`));
          }
        });

        editorProcess.on('error', (error) => {
          reject(error);
        });
      });

    } catch (error) {
      console.error('Failed to open external editor:', error);
      return '';
    }
  }

  /**
   * Get default editor based on platform
   */
  private getDefaultEditor(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return 'notepad';
      case 'darwin':
        return 'nano';
      default:
        return 'nano';
    }
  }

  /**
   * Format and preview multi-line input with line numbers
   */
  formatPreview(content: string): string {
    if (!content.trim()) {
      return '(empty)';
    }

    const lines = content.split('\n');
    const maxLineNumWidth = lines.length.toString().length;
    
    const formattedLines = lines.map((line, index) => {
      const lineNum = (index + 1).toString().padStart(maxLineNumWidth, ' ');
      return `${lineNum} | ${line}`;
    });

    return [
      '--- Preview ---',
      ...formattedLines,
      '--- End Preview ---'
    ].join('\n');
  }

  /**
   * Apply text editing shortcuts simulation
   */
  public applyTextShortcuts(input: string, shortcut: string): string {
    switch (shortcut.toLowerCase()) {
      case 'ctrl+a':
        // Select all - return the full input for processing
        return input;
      
      case 'ctrl+x':
        // Cut - return empty string (simulating cut to clipboard)
        return '';
      
      case 'ctrl+v':
        // Paste - would need clipboard integration, return input as-is
        return input;
      
      case 'ctrl+z':
        // Undo - return to previous state (simplified)
        return '';
      
      default:
        return input;
    }
  }

  /**
   * Add proper indentation for code blocks
   */
  public addIndentation(content: string, indentLevel: number = 2): string {
    const indent = ' '.repeat(indentLevel);
    return content.split('\n').map(line => {
      if (line.trim()) {
        return indent + line;
      }
      return line;
    }).join('\n');
  }

  /**
   * Validate multi-line input
   */
  public validateInput(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!content.trim()) {
      errors.push('Input cannot be empty');
    }
    
    if (content.length > 10000) {
      errors.push('Input is too long (max 10,000 characters)');
    }
    
    // Check for potentially problematic characters
    const problematicChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    if (problematicChars.test(content)) {
      errors.push('Input contains invalid control characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean up temporary files
   */
  public cleanup(): void {
    try {
      if (fs.existsSync(this.tempFilePath)) {
        fs.unlinkSync(this.tempFilePath);
      }
    } catch (error) {
      console.warn('Failed to clean up temporary file:', error);
    }
  }
}