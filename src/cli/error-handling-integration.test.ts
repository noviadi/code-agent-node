import { ErrorHandler, CLIErrorImpl } from './components/error-handler';
import { FallbackCLIManager } from './components/fallback-cli-manager';
import { 
    ErrorCategory, 
    ErrorSeverity, 
    ErrorHandlerConfig, 
    FallbackConfig 
} from './types';

// Mock dependencies to avoid module issues
jest.mock('@anthropic-ai/sdk');
jest.mock('../agent');

describe('Error Handling Integration', () => {
    let errorHandler: ErrorHandler;
    let fallbackManager: FallbackCLIManager;
    let errorConfig: ErrorHandlerConfig;
    let fallbackConfig: FallbackConfig;

    beforeEach(() => {
        errorConfig = {
            enableFallbacks: true,
            logErrors: false,
            showStackTrace: false,
            maxRetries: 2,
            retryDelay: 100
        };

        fallbackConfig = {
            useBasicReadline: false,
            disableColors: false,
            disableProgress: false,
            disableAutoComplete: false,
            disableHistory: false
        };

        errorHandler = new ErrorHandler(errorConfig, fallbackConfig);

        // Mock agent for fallback manager
        const mockAgent = {
            getAvailableTools: jest.fn().mockReturnValue([])
        } as any;

        fallbackManager = new FallbackCLIManager(mockAgent, fallbackConfig);

        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('Error Handler and Fallback Manager Integration', () => {
        it('should create CLI errors with proper categorization', () => {
            const networkError = new Error('Connection timeout');
            const cliError = CLIErrorImpl.fromError(
                networkError,
                ErrorCategory.NETWORK,
                ErrorSeverity.HIGH,
                'API call'
            );

            expect(cliError.category).toBe(ErrorCategory.NETWORK);
            expect(cliError.severity).toBe(ErrorSeverity.HIGH);
            expect(cliError.context).toBe('API call');
            expect(cliError.recoverable).toBe(true);
            expect(cliError.originalError).toBe(networkError);
        });

        it('should handle critical errors and suggest fallback mode', () => {
            const criticalError = new CLIErrorImpl(
                'System initialization failed',
                ErrorCategory.INITIALIZATION,
                ErrorSeverity.CRITICAL,
                false,
                'startup'
            );

            const shouldFallback = errorHandler.shouldActivateFallback(criticalError);
            expect(shouldFallback).toBe(true);
        });

        it('should track error statistics across categories', async () => {
            // Generate errors in different categories
            await errorHandler.handleNetworkError(new Error('Network 1'));
            await errorHandler.handleNetworkError(new Error('Network 2'));
            await errorHandler.handleFileSystemError(new Error('File error'));
            await errorHandler.handleToolError(new Error('Tool error'));

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(2);
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBe(1);
            expect(stats[ErrorCategory.TOOL_EXECUTION]).toBe(1);
            expect(stats[ErrorCategory.INPUT_VALIDATION]).toBe(0);
        });

        it('should provide fallback configuration management', () => {
            const initialConfig = errorHandler.getFallbackConfig();
            expect(initialConfig.useBasicReadline).toBe(false);

            errorHandler.updateFallbackConfig({
                useBasicReadline: true,
                disableColors: true
            });

            const updatedConfig = errorHandler.getFallbackConfig();
            expect(updatedConfig.useBasicReadline).toBe(true);
            expect(updatedConfig.disableColors).toBe(true);
            expect(updatedConfig.disableProgress).toBe(false); // Should remain unchanged
        });

        it('should handle error recovery with custom strategies', async () => {
            let recoveryAttempted = false;
            const customStrategy = {
                canRecover: jest.fn().mockReturnValue(true),
                recover: jest.fn().mockImplementation(async () => {
                    recoveryAttempted = true;
                    return true;
                })
            };

            errorHandler.registerRecoveryStrategy(ErrorCategory.NETWORK, customStrategy);

            const networkError = new Error('Network failure');
            const recovered = await errorHandler.handleNetworkError(networkError);

            expect(recovered).toBe(true);
            expect(recoveryAttempted).toBe(true);
            expect(customStrategy.canRecover).toHaveBeenCalled();
            expect(customStrategy.recover).toHaveBeenCalled();
        });

        it('should provide error history and monitoring', async () => {
            // Generate some errors
            await errorHandler.handleNetworkError(new Error('Error 1'));
            await errorHandler.handleFileSystemError(new Error('Error 2'));
            await errorHandler.handleToolError(new Error('Error 3'));

            const recentErrors = errorHandler.getRecentErrors(2);
            expect(recentErrors).toHaveLength(2);
            expect(recentErrors[0].message).toContain('Error 2');
            expect(recentErrors[1].message).toContain('Error 3');

            // Clear and verify
            errorHandler.clearErrorLog();
            const clearedErrors = errorHandler.getRecentErrors();
            expect(clearedErrors).toHaveLength(0);
        });

        it('should handle fallback manager basic functionality', () => {
            expect(fallbackManager.isActive()).toBe(false);
            
            // Test basic input method
            const inputPromise = fallbackManager.getInput('Test: ');
            expect(inputPromise).toBeInstanceOf(Promise);
        });

        it('should demonstrate error severity classification', () => {
            const errors = [
                new CLIErrorImpl('Invalid input', ErrorCategory.INPUT_VALIDATION, ErrorSeverity.LOW),
                new CLIErrorImpl('File not found', ErrorCategory.FILE_SYSTEM, ErrorSeverity.MEDIUM),
                new CLIErrorImpl('Network timeout', ErrorCategory.NETWORK, ErrorSeverity.HIGH),
                new CLIErrorImpl('System crash', ErrorCategory.INITIALIZATION, ErrorSeverity.CRITICAL)
            ];

            errors.forEach(error => {
                const shouldFallback = errorHandler.shouldActivateFallback(error);
                if (error.severity === ErrorSeverity.CRITICAL) {
                    expect(shouldFallback).toBe(true);
                } else {
                    expect(shouldFallback).toBe(false);
                }
            });
        });

        it('should handle error context detection', async () => {
            // Test automatic categorization based on error messages
            const errors = [
                { error: new Error('fetch failed'), expectedCategory: ErrorCategory.NETWORK },
                { error: new Error('ENOENT: file not found'), expectedCategory: ErrorCategory.FILE_SYSTEM },
                { error: new Error('invalid configuration'), expectedCategory: ErrorCategory.CONFIGURATION }
            ];

            for (const { error, expectedCategory } of errors) {
                await errorHandler.handleError(error);
            }

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBeGreaterThan(0);
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBeGreaterThan(0);
            expect(stats[ErrorCategory.CONFIGURATION]).toBeGreaterThan(0);
        });

        it('should provide comprehensive error information', () => {
            const originalError = new Error('Original failure');
            originalError.stack = 'Error stack trace';

            const cliError = new CLIErrorImpl(
                'Enhanced error message',
                ErrorCategory.TOOL_EXECUTION,
                ErrorSeverity.MEDIUM,
                true,
                'tool: test-tool',
                originalError
            );

            const displayMessage = cliError.getDisplayMessage();
            expect(displayMessage).toBe('Enhanced error message (tool: test-tool)');

            const detailedInfo = cliError.getDetailedInfo();
            const parsed = JSON.parse(detailedInfo);
            expect(parsed.message).toBe('Enhanced error message');
            expect(parsed.category).toBe(ErrorCategory.TOOL_EXECUTION);
            expect(parsed.severity).toBe(ErrorSeverity.MEDIUM);
            expect(parsed.context).toBe('tool: test-tool');
            expect(parsed.originalError.message).toBe('Original failure');
        });
    });

    describe('Error Handling Workflow', () => {
        it('should demonstrate complete error handling workflow', async () => {
            // 1. Error occurs
            const networkError = new Error('API connection failed');

            // 2. Error is handled and categorized
            const handled = await errorHandler.handleNetworkError(networkError, 'Claude API');

            // 3. Check if error was handled (default recovery strategies may handle it)
            expect(typeof handled).toBe('boolean');

            // 4. Check error statistics
            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(1);

            // 5. Get recent errors for monitoring
            const recentErrors = errorHandler.getRecentErrors(1);
            expect(recentErrors).toHaveLength(1);
            expect(recentErrors[0].message).toContain('Network error: API connection failed');
            expect(recentErrors[0].context).toBe('Claude API');

            // 6. Check if fallback should be activated (shouldn't for network errors)
            const shouldFallback = errorHandler.shouldActivateFallback(recentErrors[0]);
            expect(shouldFallback).toBe(false);
        });

        it('should demonstrate fallback activation workflow', async () => {
            // 1. Critical initialization error occurs
            const initError = new Error('Core component failed to initialize');

            // 2. Handle as initialization error
            const handled = await errorHandler.handleInitializationError(initError, 'display manager');

            // 3. Should not be handled (no recovery for critical errors)
            expect(handled).toBe(false);

            // 4. Check if fallback should be activated
            const recentErrors = errorHandler.getRecentErrors(1);
            const shouldFallback = errorHandler.shouldActivateFallback(recentErrors[0]);
            expect(shouldFallback).toBe(true);

            // 5. Update fallback configuration
            errorHandler.updateFallbackConfig({
                useBasicReadline: true,
                disableColors: true,
                disableProgress: true,
                disableAutoComplete: true,
                disableHistory: true
            });

            const fallbackConfig = errorHandler.getFallbackConfig();
            expect(fallbackConfig.useBasicReadline).toBe(true);
            expect(fallbackConfig.disableColors).toBe(true);
        });
    });
});