import { ConfigurationManager } from './configuration-manager';
import { InteractiveCLIConfig } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock fs/promises and os
jest.mock('fs/promises');
jest.mock('os');

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  const mockFs = jest.mocked(fs);
  const mockOs = jest.mocked(os);

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock os.homedir
    mockOs.homedir.mockReturnValue('/mock/home');
    
    // Mock fs operations - default to file not existing
    mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
    mockFs.mkdir.mockResolvedValue(undefined);
    
    // Create a new instance for each test
    configManager = new ConfigurationManager();
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

    it('should set up correct config path', () => {
      const configPath = configManager.getConfigPath();
      expect(configPath).toBe(path.join('/mock/home', '.code-agent-node-cli', 'config.json'));
    });
  });

  describe('load', () => {
    it('should load configuration from file', async () => {
      const mockConfig = {
        theme: 'dark',
        historySize: 150,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: false
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const config = await configManager.load();

      expect(config).toEqual(mockConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(path.join('/mock/home', '.code-agent-node-cli', 'config.json'), 'utf-8');
    });

    it('should use defaults when file does not exist', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const config = await configManager.load();

      expect(config).toEqual({
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      });
    });

    it('should update internal config after loading', async () => {
      const mockConfig = {
        theme: 'light',
        historySize: 200,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: false
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      await configManager.load();
      const config = configManager.getConfig();

      expect(config.theme).toBe('light');
      expect(config.historySize).toBe(200);
      expect(config.multiLineEditor).toBe(false);
    });
  });

  describe('save', () => {
    it('should save valid configuration to file', async () => {
      const newConfig: InteractiveCLIConfig = {
        theme: 'dark',
        historySize: 150,
        autoSave: false,
        progressIndicators: true,
        multiLineEditor: false
      };

      await configManager.save(newConfig);

      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join('/mock/home', '.code-agent-node-cli'), { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/mock/home', '.code-agent-node-cli', 'config.json'),
        JSON.stringify(newConfig, null, 2),
        'utf-8'
      );
      expect(configManager.getConfig()).toEqual(newConfig);
    });

    it('should throw error for invalid theme', async () => {
      // Clear any calls from constructor
      mockFs.writeFile.mockClear();
      
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

      expect(mockFs.writeFile).not.toHaveBeenCalled();
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

      const expectedConfig = {
        theme: 'dark',
        historySize: 200,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/mock/home', '.code-agent-node-cli', 'config.json'),
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
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

      const expectedConfig = {
        theme: 'dark',
        historySize: 150,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: false
      };

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/mock/home', '.code-agent-node-cli', 'config.json'),
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
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

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/mock/home', '.code-agent-node-cli', 'config.json'),
        JSON.stringify(defaultConfig, null, 2),
        'utf-8'
      );
      expect(configManager.getConfig()).toEqual(defaultConfig);
    });
  });

  describe('getConfigPath', () => {
    it('should return the configuration file path', () => {
      const configPath = configManager.getConfigPath();
      expect(configPath).toBe(path.join('/mock/home', '.code-agent-node-cli', 'config.json'));
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
    it('should handle file system errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('File system error'));

      const config: InteractiveCLIConfig = {
        theme: 'default',
        historySize: 100,
        autoSave: true,
        progressIndicators: true,
        multiLineEditor: true
      };

      await expect(configManager.save(config)).rejects.toThrow('File system error');
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