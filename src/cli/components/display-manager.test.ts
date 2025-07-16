import { DisplayManager } from './display-manager';
import { ThemeEngine } from './theme-engine';
import { ProgressManager } from './progress-manager';
import { MessageType } from '../types';

// Mock chalk
jest.mock('chalk', () => ({
    hex: jest.fn((color: string) => {
        const colorFn = (text: string) => `COLOR[${color}]:${text}`;
        colorFn.bold = jest.fn((text: string) => `BOLD[${color}]:${text}`);
        return colorFn;
    })
}));

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleClear = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    console.log = mockConsoleLog;
    console.clear = mockConsoleClear;
});

describe('DisplayManager', () => {
    let displayManager: DisplayManager;
    let themeEngine: ThemeEngine;
    let progressManager: ProgressManager;

    beforeEach(() => {
        themeEngine = new ThemeEngine('light');
        progressManager = new ProgressManager();
        displayManager = new DisplayManager(themeEngine, progressManager);
    });

    describe('constructor', () => {
        it('should initialize with theme engine and progress manager', () => {
            expect(displayManager).toBeInstanceOf(DisplayManager);
            expect(displayManager.getCurrentThemeName()).toBe('light');
        });
    });

    describe('displayMessage', () => {
        it('should display user message with correct formatting', () => {
            displayManager.displayMessage('Hello world', MessageType.USER);

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('❯'); // User symbol
            expect(output).toContain('Hello world');
        });

        it('should display assistant message with correct formatting', () => {
            displayManager.displayMessage('Hello back', MessageType.ASSISTANT);

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('◆'); // Assistant symbol
            expect(output).toContain('Hello back');
        });

        it('should display system message with correct formatting', () => {
            displayManager.displayMessage('System message', MessageType.SYSTEM);

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('System message');
        });

        it('should display error message with correct formatting', () => {
            displayManager.displayMessage('Error occurred', MessageType.ERROR);

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('✗'); // Error symbol
            expect(output).toContain('Error occurred');
        });

        it('should display success message with correct formatting', () => {
            displayManager.displayMessage('Success!', MessageType.SUCCESS);

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('✓'); // Success symbol
            expect(output).toContain('Success!');
        });

        it('should apply indentation when specified', () => {
            displayManager.displayMessage('Indented message', MessageType.USER, { indent: 4 });

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toMatch(/^\s{4}/); // Should start with 4 spaces
        });

        it('should include prefix when specified', () => {
            displayManager.displayMessage('Message with prefix', MessageType.USER, { prefix: 'PREFIX:' });

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('PREFIX:');
            expect(output).toContain('Message with prefix');
        });
    });

    describe('displayWelcome', () => {
        it('should display welcome message with branding and commands', () => {
            displayManager.displayWelcome();

            expect(mockConsoleLog).toHaveBeenCalledTimes(13); // Multiple lines

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('Code Agent Node - Interactive CLI');
            expect(fullOutput).toContain('/help');
            expect(fullOutput).toContain('/clear');
            expect(fullOutput).toContain('/history');
            expect(fullOutput).toContain('/tools');
            expect(fullOutput).toContain('/config');
            expect(fullOutput).toContain('/exit');
            expect(fullOutput).toContain('Ctrl+C');
        });
    });

    describe('formatToolUsage', () => {
        it('should display tool usage with input and result', () => {
            const input = { file: 'test.txt' };
            const result = 'File content';

            displayManager.formatToolUsage('read-file', input, result);

            expect(mockConsoleLog).toHaveBeenCalledTimes(7); // Multiple lines

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('Tool: read-file');
            expect(fullOutput).toContain('Input:');
            expect(fullOutput).toContain('test.txt');
            expect(fullOutput).toContain('Result:');
            expect(fullOutput).toContain('File content');
        });

        it('should display tool usage with only tool name when no input/result', () => {
            displayManager.formatToolUsage('list-files', null, null);

            expect(mockConsoleLog).toHaveBeenCalledTimes(5); // Tool name + empty lines

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('Tool: list-files');
        });

        it('should handle object results by stringifying them', () => {
            const result = { files: ['file1.txt', 'file2.txt'] };

            displayManager.formatToolUsage('list-files', null, result);

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('file1.txt');
            expect(fullOutput).toContain('file2.txt');
        });
    });

    describe('clearScreen', () => {
        it('should clear the console', () => {
            displayManager.clearScreen();

            expect(mockConsoleClear).toHaveBeenCalledTimes(1);
        });
    });

    describe('displayError', () => {
        it('should display error with message', () => {
            const error = new Error('Test error');

            displayManager.displayError(error);

            expect(mockConsoleLog).toHaveBeenCalledTimes(4); // Empty line + error + empty line

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('✗ Error:');
            expect(fullOutput).toContain('Test error');
        });

        it('should display error with context', () => {
            const error = new Error('Test error');

            displayManager.displayError(error, 'file operation');

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('Error (file operation):');
            expect(fullOutput).toContain('Test error');
        });

        it('should display stack trace in development mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('Test error');
            error.stack = 'Error: Test error\n    at test.js:1:1';

            displayManager.displayError(error);

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('Stack trace:');
            expect(fullOutput).toContain('at test.js:1:1');

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('displaySuccess', () => {
        it('should display success message with checkmark', () => {
            displayManager.displaySuccess('Operation completed');

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];

            expect(output).toContain('✓');
            expect(output).toContain('Operation completed');
        });
    });

    describe('displayWarning', () => {
        it('should display warning message with warning symbol', () => {
            displayManager.displayWarning('This is a warning');

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];

            expect(output).toContain('⚠️');
            expect(output).toContain('This is a warning');
        });
    });

    describe('convenience methods', () => {
        it('should display system message using displaySystem', () => {
            displayManager.displaySystem('System message');

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('System message');
        });

        it('should display user message using displayUser', () => {
            displayManager.displayUser('User message');

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('❯');
            expect(output).toContain('User message');
        });

        it('should display assistant message using displayAssistant', () => {
            displayManager.displayAssistant('Assistant message');

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('◆');
            expect(output).toContain('Assistant message');
        });
    });

    describe('theme management', () => {
        it('should set theme successfully', () => {
            const result = displayManager.setTheme('dark');

            expect(result).toBe(true);
            expect(displayManager.getCurrentThemeName()).toBe('dark');
        });

        it('should return false for invalid theme', () => {
            const result = displayManager.setTheme('invalid-theme');

            expect(result).toBe(false);
            expect(displayManager.getCurrentThemeName()).toBe('light'); // Should remain unchanged
        });

        it('should get available themes', () => {
            const themes = displayManager.getAvailableThemes();

            expect(themes).toContain('light');
            expect(themes).toContain('dark');
            expect(themes.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('progress management', () => {
        it('should create progress indicator', async () => {
            const progress = await displayManager.showProgress('Loading...');

            expect(progress).toBeDefined();
            expect(typeof progress.start).toBe('function');
            expect(typeof progress.update).toBe('function');
            expect(typeof progress.succeed).toBe('function');
            expect(typeof progress.fail).toBe('function');
            expect(typeof progress.stop).toBe('function');
        });
    });

    describe('dark theme', () => {
        beforeEach(() => {
            themeEngine = new ThemeEngine('dark');
            progressManager = new ProgressManager();
            displayManager = new DisplayManager(themeEngine, progressManager);
        });

        it('should use dark theme colors for messages', () => {
            displayManager.displayMessage('Dark theme message', MessageType.USER);

            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
            const output = mockConsoleLog.mock.calls[0][0];
            expect(output).toContain('❯');
            expect(output).toContain('Dark theme message');
        });

        it('should display welcome with dark theme colors', () => {
            displayManager.displayWelcome();

            expect(mockConsoleLog).toHaveBeenCalledTimes(13);

            const outputs = mockConsoleLog.mock.calls.map(call => call[0]);
            const fullOutput = outputs.join('\n');

            expect(fullOutput).toContain('Code Agent Node - Interactive CLI');
        });
    });
});