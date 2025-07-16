import { CommandRouter } from './command-router';
import { Agent } from '../agent';
import { DisplayManager } from './components/display-manager';
import { SessionManager } from './session-manager';
import { HistoryManager } from './components/history-manager';
import { MessageType, SpecialCommand } from './types';
import { createMockDisplayManager } from '../__mocks__/display-manager-mock';
import { createMockSessionManager } from '../__mocks__/session-manager-mock';

// Mock all dependencies
jest.mock('../agent');
jest.mock('./components/display-manager');
jest.mock('./session-manager');
jest.mock('./components/history-manager');

describe('CommandRouter', () => {
  let commandRouter: CommandRouter;
  let mockAgent: jest.Mocked<Agent>;
  let mockDisplayManager: jest.Mocked<DisplayManager>;
  let mockSessionManager: jest.Mocked<SessionManager>;
  let mockHistoryManager: jest.Mocked<HistoryManager>;

  beforeEach(() => {
    mockAgent = {
      getAvailableTools: jest.fn().mockReturnValue([]),
      processMessage: jest.fn(),
      getConversationHistory: jest.fn()
    } as any;
    
    mockDisplayManager = createMockDisplayManager();
    mockSessionManager = createMockSessionManager();
    
    mockHistoryManager = {
      add: jest.fn(),
      getPrevious: jest.fn(),
      getNext: jest.fn(),
      search: jest.fn(),
      persist: jest.fn(),
      load: jest.fn(),
      getRecent: jest.fn().mockReturnValue([])
    } as any;

    commandRouter = new CommandRouter(
      mockAgent,
      mockDisplayManager,
      mockSessionManager,
      mockHistoryManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default commands', () => {
      const commands = commandRouter.getAvailableCommands();
      
      expect(commands).toHaveLength(6);
      expect(commands.map(c => c.name)).toEqual(
        expect.arrayContaining(['help', 'clear', 'exit', 'history', 'tools', 'config'])
      );
    });
  });

  describe('registerCommand', () => {
    it('should register a new command', () => {
      const testCommand: SpecialCommand = {
        name: 'test',
        description: 'Test command',
        handler: jest.fn(),
        autoComplete: jest.fn()
      };

      commandRouter.registerCommand(testCommand);

      const commands = commandRouter.getAvailableCommands();
      expect(commands.find(c => c.name === 'test')).toBeDefined();
    });

    it('should overwrite existing command with same name', () => {
      const originalCommand: SpecialCommand = {
        name: 'test',
        description: 'Original command',
        handler: jest.fn(),
        autoComplete: jest.fn()
      };

      const newCommand: SpecialCommand = {
        name: 'test',
        description: 'New command',
        handler: jest.fn(),
        autoComplete: jest.fn()
      };

      commandRouter.registerCommand(originalCommand);
      commandRouter.registerCommand(newCommand);

      const commands = commandRouter.getAvailableCommands();
      const testCommand = commands.find(c => c.name === 'test');
      expect(testCommand?.description).toBe('New command');
    });
  });

  describe('routeInput', () => {
    it('should return false for non-command input', async () => {
      const result = await commandRouter.routeInput('regular chat message');
      expect(result).toBe(false);
    });

    it('should return false for input not starting with /', async () => {
      const result = await commandRouter.routeInput('help me with something');
      expect(result).toBe(false);
    });

    it('should execute help command', async () => {
      const result = await commandRouter.routeInput('/help');
      expect(result).toBe(true);
      // Help command should have been executed (we can't easily test the exact call due to mocking)
    });

    it('should handle command with arguments', async () => {
      const result = await commandRouter.routeInput('/history 5');
      expect(result).toBe(true);
    });

    it('should handle unknown command', async () => {
      const result = await commandRouter.routeInput('/unknown');
      
      expect(result).toBe(true);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        "Unknown command: unknown. Type '/help' for available commands.",
        MessageType.ERROR
      );
    });

    it('should handle command execution errors', async () => {
      const errorCommand: SpecialCommand = {
        name: 'error',
        description: 'Error command',
        handler: jest.fn().mockRejectedValue(new Error('Test error')),
        autoComplete: jest.fn()
      };

      commandRouter.registerCommand(errorCommand);

      const result = await commandRouter.routeInput('/error');
      
      expect(result).toBe(true);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        "Error executing command 'error': Test error",
        MessageType.ERROR
      );
    });

    it('should handle non-Error exceptions', async () => {
      const errorCommand: SpecialCommand = {
        name: 'error',
        description: 'Error command',
        handler: jest.fn().mockRejectedValue('String error'),
        autoComplete: jest.fn()
      };

      commandRouter.registerCommand(errorCommand);

      const result = await commandRouter.routeInput('/error');
      
      expect(result).toBe(true);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        "Error executing command 'error': String error",
        MessageType.ERROR
      );
    });

    it('should be case insensitive for command names', async () => {
      const result = await commandRouter.routeInput('/HELP');
      expect(result).toBe(true);
    });

    it('should handle extra whitespace', async () => {
      const result = await commandRouter.routeInput('  /help  ');
      expect(result).toBe(true);
    });
  });

  describe('getAvailableCommands', () => {
    it('should return commands sorted alphabetically', () => {
      const commands = commandRouter.getAvailableCommands();
      const names = commands.map(c => c.name);
      const sortedNames = [...names].sort();
      
      expect(names).toEqual(sortedNames);
    });
  });

  describe('getAutoCompleteSuggestions', () => {
    it('should return empty array for non-command input', () => {
      const suggestions = commandRouter.getAutoCompleteSuggestions('regular input');
      expect(suggestions).toEqual([]);
    });

    it('should return command suggestions for partial command', () => {
      const suggestions = commandRouter.getAutoCompleteSuggestions('/h');
      expect(suggestions).toContain('/help');
      expect(suggestions).toContain('/history');
    });

    it('should return exact match for complete command', () => {
      const suggestions = commandRouter.getAutoCompleteSuggestions('/help');
      expect(suggestions).toContain('/help');
    });

    it('should return argument suggestions for commands with autoComplete', () => {
      const suggestions = commandRouter.getAutoCompleteSuggestions('/history ');
      // History command should provide number suggestions
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should filter argument suggestions based on partial input', () => {
      const suggestions = commandRouter.getAutoCompleteSuggestions('/config d');
      expect(suggestions).toContain('/config display');
    });

    it('should handle empty command prefix', () => {
      const suggestions = commandRouter.getAutoCompleteSuggestions('/');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.startsWith('/'))).toBe(true);
    });
  });

  describe('isSpecialCommand', () => {
    it('should return true for command input', () => {
      expect(commandRouter.isSpecialCommand('/help')).toBe(true);
      expect(commandRouter.isSpecialCommand('  /help  ')).toBe(true);
    });

    it('should return false for non-command input', () => {
      expect(commandRouter.isSpecialCommand('help')).toBe(false);
      expect(commandRouter.isSpecialCommand('regular message')).toBe(false);
      expect(commandRouter.isSpecialCommand('')).toBe(false);
    });
  });

  describe('getCommand', () => {
    it('should return command by name', () => {
      const command = commandRouter.getCommand('help');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    it('should be case insensitive', () => {
      const command = commandRouter.getCommand('HELP');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    it('should return undefined for unknown command', () => {
      const command = commandRouter.getCommand('unknown');
      expect(command).toBeUndefined();
    });
  });
});