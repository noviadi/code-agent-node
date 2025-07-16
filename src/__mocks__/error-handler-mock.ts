import { ErrorHandler } from '../cli/components/error-handler';

/**
 * Creates a properly mocked ErrorHandler for testing
 */
export function createMockErrorHandler(): jest.Mocked<ErrorHandler> {
  const mock = {
    handleInitializationError: jest.fn(),
    handleInputError: jest.fn(),
    handleNetworkError: jest.fn(),
    handleToolError: jest.fn(),
    handleFileSystemError: jest.fn(),
    handleError: jest.fn(),
    handleConfigurationError: jest.fn(),
    setDisplayManager: jest.fn(),
    getErrorStats: jest.fn().mockReturnValue({
      totalErrors: 0,
      errorsByType: {},
      recentErrors: []
    }),
    getRecentErrors: jest.fn().mockReturnValue([]),
    clearErrorHistory: jest.fn(),
    clearErrorLog: jest.fn(),
    isInFallbackMode: jest.fn().mockReturnValue(false),
    activateFallbackMode: jest.fn(),
    deactivateFallbackMode: jest.fn(),
    registerRecoveryStrategy: jest.fn(),
    updateFallbackConfig: jest.fn(),
    // Add any private properties that might be accessed
    displayManager: {} as any,
    errorHistory: [] as any,
    fallbackMode: false as any
  };

  return mock as unknown as jest.Mocked<ErrorHandler>;
}

/**
 * Creates a mock ErrorHandler constructor that can be used with mockImplementation
 */
export function mockErrorHandlerConstructor() {
  return jest.fn().mockImplementation(() => createMockErrorHandler());
}