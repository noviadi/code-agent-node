import { ThemeEngine } from './theme-engine';
import { ProgressManager } from './progress-manager';
import { MessageType, DisplayOptions, ProgressIndicator } from '../types';

// Use require for chalk to avoid ES module issues in Jest
const chalk = require('chalk');

/**
 * Manages all visual output, theming, and formatting for the interactive CLI
 */
export class DisplayManager {
  private themeEngine: ThemeEngine;
  private progressManager: ProgressManager;

  constructor(themeEngine: ThemeEngine, progressManager: ProgressManager) {
    this.themeEngine = themeEngine;
    this.progressManager = progressManager;
  }

  /**
   * Display a formatted message with appropriate styling
   */
  displayMessage(message: string, type: MessageType, options: DisplayOptions = {}): void {
    const theme = this.themeEngine.getCurrentTheme();
    const { prefix, indent = 0, color } = options;
    
    // Get color for message type
    const messageColor = color || this.getColorForMessageType(type);
    
    // Get symbol for message type
    const symbol = this.getSymbolForMessageType(type);
    
    // Build the formatted message
    let formattedMessage = '';
    
    // Add indentation
    if (indent > 0) {
      formattedMessage += ' '.repeat(indent);
    }
    
    // Add symbol and prefix
    if (symbol) {
      formattedMessage += chalk.hex(messageColor)(symbol) + ' ';
    }
    
    if (prefix) {
      formattedMessage += chalk.hex(messageColor).bold(prefix) + ' ';
    }
    
    // Add the main message
    formattedMessage += chalk.hex(messageColor)(message);
    
    console.log(formattedMessage);
  }

  /**
   * Display a welcome message with branding
   */
  displayWelcome(): void {
    const theme = this.themeEngine.getCurrentTheme();
    
    console.log();
    console.log(chalk.hex(theme.colors.system).bold('🤖 Code Agent Node - Interactive CLI'));
    console.log(chalk.hex(theme.colors.prompt)('Type your message or use special commands:'));
    console.log();
    console.log(chalk.hex(theme.colors.tool)('  /help    - Show available commands'));
    console.log(chalk.hex(theme.colors.tool)('  /clear   - Clear the screen'));
    console.log(chalk.hex(theme.colors.tool)('  /history - Show command history'));
    console.log(chalk.hex(theme.colors.tool)('  /tools   - List available tools'));
    console.log(chalk.hex(theme.colors.tool)('  /config  - Show configuration'));
    console.log(chalk.hex(theme.colors.tool)('  /exit    - Exit the application'));
    console.log();
    console.log(chalk.hex(theme.colors.prompt)('Press Ctrl+C to exit at any time.'));
    console.log();
  }

  /**
   * Display tool usage information with formatting
   */
  formatToolUsage(toolName: string, input: any, result: any): void {
    const theme = this.themeEngine.getCurrentTheme();
    
    console.log();
    console.log(chalk.hex(theme.colors.tool).bold(`🔧 Tool: ${toolName}`));
    
    // Display input if provided
    if (input && Object.keys(input).length > 0) {
      console.log(chalk.hex(theme.colors.system)('Input:'));
      console.log(chalk.hex(theme.colors.prompt)(JSON.stringify(input, null, 2)));
    }
    
    // Display result if provided
    if (result !== undefined) {
      console.log(chalk.hex(theme.colors.system)('Result:'));
      if (typeof result === 'string') {
        console.log(chalk.hex(theme.colors.success)(result));
      } else {
        console.log(chalk.hex(theme.colors.success)(JSON.stringify(result, null, 2)));
      }
    }
    console.log();
  }

  /**
   * Show progress indicator for operations
   */
  showProgress(operation: string): ProgressIndicator {
    return this.progressManager.createIndicator(`progress-${Date.now()}`, operation);
  }

  /**
   * Clear the terminal screen
   */
  clearScreen(): void {
    console.clear();
  }

  /**
   * Display error message with proper formatting
   */
  displayError(error: Error, context?: string): void {
    const theme = this.themeEngine.getCurrentTheme();
    
    console.log();
    console.log(chalk.hex(theme.colors.error).bold(`${theme.symbols.error} Error${context ? ` (${context})` : ''}:`));
    console.log(chalk.hex(theme.colors.error)(error.message));
    
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.log(chalk.hex(theme.colors.warning)('Stack trace:'));
      console.log(chalk.hex(theme.colors.warning)(error.stack));
    }
    console.log();
  }

  /**
   * Display success message
   */
  displaySuccess(message: string): void {
    const theme = this.themeEngine.getCurrentTheme();
    console.log(chalk.hex(theme.colors.success)(`${theme.symbols.success} ${message}`));
  }

  /**
   * Display warning message
   */
  displayWarning(message: string): void {
    const theme = this.themeEngine.getCurrentTheme();
    console.log(chalk.hex(theme.colors.warning)(`⚠️  ${message}`));
  }

  /**
   * Display system message
   */
  displaySystem(message: string): void {
    this.displayMessage(message, MessageType.SYSTEM);
  }

  /**
   * Display user message
   */
  displayUser(message: string): void {
    this.displayMessage(message, MessageType.USER);
  }

  /**
   * Display assistant message
   */
  displayAssistant(message: string): void {
    this.displayMessage(message, MessageType.ASSISTANT);
  }

  /**
   * Get color for message type from current theme
   */
  private getColorForMessageType(type: MessageType): string {
    const theme = this.themeEngine.getCurrentTheme();
    
    switch (type) {
      case MessageType.USER:
        return theme.colors.user;
      case MessageType.ASSISTANT:
        return theme.colors.assistant;
      case MessageType.SYSTEM:
        return theme.colors.system;
      case MessageType.ERROR:
        return theme.colors.error;
      case MessageType.SUCCESS:
        return theme.colors.success;
      case MessageType.WARNING:
        return theme.colors.warning;
      case MessageType.TOOL:
        return theme.colors.tool;
      default:
        return theme.colors.prompt;
    }
  }

  /**
   * Get symbol for message type from current theme
   */
  private getSymbolForMessageType(type: MessageType): string {
    const theme = this.themeEngine.getCurrentTheme();
    
    switch (type) {
      case MessageType.USER:
        return theme.symbols.user;
      case MessageType.ASSISTANT:
        return theme.symbols.assistant;
      case MessageType.SUCCESS:
        return theme.symbols.success;
      case MessageType.ERROR:
        return theme.symbols.error;
      default:
        return '';
    }
  }

  /**
   * Set theme for display manager
   */
  setTheme(themeName: string): boolean {
    return this.themeEngine.setTheme(themeName);
  }

  /**
   * Get current theme name
   */
  getCurrentThemeName(): string {
    return this.themeEngine.getCurrentTheme().name;
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): string[] {
    return this.themeEngine.getAvailableThemes();
  }
}