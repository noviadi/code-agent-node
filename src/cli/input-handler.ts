import inquirer from 'inquirer';
import * as readline from 'readline';
import { InteractiveCLIConfig, InputOptions } from './types';
import { HistoryManager } from './components/history-manager';
import { AutoCompleteEngine } from './components/auto-complete-engine';
import { MultiLineEditor } from './components/multi-line-editor';

/**
 * Handles user input, history, auto-completion, and multi-line editing
 */
export class InputHandler {
  private config: InteractiveCLIConfig;
  private historyManager: HistoryManager;
  private autoCompleteEngine: AutoCompleteEngine;
  private multiLineEditor: MultiLineEditor;
  private isMultiLineMode: boolean = false;
  private multiLineBuffer: string[] = [];

  constructor(
    config: InteractiveCLIConfig,
    historyManager: HistoryManager,
    autoCompleteEngine: AutoCompleteEngine,
    multiLineEditor: MultiLineEditor
  ) {
    this.config = config;
    this.historyManager = historyManager;
    this.autoCompleteEngine = autoCompleteEngine;
    this.multiLineEditor = multiLineEditor;
    this.setupKeyBindings();
  }

  /**
   * Get input from user with specified options
   */
  async getInput(prompt: string, options?: InputOptions): Promise<string> {
    const inputOptions = {
      multiLine: false,
      autoComplete: true,
      history: true,
      ...options
    };

    try {
      if (inputOptions.multiLine && this.config.multiLineEditor) {
        return await this.getMultiLineInput(prompt);
      } else {
        return await this.getSingleLineInput(prompt, inputOptions);
      }
    } catch (error) {
      console.error('Error getting input:', error);
      // Fallback to basic input
      return await this.getBasicInput(prompt);
    }
  }

  /**
   * Get single line input with history and auto-completion
   */
  private async getSingleLineInput(prompt: string, options: InputOptions): Promise<string> {
    const promptConfig: any = {
      type: 'input',
      name: 'userInput',
      message: prompt,
      validate: (input: string) => {
        const validation = this.validateInput(input);
        return validation.valid ? true : validation.message || 'Invalid input';
      },
      transformer: (input: string) => {
        // Show completion hint if available
        if (options.autoComplete && input.length > 0) {
          const bestCompletion = this.autoCompleteEngine.getBestCompletion(input);
          if (bestCompletion && bestCompletion !== input && bestCompletion.startsWith(input)) {
            return `${input}${bestCompletion.slice(input.length)} (tab to complete)`;
          }
        }
        return input;
      }
    };

    // Add auto-completion source if enabled
    if (options.autoComplete) {
      promptConfig.source = async (answersSoFar: any, input: string) => {
        if (!input) return [];
        return this.autoCompleteEngine.getCompletions(input);
      };
    }

    const answers = await inquirer.prompt([promptConfig]);
    const input = answers.userInput.trim();
    
    // Add to history if enabled
    if (options.history && input.length > 0) {
      this.historyManager.add({
        command: input,
        timestamp: new Date(),
        success: true // Will be updated later based on execution result
      });
    }

    return input;
  }

  /**
   * Get multi-line input with enhanced editing features
   */
  private async getMultiLineInput(prompt: string): Promise<string> {
    this.isMultiLineMode = true;
    
    try {
      // Use the MultiLineEditor for enhanced multi-line input
      const result = await this.multiLineEditor.startEditing({
        showLineNumbers: true,
        enableExternalEditor: true,
        prompt: prompt,
        placeholder: 'Type your message here... (\\e for external editor, \\done to finish, \\preview to see current input)'
      });
      
      // Add to history if we got content
      if (result.trim().length > 0) {
        this.historyManager.add({
          command: result,
          timestamp: new Date(),
          success: true
        });
      }

      return result;
    } finally {
      this.isMultiLineMode = false;
    }
  }



  /**
   * Fallback basic input method
   */
  private async getBasicInput(prompt: string): Promise<string> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'userInput',
        message: prompt
      }
    ]);

    return answers.userInput || '';
  }

  /**
   * Setup key bindings for navigation and shortcuts
   */
  setupKeyBindings(): void {
    // Configure inquirer with enhanced key bindings
    // inquirer handles most standard key bindings (Ctrl+C, Ctrl+D, etc.)
    
    // Set up process-level key handlers for global shortcuts
    if (process.stdin.isTTY) {
      process.stdin.on('keypress', (str, key) => {
        if (key) {
          this.handleGlobalKeyPress(key);
        }
      });
    }

    // Configure readline-style key bindings for inquirer
    this.configureInquirerKeyBindings();
  }

  /**
   * Handle global key press events
   */
  private handleGlobalKeyPress(key: any): void {
    // Handle Ctrl+L for clear screen (when not in input mode)
    if (key.ctrl && key.name === 'l' && !this.isMultiLineMode) {
      console.clear();
    }

    // Handle Ctrl+R for history search (future enhancement)
    if (key.ctrl && key.name === 'r' && !this.isMultiLineMode) {
      // Could trigger history search mode
      // For now, just log the intent
      console.log('\n(Ctrl+R history search - feature coming soon)');
    }

    // Handle Ctrl+E for external editor
    if (key.ctrl && key.name === 'e' && !this.isMultiLineMode) {
      console.log('\n(Ctrl+E external editor - opening...)');
      this.openExternalEditor().catch(console.error);
    }
  }

  /**
   * Configure inquirer-specific key bindings
   */
  private configureInquirerKeyBindings(): void {
    // inquirer automatically handles:
    // - Up/Down arrows for history navigation
    // - Tab for auto-completion (when available)
    // - Ctrl+C for interrupt
    // - Ctrl+D for EOF
    // - Enter for submit
    
    // Additional configuration could be added here for custom prompts
    // This method serves as a placeholder for future enhancements
  }

  /**
   * Enable auto-completion with provided suggestions
   */
  enableAutoCompletion(suggestions: string[]): void {
    this.autoCompleteEngine.setSuggestions(suggestions);
  }

  /**
   * Update auto-completion with contextual suggestions
   */
  updateAutoCompletion(context: string, suggestions: string[]): void {
    this.autoCompleteEngine.addContextualSuggestions(context, suggestions);
  }

  /**
   * Set special commands for auto-completion
   */
  setSpecialCommands(commands: string[]): void {
    this.autoCompleteEngine.setSpecialCommands(commands);
  }

  /**
   * Update command history for auto-completion
   */
  updateHistory(): void {
    const recentHistory = this.historyManager.getRecent(50);
    this.autoCompleteEngine.updateHistory(recentHistory);
  }

  /**
   * Get input with enhanced features (history navigation, auto-completion)
   */
  async getEnhancedInput(prompt: string, options?: InputOptions): Promise<string> {
    // Update auto-completion with latest history
    this.updateHistory();

    // Check for multi-line mode trigger
    if (options?.multiLine || this.shouldUseMultiLine(prompt)) {
      return await this.getInput(prompt, { ...options, multiLine: true });
    }

    return await this.getInput(prompt, options);
  }

  /**
   * Check if multi-line mode should be used
   */
  private shouldUseMultiLine(prompt: string): boolean {
    // Auto-detect multi-line scenarios
    const multiLineIndicators = [
      'code',
      'script',
      'long',
      'detailed',
      'explain',
      'write'
    ];

    const lowerPrompt = prompt.toLowerCase();
    return multiLineIndicators.some(indicator => lowerPrompt.includes(indicator));
  }

  /**
   * Validate input based on context
   */
  validateInput(input: string, context?: string): { valid: boolean; message?: string } {
    if (!input || input.trim().length === 0) {
      return { valid: false, message: 'Please enter a command or message' };
    }

    // Context-specific validation
    if (context === 'command' && input.startsWith('/')) {
      const availableCommands = this.autoCompleteEngine.getCompletions(input);
      if (availableCommands.length === 0) {
        return { valid: false, message: `Unknown command: ${input}` };
      }
    }

    return { valid: true };
  }

  /**
   * Format input for display
   */
  formatInput(input: string): string {
    // Basic formatting - trim whitespace
    let formatted = input.trim();

    // Format multi-line input
    if (formatted.includes('\n')) {
      const lines = formatted.split('\n');
      formatted = lines
        .map((line, index) => `${index + 1}: ${line}`)
        .join('\n');
    }

    return formatted;
  }

  /**
   * Get input statistics
   */
  getInputStats(): {
    historySize: number;
    completionCount: number;
    multiLineMode: boolean;
  } {
    return {
      historySize: this.historyManager.size(),
      completionCount: this.autoCompleteEngine.getCompletionCount(''),
      multiLineMode: this.isMultiLineMode
    };
  }

  /**
   * Clear input history
   */
  clearHistory(): void {
    this.historyManager.clear();
  }

  /**
   * Export input history
   */
  exportHistory(): any[] {
    return this.historyManager.getAll();
  }

  /**
   * Search input history
   */
  searchHistory(query: string): any[] {
    return this.historyManager.search(query);
  }

  /**
   * Open external editor for complex input (Ctrl+E)
   */
  async openExternalEditor(initialContent?: string): Promise<string> {
    try {
      // Use the MultiLineEditor component for external editor integration
      const result = await this.multiLineEditor.openExternalEditor();
      
      // Add to history if we got content
      if (result && result.trim().length > 0) {
        this.historyManager.add({
          command: result,
          timestamp: new Date(),
          success: true
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error opening external editor:', error);
      console.log('Falling back to multi-line input...');
      
      // Fallback to multi-line input
      return await this.getMultiLineInput('Enter your text:');
    }
  }

  /**
   * Get input with preview formatting
   */
  async getInputWithPreview(prompt: string, options?: InputOptions): Promise<string> {
    const input = await this.getEnhancedInput(prompt, options);
    
    // Show formatted preview for multi-line input
    if (input.includes('\n')) {
      console.log('\nPreview:');
      console.log('─'.repeat(50));
      console.log(this.formatInput(input));
      console.log('─'.repeat(50));
      
      // Ask for confirmation
      const confirmAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Send this input?',
          default: true
        }
      ]);
      
      if (!confirmAnswers.confirm) {
        console.log('Input cancelled. Try again:');
        return await this.getInputWithPreview(prompt, options);
      }
    }
    
    return input;
  }

  /**
   * Handle text editing shortcuts (Ctrl+A, Ctrl+X, Ctrl+V)
   */
  private handleTextEditingShortcuts(key: any, currentInput: string): string | null {
    // Note: These shortcuts are primarily handled by the terminal/readline
    // This method serves as a placeholder for custom text editing logic
    
    if (key.ctrl) {
      switch (key.name) {
        case 'a':
          // Select all - handled by terminal
          return null;
        case 'x':
          // Cut - handled by terminal
          return null;
        case 'v':
          // Paste - handled by terminal
          return null;
        case 'z':
          // Undo - could implement custom undo logic
          return null;
        default:
          return null;
      }
    }
    
    return null;
  }

  /**
   * Update command execution result in history
   */
  updateLastCommandResult(success: boolean): void {
    // Update the last command's success status
    const recentHistory = this.historyManager.getRecent(1);
    if (recentHistory.length > 0) {
      const lastCommand = recentHistory[0];
      lastCommand.success = success;
      // Note: This would require the HistoryManager to support updating entries
      // For now, we'll just track this for future enhancement
    }
  }

  /**
   * Get input with context-aware validation
   */
  async getValidatedInput(prompt: string, context: string, options?: InputOptions): Promise<string> {
    let input: string;
    let isValid = false;
    
    while (!isValid) {
      input = await this.getEnhancedInput(prompt, options);
      const validation = this.validateInput(input, context);
      
      if (validation.valid) {
        isValid = true;
        return input;
      } else {
        console.log(`Error: ${validation.message}`);
        console.log('Please try again.');
      }
    }
    
    return '';
  }
}