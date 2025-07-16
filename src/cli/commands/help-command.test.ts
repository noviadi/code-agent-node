import { HelpCommand } from './help-command';
import { DisplayManager } from '../components/display-manager';
import { MessageType, SpecialCommand } from '../types';
import { createMockDisplayManager } from '../../__mocks__/display-manager-mock';

// Mock DisplayManager
jest.mock('../components/display-manager');

describe('HelpCommand', () => {
  let helpCommand: HelpCommand;
  let mockDisplayManager: jest.Mocked<DisplayManager>;
  let mockGetAvailableCommands: jest.Mock;

  beforeEach(() => {
    mockDisplayManager = createMockDisplayManager();
    mockGetAvailableCommands = jest.fn();
    helpCommand = new HelpCommand(mockDisplayManager, mockGetAvailableCommands);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct name and description', () => {
      expect(helpCommand.name).toBe('help');
      expect(helpCommand.description).toBe('Display available commands and shortcuts');
    });
  });

  describe('handler', () => {
    it('should display available commands and shortcuts', async () => {
      const mockCommands: SpecialCommand[] = [
        { name: 'help', description: 'Show help', handler: jest.fn(), autoComplete: jest.fn() },
        { name: 'clear', description: 'Clear screen', handler: jest.fn(), autoComplete: jest.fn() },
        { name: 'exit', description: 'Exit app', handler: jest.fn(), autoComplete: jest.fn() }
      ];

      mockGetAvailableCommands.mockReturnValue(mockCommands);

      await helpCommand.handler([]);

      // Verify the display calls
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Available Commands:', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  help         - Show help', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  clear        - Clear screen', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  exit         - Exit app', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Keyboard Shortcuts:', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  ↑/↓ arrows    - Navigate command history', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Tab           - Auto-complete commands', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Shift+Enter   - Multi-line input', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Ctrl+C        - Exit with confirmation', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Ctrl+E        - Open external editor', MessageType.SYSTEM);
    });

    it('should handle empty commands list', async () => {
      mockGetAvailableCommands.mockReturnValue([]);

      await helpCommand.handler([]);

      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Available Commands:', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      // Should still show keyboard shortcuts even with no commands
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Keyboard Shortcuts:', MessageType.SYSTEM);
    });
  });

  describe('autoComplete', () => {
    it('should return empty array', () => {
      const result = helpCommand.autoComplete();
      expect(result).toEqual([]);
    });
  });
});