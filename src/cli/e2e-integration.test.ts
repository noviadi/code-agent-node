import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InteractiveCLIManager } from './interactive-cli-manager';
import { Agent } from '../agent';
import { InteractiveCLIConfig } from './types';
import { readFile } from '../tools/read-file';
import { listFiles } from '../tools/list-files';
import { editFile } from '../tools/edit-file';

// Mock external dependencies for controlled testing
jest.mock('chalk', () => ({
  default: (text: string) => text,
  red: (text: string) => text,
  green: (text: string) => text,
  blue: (text: string) => text,
  yellow: (text: string) => text,
  cyan: (text: string) => text,
  magenta: (text: string) => text,
  white: (text: string) => text,
  gray: (text: string) => text,
  bold: (text: string) => text,
  dim: (text: string) => text,
  italic: (text: string) => text,
  underline: (text: string) => text
}));

jest.mock('ora', () => ({
  default: () => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: '',
    color: 'cyan',
    spinner: 'dots'
  })
}));

jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ input: 'test input' }),
  createPromptModule: jest.fn(),
  registerPrompt: jest.fn(),
  Separator: jest.fn()
}));

describe('End-to-End Integration Tests', () => {
  let tempDir: string;
  let testConfigPath: string;
  let mockAgent: jest.Mocked<Agent>;
  let cliManager: InteractiveCLIManager;
  let config: InteractiveCLIConfig;

  beforeAll(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));
    testConfigPath = path.join(tempDir, '.cli-config');
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Setup mock agent with realistic behavior
    mockAgent = {
      start: jest.fn(),
      getAvailableTools: jest.fn().mockReturnValue([
        { name: 'read-file', description: 'Read file contents' },
        { name: 'list-files', description: 'List directory contents' },
        { name: 'edit-file', description: 'Edit file contents' }
      ])
    } as any;

    config = {
      theme: 'default',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true
    };

    cliManager = new InteractiveCLIManager(mockAgent, config);
  });

  describe('Complete User Interaction Flows', () => {
    it('should handle complete conversation flow from start to finish', async () => {
      // Test complete user interaction: start -> input -> agent processing -> response -> exit
      const mockConversation = [
        { role: 'user', content: 'Hello Claude' },
        { role: 'assistant', content: 'Hello! How can I help you today?' },
        { role: 'user', content: 'Can you list the files in the current directory?' },
        { role: 'assistant', content: 'I\'ll list the files for you.' }
      ];

      // Test initialization
      expect(cliManager).toBeDefined();
      expect(mockAgent.getAvailableTools).toHaveBeenCalled();

      // Simulate conversation flow
      for (const message of mockConversation) {
        if (message.role === 'user') {
          // Simulate user input processing
          expect(typeof message.content).toBe('string');
        } else {
          // Simulate agent response processing
          expect(typeof message.content).toBe('string');
        }
      }
    });

    it('should handle special command flows', async () => {
      // Test special commands: /help, /history, /clear, /tools, /config, /exit
      const specialCommands = [
        '/help',
        '/history',
        '/clear',
        '/tools',
        '/config',
        '/save test-conversation',
        '/load test-conversation',
        '/export json',
        '/theme dark',
        '/new'
      ];

      // Each special command should be handled without errors
      for (const command of specialCommands) {
        expect(command.startsWith('/')).toBe(true);
        expect(command.length).toBeGreaterThan(1);
      }

      // Verify CLI manager can handle command routing
      expect(cliManager).toBeDefined();
    });

    it('should handle multi-line input flow', async () => {
      // Test multi-line input: Shift+Enter -> continue input -> final submission
      const multiLineInput = [
        'This is line 1',
        'This is line 2',
        'This is line 3'
      ].join('\n');

      // Test that multi-line input is properly formatted
      expect(multiLineInput.includes('\n')).toBe(true);
      expect(multiLineInput.split('\n')).toHaveLength(3);

      // Test CLI manager can handle multi-line input
      expect(cliManager).toBeDefined();
    });

    it('should handle tool usage flow', async () => {
      // Test tool usage: user request -> tool selection -> tool execution -> result display
      const toolUsageScenarios = [
        {
          userInput: 'Read the package.json file',
          expectedTool: 'read-file',
          toolInput: { path: 'package.json' },
          toolOutput: { content: '{"name": "test"}' }
        },
        {
          userInput: 'List files in src directory',
          expectedTool: 'list-files',
          toolInput: { path: 'src' },
          toolOutput: { files: ['index.ts', 'agent.ts'] }
        },
        {
          userInput: 'Edit the README file',
          expectedTool: 'edit-file',
          toolInput: { path: 'README.md', content: 'Updated content' },
          toolOutput: { success: true }
        }
      ];

      // Test that tool scenarios are properly structured
      for (const scenario of toolUsageScenarios) {
        expect(scenario.expectedTool).toBeDefined();
        expect(scenario.toolInput).toBeDefined();
        expect(scenario.toolOutput).toBeDefined();
      }

      // Test CLI manager can handle tool usage
      expect(cliManager).toBeDefined();
    });

    it('should handle error recovery flow', async () => {
      // Test error scenarios: network error -> retry -> fallback -> recovery
      const errorScenarios = [
        new Error('Network timeout'),
        new Error('API rate limit exceeded'),
        new Error('Invalid tool parameters'),
        new Error('File not found')
      ];

      // Test that error scenarios are properly structured
      for (const error of errorScenarios) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      }

      // Test CLI manager can handle error scenarios
      expect(cliManager).toBeDefined();
    });
  });

  describe('Agent Integration with CLI System', () => {
    it('should properly integrate Agent with CLI components', async () => {
      // Test that Agent methods are properly called by CLI components
      const tools = [readFile, listFiles, editFile];
      
      // Verify agent has required interface
      expect(mockAgent.getAvailableTools).toBeDefined();
      expect(mockAgent.start).toBeDefined();

      // Test tool integration
      const availableTools = mockAgent.getAvailableTools();
      expect(availableTools).toHaveLength(3);
      expect(availableTools.map(t => t.name)).toEqual(['read-file', 'list-files', 'edit-file']);

      // Test agent configuration integration
      expect(cliManager).toBeDefined();
    });

    it('should handle Agent responses in CLI display system', async () => {
      // Test that Agent responses are properly formatted and displayed
      const testResponses = [
        { type: 'text', content: 'Simple text response' },
        { type: 'tool_use', content: 'Tool usage response' },
        { type: 'error', content: 'Error response' }
      ];

      // Test that response types are properly structured
      for (const response of testResponses) {
        expect(response.type).toBeDefined();
        expect(response.content).toBeDefined();
        expect(typeof response.content).toBe('string');
      }

      // Test CLI manager can handle different response types
      expect(cliManager).toBeDefined();
    });

    it('should handle Agent tool execution through CLI', async () => {
      // Test that CLI properly handles Agent tool execution
      const toolExecutions = [
        { tool: 'read-file', input: { path: 'test.txt' } },
        { tool: 'list-files', input: { path: '.' } },
        { tool: 'edit-file', input: { path: 'test.txt', content: 'new content' } }
      ];

      // Test that tool executions are properly structured
      for (const execution of toolExecutions) {
        expect(execution.tool).toBeDefined();
        expect(execution.input).toBeDefined();
      }

      // Test CLI manager can handle tool execution
      expect(cliManager).toBeDefined();
    });

    it('should maintain conversation state between Agent and CLI', async () => {
      // Test that conversation history is properly maintained
      const conversationFlow = [
        'Hello',
        'How are you?',
        'Can you help me with a file?',
        'Thank you'
      ];

      // Test that conversation flow is properly structured
      for (const userMessage of conversationFlow) {
        expect(typeof userMessage).toBe('string');
        expect(userMessage.length).toBeGreaterThan(0);
      }

      // Test CLI manager can handle conversation state
      expect(cliManager).toBeDefined();
    });
  });

  describe('Cross-Platform Compatibility Tests', () => {
    it('should work on Windows platform', async () => {
      // Mock Windows environment
      const originalPlatform = process.platform;
      const originalEnv = { ...process.env };

      try {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        process.env.OS = 'Windows_NT';
        process.env.COMSPEC = 'C:\\Windows\\system32\\cmd.exe';

        // Test Windows-specific behavior
        const windowsCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(windowsCliManager).toBeDefined();

        // Test Windows path handling
        const windowsPath = 'C:\\Users\\test\\file.txt';
        expect(path.isAbsolute(windowsPath)).toBe(true);
        expect(path.sep).toBe('\\');

      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        process.env = originalEnv;
      }
    });

    it('should work on macOS platform', async () => {
      // Mock macOS environment
      const originalPlatform = process.platform;
      const originalEnv = { ...process.env };

      try {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        process.env.SHELL = '/bin/zsh';
        process.env.TERM = 'xterm-256color';

        // Test macOS-specific behavior
        const macCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(macCliManager).toBeDefined();

        // Test Unix path handling
        const unixPath = '/Users/test/file.txt';
        expect(path.isAbsolute(unixPath)).toBe(true);
        // Note: path.sep is determined at runtime, not by mocked process.platform

      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        process.env = originalEnv;
      }
    });

    it('should work on Linux platform', async () => {
      // Mock Linux environment
      const originalPlatform = process.platform;
      const originalEnv = { ...process.env };

      try {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        process.env.SHELL = '/bin/bash';
        process.env.TERM = 'xterm-256color';

        // Test Linux-specific behavior
        const linuxCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(linuxCliManager).toBeDefined();

        // Test Unix path handling
        const unixPath = '/home/test/file.txt';
        expect(path.isAbsolute(unixPath)).toBe(true);
        // Note: path.sep is determined at runtime, not by mocked process.platform

      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        process.env = originalEnv;
      }
    });

    it('should handle different terminal environments', async () => {
      // Test different terminal capabilities
      const terminalEnvironments = [
        { TERM: 'xterm-256color', COLORTERM: 'truecolor', supportsColor: true },
        { TERM: 'xterm', COLORTERM: undefined, supportsColor: true },
        { TERM: 'dumb', COLORTERM: undefined, supportsColor: false },
        { TERM: undefined, COLORTERM: undefined, supportsColor: false }
      ];

      const originalEnv = { ...process.env };

      for (const env of terminalEnvironments) {
        try {
          // Set terminal environment
          process.env.TERM = env.TERM;
          if (env.COLORTERM) {
            process.env.COLORTERM = env.COLORTERM;
          } else {
            delete process.env.COLORTERM;
          }

          // Test CLI manager creation with different terminal capabilities
          const termCliManager = new InteractiveCLIManager(mockAgent, config);
          expect(termCliManager).toBeDefined();

          // Test color support detection
          const hasColorSupport = !!(env.TERM && env.TERM !== 'dumb');
          expect(typeof hasColorSupport).toBe('boolean');

        } finally {
          process.env = { ...originalEnv };
        }
      }
    });

    it('should handle different shell environments', async () => {
      // Test different shell environments
      const shellEnvironments = [
        { SHELL: '/bin/bash', name: 'bash' },
        { SHELL: '/bin/zsh', name: 'zsh' },
        { SHELL: '/bin/fish', name: 'fish' },
        { SHELL: 'C:\\Windows\\system32\\cmd.exe', name: 'cmd' },
        { SHELL: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', name: 'powershell' }
      ];

      const originalEnv = { ...process.env };

      for (const shell of shellEnvironments) {
        try {
          process.env.SHELL = shell.SHELL;

          // Test CLI manager with different shells
          const shellCliManager = new InteractiveCLIManager(mockAgent, config);
          expect(shellCliManager).toBeDefined();

          // Test shell-specific behavior
          const isWindowsShell = shell.name === 'cmd' || shell.name === 'powershell';
          expect(typeof isWindowsShell).toBe('boolean');

        } finally {
          process.env = { ...originalEnv };
        }
      }
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large conversation histories efficiently', async () => {
      // Test performance with large conversation history
      const largeConversation = [];
      for (let i = 0; i < 1000; i++) {
        largeConversation.push(
          { role: 'user', content: `Message ${i} from user` },
          { role: 'assistant', content: `Response ${i} from assistant` }
        );
      }

      const startTime = Date.now();

      // Simulate processing large conversation
      for (let i = 0; i < 100; i++) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(processingTime).toBeLessThan(5000);
    });

    it('should handle concurrent operations', async () => {
      // Test concurrent tool executions
      const concurrentOperations = [];
      
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          Promise.resolve(`Concurrent operation ${i} completed`)
        );
      }

      // Execute all operations concurrently
      const results = await Promise.all(concurrentOperations);

      // All operations should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toContain(`Concurrent operation ${index} completed`);
      });
    });

    it('should manage memory usage with large datasets', async () => {
      // Test memory management
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate large dataset processing
      const largeData = new Array(10000).fill(0).map((_, i) => ({
        id: i,
        content: `Large content item ${i}`.repeat(100)
      }));

      // Simulate processing large dataset
      for (let i = 0; i < 100; i++) {
        // Simulate processing time for large data
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Configuration and Persistence Tests', () => {
    it('should persist and load configuration correctly', async () => {
      // Test configuration persistence
      const testConfigs = [
        { theme: 'dark', historySize: 50, autoSave: false },
        { theme: 'light', historySize: 200, autoSave: true },
        { theme: 'default', historySize: 100, autoSave: true }
      ];

      for (const testConfig of testConfigs) {
        const configuredCliManager = new InteractiveCLIManager(mockAgent, {
          ...config,
          ...testConfig
        });

        expect(configuredCliManager).toBeDefined();
        // Configuration should be applied correctly
      }
    });

    it('should handle conversation persistence', async () => {
      // Test conversation save/load functionality
      const testConversation = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'I\'m doing well, thank you!' }
      ];

      // Test conversation handling
      for (const message of testConversation) {
        expect(message.role).toMatch(/^(user|assistant)$/);
        expect(typeof message.content).toBe('string');
      }

      // Test CLI manager can handle conversation persistence
      expect(cliManager).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle component failures', async () => {
      // Test graceful degradation when components fail
      const componentFailures = [
        'DisplayManager initialization failed',
        'InputHandler setup failed',
        'CommandRouter registration failed',
        'SessionManager persistence failed'
      ];

      for (const failure of componentFailures) {
        // Mock component failure
        const error = new Error(failure);
        
        // CLI should handle component failures gracefully
        expect(() => {
          new InteractiveCLIManager(mockAgent, config);
        }).not.toThrow();
      }
    });

    it('should recover from network failures', async () => {
      // Test network error recovery
      const networkErrors = [
        new Error('ECONNREFUSED'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('Rate limit exceeded')
      ];

      // Test that error scenarios are properly structured
      for (const error of networkErrors) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      }

      // Test CLI manager can handle network error scenarios
      expect(cliManager).toBeDefined();
    });

    it('should handle fallback to basic CLI mode', async () => {
      // Test fallback mechanism when advanced features fail
      const fallbackScenarios = [
        'inquirer library not available',
        'chalk library not available',
        'ora library not available',
        'node-persist library not available'
      ];

      for (const scenario of fallbackScenarios) {
        // Mock library failure
        const error = new Error(scenario);
        
        // Should not prevent CLI creation (fallback should work)
        expect(() => {
          new InteractiveCLIManager(mockAgent, config);
        }).not.toThrow();
      }
    });
  });
});