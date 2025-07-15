import { ConfigurationManager } from './configuration-manager';
import { InteractiveCLIConfig } from '../types';

// Mock the conf library
jest.mock('conf', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    path: '/mock/config/path'
  }));
});

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockStore: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup default mock returns before creating the instance
    const mockGet = jest.fn().mockImplementation((key: keyof InteractiveCLIConfig) => {
      const defaults: InteractiveCLIConfig = {
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };
      return defaults[key];
    });
    
    const mockSet = jest.fn();
    
    // Mock the conf constructor to return our mock store
    const Conf = require('conf');
    Conf.mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      path: '/mock/config/path'
    }));
    
    // Create a new instance for each test
    configManager = new ConfigurationManager();
    
    // Get the mocked store instance
    mockStore = (configManager as any).store;
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = configManager.getConfig();
      
      expect(config).toEqual({
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      });
    });

    it('should create conf store with correct options', () => {
      const Conf = require('conf');
      
      expect(Conf).toHaveBeenCalledWith({
        projectName: 'code-agent-node-cli',
        defaults: {
          theme: 'default',
          historySize: 100,
          autoSave: true,
          progressIndicators: true,
          multiLineEditor: true
        }
      });
    });
  });

  describe('load', () => {
    it('should load configuration from store', async () => {
      mockStore.get.mockImplementation((key: string) => {
        const mockConfig: any = {
          theme: 'dark',
          historySize: 150,
          autoSave: false,
          progressIndicators: false,
          multiLineEditor: false
        };
        return mockConfig[key];
      });

      const config = await configManager.load();

      expect(config).toEqual({
        theme: 'dark',
        historySize: 150,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: false
      });

      expect(mockStore.get).toHaveBeenCalledWith('theme');
      expect(mockStore.get).toHaveBeenCalledWith('historySize');
      expect(mockStore.get).toHaveBeenCalledWith('autoSave');
      expect(mockStore.get).toHaveBeenCalledWith('progressIndicators');
      expect(mockStore.get).toHaveBeenCalledWith('multiLineEditor');
    });

    it('should update internal config after loading', async () => {
      mockStore.get.mockImplementation((key: string) => {
        const mockConfig: any = {
          theme: 'light',
          historySize: 200,
          autoSave: true,
          progressIndicators: true,
          multiLineEditor: false
        };
        return mockConfig[key];
      });

      await configManager.load();
      const config = configManager.getConfig();

      expect(config.theme).toBe('light');
      expect(config.historySize).toBe(200);
      expect(config.multiLineEditor).toBe(false);
    });
  });

  describe('save', () => {
    it('should save valid configuration to store', async () => {
      const newConfig: InteractiveCLIConfig = {
        theme: 'dark',
        historySize: 150,
        autoSave: false,
        progressIndicators: true,
        multiLineEditor: false
      };

      await configManager.save(newConfig);

      expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
      expect(mockStore.set).toHaveBeenCalledWith('historySize', 150);
      expect(mockStore.set).toHaveBeenCalledWith('autoSave', false);
      expect(mockStore.set).toHaveBeenCalledWith('progressIndicators', true);
      expect(mockStore.set).toHaveBeenCalledWith('multiLineEditor', false);
      expect(configManager.getConfig()).toEqual(newConfig);
    });

    it('should throw error for invalid theme', async () => {
      const invalidConfig: InteractiveCLIConfig = {
        theme: 'invalid-theme',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };

      await expect(configManager.save(invalidConfig)).rejects.toThrow(
        'Invalid theme: invalid-theme. Valid themes: default, dark, light, minimal'
      );

      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('should throw error for invalid history size', async () => {
      const invalidConfig: InteractiveCLIConfig = {
        theme: 'default',
        historySize: 5, // Too small
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };

      await expect(configManager.save(invalidConfig)).rejects.toThrow(
        'History size must be between 10 and 1000'
      );

      // Test upper bound
      const invalidConfig2: InteractiveCLIConfig = {
        ...invalidConfig,
        historySize: 1001 // Too large
      };

      await expect(configManager.save(invalidConfig2)).rejects.toThrow(
        'History size must be between 10 and 1000'
      );
    });

    it('should throw error for invalid boolean values', async () => {
      const invalidConfig: any = {
        theme: 'default',
        historySize: 100,
        autoSave: 'not-boolean',
        progressIndicators: true,
        multiLineEditor: true
      };

      await expect(configManager.save(invalidConfig)).rejects.toThrow(
        'autoSave must be a boolean value'
      );
    });
  });

  describe('update', () => {
    it('should update specific configuration values', async () => {
      const updates: Partial<InteractiveCLIConfig> = {
        theme: 'dark',
        historySize: 200
      };

      await configManager.update(updates);

      expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
      expect(mockStore.set).toHaveBeenCalledWith('historySize', 200);
      expect(mockStore.set).toHaveBeenCalledWith('autoSave', true);
      expect(mockStore.set).toHaveBeenCalledWith('progressIndicators', true);
      expect(mockStore.set).toHaveBeenCalledWith('multiLineEditor', true);
    });

    it('should validate updated configuration', async () => {
      const invalidUpdates: Partial<InteractiveCLIConfig> = {
        theme: 'invalid-theme'
      };

      await expect(configManager.update(invalidUpdates)).rejects.toThrow(
        'Invalid theme: invalid-theme'
      );
    });

    it('should preserve existing values when updating partial config', async () => {
      // Set initial config
      const initialConfig: InteractiveCLIConfig = {
        theme: 'light',
        historySize: 150,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: false
      };
      await configManager.save(initialConfig);

      // Update only theme
      await configManager.update({ theme: 'dark' });

      // Check that the final calls include the preserved values
      expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
      expect(mockStore.set).toHaveBeenCalledWith('historySize', 150);
      expect(mockStore.set).toHaveBeenCalledWith('autoSave', false);
      expect(mockStore.set).toHaveBeenCalledWith('progressIndicators', false);
      expect(mockStore.set).toHaveBeenCalledWith('multiLineEditor', false);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });

    it('should not allow external modification of internal config', () => {
      const config = configManager.getConfig();
      config.theme = 'modified';

      const freshConfig = configManager.getConfig();
      expect(freshConfig.theme).toBe('default'); // Should remain unchanged
    });
  });

  describe('resetToDefaults', () => {
    it('should reset configuration to default values', async () => {
      // First set a custom config
      const customConfig: InteractiveCLIConfig = {
        theme: 'dark',
        historySize: 200,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: false
      };
      await configManager.save(customConfig);

      // Reset to defaults
      const defaultConfig = await configManager.resetToDefaults();

      expect(defaultConfig).toEqual({
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      });

      expect(mockStore.set).toHaveBeenCalledWith('theme', 'default');
      expect(mockStore.set).toHaveBeenCalledWith('historySize', 100);
      expect(mockStore.set).toHaveBeenCalledWith('autoSave', true);
      expect(mockStore.set).toHaveBeenCalledWith('progressIndicators', true);
      expect(mockStore.set).toHaveBeenCalledWith('multiLineEditor', true);
      expect(configManager.getConfig()).toEqual(defaultConfig);
    });
  });

  describe('getConfigPath', () => {
    it('should return the configuration file path', () => {
      const path = configManager.getConfigPath();
      expect(path).toBe('/mock/config/path');
    });
  });

  describe('theme validation', () => {
    it('should validate theme names correctly', () => {
      expect(configManager.isValidTheme('default')).toBe(true);
      expect(configManager.isValidTheme('dark')).toBe(true);
      expect(configManager.isValidTheme('light')).toBe(true);
      expect(configManager.isValidTheme('minimal')).toBe(true);
      expect(configManager.isValidTheme('invalid')).toBe(false);
      expect(configManager.isValidTheme('')).toBe(false);
    });

    it('should return available themes', () => {
      const themes = configManager.getAvailableThemes();
      expect(themes).toEqual(['default', 'dark', 'light', 'minimal']);
    });
  });

  describe('error handling', () => {
    it('should handle store errors gracefully', async () => {
      mockStore.set.mockImplementation(() => {
        throw new Error('Store error');
      });

      const config: InteractiveCLIConfig = {
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };

      await expect(configManager.save(config)).rejects.toThrow('Store error');
    });

    it('should validate all boolean fields', async () => {
      const testCases = [
        { field: 'progressIndicators', error: 'progressIndicators must be a boolean value' },
        { field: 'multiLineEditor', error: 'multiLineEditor must be a boolean value' }
      ];

      for (const testCase of testCases) {
        const invalidConfig: any = {
          theme: 'default',
          historySize: 100,
          autoSave: true,
          progressIndicators: true,
          multiLineEditor: true,
          [testCase.field]: 'not-boolean'
        };

        await expect(configManager.save(invalidConfig)).rejects.toThrow(testCase.error);
      }
    });
  });
});