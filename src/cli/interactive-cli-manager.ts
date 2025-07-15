import { Agent } from '../agent';
import { InteractiveCLIConfig } from './types';
import { InputHandler } from './input-handler';
import { DisplayManager } from './display-manager';
import { HistoryManager } from './components/history-manager';
import { AutoCompleteEngine } from './components/auto-complete-engine';
import { MultiLineEditor } from './components/multi-line-editor';
// import { CommandRouter } from './command-router'; // Task 4 - not implemented yet
// import { SessionManager } from './session-manager'; // Task 5 - not implemented yet

/**
 * Central orchestrator for the interactive CLI system
 * Coordinates all CLI functionality and manages component interactions
 */
export class InteractiveCLIManager {
    private inputHandler: InputHandler;
    private displayManager: DisplayManager;
    private historyManager: HistoryManager;
    private autoCompleteEngine: AutoCompleteEngine;
    private multiLineEditor: MultiLineEditor;
    // private commandRouter: CommandRouter; // Task 4
    // private sessionManager: SessionManager; // Task 5
    private agent: Agent;
    private config: InteractiveCLIConfig;
    private isRunning: boolean = false;

    constructor(agent: Agent, config: InteractiveCLIConfig) {
        this.agent = agent;
        this.config = config;

        // Initialize implemented components
        this.displayManager = new DisplayManager(config);
        
        // Initialize input handling components (Task 3 - completed)
        this.historyManager = new HistoryManager(config.historySize);
        this.autoCompleteEngine = new AutoCompleteEngine();
        this.multiLineEditor = new MultiLineEditor();
        
        this.inputHandler = new InputHandler(
            config,
            this.historyManager,
            this.autoCompleteEngine,
            this.multiLineEditor
        );

        // TODO: Initialize these when tasks 4 and 5 are completed
        // this.sessionManager = new SessionManager(config);
        // this.commandRouter = new CommandRouter(agent, this.displayManager, this.sessionManager);
        
        // Load history on initialization
        this.initializeComponents();
    }

    /**
     * Initialize components that require async setup
     */
    private async initializeComponents(): Promise<void> {
        try {
            await this.historyManager.load();
        } catch (error) {
            console.error('Failed to load command history:', error);
        }
    }

    /**
     * Start the interactive CLI session
     */
    async start(): Promise<void> {
        this.isRunning = true;
        this.displayManager.displayWelcome();

        // Main interaction loop will be implemented in later tasks
        console.log('Interactive CLI Manager initialized - implementation pending');
        console.log('Available components:');
        console.log('- InputHandler with history and auto-completion ✓');
        console.log('- DisplayManager (stub) ✓');
        console.log('- CommandRouter (pending - Task 4)');
        console.log('- SessionManager (pending - Task 5)');
    }

    /**
     * Gracefully shutdown the CLI session
     */
    async shutdown(): Promise<void> {
        this.isRunning = false;
        
        // Save history before shutdown
        try {
            await this.historyManager.persist();
        } catch (error) {
            console.error('Failed to save command history:', error);
        }
        
        // TODO: Uncomment when SessionManager is implemented
        // await this.sessionManager.saveCurrentSession();
        
        console.log('CLI session ended');
    }

    /**
     * Check if the CLI is currently running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Get input from user (exposed for testing and integration)
     */
    async getInput(prompt: string): Promise<string> {
        return await this.inputHandler.getEnhancedInput(prompt);
    }

    /**
     * Display a message (exposed for integration with other components)
     */
    displayMessage(message: string): void {
        // For now, use console.log until DisplayManager is fully implemented
        console.log(message);
    }

    /**
     * Get input statistics for debugging/monitoring
     */
    getInputStats(): any {
        return this.inputHandler.getInputStats();
    }

    /**
     * Clear command history
     */
    clearHistory(): void {
        this.inputHandler.clearHistory();
    }

    /**
     * Search command history
     */
    searchHistory(query: string): any[] {
        return this.inputHandler.searchHistory(query);
    }
}