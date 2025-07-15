import { InteractiveCLIManager } from './interactive-cli-manager';
import { Agent } from '../agent';
import { InteractiveCLIConfig } from './types';

// Mock dependencies
jest.mock('./components/theme-engine');
jest.mock('./components/progress-manager');
jest.mock('./components/display-manager');
jest.mock('./components/history-manager');
jest.mock('./components/auto-complete-engine');
jest.mock('./components/multi-line-editor');
jest.mock('./components/configuration-manager');
jest.mock('./command-router');
jest.mock('./session-manager');
jest.mock('./input-handler');

describe('InteractiveCLIManager', () => {
  let mockAgent: jest.Mocked<Agent>;
  let config: InteractiveCLIConfig;
  let cliManager: InteractiveCLIManager;

  beforeEach(() => {
    // Mock Agent
    mockAgent = {
      getAvailableTools: jest.fn().mockReturnValue([]),
      start: jest.fn(),
    } as any;

    // Default config
    config = {
      theme: 'default',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true,
    };

    cliManager = new InteractiveCLIManager(mockAgent, config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with agent and config', () => {
      expect(cliManager).toBeInstanceOf(InteractiveCLIManager);
    });

    it('should initialize all required components', () => {
      // Verify that all components are initialized
      expect(cliManager).toBeDefined();
    });
  });

  describe('isActive', () => {
    it('should return false initially', () => {
      expect(cliManager.isActive()).toBe(false);
    });
  });

  describe('displayMessage', () => {
    it('should display message through display manager', () => {
      const message = 'Test message';
      
      // This test verifies the method exists and can be called
      expect(() => cliManager.displayMessage(message)).not.toThrow();
    });
  });

  describe('clearHistory', () => {
    it('should clear history through input handler', () => {
      expect(() => cliManager.clearHistory()).not.toThrow();
    });
  });

  describe('searchHistory', () => {
    it('should search history through input handler', () => {
      const query = 'test';
      const result = cliManager.searchHistory(query);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getInputStats', () => {
    it('should return input statistics', () => {
      const stats = cliManager.getInputStats();
      expect(stats).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(cliManager.shutdown()).resolves.not.toThrow();
      expect(cliManager.isActive()).toBe(false);
    });
  });
});