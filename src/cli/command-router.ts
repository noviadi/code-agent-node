import { Agent } from '../agent';
import { SpecialCommand } from './types';
import { DisplayManager } from './display-manager';
import { SessionManager } from './session-manager';

/**
 * Routes special commands and regular chat messages
 */
export class CommandRouter {
  private commands: Map<string, SpecialCommand> = new Map();
  private agent: Agent;
  private displayManager: DisplayManager;
  private sessionManager: SessionManager;

  constructor(agent: Agent, displayManager: DisplayManager, sessionManager: SessionManager) {
    this.agent = agent;
    this.displayManager = displayManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Register a special command
   * Implementation will be added in task 4.1
   */
  registerCommand(command: SpecialCommand): void {
    console.log('CommandRouter.registerCommand - implementation pending');
  }

  /**
   * Route input to appropriate handler
   * Returns true if handled as special command, false if should be sent to agent
   * Implementation will be added in task 4.2
   */
  async routeInput(input: string): Promise<boolean> {
    console.log('CommandRouter.routeInput - implementation pending');
    return false;
  }

  /**
   * Get list of available commands
   * Implementation will be added in task 4.1
   */
  getAvailableCommands(): SpecialCommand[] {
    console.log('CommandRouter.getAvailableCommands - implementation pending');
    return [];
  }

  /**
   * Get auto-complete suggestions for partial input
   * Implementation will be added in task 4.2
   */
  getAutoCompleteSuggestions(partial: string): string[] {
    console.log('CommandRouter.getAutoCompleteSuggestions - implementation pending');
    return [];
  }
}