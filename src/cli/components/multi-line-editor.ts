import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import { InputFormatter, InputFormatOptions, InputValidationResult } from './input-formatter';

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
  private inputFormatter: InputFormatter;

  constructor() {
    this.tempFilePath = path.join(os.tmpdir(), `cli-editor-${Date.now()}.txt`);
    this.inputFormatter = new InputFormatter();
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
            // Show preview with validation before returning
            const shouldProceed = await this.showPreviewWithValidation(externalContent);
            if (shouldProceed) {
              return externalContent;
            }
            // If user wants to edit more, continue the loop
            continue;
          }
          continue;
        }

        if (line.trim() === '\\preview' || line.trim() === '\\p') {
          // Show current preview
          const currentContent = this.content.join('\n');
          if (currentContent.trim()) {
            await this.showPreviewWithValidation(currentContent);
          } else {
            console.log('No content to preview yet.');
          }
          continue;
        }

        if (line.trim() === '\\done' || line.trim() === '\\end') {
          // Finish editing with preview
          const finalContent = this.content.join('\n');
          if (finalContent.trim()) {
            const shouldProceed = await this.showPreviewWithValidation(finalContent);
            if (shouldProceed) {
              break;
            }
            // Continue editing if user wants to make changes
            continue;
          } else {
            break;
          }
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
          const currentContent = this.content.join('\n');
          
          // Show mini preview for current content
          console.log('\nCurrent input:');
          console.log(this.formatPreview(currentContent, { maxPreviewLines: 10 }));
          
          const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Continue adding lines', value: 'continue' },
              { name: 'Finish and show full preview', value: 'finish' },
              { name: 'Cancel input', value: 'cancel' }
            ],
            default: 'finish'
          }]);

          if (action === 'continue') {
            continue;
          } else if (action === 'finish') {
            const shouldProceed = await this.showPreviewWithValidation(currentContent);
            if (shouldProceed) {
              break;
            }
            // Continue editing if validation failed or user wants changes
            continue;
          } else {
            this.content = [];
            return '';
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
   * Format and preview multi-line input with enhanced formatting
   */
  formatPreview(content: string, options: InputFormatOptions = {}): string {
    return this.inputFormatter.formatPreview(content, {
      showLineNumbers: true,
      enableSyntaxHighlighting: true,
      maxPreviewLines: 50,
      ...options
    });
  }

  /**
   * Format input with error highlighting
   */
  formatWithErrorHighlighting(content: string): string {
    const validationResult = this.inputFormatter.validateInput(content);
    return this.inputFormatter.formatWithErrorHighlighting(content, validationResult);
  }

  /**
   * Show formatted preview with validation
   */
  async showPreviewWithValidation(content: string): Promise<boolean> {
    const validationResult = this.inputFormatter.validateInput(content);
    const stats = this.inputFormatter.getInputStatistics(content);
    
    console.log('\n');
    
    // Show statistics
    console.log(`📊 Input Statistics: ${stats.lines} lines, ${stats.characters} characters, ${stats.words} words`);
    if (stats.codeBlocks > 0) {
      console.log(`💻 Code blocks: ${stats.codeBlocks} (${stats.languages.join(', ')})`);
    }
    console.log('');
    
    // Show preview
    if (validationResult.isValid && validationResult.warnings.length === 0) {
      console.log(this.formatPreview(content));
    } else {
      console.log(this.formatWithErrorHighlighting(content));
    }
    
    console.log('');
    
    // Show validation results
    this.inputFormatter.displayValidationResults(validationResult);
    
    // Ask user if they want to proceed
    if (!validationResult.isValid) {
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Input has validation errors. Do you want to edit it?',
        default: true
      }]);
      return !proceed; // Return true if they want to continue editing
    }
    
    if (validationResult.warnings.length > 0) {
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Input has warnings. Do you want to proceed anyway?',
        default: true
      }]);
      return proceed;
    }
    
    return true; // No issues, proceed
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