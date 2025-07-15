import { HistoryCommand } from './history-command';
import { DisplayManager } from '../display-manager';
import { HistoryManager } from '../components/history-manager';
import { MessageType, HistoryEntry } from '../types';

// Mock dependencies
jest.mock('../display-manager');
jest.mock('../components/history-manager');

describe('HistoryCommand', () => {
  let historyCommand: HistoryCommand;
  let mockDisplayManager: jest.Mocked<DisplayManager>;
  let mockHistoryManager: jest.Mocked<HistoryManager>;

  beforeEach(() => {
    mockDisplayManager = new DisplayManager({} as any) as jest.Mocked<DisplayManager>;
    mockHistoryManager = new HistoryManager() as jest.Mocked<HistoryManager>;
    historyCommand = new HistoryCommand(mockDisplayManager, mockHistoryManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct name and description', () => {
      expect(historyCommand.name).toBe('history');
      expect(historyCommand.description).toBe('Display recent command history');
    });
  });

  describe('handler', () => {
    it('should display recent history with default limit', async () => {
      const mockHistory: HistoryEntry[] = [
        { command: 'test command 1', timestamp: new Date('2023-01-01T10:00:00Z'), success: true },
        { command: 'test command 2', timestamp: new Date('2023-01-01T11:00:00Z'), success: false },
        { command: 'test command 3', timestamp: new Date('2023-01-01T12:00:00Z'), success: true }
      ];

      mockHistoryManager.getRecent.mockReturnValue(mockHistory);

      await historyCommand.handler([]);

      expect(mockHistoryManager.getRecent).toHaveBeenCalledWith(10);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Recent Commands (last 3):', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        expect.stringMatching(/\s*1\. \[.*\] ✓ test command 1/),
        MessageType.SYSTEM
      );
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        expect.stringMatching(/\s*2\. \[.*\] ✗ test command 2/),
        MessageType.SYSTEM
      );
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        expect.stringMatching(/\s*3\. \[.*\] ✓ test command 3/),
        MessageType.SYSTEM
      );
    });

    it('should display recent history with custom limit', async () => {
      const mockHistory: HistoryEntry[] = [
        { command: 'test command 1', timestamp: new Date('2023-01-01T10:00:00Z'), success: true }
      ];

      mockHistoryManager.getRecent.mockReturnValue(mockHistory);

      await historyCommand.handler(['5']);

      expect(mockHistoryManager.getRecent).toHaveBeenCalledWith(5);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Recent Commands (last 1):', MessageType.SYSTEM);
    });

    it('should handle invalid limit argument', async () => {
      const mockHistory: HistoryEntry[] = [];
      mockHistoryManager.getRecent.mockReturnValue(mockHistory);

      await historyCommand.handler(['invalid']);

      expect(mockHistoryManager.getRecent).toHaveBeenCalledWith(10); // Should default to 10
    });

    it('should display message when no history available', async () => {
      mockHistoryManager.getRecent.mockReturnValue([]);

      await historyCommand.handler([]);

      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('No command history available.', MessageType.SYSTEM);
    });
  });

  describe('autoComplete', () => {
    it('should return predefined limit options', () => {
      const result = historyCommand.autoComplete();
      expect(result).toEqual(['5', '10', '20', '50']);
    });
  });
});