import * as readline from 'readline';
import { Agent } from '../../agent';
import { FallbackConfig, MessageType } from '../types';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Fallback CLI manager that provides basic functionality when advanced features fail
 * Uses only Node.js built-in modules to ensure maximum compatibility
 */
export class FallbackCLIManager {
    private agent: Agent;
    private config: FallbackConfig;
    private rl: readline.Interface;
    private conversation: Anthropic.MessageParam[] = [];
    private isRunning: boolean = false;

    constructor(agent: Agent, config: FallbackConfig) {
        this.agent = agent;
        this.config = config;
        this.rl = this.createReadlineInterface();
    }

    /**
     * Create readline interface with basic configuration
     */
    private createReadlineInterface(): readline.Interface {
        return readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.config.disableColors ? 'You: ' : '\x1b[36mYou: \x1b[0m'
        });
    }

    /**
     * Start the fallback CLI session
     */
    async start(): Promise<void> {
        this.isRunning = true;
        
        // Display fallback mode warning
        this.displayMessage(
            'Running in fallback mode - advanced features are disabled',
            MessageType.WARNING
        );
        
        this.displayMessage(
            'Type "exit" to quit, "help" for basic commands',
            MessageType.SYSTEM
        );
        
        // Setup signal handlers
        this.setupSignalHandlers();
        
        // Start interaction loop
        await this.startInteractionLoop();
    }

    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers(): void {
        const handleShutdown = () => {
            this.displayMessage('\nShutting down...', MessageType.SYSTEM);
            this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);
    }

    /**
     * Start the basic interaction loop
     */
    private async startInteractionLoop(): Promise<void> {
        return new Promise((resolve) => {
            const handleInput = async (input: string) => {
                const trimmedInput = input.trim();
                
                // Handle exit command
                if (trimmedInput.toLowerCase() === 'exit') {
                    this.shutdown();
                    resolve();
                    return;
                }
                
                // Handle basic help command
                if (trimmedInput.toLowerCase() === 'help') {
                    this.displayHelp();
                    this.rl.prompt();
                    return;
                }
                
                // Handle clear command
                if (trimmedInput.toLowerCase() === 'clear') {
                    console.clear();
                    this.rl.prompt();
                    return;
                }
                
                // Skip empty input
                if (!trimmedInput) {
                    this.rl.prompt();
                    return;
                }
                
                try {
                    // Process user input
                    await this.processUserInput(trimmedInput);
                } catch (error) {
                    this.displayError(error instanceof Error ? error : new Error(String(error)));
                }
                
                this.rl.prompt();
            };

            this.rl.on('line', handleInput);
            this.rl.on('close', () => {
                this.shutdown();
                resolve();
            });

            // Start prompting
            this.rl.prompt();
        });
    }

    /**
     * Process user input and get AI response
     */
    private async processUserInput(input: string): Promise<void> {
        // Display user message
        this.displayMessage(`You: ${input}`, MessageType.USER);
        
        // Add to conversation
        const userMessage: Anthropic.MessageParam = {
            role: 'user',
            content: input,
        };
        this.conversation.push(userMessage);
        
        // Show simple loading indicator
        this.displayMessage('Claude is thinking...', MessageType.SYSTEM);
        
        try {
            // Get response from agent
            const response = await this.runInference();
            
            // Process response
            let readUserInput = true;
            
            // Check if tools were used
            const toolResultsPresent = response.content.some(
                (block) => block.type === 'tool_use'
            );
            
            if (toolResultsPresent) {
                // Execute tools
                for (const contentBlock of response.content) {
                    if (contentBlock.type === 'tool_use') {
                        await this.executeToolCall(contentBlock);
                    }
                }
                
                // Get follow-up response
                const followUpResponse = await this.runInference();
                
                // Display assistant response
                const assistantMessage = followUpResponse.content[0];
                if (assistantMessage.type === 'text') {
                    this.displayMessage(`Claude: ${assistantMessage.text}`, MessageType.ASSISTANT);
                }
                
                // Add to conversation
                this.conversation.push({
                    role: 'assistant',
                    content: followUpResponse.content,
                });
                
            } else {
                // Display assistant response
                const assistantMessage = response.content[0];
                if (assistantMessage.type === 'text') {
                    this.displayMessage(`Claude: ${assistantMessage.text}`, MessageType.ASSISTANT);
                }
                
                // Add to conversation
                this.conversation.push({
                    role: 'assistant',
                    content: response.content,
                });
            }
            
        } catch (error) {
            this.displayError(error instanceof Error ? error : new Error(String(error)));
        }
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
            this.displayMessage(`Using tool: ${name}`, MessageType.TOOL);
            
            try {
                const toolResult = await tool.execute(input);
                
                const toolResultMessage: Anthropic.MessageParam = {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: id,
                        content: JSON.stringify(toolResult),
                    }],
                };
                
                this.conversation.push(toolResultMessage);
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.displayError(new Error(`Tool execution failed: ${errorMessage}`));
                
                const errorResultMessage: Anthropic.MessageParam = {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: id,
                        content: `Error: ${errorMessage}`,
                    }],
                };
                
                this.conversation.push(errorResultMessage);
            }
        } else {
            const errorMessage = `Tool ${name} not found.`;
            this.displayError(new Error(errorMessage));
            
            const errorResultMessage: Anthropic.MessageParam = {
                role: 'user',
                content: [{
                    type: 'tool_result',
                    tool_use_id: id,
                    content: `Error: ${errorMessage}`,
                }],
            };
            
            this.conversation.push(errorResultMessage);
        }
    }

    /**
     * Format tool input schema for Anthropic API
     */
    private formatToolInputSchema(tool: any): any {
        const { formatToolInputSchema } = require('../../utils/tool-utils');
        return formatToolInputSchema(tool);
    }

    /**
     * Display a message with optional formatting
     */
    private displayMessage(message: string, type: MessageType = MessageType.SYSTEM): void {
        if (this.config.disableColors) {
            console.log(message);
            return;
        }

        let colorCode = '';
        switch (type) {
            case MessageType.USER:
                colorCode = '\x1b[36m'; // Cyan
                break;
            case MessageType.ASSISTANT:
                colorCode = '\x1b[32m'; // Green
                break;
            case MessageType.SYSTEM:
                colorCode = '\x1b[90m'; // Gray
                break;
            case MessageType.ERROR:
                colorCode = '\x1b[31m'; // Red
                break;
            case MessageType.WARNING:
                colorCode = '\x1b[33m'; // Yellow
                break;
            case MessageType.TOOL:
                colorCode = '\x1b[35m'; // Magenta
                break;
            default:
                colorCode = '\x1b[0m'; // Reset
        }

        console.log(`${colorCode}${message}\x1b[0m`);
    }

    /**
     * Display error message
     */
    private displayError(error: Error): void {
        this.displayMessage(`Error: ${error.message}`, MessageType.ERROR);
    }

    /**
     * Display help information
     */
    private displayHelp(): void {
        const helpText = `
Available commands in fallback mode:
  help  - Show this help message
  clear - Clear the screen
  exit  - Exit the application

Note: Advanced features like history, auto-completion, and themes are disabled in fallback mode.
`;
        this.displayMessage(helpText, MessageType.SYSTEM);
    }

    /**
     * Shutdown the fallback CLI
     */
    shutdown(): void {
        this.isRunning = false;
        if (this.rl) {
            this.rl.close();
        }
        this.displayMessage('Fallback CLI session ended.', MessageType.SYSTEM);
    }

    /**
     * Check if the CLI is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Get basic input (for compatibility)
     */
    async getInput(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }
}