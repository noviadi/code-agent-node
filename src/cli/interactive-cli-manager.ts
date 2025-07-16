import { Agent } from '../agent';
import { InteractiveCLIConfig, MessageType, ErrorHandlerConfig, FallbackConfig } from './types';
import { InputHandler } from './input-handler';
import { DisplayManager } from './components/display-manager';
import { ThemeEngine } from './components/theme-engine';
import { ProgressManager } from './components/progress-manager';
import { HistoryManager } from './components/history-manager';
import { AutoCompleteEngine } from './components/auto-complete-engine';
import { MultiLineEditor } from './components/multi-line-editor';
import { CommandRouter } from './command-router';
import { SessionManager } from './session-manager';
import { ConfigurationManager } from './components/configuration-manager';
import { ErrorHandler } from './components/error-handler';
import { FallbackCLIManager } from './components/fallback-cli-manager';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Central orchestrator for the interactive CLI system
 * Coordinates all CLI functionality and manages component interactions
 */
export class InteractiveCLIManager {
    private inputHandler!: InputHandler;
    private displayManager!: DisplayManager;
    private themeEngine!: ThemeEngine;
    private progressManager!: ProgressManager;
    private historyManager!: HistoryManager;
    private autoCompleteEngine!: AutoCompleteEngine;
    private multiLineEditor!: MultiLineEditor;
    private commandRouter!: CommandRouter;
    private sessionManager!: SessionManager;
    private configManager!: ConfigurationManager;
    private errorHandler: ErrorHandler;
    private fallbackManager: FallbackCLIManager | null = null;
    private agent: Agent;
    private config: InteractiveCLIConfig;
    private isRunning: boolean = false;
    private conversation: Anthropic.MessageParam[] = [];
    private isInFallbackMode: boolean = false;

    constructor(agent: Agent, config: InteractiveCLIConfig) {
        this.agent = agent;
        this.config = config;

        // Initialize error handling first
        const errorHandlerConfig: ErrorHandlerConfig = {
            enableFallbacks: true,
            logErrors: true,
            showStackTrace: false,
            maxRetries: 3,
            retryDelay: 1000
        };

        const fallbackConfig: FallbackConfig = {
            useBasicReadline: false,
            disableColors: false,
            disableProgress: false,
            disableAutoComplete: false,
            disableHistory: false
        };

        this.errorHandler = new ErrorHandler(errorHandlerConfig, fallbackConfig);

        try {
            // Initialize core components with error handling
            this.initializeCoreComponents();
            
            // Setup auto-completion with command suggestions
            this.setupAutoCompletion();
            
            // Load components asynchronously
            this.initializeComponents();
            
        } catch (error) {
            // If initialization fails, prepare fallback mode
            this.handleInitializationFailure(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Initialize core components with error handling
     */
    private initializeCoreComponents(): void {
        try {
            this.configManager = new ConfigurationManager();
            this.themeEngine = new ThemeEngine();
            this.progressManager = new ProgressManager();
            this.displayManager = new DisplayManager(this.themeEngine, this.progressManager);
            
            // Set display manager for error handler
            this.errorHandler.setDisplayManager(this.displayManager);
            
        } catch (error) {
            throw new Error(`Failed to initialize core components: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            // Initialize input handling components
            this.historyManager = new HistoryManager(this.config.historySize);
            this.autoCompleteEngine = new AutoCompleteEngine();
            this.multiLineEditor = new MultiLineEditor();
            
            this.inputHandler = new InputHandler(
                this.config,
                this.historyManager,
                this.autoCompleteEngine,
                this.multiLineEditor
            );
            
        } catch (error) {
            throw new Error(`Failed to initialize input components: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            // Initialize session and command management
            this.sessionManager = new SessionManager(this.configManager);
            this.commandRouter = new CommandRouter(
                this.agent, 
                this.displayManager, 
                this.sessionManager,
                this.historyManager
            );
            
        } catch (error) {
            throw new Error(`Failed to initialize session components: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Handle initialization failure by setting up fallback mode
     */
    private handleInitializationFailure(error: Error): void {
        console.error('⚠️  Advanced CLI features failed to initialize. Starting in fallback mode.');
        console.error(`Error: ${error.message}`);
        
        this.isInFallbackMode = true;
        
        const fallbackConfig: FallbackConfig = {
            useBasicReadline: true,
            disableColors: false,
            disableProgress: true,
            disableAutoComplete: true,
            disableHistory: true
        };
        
        this.fallbackManager = new FallbackCLIManager(this.agent, fallbackConfig);
    }

    /**
     * Setup auto-completion with command suggestions
     */
    private setupAutoCompletion(): void {
        // Get command suggestions from command router
        const commandSuggestions = this.commandRouter.getAvailableCommands().map(cmd => `/${cmd.name}`);
        this.autoCompleteEngine.addContextualSuggestions('commands', commandSuggestions);
        
        // Add common phrases and patterns
        this.autoCompleteEngine.addCommonPhrases([
            'help me with',
            'can you',
            'please',
            'how do I',
            'what is',
            'explain',
            'show me',
            'create',
            'update',
            'delete',
            'list',
            'find'
        ]);
        
        // Add tool suggestions
        const toolNames = this.agent.getAvailableTools().map(tool => tool.name);
        this.autoCompleteEngine.addToolSuggestions(toolNames);
    }

    /**
     * Initialize components that require async setup
     */
    private async initializeComponents(): Promise<void> {
        try {
            await this.historyManager.load();
            
            // Load user configuration
            const userConfig = this.configManager.getConfig();
            if (userConfig.theme !== this.config.theme) {
                this.themeEngine.setTheme(userConfig.theme);
            }
        } catch (error) {
            this.displayManager.displayError(
                error instanceof Error ? error : new Error(String(error)),
                'initialization'
            );
        }
    }

    /**
     * Start the interactive CLI session
     */
    async start(): Promise<void> {
        this.isRunning = true;
        
        // If in fallback mode, use fallback manager
        if (this.isInFallbackMode && this.fallbackManager) {
            await this.fallbackManager.start();
            return;
        }
        
        try {
            // Setup signal handlers for graceful shutdown
            this.setupSignalHandlers();
            
            // Display welcome message
            this.displayManager.displayWelcome();
            
            // Start the main interaction loop
            await this.mainInteractionLoop();
            
        } catch (error) {
            const handled = await this.errorHandler.handleInitializationError(
                error instanceof Error ? error : new Error(String(error)),
                'CLI startup'
            );
            
            if (!handled) {
                // Fall back to basic CLI
                console.error('⚠️  Falling back to basic CLI due to startup errors.');
                await this.activateFallbackMode();
            }
        }
    }

    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers(): void {
        const handleShutdown = async (signal: string) => {
            this.displayManager.displaySystem(`\nReceived ${signal}. Shutting down gracefully...`);
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    }

    /**
     * Main interaction loop - handles user input and agent responses
     */
    private async mainInteractionLoop(): Promise<void> {
        let readUserInput = true;
        
        while (this.isRunning) {
            try {
                if (readUserInput) {
                    // Get user input with enhanced features
                    const userInput = await this.getUserInputWithErrorHandling();
                    
                    // Check for exit command
                    if (userInput.toLowerCase() === 'exit') {
                        break;
                    }
                    
                    // Add to history with error handling
                    try {
                        this.historyManager.add({
                            command: userInput,
                            timestamp: new Date(),
                            success: true
                        });
                    } catch (error) {
                        await this.errorHandler.handleFileSystemError(
                            error instanceof Error ? error : new Error(String(error)),
                            'history management'
                        );
                    }
                    
                    // Check if it's a special command
                    let isSpecialCommand = false;
                    try {
                        isSpecialCommand = await this.commandRouter.routeInput(userInput);
                    } catch (error) {
                        const handled = await this.errorHandler.handleError(
                            error instanceof Error ? error : new Error(String(error)),
                            'command routing'
                        );
                        if (!handled) {
                            readUserInput = true;
                            continue;
                        }
                    }
                    
                    if (isSpecialCommand) {
                        // Command was handled by router, continue to next input
                        readUserInput = true;
                        continue;
                    }
                    
                    // Display user message
                    this.displayManager.displayUser(userInput);
                    
                    // Add to conversation
                    const userMessage: Anthropic.MessageParam = {
                        role: 'user',
                        content: userInput,
                    };
                    this.conversation.push(userMessage);
                    
                    try {
                        this.sessionManager.addMessageToCurrentConversation(userMessage);
                    } catch (error) {
                        await this.errorHandler.handleFileSystemError(
                            error instanceof Error ? error : new Error(String(error)),
                            'session management'
                        );
                    }
                }
                
                // Show progress indicator for Claude processing
                let progressIndicator: any = null;
                try {
                    progressIndicator = await this.displayManager.showProgress('Claude is thinking...');
                    progressIndicator.start('Processing your request...');
                } catch (error) {
                    // Progress indicator failed, continue without it
                    await this.errorHandler.handleError(
                        error instanceof Error ? error : new Error(String(error)),
                        'progress indicator'
                    );
                }
                
                try {
                    // Get response from agent with network error handling
                    const response = await this.runInferenceWithErrorHandling();
                    
                    if (progressIndicator) {
                        progressIndicator.succeed('Response received');
                    }
                    
                    // Add assistant response to conversation
                    this.conversation.push({
                        role: 'assistant',
                        content: response.content,
                    });
                    
                    try {
                        this.sessionManager.addMessageToCurrentConversation({
                            role: 'assistant',
                            content: response.content,
                        });
                    } catch (error) {
                        await this.errorHandler.handleFileSystemError(
                            error instanceof Error ? error : new Error(String(error)),
                            'session management'
                        );
                    }
                    
                    // Check if tools were used
                    const toolResultsPresent = response.content.some(
                        (block) => block.type === 'tool_use'
                    );
                    
                    if (toolResultsPresent) {
                        // Execute tools and continue processing
                        for (const contentBlock of response.content) {
                            if (contentBlock.type === 'tool_use') {
                                await this.executeToolCallWithErrorHandling(contentBlock);
                            }
                        }
                        readUserInput = false; // Continue with tool results
                    } else {
                        // Display assistant response
                        const assistantMessage = response.content[0];
                        if (assistantMessage.type === 'text') {
                            this.displayManager.displayAssistant(assistantMessage.text);
                        }
                        readUserInput = true; // Wait for new user input
                    }
                    
                    // Auto-save if enabled
                    try {
                        await this.sessionManager.autoSaveIfEnabled();
                    } catch (error) {
                        await this.errorHandler.handleFileSystemError(
                            error instanceof Error ? error : new Error(String(error)),
                            'auto-save'
                        );
                    }
                    
                } catch (error) {
                    if (progressIndicator) {
                        progressIndicator.fail('Error processing request');
                    }
                    
                    const handled = await this.errorHandler.handleNetworkError(
                        error instanceof Error ? error : new Error(String(error)),
                        'agent processing'
                    );
                    
                    if (!handled) {
                        this.displayManager.displayError(
                            error instanceof Error ? error : new Error(String(error)),
                            'agent processing'
                        );
                    }
                    
                    readUserInput = true; // Allow user to try again
                }
                
            } catch (error) {
                // Handle critical errors in the main loop
                const handled = await this.errorHandler.handleError(
                    error instanceof Error ? error : new Error(String(error)),
                    'main interaction loop'
                );
                
                if (!handled) {
                    // Critical error - consider fallback mode
                    const cliError = error instanceof Error ? error : new Error(String(error));
                    if (this.errorHandler.shouldActivateFallback(cliError as any)) {
                        await this.activateFallbackMode();
                        break;
                    }
                }
                
                readUserInput = true;
            }
        }
    }

    /**
     * Get user input with enhanced features
     */
    private async getUserInput(): Promise<string> {
        const theme = this.themeEngine.getCurrentTheme();
        const prompt = `${theme.symbols.user} You: `;
        
        return await this.inputHandler.getEnhancedInput(prompt, {
            multiLine: this.config.multiLineEditor,
            autoComplete: true,
            history: true
        });
    }

    /**
     * Run inference with Claude
     */
    private async runInference(): Promise<Anthropic.Message> {
        const toolSpecs = this.agent.getAvailableTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: this.formatToolInputSchema(tool),
        }));

        const client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        return await client.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: this.conversation,
            tools: toolSpecs,
        });
    }

    /**
     * Execute a tool call
     */
    private async executeToolCall(toolUseBlock: Anthropic.ToolUseBlock): Promise<void> {
        const { id, name, input } = toolUseBlock;
        const tools = this.agent.getAvailableTools();
        const tool = tools.find(t => t.name === name);

        if (tool) {
            // Display tool usage
            this.displayManager.formatToolUsage(name, input, null);
            
            try {
                const toolResult = await tool.execute(input);
                
                // Display tool result
                this.displayManager.formatToolUsage(name, input, toolResult);

                const toolResultMessage: Anthropic.MessageParam = {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: id,
                        content: JSON.stringify(toolResult),
                    }],
                };
                
                this.conversation.push(toolResultMessage);
                this.sessionManager.addMessageToCurrentConversation(toolResultMessage);
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.displayManager.displayError(
                    new Error(`Tool execution failed: ${errorMessage}`),
                    `tool: ${name}`
                );
                
                const errorResultMessage: Anthropic.MessageParam = {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: id,
                        content: `Error: ${errorMessage}`,
                    }],
                };
                
                this.conversation.push(errorResultMessage);
                this.sessionManager.addMessageToCurrentConversation(errorResultMessage);
            }
        } else {
            const errorMessage = `Tool ${name} not found.`;
            this.displayManager.displayError(new Error(errorMessage), 'tool execution');
            
            const errorResultMessage: Anthropic.MessageParam = {
                role: 'user',
                content: [{
                    type: 'tool_result',
                    tool_use_id: id,
                    content: `Error: ${errorMessage}`,
                }],
            };
            
            this.conversation.push(errorResultMessage);
            this.sessionManager.addMessageToCurrentConversation(errorResultMessage);
        }
    }

    /**
     * Format tool input schema for Anthropic API
     */
    private formatToolInputSchema(tool: any): any {
        // Import the utility function
        const { formatToolInputSchema } = require('../utils/tool-utils');
        return formatToolInputSchema(tool);
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
            this.displayManager.displayError(
                error instanceof Error ? error : new Error(String(error)),
                'saving history'
            );
        }
        
        // Save current session
        try {
            await this.sessionManager.saveCurrentSession();
        } catch (error) {
            this.displayManager.displayError(
                error instanceof Error ? error : new Error(String(error)),
                'saving session'
            );
        }
        
        this.displayManager.displaySystem('CLI session ended. Goodbye!');
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
    displayMessage(message: string, type: MessageType = MessageType.SYSTEM): void {
        this.displayManager.displayMessage(message, type);
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

    /**
     * Get user input with error handling
     */
    private async getUserInputWithErrorHandling(): Promise<string> {
        try {
            return await this.getUserInput();
        } catch (error) {
            const handled = await this.errorHandler.handleInputError(
                error instanceof Error ? error : new Error(String(error)),
                'user input'
            );
            
            if (!handled) {
                // Fallback to basic input
                const fallbackConfig = this.errorHandler.getFallbackConfig();
                if (fallbackConfig.useBasicReadline) {
                    return await this.getBasicInput();
                }
                throw error;
            }
            
            // Retry input after error handling
            return await this.getUserInput();
        }
    }

    /**
     * Run inference with error handling and retries
     */
    private async runInferenceWithErrorHandling(): Promise<Anthropic.Message> {
        try {
            return await this.runInference();
        } catch (error) {
            const handled = await this.errorHandler.handleNetworkError(
                error instanceof Error ? error : new Error(String(error)),
                'Claude API'
            );
            
            if (!handled) {
                throw error;
            }
            
            // Retry inference after error handling
            return await this.runInference();
        }
    }

    /**
     * Execute tool call with error handling
     */
    private async executeToolCallWithErrorHandling(toolUseBlock: Anthropic.ToolUseBlock): Promise<void> {
        try {
            await this.executeToolCall(toolUseBlock);
        } catch (error) {
            const handled = await this.errorHandler.handleToolError(
                error instanceof Error ? error : new Error(String(error)),
                toolUseBlock.name
            );
            
            if (!handled) {
                // Add error result to conversation
                const errorResultMessage: Anthropic.MessageParam = {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: toolUseBlock.id,
                        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    }],
                };
                
                this.conversation.push(errorResultMessage);
                
                try {
                    this.sessionManager.addMessageToCurrentConversation(errorResultMessage);
                } catch (sessionError) {
                    // Ignore session errors during error handling
                }
            }
        }
    }

    /**
     * Activate fallback mode
     */
    private async activateFallbackMode(): Promise<void> {
        console.log('🔄 Activating fallback mode...');
        
        this.isInFallbackMode = true;
        
        const fallbackConfig: FallbackConfig = {
            useBasicReadline: true,
            disableColors: false,
            disableProgress: true,
            disableAutoComplete: true,
            disableHistory: true
        };
        
        this.fallbackManager = new FallbackCLIManager(this.agent, fallbackConfig);
        
        // Stop current session and start fallback
        this.isRunning = false;
        await this.fallbackManager.start();
    }

    /**
     * Get basic input using readline (fallback)
     */
    private async getBasicInput(): Promise<string> {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('You: ', (answer: string) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    /**
     * Get error handler statistics
     */
    getErrorStats(): any {
        return this.errorHandler.getErrorStats();
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(count: number = 10): any[] {
        return this.errorHandler.getRecentErrors(count);
    }

    /**
     * Check if currently in fallback mode
     */
    isInFallback(): boolean {
        return this.isInFallbackMode;
    }

    /**
     * Get fallback configuration
     */
    getFallbackConfig(): FallbackConfig {
        return this.errorHandler.getFallbackConfig();
    }
}