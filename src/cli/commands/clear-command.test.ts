import { ClearCommand } from './clear-command';
import { DisplayManager } from '../components/display-manager';
import { createMockDisplayManager } from '../../__mocks__/display-manager-mock';

// Mock DisplayManager
jest.mock('../components/display-manager');

describe('ClearCommand', () => {
  let clearCommand: ClearCommand;
  let mockDisplayManager: jest.Mocked<DisplayManager>;

  beforeEach(() => {
    mockDisplayManager = createMockDisplayManager();
    clearCommand = new ClearCommand(mockDisplayManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct name and description', () => {
      expect(clearCommand.name).toBe('clear');
      expect(clearCommand.description).toBe('Clear the terminal screen');
    });
  });

  describe('handler', () => {
    it('should call clearScreen on display manager', async () => {
      await clearCommand.handler([]);

      expect(mockDisplayManager.clearScreen).toHaveBeenCalledTimes(1);
    });

    it('should ignore arguments', async () => {
      await clearCommand.handler(['arg1', 'arg2']);

      expect(mockDisplayManager.clearScreen).toHaveBeenCalledTimes(1);
    });
  });

  describe('autoComplete', () => {
    it('should return empty array', () => {
      const result = clearCommand.autoComplete();
      expect(result).toEqual([]);
    });
  });
});