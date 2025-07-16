import { ProgressManager } from './progress-manager';

// Mock ora module with dynamic import
const mockOra = jest.fn();
jest.mock('ora', () => ({
  __esModule: true,
  default: mockOra
}));

describe('ProgressManager', () => {
  let progressManager: ProgressManager;
  let mockSpinner: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock spinner
    mockSpinner = {
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
      isSpinning: false,
      text: ''
    };

    // Mock ora to return our mock spinner
    mockOra.mockReturnValue(mockSpinner);
    
    progressManager = new ProgressManager(true);
  });

  describe('constructor', () => {
    it('should create ProgressManager with enabled state', () => {
      const manager = new ProgressManager(true);
      expect(manager.getActiveCount()).toBe(0);
    });

    it('should create ProgressManager with disabled state', () => {
      const manager = new ProgressManager(false);
      expect(manager.getActiveCount()).toBe(0);
    });

    it('should default to enabled when no parameter provided', () => {
      const manager = new ProgressManager();
      expect(manager.getActiveCount()).toBe(0);
    });
  });

  describe('createIndicator', () => {
    it('should create a new progress indicator', async () => {
      const indicator = await progressManager.createIndicator('test-id', 'Test message');
      
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Test message',
        spinner: 'dots',
        color: 'cyan'
      });
      expect(indicator).toBeDefined();
      expect(progressManager.getActiveCount()).toBe(1);
    });

    it('should replace existing indicator with same id', async () => {
      const indicator1 = await progressManager.createIndicator('test-id', 'Message 1');
      const indicator2 = await progressManager.createIndicator('test-id', 'Message 2');
      
      expect(progressManager.getActiveCount()).toBe(1);
      expect(mockOra).toHaveBeenCalledTimes(2);
    });

    it('should create multiple indicators with different ids', async () => {
      await progressManager.createIndicator('id1', 'Message 1');
      await progressManager.createIndicator('id2', 'Message 2');
      
      expect(progressManager.getActiveCount()).toBe(2);
    });
  });

  describe('indicator methods', () => {
    let indicator: any;

    beforeEach(async () => {
      indicator = await progressManager.createIndicator('test-id', 'Test message');
    });

    it('should start spinner when enabled', () => {
      mockSpinner.isSpinning = true;
      indicator.start('Starting...');
      
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.text).toBe('Starting...');
    });

    it('should update spinner text when spinning', () => {
      mockSpinner.isSpinning = true;
      indicator.update('Updating...');
      
      expect(mockSpinner.text).toBe('Updating...');
    });

    it('should not update spinner text when not spinning', () => {
      mockSpinner.isSpinning = false;
      const originalText = mockSpinner.text;
      indicator.update('Updating...');
      
      expect(mockSpinner.text).toBe(originalText);
    });

    it('should succeed and remove indicator', () => {
      mockSpinner.isSpinning = true;
      indicator.succeed('Success!');
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Success!');
      expect(progressManager.getActiveCount()).toBe(0);
    });

    it('should fail and remove indicator', () => {
      mockSpinner.isSpinning = true;
      indicator.fail('Failed!');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed!');
      expect(progressManager.getActiveCount()).toBe(0);
    });

    it('should stop and remove indicator', () => {
      mockSpinner.isSpinning = true;
      indicator.stop();
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(progressManager.getActiveCount()).toBe(0);
    });
  });

  describe('disabled state', () => {
    beforeEach(() => {
      progressManager = new ProgressManager(false);
    });

    it('should not start spinner when disabled', async () => {
      const indicator = await progressManager.createIndicator('test-id', 'Test message');
      indicator.start('Starting...');
      
      expect(mockSpinner.start).not.toHaveBeenCalled();
    });

    it('should not update spinner when disabled', async () => {
      const indicator = await progressManager.createIndicator('test-id', 'Test message');
      const originalText = mockSpinner.text;
      indicator.update('Updating...');
      
      // Text should not be updated when disabled (spinner is not spinning)
      expect(mockSpinner.text).toBe(originalText);
    });
  });

  describe('removeIndicator', () => {
    it('should remove existing indicator', async () => {
      await progressManager.createIndicator('test-id', 'Test message');
      expect(progressManager.getActiveCount()).toBe(1);
      
      progressManager.removeIndicator('test-id');
      expect(progressManager.getActiveCount()).toBe(0);
    });

    it('should stop spinning indicator before removal', async () => {
      await progressManager.createIndicator('test-id', 'Test message');
      mockSpinner.isSpinning = true;
      
      progressManager.removeIndicator('test-id');
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should handle removal of non-existent indicator', () => {
      progressManager.removeIndicator('non-existent');
      expect(progressManager.getActiveCount()).toBe(0);
    });
  });

  describe('stopAll', () => {
    it('should stop all active indicators', async () => {
      const mockSpinner1 = { ...mockSpinner, isSpinning: true };
      const mockSpinner2 = { ...mockSpinner, isSpinning: true };
      
      mockOra.mockReturnValueOnce(mockSpinner1).mockReturnValueOnce(mockSpinner2);
      
      await progressManager.createIndicator('id1', 'Message 1');
      await progressManager.createIndicator('id2', 'Message 2');
      
      progressManager.stopAll();
      
      expect(mockSpinner1.stop).toHaveBeenCalled();
      expect(mockSpinner2.stop).toHaveBeenCalled();
      expect(progressManager.getActiveCount()).toBe(0);
    });

    it('should clear all indicators even if not spinning', async () => {
      await progressManager.createIndicator('id1', 'Message 1');
      await progressManager.createIndicator('id2', 'Message 2');
      
      progressManager.stopAll();
      expect(progressManager.getActiveCount()).toBe(0);
    });
  });

  describe('isActive', () => {
    it('should return true for active spinning indicator', async () => {
      await progressManager.createIndicator('test-id', 'Test message');
      mockSpinner.isSpinning = true;
      
      expect(progressManager.isActive('test-id')).toBe(true);
    });

    it('should return false for inactive indicator', async () => {
      await progressManager.createIndicator('test-id', 'Test message');
      mockSpinner.isSpinning = false;
      
      expect(progressManager.isActive('test-id')).toBe(false);
    });

    it('should return false for non-existent indicator', () => {
      expect(progressManager.isActive('non-existent')).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('should enable progress indicators', async () => {
      progressManager.setEnabled(true);
      const indicator = await progressManager.createIndicator('test-id', 'Test message');
      
      indicator.start('Starting...');
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should disable progress indicators and stop all', async () => {
      await progressManager.createIndicator('test-id', 'Test message');
      mockSpinner.isSpinning = true;
      
      progressManager.setEnabled(false);
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(progressManager.getActiveCount()).toBe(0);
    });
  });

  describe('createClaudeIndicator', () => {
    it('should create Claude-specific indicator with default message', async () => {
      const indicator = await progressManager.createClaudeIndicator();
      
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Processing with Claude...',
        spinner: 'bouncingBall',
        color: 'blue'
      });
      expect(progressManager.getActiveCount()).toBe(1);
    });

    it('should create Claude-specific indicator with custom message', async () => {
      const indicator = await progressManager.createClaudeIndicator('Custom Claude message');
      
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Custom Claude message',
        spinner: 'bouncingBall',
        color: 'blue'
      });
    });

    it('should succeed with default message', async () => {
      const indicator = await progressManager.createClaudeIndicator();
      mockSpinner.isSpinning = true;
      
      indicator.succeed();
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Claude processing complete');
    });

    it('should fail with default message', async () => {
      const indicator = await progressManager.createClaudeIndicator();
      mockSpinner.isSpinning = true;
      
      indicator.fail();
      expect(mockSpinner.fail).toHaveBeenCalledWith('Claude processing failed');
    });
  });

  describe('createToolIndicator', () => {
    it('should create tool-specific indicator with default message', async () => {
      const indicator = await progressManager.createToolIndicator('read-file');
      
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Executing read-file...',
        spinner: 'arrow3',
        color: 'yellow'
      });
      expect(progressManager.getActiveCount()).toBe(1);
    });

    it('should create tool-specific indicator with custom message', async () => {
      const indicator = await progressManager.createToolIndicator('read-file', 'Reading important file');
      
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Reading important file',
        spinner: 'arrow3',
        color: 'yellow'
      });
    });

    it('should succeed with default message', async () => {
      const indicator = await progressManager.createToolIndicator('read-file');
      mockSpinner.isSpinning = true;
      
      indicator.succeed();
      expect(mockSpinner.succeed).toHaveBeenCalledWith('read-file completed successfully');
    });

    it('should fail with default message', async () => {
      const indicator = await progressManager.createToolIndicator('read-file');
      mockSpinner.isSpinning = true;
      
      indicator.fail();
      expect(mockSpinner.fail).toHaveBeenCalledWith('read-file failed');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid indicator creations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(progressManager.createIndicator(`id-${i}`, `Message ${i}`));
      }
      await Promise.all(promises);
      
      expect(progressManager.getActiveCount()).toBe(10);
      expect(mockOra).toHaveBeenCalledTimes(10);
    });

    it('should handle indicator operations when disabled', async () => {
      progressManager.setEnabled(false);
      const indicator = await progressManager.createIndicator('test-id', 'Test message');
      
      indicator.start('Starting...');
      indicator.update('Updating...');
      indicator.succeed('Success!');
      
      expect(mockSpinner.start).not.toHaveBeenCalled();
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
    });

    it('should handle concurrent indicator operations', async () => {
      const indicator1 = await progressManager.createIndicator('id1', 'Message 1');
      const indicator2 = await progressManager.createIndicator('id2', 'Message 2');
      
      mockSpinner.isSpinning = true;
      
      indicator1.start('Starting 1');
      indicator2.start('Starting 2');
      indicator1.succeed('Success 1');
      indicator2.fail('Failed 2');
      
      expect(progressManager.getActiveCount()).toBe(0);
    });
  });
});