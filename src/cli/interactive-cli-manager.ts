import { Agent } from '../agent';
import { InteractiveCLIConfig } from './types';
import { InputHandler } from './input-handler';
import { DisplayManager } from './display-manager';
import { CommandRouter } from './command-router';
import { SessionManager } from './session-manager';

/**
 * Central orchestrator for the interactive CLI system
 * Coordinates all CLI functionality and manages component interactions
 */
export class InteractiveCLIManager {
  private inputHandler: InputHandler;
  private displayManager: DisplayManager;
  private commandRouter: CommandRouter;
  private sessionManager: SessionManager;
  private agent: Agent;
  private config: InteractiveCLIConfig;
  private isRunning: boolean = false;

  constructor(agent: Agent, config: InteractiveCLIConfig) {
    this.agent = agent;
    this.config = config;
    
    // Initialize components (will be implemented in later tasks)
    this.displayManager = new DisplayManager(config);
    this.sessionManager = new SessionManager(config);
    this.inputHandler = new InputHandler(config);
    this.commandRouter = new CommandRouter(agent, this.displayManager, this.sessionManager);
  }

  /**
   * Start the interactive CLI session
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.displayManager.displayWelcome();
    
    // Main interaction loop will be implemented in later tasks
    console.log('Interactive CLI Manager initialized - implementation pending');
  }

  /**
   * Gracefully shutdown the CLI session
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.sessionManager.saveCurrentSession();
    console.log('CLI session ended');
  }

  /**
   * Check if the CLI is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}