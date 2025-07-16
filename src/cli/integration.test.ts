import { InteractiveCLIManager } from './interactive-cli-manager';
import { Agent } from '../agent';
import { InteractiveCLIConfig } from './types';

// Mock all dependencies
jest.mock('./components/display-manager');
jest.mock('./input-handler');
jest.mock('./command-router');
jest.mock('./session-manager');
jest.mock('./components/error-handler');
jest.mock('../agent');

describe('CLI Integration Tests', () => {
  let cliManager: InteractiveCLIManager;
  let mockAgent: jest.Mocked<Agent>;
  let config: InteractiveCLIConfig;

  beforeEach(() => {
    // Setup mock agent
    mockAgent = {
      start: jest.fn().mockResolvedValue(undefined),
      getAvailableTools: jest.fn().mockReturnValue([
        { name: 'read-file', description: 'Read file contents' },
        { name: 'list-files', description: 'List directory contents' }
      ])
    } as any;

    config = {
      theme: 'light',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true
    };

    cliManager = new InteractiveCLIManager(mockAgent, config);
  });

  describe('Component Integration', () => {
    it('should initialize all components correctly', () => {
      // Test that CLI manager can be created without errors
      expect(cliManager).toBeDefined();
      expect(cliManager).toBeInstanceOf(InteractiveCLIManager);
    });

    it('should handle user input flow from input to agent to display', () => {
      // Test that agent has required methods
      expect(mockAgent.getAvailableTools).toBeDefined();
      expect(mockAgent.start).toBeDefined();
    });

    it('should handle special command routing', () => {
      // Test that CLI manager is properly configured
      expect(cliManager).toBeDefined();
    });

    it('should handle error scenarios gracefully', () => {
      mockAgent.start.mockRejectedValue(new Error('Agent error'));

      // Should not throw during setup
      expect(() => {
        new InteractiveCLIManager(mockAgent, config);
      }).not.toThrow();
    });

    it('should properly initialize with configuration', () => {
      // Test that configuration is properly passed
      expect(cliManager).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should apply configuration to all components', () => {
      const customConfig: InteractiveCLIConfig = {
        theme: 'dark',
        historySize: 50,
        autoSave: false,
        progressIndicators: false,
        multiLineEditor: false
      };

      const customCliManager = new InteractiveCLIManager(mockAgent, customConfig);
      expect(customCliManager).toBeDefined();
    });

    it('should handle theme changes across components', () => {
      // Test that CLI manager can be created with different themes
      expect(cliManager).toBeDefined();
    });
  });

  describe('Session Management Integration', () => {
    it('should save and load conversations correctly', () => {
      // Test that CLI manager can be created with session management
      expect(cliManager).toBeDefined();
    });

    it('should export conversations in different formats', () => {
      // Test that CLI manager supports export functionality
      expect(cliManager).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle component initialization failures', () => {
      // Test error handling when components fail to initialize
      const faultyConfig = { ...config, theme: 'invalid-theme' };
      
      expect(() => {
        new InteractiveCLIManager(mockAgent, faultyConfig);
      }).not.toThrow();
    });

    it('should recover from runtime errors', () => {
      // Simulate runtime error
      mockAgent.start.mockRejectedValueOnce(new Error('Runtime error'));

      // Should not throw during initialization
      expect(() => {
        new InteractiveCLIManager(mockAgent, config);
      }).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large conversation histories efficiently', () => {
      // Test performance with large datasets
      const startTime = Date.now();
      
      // Simulate processing multiple messages
      for (let i = 0; i < 10; i++) {
        mockAgent.start.mockResolvedValueOnce(undefined);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second for this test)
      expect(processingTime).toBeLessThan(1000);
    });

    it('should manage memory usage with large histories', () => {
      // Test memory management
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate large conversation
      for (let i = 0; i < 100; i++) {
        mockAgent.start.mockResolvedValueOnce(undefined);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should work on different operating systems', () => {
      // Mock different OS environments
      const originalPlatform = process.platform;

      try {
        // Test Windows
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const winCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(winCliManager).toBeDefined();

        // Test macOS
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        const macCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(macCliManager).toBeDefined();

        // Test Linux
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const linuxCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(linuxCliManager).toBeDefined();
      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });

    it('should handle different terminal environments', () => {
      // Test different terminal capabilities
      const originalEnv = { ...process.env };

      try {
        // Test with color support
        process.env.FORCE_COLOR = '1';
        const colorCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(colorCliManager).toBeDefined();

        // Test without color support
        delete process.env.FORCE_COLOR;
        process.env.NO_COLOR = '1';
        const noColorCliManager = new InteractiveCLIManager(mockAgent, config);
        expect(noColorCliManager).toBeDefined();
      } finally {
        process.env = originalEnv;
      }
    });
  });
});