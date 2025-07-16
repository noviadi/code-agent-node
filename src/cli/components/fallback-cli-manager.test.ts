import { FallbackCLIManager } from './fallback-cli-manager';
import { Agent } from '../../agent';
import { FallbackConfig, MessageType } from '../types';
import * as readline from 'readline';
import { z } from 'zod';

// Mock readline
jest.mock('readline');
const mockReadline = readline as jest.Mocked<typeof readline>;

// Mock Agent
jest.mock('../../agent');

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
    return jest.fn().mockImplementation(() => ({
        messages: {
            create: jest.fn()
        }
    }));
});

describe('FallbackCLIManager', () => {
    let fallbackManager: FallbackCLIManager;
    let mockAgent: jest.Mocked<Agent>;
    let mockRl: any;
    let fallbackConfig: FallbackConfig;

    beforeEach(() => {
        // Setup mock readline interface
        mockRl = {
            on: jest.fn(),
            prompt: jest.fn(),
            question: jest.fn(),
            close: jest.fn()
        };

        mockReadline.createInterface.mockReturnValue(mockRl);

        // Setup mock agent
        mockAgent = {
            getAvailableTools: jest.fn().mockReturnValue([
                {
                    name: 'test-tool',
                    description: 'Test tool',
                    input_schema: z.object({ test: z.string() }),
                    execute: jest.fn().mockResolvedValue({ result: 'success' })
                }
            ])
        } as any;

        fallbackConfig = {
            useBasicReadline: true,
            disableColors: false,
            disableProgress: true,
            disableAutoComplete: true,
            disableHistory: true
        };

        fallbackManager = new FallbackCLIManager(mockAgent, fallbackConfig);

        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'clear').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should create readline interface with correct configuration', () => {
            expect(mockReadline.createInterface).toHaveBeenCalledWith({
                input: process.stdin,
                output: process.stdout,
                prompt: expect.any(String)
            });
        });

        it('should create colored prompt when colors are enabled', () => {
            const colorConfig = { ...fallbackConfig, disableColors: false };
            new FallbackCLIManager(mockAgent, colorConfig);

            expect(mockReadline.createInterface).toHaveBeenCalledWith({
                input: process.stdin,
                output: process.stdout,
                prompt: '\x1b[36mYou: \x1b[0m'
            });
        });

        it('should create plain prompt when colors are disabled', () => {
            const noColorConfig = { ...fallbackConfig, disableColors: true };
            new FallbackCLIManager(mockAgent, noColorConfig);

            expect(mockReadline.createInterface).toHaveBeenCalledWith({
                input: process.stdin,
                output: process.stdout,
                prompt: 'You: '
            });
        });
    });

    describe('Message Display', () => {
        it('should display colored messages when colors are enabled', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Access private method for testing
            (fallbackManager as any).displayMessage('Test message', MessageType.USER);

            expect(consoleSpy).toHaveBeenCalledWith('\x1b[36mTest message\x1b[0m');
        });

        it('should display plain messages when colors are disabled', () => {
            const noColorConfig = { ...fallbackConfig, disableColors: true };
            const noColorManager = new FallbackCLIManager(mockAgent, noColorConfig);
            const consoleSpy = jest.spyOn(console, 'log');
            
            (noColorManager as any).displayMessage('Test message', MessageType.USER);

            expect(consoleSpy).toHaveBeenCalledWith('Test message');
        });

        it('should use correct colors for different message types', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            const testCases = [
                { type: MessageType.USER, color: '\x1b[36m' },
                { type: MessageType.ASSISTANT, color: '\x1b[32m' },
                { type: MessageType.SYSTEM, color: '\x1b[90m' },
                { type: MessageType.ERROR, color: '\x1b[31m' },
                { type: MessageType.WARNING, color: '\x1b[33m' },
                { type: MessageType.TOOL, color: '\x1b[35m' }
            ];

            testCases.forEach(({ type, color }) => {
                (fallbackManager as any).displayMessage('Test', type);
                expect(consoleSpy).toHaveBeenCalledWith(`${color}Test\x1b[0m`);
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error messages correctly', () => {
            const error = new Error('Test error');
            (fallbackManager as any).displayError(error);

            expect(console.log).toHaveBeenCalledWith('\x1b[31mError: Test error\x1b[0m');
        });
    });

    describe('Help Display', () => {
        it('should display help information', () => {
            (fallbackManager as any).displayHelp();

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Available commands in fallback mode:')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('help  - Show this help message')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('clear - Clear the screen')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('exit  - Exit the application')
            );
        });
    });

    describe('Input Handling', () => {
        it('should handle basic input through question method', async () => {
            const testInput = 'test input';
            mockRl.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
                callback(testInput);
            });

            const result = await fallbackManager.getInput('Test prompt: ');
            expect(result).toBe(testInput);
            expect(mockRl.question).toHaveBeenCalledWith('Test prompt: ', expect.any(Function));
        });
    });

    describe('Status Methods', () => {
        it('should report active status correctly', () => {
            expect(fallbackManager.isActive()).toBe(false);
        });

        it('should update active status when started', async () => {
            // Mock the start method to avoid full startup
            const startPromise = fallbackManager.start();
            
            // Simulate immediate close to avoid hanging
            setTimeout(() => {
                const closeHandler = mockRl.on.mock.calls.find((call: any) => call[0] === 'close')?.[1];
                if (closeHandler) closeHandler();
            }, 0);

            await startPromise;
            expect(fallbackManager.isActive()).toBe(false); // Should be false after shutdown
        });
    });

    describe('Shutdown', () => {
        it('should close readline interface on shutdown', () => {
            fallbackManager.shutdown();

            expect(mockRl.close).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(
                '\x1b[90mFallback CLI session ended.\x1b[0m'
            );
        });

        it('should handle shutdown when readline is not available', () => {
            // Create manager with null readline
            const managerWithoutRl = new FallbackCLIManager(mockAgent, fallbackConfig);
            (managerWithoutRl as any).rl = null;

            // Should not throw
            expect(() => managerWithoutRl.shutdown()).not.toThrow();
        });
    });

    describe('Signal Handling', () => {
        let originalProcessOn: any;

        beforeEach(() => {
            originalProcessOn = process.on;
            process.on = jest.fn();
        });

        afterEach(() => {
            process.on = originalProcessOn;
        });

        it('should setup signal handlers on start', async () => {
            const startPromise = fallbackManager.start();
            
            // Simulate immediate close
            setTimeout(() => {
                const closeHandler = mockRl.on.mock.calls.find((call: any) => call[0] === 'close')?.[1];
                if (closeHandler) closeHandler();
            }, 0);

            await startPromise;

            expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
            expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
        });
    });

    describe('Tool Integration', () => {
        it('should get available tools from agent', () => {
            const tools = mockAgent.getAvailableTools();
            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe('test-tool');
        });

        it('should handle tool execution in processUserInput', async () => {
            // Mock Anthropic response with tool use
            const mockAnthropicInstance = {
                messages: {
                    create: jest.fn().mockResolvedValue({
                        content: [{
                            type: 'tool_use',
                            id: 'test-id',
                            name: 'test-tool',
                            input: { test: 'input' }
                        }]
                    })
                }
            };

            // Mock the Anthropic constructor
            const AnthropicMock = require('@anthropic-ai/sdk');
            AnthropicMock.mockImplementation(() => mockAnthropicInstance);

            // Mock environment variable
            process.env.ANTHROPIC_API_KEY = 'test-key';

            // Test tool execution
            await (fallbackManager as any).processUserInput('test input');

            expect(mockAgent.getAvailableTools()[0].execute).toHaveBeenCalledWith({ test: 'input' });
        });
    });

    describe('Error Recovery', () => {
        it('should handle errors in processUserInput gracefully', async () => {
            // Mock Anthropic to throw error
            const mockAnthropicInstance = {
                messages: {
                    create: jest.fn().mockRejectedValue(new Error('API Error'))
                }
            };

            const AnthropicMock = require('@anthropic-ai/sdk');
            AnthropicMock.mockImplementation(() => mockAnthropicInstance);

            process.env.ANTHROPIC_API_KEY = 'test-key';

            // Should not throw
            await expect((fallbackManager as any).processUserInput('test input')).resolves.toBeUndefined();
            
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Error: API Error')
            );
        });

        it('should handle tool execution errors', async () => {
            const mockTool = {
                name: 'failing-tool',
                description: 'Tool that fails',
                input_schema: z.object({ test: z.string() }),
                execute: jest.fn().mockRejectedValue(new Error('Tool failed'))
            };

            mockAgent.getAvailableTools.mockReturnValue([mockTool]);

            const mockAnthropicInstance = {
                messages: {
                    create: jest.fn().mockResolvedValue({
                        content: [{
                            type: 'tool_use',
                            id: 'test-id',
                            name: 'failing-tool',
                            input: { test: 'input' }
                        }]
                    })
                }
            };

            const AnthropicMock = require('@anthropic-ai/sdk');
            AnthropicMock.mockImplementation(() => mockAnthropicInstance);

            process.env.ANTHROPIC_API_KEY = 'test-key';

            await (fallbackManager as any).processUserInput('test input');

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Error: Tool execution failed: Tool failed')
            );
        });
    });
});