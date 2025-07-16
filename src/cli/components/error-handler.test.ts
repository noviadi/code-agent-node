import { ErrorHandler, CLIErrorImpl } from './error-handler';
import { 
    ErrorCategory, 
    ErrorSeverity, 
    ErrorHandlerConfig, 
    FallbackConfig,
    ErrorRecoveryStrategy 
} from '../types';

describe('CLIErrorImpl', () => {
    it('should create a CLI error with all properties', () => {
        const originalError = new Error('Original error');
        const cliError = new CLIErrorImpl(
            'Test error',
            ErrorCategory.NETWORK,
            ErrorSeverity.HIGH,
            true,
            'test context',
            originalError
        );

        expect(cliError.message).toBe('Test error');
        expect(cliError.category).toBe(ErrorCategory.NETWORK);
        expect(cliError.severity).toBe(ErrorSeverity.HIGH);
        expect(cliError.recoverable).toBe(true);
        expect(cliError.context).toBe('test context');
        expect(cliError.originalError).toBe(originalError);
        expect(cliError.timestamp).toBeInstanceOf(Date);
    });

    it('should create CLI error from standard error', () => {
        const standardError = new Error('Standard error');
        const cliError = CLIErrorImpl.fromError(
            standardError,
            ErrorCategory.FILE_SYSTEM,
            ErrorSeverity.MEDIUM,
            'file context'
        );

        expect(cliError.message).toBe('Standard error');
        expect(cliError.category).toBe(ErrorCategory.FILE_SYSTEM);
        expect(cliError.severity).toBe(ErrorSeverity.MEDIUM);
        expect(cliError.context).toBe('file context');
        expect(cliError.originalError).toBe(standardError);
    });

    it('should get formatted display message', () => {
        const cliError = new CLIErrorImpl(
            'Test error',
            ErrorCategory.NETWORK,
            ErrorSeverity.HIGH,
            true,
            'network context'
        );

        expect(cliError.getDisplayMessage()).toBe('Test error (network context)');
    });

    it('should get formatted display message without context', () => {
        const cliError = new CLIErrorImpl('Test error');
        expect(cliError.getDisplayMessage()).toBe('Test error');
    });

    it('should get detailed info as JSON', () => {
        const cliError = new CLIErrorImpl(
            'Test error',
            ErrorCategory.TOOL_EXECUTION,
            ErrorSeverity.MEDIUM,
            true,
            'tool context'
        );

        const detailedInfo = cliError.getDetailedInfo();
        const parsed = JSON.parse(detailedInfo);

        expect(parsed.message).toBe('Test error');
        expect(parsed.category).toBe(ErrorCategory.TOOL_EXECUTION);
        expect(parsed.severity).toBe(ErrorSeverity.MEDIUM);
        expect(parsed.context).toBe('tool context');
        expect(parsed.recoverable).toBe(true);
        expect(parsed.timestamp).toBeDefined();
    });
});

describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;
    let mockDisplayManager: any;
    let errorConfig: ErrorHandlerConfig;
    let fallbackConfig: FallbackConfig;

    beforeEach(() => {
        errorConfig = {
            enableFallbacks: true,
            logErrors: false, // Disable logging for tests
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

        mockDisplayManager = {
            displayError: jest.fn(),
            displayWarning: jest.fn()
        };

        errorHandler = new ErrorHandler(errorConfig, fallbackConfig);
        errorHandler.setDisplayManager(mockDisplayManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Error Categorization', () => {
        it('should categorize network errors correctly', async () => {
            const networkError = new Error('Connection failed');
            await errorHandler.handleNetworkError(networkError, 'API call');

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(1);
        });

        it('should categorize file system errors correctly', async () => {
            const fsError = new Error('ENOENT: file not found');
            await errorHandler.handleFileSystemError(fsError, 'config file');

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBe(1);
        });

        it('should categorize tool errors correctly', async () => {
            const toolError = new Error('Tool execution failed');
            await errorHandler.handleToolError(toolError, 'read-file');

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.TOOL_EXECUTION]).toBe(1);
        });

        it('should categorize configuration errors correctly', async () => {
            const configError = new Error('Invalid configuration');
            await errorHandler.handleConfigurationError(configError, 'theme config');

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.CONFIGURATION]).toBe(1);
        });

        it('should categorize initialization errors correctly', async () => {
            const initError = new Error('Component initialization failed');
            await errorHandler.handleInitializationError(initError, 'display manager');

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.INITIALIZATION]).toBe(1);
        });
    });

    describe('Error Recovery', () => {
        it('should attempt recovery with custom strategy', async () => {
            const mockStrategy: ErrorRecoveryStrategy = {
                canRecover: jest.fn().mockReturnValue(true),
                recover: jest.fn().mockResolvedValue(true)
            };

            errorHandler.registerRecoveryStrategy(ErrorCategory.NETWORK, mockStrategy);

            const networkError = new Error('Network error');
            const recovered = await errorHandler.handleNetworkError(networkError);

            expect(mockStrategy.canRecover).toHaveBeenCalled();
            expect(mockStrategy.recover).toHaveBeenCalled();
            expect(recovered).toBe(true);
        });

        it('should use fallback action when recovery fails', async () => {
            const fallbackAction = jest.fn().mockResolvedValue(undefined);
            const mockStrategy: ErrorRecoveryStrategy = {
                canRecover: jest.fn().mockReturnValue(true),
                recover: jest.fn().mockResolvedValue(false),
                getFallbackAction: jest.fn().mockReturnValue(fallbackAction)
            };

            errorHandler.registerRecoveryStrategy(ErrorCategory.NETWORK, mockStrategy);

            const networkError = new Error('Network error');
            const recovered = await errorHandler.handleNetworkError(networkError);

            expect(mockStrategy.recover).toHaveBeenCalled();
            expect(mockStrategy.getFallbackAction).toHaveBeenCalled();
            expect(fallbackAction).toHaveBeenCalled();
            expect(recovered).toBe(true);
        });

        it('should retry recovery attempts', async () => {
            const mockStrategy: ErrorRecoveryStrategy = {
                canRecover: jest.fn().mockReturnValue(true),
                recover: jest.fn()
                    .mockResolvedValueOnce(false) // First attempt fails
                    .mockResolvedValueOnce(true)  // Second attempt succeeds
            };

            errorHandler.registerRecoveryStrategy(ErrorCategory.NETWORK, mockStrategy);

            const networkError = new Error('Network error');
            const recovered = await errorHandler.handleNetworkError(networkError);

            expect(mockStrategy.recover).toHaveBeenCalledTimes(2);
            expect(recovered).toBe(true);
        });
    });

    describe('Fallback Mode', () => {
        it('should determine when fallback mode should be activated', () => {
            const criticalError = new CLIErrorImpl(
                'Critical error',
                ErrorCategory.INITIALIZATION,
                ErrorSeverity.CRITICAL,
                false
            );

            expect(errorHandler.shouldActivateFallback(criticalError)).toBe(true);
        });

        it('should not activate fallback for recoverable errors', () => {
            const recoverableError = new CLIErrorImpl(
                'Recoverable error',
                ErrorCategory.NETWORK,
                ErrorSeverity.HIGH,
                true
            );

            expect(errorHandler.shouldActivateFallback(recoverableError)).toBe(false);
        });

        it('should update fallback configuration', () => {
            const updates: Partial<FallbackConfig> = {
                useBasicReadline: true,
                disableColors: true
            };

            errorHandler.updateFallbackConfig(updates);
            const config = errorHandler.getFallbackConfig();

            expect(config.useBasicReadline).toBe(true);
            expect(config.disableColors).toBe(true);
        });
    });

    describe('Error Statistics', () => {
        it('should track error statistics by category', async () => {
            await errorHandler.handleNetworkError(new Error('Network 1'));
            await errorHandler.handleNetworkError(new Error('Network 2'));
            await errorHandler.handleFileSystemError(new Error('File error'));

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(2);
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBe(1);
            expect(stats[ErrorCategory.TOOL_EXECUTION]).toBe(0);
        });

        it('should get recent errors', async () => {
            await errorHandler.handleNetworkError(new Error('Error 1'));
            await errorHandler.handleFileSystemError(new Error('Error 2'));
            await errorHandler.handleToolError(new Error('Error 3'));

            const recentErrors = errorHandler.getRecentErrors(2);
            expect(recentErrors).toHaveLength(2);
            expect(recentErrors[0].message).toContain('Error 2');
            expect(recentErrors[1].message).toContain('Error 3');
        });

        it('should clear error log', async () => {
            await errorHandler.handleNetworkError(new Error('Error 1'));
            await errorHandler.handleFileSystemError(new Error('Error 2'));

            let stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(1);
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBe(1);

            errorHandler.clearErrorLog();

            stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(0);
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBe(0);
        });
    });

    describe('Error Display', () => {
        it('should display errors through display manager', async () => {
            const error = new Error('Test error');
            await errorHandler.handleError(error, 'test context');

            expect(mockDisplayManager.displayError).toHaveBeenCalled();
        });

        it('should handle missing display manager gracefully', async () => {
            const errorHandlerWithoutDisplay = new ErrorHandler(errorConfig, fallbackConfig);
            
            // Should not throw when display manager is not set
            const error = new Error('Test error');
            await expect(errorHandlerWithoutDisplay.handleError(error)).resolves.toBe(false);
        });
    });

    describe('Input Validation', () => {
        it('should handle input validation errors with low severity', async () => {
            const inputError = new Error('Invalid input format');
            await errorHandler.handleInputError(inputError, 'user input');

            const recentErrors = errorHandler.getRecentErrors(1);
            expect(recentErrors[0].category).toBe(ErrorCategory.INPUT_VALIDATION);
            expect(recentErrors[0].severity).toBe(ErrorSeverity.LOW);
        });
    });

    describe('Error Context Detection', () => {
        it('should detect network context from error message', async () => {
            const error = new Error('fetch failed due to network timeout');
            await errorHandler.handleError(error);

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.NETWORK]).toBe(1);
        });

        it('should detect file system context from error message', async () => {
            const error = new Error('ENOENT: no such file or directory');
            await errorHandler.handleError(error);

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.FILE_SYSTEM]).toBe(1);
        });

        it('should detect tool context from context parameter', async () => {
            const error = new Error('execution failed');
            await errorHandler.handleError(error, 'tool execution');

            const stats = errorHandler.getErrorStats();
            expect(stats[ErrorCategory.TOOL_EXECUTION]).toBe(1);
        });
    });
});