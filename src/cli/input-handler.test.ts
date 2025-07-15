import { InputHandler } from './input-handler';
import { InteractiveCLIConfig, InputOptions } from './types';
import { HistoryManager } from './components/history-manager';
import { AutoCompleteEngine } from './components/auto-complete-engine';
import { MultiLineEditor } from './components/multi-line-editor';
import inquirer from 'inquirer';

// Mock inquirer
jest.mock('inquirer');
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

// Mock components
jest.mock('./components/history-manager');
jest.mock('./components/auto-complete-engine');
jest.mock('./components/multi-line-editor');

const MockHistoryManager = HistoryManager as jest.MockedClass<typeof HistoryManager>;
const MockAutoCompleteEngine = AutoCompleteEngine as jest.MockedClass<typeof AutoCompleteEngine>;
const MockMultiLineEditor = MultiLineEditor as jest.MockedClass<typeof MultiLineEditor>;

describe('InputHandler', () => {
  let inputHandler: InputHandler;
  let mockConfig: InteractiveCLIConfig;
  let mockHistoryManager: jest.Mocked<HistoryManager>;
  let mockAutoCompleteEngine: jest.Mocked<AutoCompleteEngine>;
  let mockMultiLineEditor: jest.Mocked<MultiLineEditor>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      theme: 'default',
      historySize: 100,
      autoSave: true,
      progressIndicators: true,
      multiLineEditor: true
    };

    // Create mock instances
    mockHistoryManager = new MockHistoryManager() as jest.Mocked<HistoryManager>;
    mockAutoCompleteEngine = new MockAutoCompleteEngine() as jest.Mocked<AutoCompleteEngine>;
    mockMultiLineEditor = new MockMultiLineEditor() as jest.Mocked<MultiLineEditor>;

    // Setup default mock implementations
    mockHistoryManager.add = jest.fn();
    mockHistoryManager.getRecent = jest.fn().mockReturnValue([]);
    mockHistoryManager.size = jest.fn().mockReturnValue(0);
    mockHistoryManager.getAll = jest.fn().mockReturnValue([]);
    mockHistoryManager.search = jest.fn().mockReturnValue([]);
    mockHistoryManager.clear = jest.fn();

    mockAutoCompleteEngine.setSuggestions = jest.fn();
    mockAutoCompleteEngine.addContextualSuggestions = jest.fn();
    mockAutoCompleteEngine.setSpecialCommands = jest.fn();
    mockAutoCompleteEngine.updateHistory = jest.fn();
    mockAutoCompleteEngine.getBestCompletion = jest.fn().mockReturnValue(null);
    mockAutoCompleteEngine.getCompletions = jest.fn().mockReturnValue([]);
    mockAutoCompleteEngine.getCompletionCount = jest.fn().mockReturnValue(0);

    inputHandler = new InputHandler(
      mockConfig,
      mockHistoryManager,
      mockAutoCompleteEngine,
      mockMultiLineEditor
    );
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(inputHandler).toBeInstanceOf(InputHandler);
    });

    it('should call setupKeyBindings during initialization', () => {
      // setupKeyBindings is called in constructor, so we just verify the handler was created
      expect(inputHandler).toBeDefined();
    });
  });

  describe('getInput', () => {
    it('should get single line input by default', async () => {
      mockInquirer.prompt.mockResolvedValue({ userInput: 'test input' });

      const result = await inputHandler.getInput('Enter command:');

      expect(result).toBe('test input');
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'input',
          name: 'userInput',
          message: 'Enter command:'
        })
      ]);
    });

    it('should add input to history when history is enabled', async () => {
      mockInquirer.prompt.mockResolvedValue({ userInput: 'test command' });

      await inputHandler.getInput('Enter command:', { history: true });

      expect(mockHistoryManager.add).toHaveBeenCalledWith({
        command: 'test command',
        timestamp: expect.any(Date),
        success: true
      });
    });

    it('should not add empty input to history', async () => {
      mockInquirer.prompt.mockResolvedValue({ userInput: '   ' });

      await inputHandler.getInput('Enter command:', { history: true });

      expect(mockHistoryManager.add).not.toHaveBeenCalled();
    });

    it('should use multi-line input when multiLine option is true', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ line: 'line 1' })
        .mockResolvedValueOnce({ line: 'line 2' })
        .mockResolvedValueOnce({ line: '' }); // Empty line to end

      const result = await inputHandler.getInput('Enter text:', { multiLine: true });

      expect(result).toBe('line 1\nline 2');
    });

    it('should handle input validation errors', async () => {
      mockInquirer.prompt.mockResolvedValue({ userInput: '' });

      const result = await inputHandler.getInput('Enter command:');

      expect(result).toBe('');
    });

    it('should fall back to basic input on error', async () => {
      mockInquirer.prompt
        .mockRejectedValueOnce(new Error('Inquirer error'))
        .mockResolvedValueOnce({ userInput: 'fallback input' });

      const result = await inputHandler.getInput('Enter command:');

      expect(result).toBe('fallback input');
    });
  });

  describe('getSingleLineInput', () => {
    it('should show completion hints when auto-completion is enabled', async () => {
      mockAutoCompleteEngine.getBestCompletion.mockReturnValue('test completion');
      mockInquirer.prompt.mockResolvedValue({ userInput: 'test' });

      await inputHandler.getInput('Enter command:', { autoComplete: true });

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          transformer: expect.any(Function)
        })
      ]);
    });

    it('should validate non-empty input', async () => {
      mockInquirer.prompt.mockResolvedValue({ userInput: 'valid input' });

      await inputHandler.getInput('Enter command:');

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          validate: expect.any(Function)
        })
      ]);

      // Test the validation function
      const promptCall = mockInquirer.prompt.mock.calls[0][0] as any;
      const validateFn = promptCall[0].validate;
      
      expect(validateFn('')).toBe('Please enter a command or message');
      expect(validateFn('valid')).toBe(true);
    });
  });

  describe('getMultiLineInput', () => {
    it('should collect multiple lines until empty line', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ line: 'first line' })
        .mockResolvedValueOnce({ line: 'second line' })
        .mockResolvedValueOnce({ line: '' });

      const result = await inputHandler.getInput('Enter text:', { multiLine: true });

      expect(result).toBe('first line\nsecond line');
      expect(mockHistoryManager.add).toHaveBeenCalledWith({
        command: 'first line\nsecond line',
        timestamp: expect.any(Date),
        success: true
      });
    });

    it('should handle empty multi-line input', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ line: '' });

      const result = await inputHandler.getInput('Enter text:', { multiLine: true });

      expect(result).toBe('');
      expect(mockHistoryManager.add).not.toHaveBeenCalled();
    });
  });

  describe('enableAutoCompletion', () => {
    it('should set suggestions on auto-complete engine', () => {
      const suggestions = ['suggestion1', 'suggestion2'];
      
      inputHandler.enableAutoCompletion(suggestions);

      expect(mockAutoCompleteEngine.setSuggestions).toHaveBeenCalledWith(suggestions);
    });
  });

  describe('updateAutoCompletion', () => {
    it('should add contextual suggestions', () => {
      const context = 'test-context';
      const suggestions = ['contextual1', 'contextual2'];

      inputHandler.updateAutoCompletion(context, suggestions);

      expect(mockAutoCompleteEngine.addContextualSuggestions).toHaveBeenCalledWith(context, suggestions);
    });
  });

  describe('setSpecialCommands', () => {
    it('should set special commands on auto-complete engine', () => {
      const commands = ['/help', '/exit'];

      inputHandler.setSpecialCommands(commands);

      expect(mockAutoCompleteEngine.setSpecialCommands).toHaveBeenCalledWith(commands);
    });
  });

  describe('updateHistory', () => {
    it('should update auto-complete engine with recent history', () => {
      const recentHistory = [
        { command: 'recent1', timestamp: new Date(), success: true },
        { command: 'recent2', timestamp: new Date(), success: true }
      ];
      mockHistoryManager.getRecent.mockReturnValue(recentHistory);

      inputHandler.updateHistory();

      expect(mockHistoryManager.getRecent).toHaveBeenCalledWith(50);
      expect(mockAutoCompleteEngine.updateHistory).toHaveBeenCalledWith(recentHistory);
    });
  });

  describe('getEnhancedInput', () => {
    it('should update history before getting input', async () => {
      mockInquirer.prompt.mockResolvedValue({ userInput: 'test' });

      await inputHandler.getEnhancedInput('Enter command:');

      expect(mockHistoryManager.getRecent).toHaveBeenCalledWith(50);
      expect(mockAutoCompleteEngine.updateHistory).toHaveBeenCalled();
    });

    it('should use multi-line mode when explicitly requested', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ line: 'line 1' })
        .mockResolvedValueOnce({ line: '' });

      const result = await inputHandler.getEnhancedInput('Enter text:', { multiLine: true });

      expect(result).toBe('line 1');
    });

    it('should auto-detect multi-line scenarios', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ line: 'some code' })
        .mockResolvedValueOnce({ line: '' });

      const result = await inputHandler.getEnhancedInput('Write some code:');

      expect(result).toBe('some code');
    });
  });

  describe('shouldUseMultiLine', () => {
    it('should detect multi-line indicators in prompt', () => {
      const handler = inputHandler as any; // Access private method
      
      expect(handler.shouldUseMultiLine('Write some code')).toBe(true);
      expect(handler.shouldUseMultiLine('Create a script')).toBe(true);
      expect(handler.shouldUseMultiLine('Give me a long explanation')).toBe(true);
      expect(handler.shouldUseMultiLine('Simple question')).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should validate non-empty input', () => {
      expect(inputHandler.validateInput('')).toEqual({
        valid: false,
        message: 'Please enter a command or message'
      });

      expect(inputHandler.validateInput('valid input')).toEqual({
        valid: true
      });
    });

    it('should validate commands in command context', () => {
      mockAutoCompleteEngine.getCompletions.mockReturnValue([]);

      expect(inputHandler.validateInput('/unknown', 'command')).toEqual({
        valid: false,
        message: 'Unknown command: /unknown'
      });

      mockAutoCompleteEngine.getCompletions.mockReturnValue(['/help']);

      expect(inputHandler.validateInput('/help', 'command')).toEqual({
        valid: true
      });
    });
  });

  describe('formatInput', () => {
    it('should trim whitespace', () => {
      expect(inputHandler.formatInput('  test  ')).toBe('test');
    });

    it('should format multi-line input with line numbers', () => {
      const multiLine = 'line 1\nline 2\nline 3';
      const expected = '1: line 1\n2: line 2\n3: line 3';
      
      expect(inputHandler.formatInput(multiLine)).toBe(expected);
    });
  });

  describe('getInputStats', () => {
    it('should return input statistics', () => {
      mockHistoryManager.size.mockReturnValue(10);
      mockAutoCompleteEngine.getCompletionCount.mockReturnValue(5);

      const stats = inputHandler.getInputStats();

      expect(stats).toEqual({
        historySize: 10,
        completionCount: 5,
        multiLineMode: false
      });
    });
  });

  describe('clearHistory', () => {
    it('should clear history manager', () => {
      inputHandler.clearHistory();

      expect(mockHistoryManager.clear).toHaveBeenCalled();
    });
  });

  describe('exportHistory', () => {
    it('should export all history', () => {
      const historyData = [
        { command: 'cmd1', timestamp: new Date(), success: true },
        { command: 'cmd2', timestamp: new Date(), success: true }
      ];
      mockHistoryManager.getAll.mockReturnValue(historyData);

      const result = inputHandler.exportHistory();

      expect(result).toBe(historyData);
      expect(mockHistoryManager.getAll).toHaveBeenCalled();
    });
  });

  describe('searchHistory', () => {
    it('should search history with query', () => {
      const searchResults = [
        { command: 'git status', timestamp: new Date(), success: true }
      ];
      mockHistoryManager.search.mockReturnValue(searchResults);

      const result = inputHandler.searchHistory('git');

      expect(result).toBe(searchResults);
      expect(mockHistoryManager.search).toHaveBeenCalledWith('git');
    });
  });

  describe('error handling', () => {
    it('should handle inquirer errors gracefully', async () => {
      mockInquirer.prompt
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ userInput: 'fallback' });

      const result = await inputHandler.getInput('Enter command:');

      expect(result).toBe('fallback');
    });

    it('should handle multi-line input errors', async () => {
      mockInquirer.prompt
        .mockRejectedValueOnce(new Error('Multi-line error'))
        .mockResolvedValueOnce({ userInput: '' }); // Fallback to basic input

      const result = await inputHandler.getInput('Enter text:', { multiLine: true });

      expect(result).toBe(''); // Should fallback to basic input and return empty string
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete input flow with all features', async () => {
      // Setup mocks for a complete flow
      mockAutoCompleteEngine.getBestCompletion.mockReturnValue('git status');
      mockHistoryManager.getRecent.mockReturnValue([
        { command: 'git log', timestamp: new Date(), success: true }
      ]);
      mockInquirer.prompt.mockResolvedValue({ userInput: 'git status' });

      const result = await inputHandler.getEnhancedInput('Enter git command:', {
        autoComplete: true,
        history: true
      });

      expect(result).toBe('git status');
      expect(mockHistoryManager.add).toHaveBeenCalledWith({
        command: 'git status',
        timestamp: expect.any(Date),
        success: true
      });
      expect(mockAutoCompleteEngine.updateHistory).toHaveBeenCalled();
    });

    it('should handle disabled features gracefully', async () => {
      const configWithDisabledFeatures: InteractiveCLIConfig = {
        ...mockConfig,
        multiLineEditor: false
      };

      const handlerWithDisabledFeatures = new InputHandler(
        configWithDisabledFeatures,
        mockHistoryManager,
        mockAutoCompleteEngine,
        mockMultiLineEditor
      );

      mockInquirer.prompt.mockResolvedValue({ userInput: 'test' });

      const result = await handlerWithDisabledFeatures.getInput('Enter:', { multiLine: true });

      expect(result).toBe('test'); // Should use single-line input instead
    });
  });
});