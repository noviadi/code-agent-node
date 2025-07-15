import { HistoryManager } from './history-manager';
import { HistoryEntry } from '../types';
import * as storage from 'node-persist';
import * as path from 'path';
import * as os from 'os';

// Mock node-persist
jest.mock('node-persist', () => ({
  init: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let mockStorageData: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageData = {};
    
    // Mock storage methods
    mockStorage.init.mockResolvedValue({} as any);
    mockStorage.setItem.mockImplementation((key: string, value: any) => {
      mockStorageData[key] = value;
      return Promise.resolve({ key, value } as any);
    });
    mockStorage.getItem.mockImplementation((key: string) => {
      return Promise.resolve(mockStorageData[key]);
    });

    historyManager = new HistoryManager(5); // Small size for testing
  });

  describe('constructor', () => {
    it('should initialize with default max history size', () => {
      const manager = new HistoryManager();
      expect(manager.size()).toBe(0);
    });

    it('should initialize with custom max history size', () => {
      const manager = new HistoryManager(100);
      expect(manager.size()).toBe(0);
    });
  });

  describe('add', () => {
    it('should add a command to history', () => {
      const entry: HistoryEntry = {
        command: 'test command',
        timestamp: new Date(),
        success: true
      };

      historyManager.add(entry);
      expect(historyManager.size()).toBe(1);
    });

    it('should not add empty commands', () => {
      const entry: HistoryEntry = {
        command: '',
        timestamp: new Date(),
        success: true
      };

      historyManager.add(entry);
      expect(historyManager.size()).toBe(0);
    });

    it('should not add whitespace-only commands', () => {
      const entry: HistoryEntry = {
        command: '   ',
        timestamp: new Date(),
        success: true
      };

      historyManager.add(entry);
      expect(historyManager.size()).toBe(0);
    });

    it('should not add duplicate consecutive commands', () => {
      const entry1: HistoryEntry = {
        command: 'test command',
        timestamp: new Date(),
        success: true
      };
      const entry2: HistoryEntry = {
        command: 'test command',
        timestamp: new Date(),
        success: false
      };

      historyManager.add(entry1);
      historyManager.add(entry2);
      expect(historyManager.size()).toBe(1);
    });

    it('should allow same command if not consecutive', () => {
      const entry1: HistoryEntry = {
        command: 'test command',
        timestamp: new Date(),
        success: true
      };
      const entry2: HistoryEntry = {
        command: 'different command',
        timestamp: new Date(),
        success: true
      };
      const entry3: HistoryEntry = {
        command: 'test command',
        timestamp: new Date(),
        success: true
      };

      historyManager.add(entry1);
      historyManager.add(entry2);
      historyManager.add(entry3);
      expect(historyManager.size()).toBe(3);
    });

    it('should trim history when exceeding max size', () => {
      // Add 6 entries to a manager with max size 5
      for (let i = 0; i < 6; i++) {
        historyManager.add({
          command: `command ${i}`,
          timestamp: new Date(),
          success: true
        });
      }

      expect(historyManager.size()).toBe(5);
      const recent = historyManager.getRecent(5);
      expect(recent[0].command).toBe('command 5'); // Most recent
      expect(recent[4].command).toBe('command 1'); // Oldest remaining
    });

    it('should reset navigation index when adding new entry', () => {
      historyManager.add({
        command: 'command 1',
        timestamp: new Date(),
        success: true
      });
      
      // Navigate to previous
      historyManager.getPrevious();
      
      // Add new entry
      historyManager.add({
        command: 'command 2',
        timestamp: new Date(),
        success: true
      });
      
      // Should start from most recent again
      const previous = historyManager.getPrevious();
      expect(previous).toBe('command 2');
    });
  });

  describe('getPrevious', () => {
    beforeEach(() => {
      // Add test data
      historyManager.add({
        command: 'command 1',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'command 2',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'command 3',
        timestamp: new Date(),
        success: true
      });
    });

    it('should return null for empty history', () => {
      const emptyManager = new HistoryManager();
      expect(emptyManager.getPrevious()).toBeNull();
    });

    it('should return most recent command on first call', () => {
      const previous = historyManager.getPrevious();
      expect(previous).toBe('command 3');
    });

    it('should navigate backwards through history', () => {
      expect(historyManager.getPrevious()).toBe('command 3');
      expect(historyManager.getPrevious()).toBe('command 2');
      expect(historyManager.getPrevious()).toBe('command 1');
    });

    it('should stay at oldest command when at beginning', () => {
      historyManager.getPrevious(); // command 3
      historyManager.getPrevious(); // command 2
      historyManager.getPrevious(); // command 1
      expect(historyManager.getPrevious()).toBe('command 1');
    });
  });

  describe('getNext', () => {
    beforeEach(() => {
      // Add test data
      historyManager.add({
        command: 'command 1',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'command 2',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'command 3',
        timestamp: new Date(),
        success: true
      });
    });

    it('should return null for empty history', () => {
      const emptyManager = new HistoryManager();
      expect(emptyManager.getNext()).toBeNull();
    });

    it('should return null when not navigating', () => {
      expect(historyManager.getNext()).toBeNull();
    });

    it('should navigate forwards through history', () => {
      // Go back first
      historyManager.getPrevious(); // command 3
      historyManager.getPrevious(); // command 2
      historyManager.getPrevious(); // command 1
      
      // Now go forward
      expect(historyManager.getNext()).toBe('command 2');
      expect(historyManager.getNext()).toBe('command 3');
    });

    it('should return empty string when reaching end', () => {
      // Navigate to start
      historyManager.getPrevious(); // command 3
      historyManager.getPrevious(); // command 2
      
      // Navigate forward to end
      historyManager.getNext(); // command 3
      expect(historyManager.getNext()).toBe('');
    });
  });

  describe('resetNavigation', () => {
    it('should reset navigation index', () => {
      historyManager.add({
        command: 'test command',
        timestamp: new Date(),
        success: true
      });
      
      historyManager.getPrevious();
      historyManager.resetNavigation();
      
      // Should start from most recent again
      const previous = historyManager.getPrevious();
      expect(previous).toBe('test command');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      historyManager.add({
        command: 'git status',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'npm install',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'git commit -m "test"',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'npm test',
        timestamp: new Date(),
        success: true
      });
    });

    it('should return empty array for empty query', () => {
      expect(historyManager.search('')).toEqual([]);
      expect(historyManager.search('   ')).toEqual([]);
    });

    it('should find matching commands', () => {
      const results = historyManager.search('git');
      expect(results).toHaveLength(2);
      expect(results[0].command).toBe('git commit -m "test"'); // Most recent first
      expect(results[1].command).toBe('git status');
    });

    it('should be case insensitive', () => {
      const results = historyManager.search('GIT');
      expect(results).toHaveLength(2);
    });

    it('should find partial matches', () => {
      const results = historyManager.search('npm');
      expect(results).toHaveLength(2);
      expect(results[0].command).toBe('npm test');
      expect(results[1].command).toBe('npm install');
    });

    it('should return results in reverse chronological order', () => {
      const results = historyManager.search('npm');
      expect(results[0].command).toBe('npm test'); // More recent
      expect(results[1].command).toBe('npm install'); // Older
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty history', () => {
      expect(historyManager.getAll()).toEqual([]);
    });

    it('should return all entries in reverse chronological order', () => {
      historyManager.add({
        command: 'command 1',
        timestamp: new Date(),
        success: true
      });
      historyManager.add({
        command: 'command 2',
        timestamp: new Date(),
        success: true
      });

      const all = historyManager.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].command).toBe('command 2'); // Most recent first
      expect(all[1].command).toBe('command 1');
    });
  });

  describe('getRecent', () => {
    beforeEach(() => {
      for (let i = 1; i <= 10; i++) {
        historyManager.add({
          command: `command ${i}`,
          timestamp: new Date(),
          success: true
        });
      }
    });

    it('should return recent entries with default count', () => {
      const recent = historyManager.getRecent();
      expect(recent).toHaveLength(5); // Limited by max history size
      expect(recent[0].command).toBe('command 10'); // Most recent first
    });

    it('should return specified number of recent entries', () => {
      const recent = historyManager.getRecent(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].command).toBe('command 10');
      expect(recent[2].command).toBe('command 8');
    });

    it('should not exceed available history size', () => {
      const recent = historyManager.getRecent(20);
      expect(recent).toHaveLength(5); // Limited by actual history size
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      historyManager.add({
        command: 'test command',
        timestamp: new Date(),
        success: true
      });

      expect(historyManager.size()).toBe(1);
      historyManager.clear();
      expect(historyManager.size()).toBe(0);
    });

    it('should reset navigation index', () => {
      historyManager.add({
        command: 'test command',
        timestamp: new Date(),
        success: true
      });
      
      historyManager.getPrevious();
      historyManager.clear();
      
      expect(historyManager.getPrevious()).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should initialize storage with correct configuration', async () => {
      await historyManager.load();
      
      expect(mockStorage.init).toHaveBeenCalledWith({
        dir: path.join(os.homedir(), '.code-agent-cli', 'history'),
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8',
        logging: false,
        ttl: false,
        expiredInterval: 2 * 60 * 1000,
        forgiveParseErrors: true
      });
    });

    it('should persist history to storage', async () => {
      const entry: HistoryEntry = {
        command: 'test command',
        timestamp: new Date(),
        success: true
      };

      historyManager.add(entry);
      await historyManager.persist();

      expect(mockStorage.setItem).toHaveBeenCalledWith('command_history', [entry]);
    });

    it('should load history from storage', async () => {
      const savedHistory = [
        {
          command: 'saved command 1',
          timestamp: new Date().toISOString(),
          success: true
        },
        {
          command: 'saved command 2',
          timestamp: new Date().toISOString(),
          success: false
        }
      ];

      mockStorageData['command_history'] = savedHistory;
      await historyManager.load();

      expect(historyManager.size()).toBe(2);
      const recent = historyManager.getRecent(2);
      expect(recent[0].command).toBe('saved command 2');
      expect(recent[1].command).toBe('saved command 1');
    });

    it('should handle invalid saved data gracefully', async () => {
      mockStorageData['command_history'] = [
        { command: 'valid command', timestamp: new Date().toISOString(), success: true },
        { command: '', timestamp: 'invalid date', success: true }, // Invalid
        { timestamp: new Date().toISOString(), success: true }, // Missing command
        'invalid entry' // Not an object
      ];

      await historyManager.load();

      expect(historyManager.size()).toBe(1);
      const recent = historyManager.getRecent(1);
      expect(recent[0].command).toBe('valid command');
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      await historyManager.load();
      expect(historyManager.size()).toBe(0);
    });

    it('should trim loaded history if it exceeds max size', async () => {
      const savedHistory = [];
      for (let i = 1; i <= 10; i++) {
        savedHistory.push({
          command: `command ${i}`,
          timestamp: new Date().toISOString(),
          success: true
        });
      }

      mockStorageData['command_history'] = savedHistory;
      await historyManager.load(); // Manager has max size of 5

      expect(historyManager.size()).toBe(5);
      const recent = historyManager.getRecent(5);
      expect(recent[0].command).toBe('command 10'); // Most recent kept
      expect(recent[4].command).toBe('command 6'); // Oldest kept
    });
  });
});