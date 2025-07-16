import { DisplayManager } from '../cli/components/display-manager';
import { MessageType, DisplayOptions, ProgressIndicator } from '../cli/types';

/**
 * Creates a properly mocked DisplayManager for testing
 */
export function createMockDisplayManager(): jest.Mocked<DisplayManager> {
  const mockProgressIndicator: ProgressIndicator = {
    start: jest.fn(),
    update: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    stop: jest.fn()
  };

  const mock = {
    displayMessage: jest.fn(),
    displayWelcome: jest.fn(),
    formatToolUsage: jest.fn(),
    showProgress: jest.fn().mockResolvedValue(mockProgressIndicator),
    clearScreen: jest.fn(),
    displayError: jest.fn(),
    displaySuccess: jest.fn(),
    displayWarning: jest.fn(),
    displaySystem: jest.fn(),
    displayUser: jest.fn(),
    displayAssistant: jest.fn(),
    setTheme: jest.fn().mockReturnValue(true),
    getCurrentThemeName: jest.fn().mockReturnValue('default'),
    getAvailableThemes: jest.fn().mockReturnValue(['light', 'dark', 'default']),
    // Add private methods that might be accessed
    getColorForMessageType: jest.fn().mockReturnValue('#ffffff'),
    getSymbolForMessageType: jest.fn().mockReturnValue(''),
    // Add any private properties that might be accessed
    themeEngine: {} as any,
    progressManager: {} as any
  };

  return mock as unknown as jest.Mocked<DisplayManager>;
}

/**
 * Creates a mock DisplayManager constructor
 */
export function mockDisplayManagerConstructor() {
  return jest.fn().mockImplementation(() => createMockDisplayManager());
}