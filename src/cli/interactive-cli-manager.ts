import { Agent } from '../agent';
import { InteractiveCLIConfig, MessageType } from './types';
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
import Anthropic from '@anthropic-ai/sdk';

/**
 * Central orchestrator for the interactive CLI system
 * Coordinates all CLI functionality and manages component interactions
 */
export class InteractiveCLIManager {
    private inputHandler: InputHandler;
    private displayManager: DisplayManager;
    private themeEngine: ThemeEngine;
    private progressManager: ProgressManager;
    private historyManager: HistoryManager;
    private autoCompleteEngine: AutoCompleteEngine;
    private multiLineEditor: MultiLineEditor;
    private commandRouter: CommandRouter;
    private sessionManager: SessionManager;
    private configManager: ConfigurationManager;
    private agent: Agent;
    private config: InteractiveCLIConfig;
    private isRunning: boolean = false;
    private conversation: Anthropic.MessageParam[] = [];

    constructor(agent: Agent, config: InteractiveCLIConfig) {
        this.agent = agent;
        this.config = config;

        // Initialize core components
        this.configManager = new ConfigurationManager();
        this.themeEngine = new ThemeEngine();
        this.progressManager = new ProgressManager();
        this.displayManager = new DisplayManager(this.themeEngine, this.progressManager);
        
        // Initialize input handling components
        this.historyManager = new HistoryManager(config.historySize);
        this.autoCompleteEngine = new AutoCompleteEngine();
        this.multiLineEditor = new MultiLineEditor();
        
        this.inputHandler = new InputHandler(
            config,
            this.historyManager,
            this.autoCompleteEngine,
            this.multiLineEditor
        );

        // Initialize session and command management
        this.sessionManager = new SessionManager(this.configManager);
        this.commandRouter = new CommandRouter(
            agent, 
            this.displayManager, 
            this.sessionManager,
            this.historyManager
        );
        
        // Setup auto-completion with command suggestions
        this.setupAutoCompletion();
        
        // Load components asynchronously
        this.initializeComponents();
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
        
        // Setup signal handlers for graceful shutdown
        this.setupSignalHandlers();
        
        // Display welcome message
        this.displayManager.displayWelcome();
        
        // Start the main interaction loop
        await this.mainInteractionLoop();
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
                    const userInput = await this.getUserInput();
                    
                    // Check for exit command
                    if (userInput.toLowerCase() === 'exit') {
                        break;
                    }
                    
                    // Add to history
                    this.historyManager.add({
                        command: userInput,
                        timestamp: new Date(),
                        success: true
                    });
                    
                    // Check if it's a special command
                    const isSpecialCommand = await this.commandRouter.routeInput(userInput);
                    
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
                    this.sessionManager.addMessageToCurrentConversation(userMessage);
                }
                
                // Show progress indicator for Claude processing
                const progressIndicator = await this.displayManager.showProgress('Claude is thinking...');
                progressIndicator.start('Processing your request...');
                
                try {
                    // Get response from agent
                    const response = await this.runInference();
                    progressIndicator.succeed('Response received');
                    
                    // Add assistant response to conversation
                    this.conversation.push({
                        role: 'assistant',
                        content: response.content,
                    });
                    this.sessionManager.addMessageToCurrentConversation({
                        role: 'assistant',
                        content: response.content,
                    });
                    
                    // Check if tools were used
                    const toolResultsPresent = response.content.some(
                        (block) => block.type === 'tool_use'
                    );
                    
                    if (toolResultsPresent) {
                        // Execute tools and continue processing
                        for (const contentBlock of response.content) {
                            if (contentBlock.type === 'tool_use') {
                                await this.executeToolCall(contentBlock);
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
                    await this.sessionManager.autoSaveIfEnabled();
                    
                } catch (error) {
                    progressIndicator.fail('Error processing request');
                    this.displayManager.displayError(
                        error instanceof Error ? error : new Error(String(error)),
                        'agent processing'
                    );
                    readUserInput = true; // Allow user to try again
                }
                
            } catch (error) {
                // Handle input errors
                this.displayManager.displayError(
                    error instanceof Error ? error : new Error(String(error)),
                    'input handling'
                );
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
}