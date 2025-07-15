import { ExitCommand } from './exit-command';
import { DisplayManager } from '../display-manager';
import { MessageType } from '../types';

// Mock DisplayManager
jest.mock('../display-manager');

describe('ExitCommand', () => {
  let exitCommand: ExitCommand;
  let mockDisplayManager: jest.Mocked<DisplayManager>;
  let mockProcessExit: jest.SpyInstance;

  beforeEach(() => {
    mockDisplayManager = new DisplayManager({} as any) as jest.Mocked<DisplayManager>;
    exitCommand = new ExitCommand(mockDisplayManager);
    
    // Mock process.exit to prevent actual exit during tests
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockProcessExit.mockRestore();
  });

  describe('properties', () => {
    it('should have correct name and description', () => {
      expect(exitCommand.name).toBe('exit');
      expect(exitCommand.description).toBe('Gracefully exit the application');
    });
  });

  describe('handler', () => {
    it('should display goodbye message and exit', async () => {
      try {
        await exitCommand.handler([]);
      } catch (error) {
        // Expected to throw due to mocked process.exit
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Goodbye! 👋', MessageType.SYSTEM);
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should ignore arguments', async () => {
      try {
        await exitCommand.handler(['arg1', 'arg2']);
      } catch (error) {
        // Expected to throw due to mocked process.exit
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Goodbye! 👋', MessageType.SYSTEM);
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });
  });

  describe('autoComplete', () => {
    it('should return empty array', () => {
      const result = exitCommand.autoComplete();
      expect(result).toEqual([]);
    });
  });
});