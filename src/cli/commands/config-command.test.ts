import { ConfigCommand } from './config-command';
import { DisplayManager } from '../display-manager';
import { SessionManager } from '../session-manager';
import { MessageType, InteractiveCLIConfig } from '../types';

// Mock dependencies
jest.mock('../display-manager');
jest.mock('../session-manager');

describe('ConfigCommand', () => {
  let configCommand: ConfigCommand;
  let mockDisplayManager: jest.Mocked<DisplayManager>;
  let mockSessionManager: jest.Mocked<SessionManager>;

  beforeEach(() => {
    mockDisplayManager = new DisplayManager({} as any) as jest.Mocked<DisplayManager>;
    mockSessionManager = new SessionManager({} as any) as jest.Mocked<SessionManager>;
    configCommand = new ConfigCommand(mockDisplayManager, mockSessionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct name and description', () => {
      expect(configCommand.name).toBe('config');
      expect(configCommand.description).toBe('Show current configuration settings');
    });
  });

  describe('handler', () => {
    it('should display current configuration', async () => {
      const mockConfig: InteractiveCLIConfig = {
        theme: 'dark',
        historySize: 1000,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: false
      };

      mockSessionManager.getConfig.mockReturnValue(mockConfig);

      await configCommand.handler([]);

      expect(mockSessionManager.getConfig).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Current Configuration:', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Theme                : dark', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  History size         : 1000', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Auto save            : true', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Progress indicators  : true', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Multi line editor    : false', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        'Configuration can be modified by editing the config file or using theme commands.',
        MessageType.SYSTEM
      );
    });

    it('should handle camelCase property names correctly', async () => {
      const mockConfig: InteractiveCLIConfig = {
        theme: 'light',
        historySize: 500,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: true
      };

      mockSessionManager.getConfig.mockReturnValue(mockConfig);

      await configCommand.handler([]);

      // Check that camelCase is converted to readable format
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  History size         : 500', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Auto save            : false', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Progress indicators  : false', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  Multi line editor    : true', MessageType.SYSTEM);
    });

    it('should ignore arguments', async () => {
      const mockConfig: InteractiveCLIConfig = {
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };

      mockSessionManager.getConfig.mockReturnValue(mockConfig);

      await configCommand.handler(['arg1', 'arg2']);

      expect(mockSessionManager.getConfig).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Current Configuration:', MessageType.SYSTEM);
    });
  });

  describe('autoComplete', () => {
    it('should return predefined config categories', () => {
      const result = configCommand.autoComplete();
      expect(result).toEqual(['display', 'theme', 'history', 'editor']);
    });
  });
});