import { Agent } from '../agent';
import { DisplayManager } from './display-manager';
import { SessionManager } from './session-manager';
import { SpecialCommand, MessageType } from './types';
import { HistoryManager } from './components/history-manager';
import {
  HelpCommand,
  ClearCommand,
  ExitCommand,
  HistoryCommand,
  ToolsCommand,
  ConfigCommand
} from './commands';

/**
 * Routes special commands and regular chat messages
 */
export class CommandRouter {
  private commands: Map<string, SpecialCommand> = new Map();
  private agent: Agent;
  private displayManager: DisplayManager;
  private sessionManager: SessionManager;
  private historyManager: HistoryManager;

  constructor(
    agent: Agent, 
    displayManager: DisplayManager, 
    sessionManager: SessionManager,
    historyManager: HistoryManager
  ) {
    this.agent = agent;
    this.displayManager = displayManager;
    this.sessionManager = sessionManager;
    this.historyManager = historyManager;
    
    this.initializeDefaultCommands();
  }

  /**
   * Initialize default commands
   */
  private initializeDefaultCommands(): void {
    const helpCommand = new HelpCommand(this.displayManager, () => this.getAvailableCommands());
    const clearCommand = new ClearCommand(this.displayManager);
    const exitCommand = new ExitCommand(this.displayManager);
    const historyCommand = new HistoryCommand(this.displayManager, this.historyManager);
    const toolsCommand = new ToolsCommand(this.displayManager, this.agent);
    const configCommand = new ConfigCommand(this.displayManager, this.sessionManager);

    this.registerCommand(helpCommand);
    this.registerCommand(clearCommand);
    this.registerCommand(exitCommand);
    this.registerCommand(historyCommand);
    this.registerCommand(toolsCommand);
    this.registerCommand(configCommand);
  }

  /**
   * Register a special command
   */
  registerCommand(command: SpecialCommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * Route input to appropriate handler
   * @param input The user input to route
   * @returns true if handled as special command, false if should be sent to agent
   */
  async routeInput(input: string): Promise<boolean> {
    const trimmedInput = input.trim();
    
    // Check if input starts with command prefix
    if (!trimmedInput.startsWith('/')) {
      return false; // Not a special command
    }

    // Parse command and arguments
    const parts = trimmedInput.slice(1).split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find and execute command
    const command = this.commands.get(commandName);
    if (command) {
      try {
        await command.handler(args);
        return true; // Command was handled
      } catch (error) {
        this.displayManager.displayMessage(
          `Error executing command '${commandName}': ${error instanceof Error ? error.message : String(error)}`,
          MessageType.ERROR
        );
        return true; // Still handled, even if it failed
      }
    } else {
      // Unknown command
      this.displayManager.displayMessage(
        `Unknown command: ${commandName}. Type '/help' for available commands.`,
        MessageType.ERROR
      );
      return true; // Handled as error
    }
  }

  /**
   * Get available commands
   */
  getAvailableCommands(): SpecialCommand[] {
    return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get auto-complete suggestions for partial command input
   */
  getAutoCompleteSuggestions(partial: string): string[] {
    if (!partial.startsWith('/')) {
      return [];
    }

    const commandPart = partial.slice(1).toLowerCase();
    const suggestions: string[] = [];

    // Get command name suggestions
    for (const [name, command] of this.commands) {
      if (name.startsWith(commandPart)) {
        suggestions.push(`/${name}`);
      }
    }

    // If we have a complete command name, get argument suggestions
    const parts = partial.slice(1).split(/\s+/);
    if (parts.length > 1) {
      const commandName = parts[0].toLowerCase();
      const command = this.commands.get(commandName);
      if (command && command.autoComplete) {
        const argSuggestions = command.autoComplete();
        const currentArg = parts[parts.length - 1];
        
        argSuggestions
          .filter(suggestion => suggestion.toLowerCase().startsWith(currentArg.toLowerCase()))
          .forEach(suggestion => {
            const baseParts = parts.slice(0, -1);
            suggestions.push(`/${baseParts.join(' ')} ${suggestion}`);
          });
      }
    }

    return suggestions;
  }

  /**
   * Check if input is a special command
   */
  isSpecialCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  /**
   * Get command by name
   */
  getCommand(name: string): SpecialCommand | undefined {
    return this.commands.get(name.toLowerCase());
  }
}