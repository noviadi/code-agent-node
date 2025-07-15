import { AutoCompleteEngine } from './auto-complete-engine';
import { HistoryEntry } from '../types';

describe('AutoCompleteEngine', () => {
  let autoCompleteEngine: AutoCompleteEngine;

  beforeEach(() => {
    autoCompleteEngine = new AutoCompleteEngine();
  });

  describe('constructor', () => {
    it('should initialize with default special commands', () => {
      const completions = autoCompleteEngine.getCompletions('/h');
      expect(completions).toContain('/help');
      expect(completions).toContain('/history');
    });
  });

  describe('setSuggestions', () => {
    it('should set static suggestions', () => {
      const suggestions = ['hello world', 'help me', 'how are you'];
      autoCompleteEngine.setSuggestions(suggestions);
      
      const completions = autoCompleteEngine.getCompletions('hel');
      expect(completions).toContain('hello world');
      expect(completions).toContain('help me');
    });

    it('should replace existing suggestions', () => {
      autoCompleteEngine.setSuggestions(['old suggestion']);
      autoCompleteEngine.setSuggestions(['new suggestion']);
      
      const completions = autoCompleteEngine.getCompletions('old');
      expect(completions).not.toContain('old suggestion');
      
      const newCompletions = autoCompleteEngine.getCompletions('new');
      expect(newCompletions).toContain('new suggestion');
    });
  });

  describe('setSpecialCommands', () => {
    it('should set custom special commands', () => {
      const customCommands = ['/custom', '/test', '/demo'];
      autoCompleteEngine.setSpecialCommands(customCommands);
      
      const completions = autoCompleteEngine.getCompletions('/c');
      expect(completions).toContain('/custom');
      expect(completions).not.toContain('/help'); // Default commands should be replaced
    });
  });

  describe('updateHistory', () => {
    it('should update command history for suggestions', () => {
      const history: HistoryEntry[] = [
        { command: 'git status', timestamp: new Date(), success: true },
        { command: 'npm install', timestamp: new Date(), success: true },
        { command: 'git commit', timestamp: new Date(), success: true }
      ];
      
      autoCompleteEngine.updateHistory(history);
      
      const completions = autoCompleteEngine.getCompletions('git');
      expect(completions).toContain('git status');
      expect(completions).toContain('git commit');
    });
  });

  describe('getCompletions', () => {
    beforeEach(() => {
      // Set up test data
      autoCompleteEngine.setSuggestions(['hello world', 'help me', 'how are you']);
      
      const history: HistoryEntry[] = [
        { command: 'git status', timestamp: new Date(), success: true },
        { command: 'npm test', timestamp: new Date(), success: true }
      ];
      autoCompleteEngine.updateHistory(history);
      
      autoCompleteEngine.addContextualSuggestions('test', ['test command', 'testing']);
    });

    it('should return empty array for empty input', () => {
      expect(autoCompleteEngine.getCompletions('')).toEqual([]);
      expect(autoCompleteEngine.getCompletions('   ')).toEqual([]);
    });

    it('should return special command completions for commands starting with /', () => {
      const completions = autoCompleteEngine.getCompletions('/h');
      expect(completions).toContain('/help');
      expect(completions).toContain('/history');
      expect(completions).not.toContain('hello world'); // Should not include regular suggestions
    });

    it('should return static suggestion completions', () => {
      const completions = autoCompleteEngine.getCompletions('hel');
      expect(completions).toContain('hello world');
      expect(completions).toContain('help me');
    });

    it('should return history-based completions', () => {
      const completions = autoCompleteEngine.getCompletions('git');
      expect(completions).toContain('git status');
    });

    it('should return contextual completions', () => {
      const completions = autoCompleteEngine.getCompletions('test');
      expect(completions).toContain('test command');
      expect(completions).toContain('testing');
    });

    it('should combine all types of completions', () => {
      autoCompleteEngine.setSuggestions(['test static']);
      autoCompleteEngine.updateHistory([
        { command: 'test history', timestamp: new Date(), success: true }
      ]);
      autoCompleteEngine.addContextualSuggestions('ctx', ['test contextual']);
      
      const completions = autoCompleteEngine.getCompletions('test');
      expect(completions).toContain('test static');
      expect(completions).toContain('test history');
      expect(completions).toContain('test contextual');
    });

    it('should be case insensitive', () => {
      const completions = autoCompleteEngine.getCompletions('HEL');
      expect(completions).toContain('hello world');
      expect(completions).toContain('help me');
    });

    it('should remove duplicates', () => {
      autoCompleteEngine.setSuggestions(['duplicate']);
      autoCompleteEngine.addContextualSuggestions('ctx', ['duplicate']);
      
      const completions = autoCompleteEngine.getCompletions('dup');
      const duplicateCount = completions.filter(c => c === 'duplicate').length;
      expect(duplicateCount).toBe(1);
    });
  });

  describe('completion sorting', () => {
    beforeEach(() => {
      autoCompleteEngine.setSuggestions([
        'test',
        'testing',
        'test case',
        'another test',
        'best test'
      ]);
    });

    it('should prioritize exact matches', () => {
      const completions = autoCompleteEngine.getCompletions('test');
      expect(completions[0]).toBe('test');
    });

    it('should prioritize starts-with matches', () => {
      const completions = autoCompleteEngine.getCompletions('test');
      const startsWithMatches = completions.filter(c => c.startsWith('test'));
      const containsMatches = completions.filter(c => c.includes('test') && !c.startsWith('test'));
      
      // All starts-with matches should come before contains matches
      const firstContainsIndex = completions.findIndex(c => containsMatches.includes(c));
      let lastStartsWithIndex = -1;
      for (let i = completions.length - 1; i >= 0; i--) {
        if (startsWithMatches.includes(completions[i])) {
          lastStartsWithIndex = i;
          break;
        }
      }
      
      if (firstContainsIndex !== -1 && lastStartsWithIndex !== -1) {
        expect(lastStartsWithIndex).toBeLessThan(firstContainsIndex);
      }
    });

    it('should prefer shorter matches among starts-with results', () => {
      const completions = autoCompleteEngine.getCompletions('test');
      const startsWithMatches = completions.filter(c => c.startsWith('test'));
      
      // Should be sorted by length among starts-with matches
      for (let i = 0; i < startsWithMatches.length - 1; i++) {
        expect(startsWithMatches[i].length).toBeLessThanOrEqual(startsWithMatches[i + 1].length);
      }
    });
  });

  describe('addContextualSuggestions', () => {
    it('should add contextual suggestions', () => {
      autoCompleteEngine.addContextualSuggestions('files', ['file1.txt', 'file2.js']);
      
      const completions = autoCompleteEngine.getCompletions('file');
      expect(completions).toContain('file1.txt');
      expect(completions).toContain('file2.js');
    });

    it('should replace existing contextual suggestions for same context', () => {
      autoCompleteEngine.addContextualSuggestions('test', ['old suggestion']);
      autoCompleteEngine.addContextualSuggestions('test', ['new suggestion']);
      
      const completions = autoCompleteEngine.getCompletions('suggestion');
      expect(completions).toContain('new suggestion');
      expect(completions).not.toContain('old suggestion');
    });
  });

  describe('removeContextualSuggestions', () => {
    it('should remove contextual suggestions for specific context', () => {
      autoCompleteEngine.addContextualSuggestions('test1', ['suggestion1']);
      autoCompleteEngine.addContextualSuggestions('test2', ['suggestion2']);
      
      autoCompleteEngine.removeContextualSuggestions('test1');
      
      const completions = autoCompleteEngine.getCompletions('suggestion');
      expect(completions).not.toContain('suggestion1');
      expect(completions).toContain('suggestion2');
    });
  });

  describe('clearContextualSuggestions', () => {
    it('should clear all contextual suggestions', () => {
      autoCompleteEngine.addContextualSuggestions('test1', ['suggestion1']);
      autoCompleteEngine.addContextualSuggestions('test2', ['suggestion2']);
      
      autoCompleteEngine.clearContextualSuggestions();
      
      const completions = autoCompleteEngine.getCompletions('suggestion');
      expect(completions).not.toContain('suggestion1');
      expect(completions).not.toContain('suggestion2');
    });
  });

  describe('getBestCompletion', () => {
    beforeEach(() => {
      autoCompleteEngine.setSuggestions(['test', 'testing', 'tester']);
    });

    it('should return null for no completions', () => {
      const best = autoCompleteEngine.getBestCompletion('xyz');
      expect(best).toBeNull();
    });

    it('should return single completion', () => {
      autoCompleteEngine.setSuggestions(['unique']);
      const best = autoCompleteEngine.getBestCompletion('uni');
      expect(best).toBe('unique');
    });

    it('should return common prefix when multiple completions exist', () => {
      const best = autoCompleteEngine.getBestCompletion('te');
      expect(best).toBe('test'); // Common prefix of 'test', 'testing', 'tester'
    });

    it('should return common prefix when it extends beyond input', () => {
      autoCompleteEngine.setSuggestions(['apple', 'application']);
      const best = autoCompleteEngine.getBestCompletion('app');
      expect(best).toBe('appl'); // Common prefix of 'apple' and 'application'
    });

    it('should return best match when no common prefix extends beyond input', () => {
      autoCompleteEngine.setSuggestions(['test1', 'other']);
      const best = autoCompleteEngine.getBestCompletion('te');
      expect(best).toBe('test1'); // Best match when no useful common prefix
    });
  });

  describe('findCommonPrefix', () => {
    it('should find common prefix among completions', () => {
      const engine = new AutoCompleteEngine();
      // Access private method through any cast for testing
      const findCommonPrefix = (engine as any).findCommonPrefix.bind(engine);
      
      expect(findCommonPrefix(['test', 'testing', 'tester'])).toBe('test');
      expect(findCommonPrefix(['hello', 'help'])).toBe('hel');
      expect(findCommonPrefix(['abc', 'xyz'])).toBe('');
      expect(findCommonPrefix(['single'])).toBe('single');
      expect(findCommonPrefix([])).toBe('');
    });

    it('should be case insensitive', () => {
      const engine = new AutoCompleteEngine();
      const findCommonPrefix = (engine as any).findCommonPrefix.bind(engine);
      
      expect(findCommonPrefix(['Test', 'testing', 'TESTER'])).toBe('Test');
    });
  });

  describe('hasCompletions', () => {
    it('should return true when completions exist', () => {
      autoCompleteEngine.setSuggestions(['test']);
      expect(autoCompleteEngine.hasCompletions('te')).toBe(true);
    });

    it('should return false when no completions exist', () => {
      expect(autoCompleteEngine.hasCompletions('xyz')).toBe(false);
    });
  });

  describe('getCompletionCount', () => {
    it('should return correct completion count', () => {
      autoCompleteEngine.setSuggestions(['test1', 'test2', 'other']);
      expect(autoCompleteEngine.getCompletionCount('test')).toBe(2);
      expect(autoCompleteEngine.getCompletionCount('xyz')).toBe(0);
    });
  });

  describe('addCommonPhrases', () => {
    it('should add common phrases as contextual suggestions', () => {
      const phrases = ['how to', 'what is', 'can you'];
      autoCompleteEngine.addCommonPhrases(phrases);
      
      const completions = autoCompleteEngine.getCompletions('how');
      expect(completions).toContain('how to');
    });
  });

  describe('addToolSuggestions', () => {
    it('should add tool-related suggestions', () => {
      const tools = ['file-reader', 'calculator'];
      autoCompleteEngine.addToolSuggestions(tools);
      
      const completions = autoCompleteEngine.getCompletions('use');
      expect(completions).toContain('use file-reader');
      expect(completions).toContain('use calculator');
      
      const helpCompletions = autoCompleteEngine.getCompletions('help');
      expect(helpCompletions).toContain('help with file-reader');
      expect(helpCompletions).toContain('help with calculator');
    });
  });

  describe('special command handling', () => {
    it('should handle special commands with exact matching', () => {
      const completions = autoCompleteEngine.getCompletions('/help');
      expect(completions).toContain('/help');
    });

    it('should handle partial special command matching', () => {
      const completions = autoCompleteEngine.getCompletions('/ex');
      expect(completions).toContain('/exit');
      expect(completions).toContain('/export');
    });

    it('should not mix special commands with regular suggestions', () => {
      autoCompleteEngine.setSuggestions(['/not-a-command', 'regular suggestion']);
      
      const specialCompletions = autoCompleteEngine.getCompletions('/');
      specialCompletions.forEach(completion => {
        expect(completion.startsWith('/')).toBe(true);
      });
      
      const regularCompletions = autoCompleteEngine.getCompletions('regular');
      expect(regularCompletions).toContain('regular suggestion');
      expect(regularCompletions).not.toContain('/help');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in input', () => {
      autoCompleteEngine.setSuggestions(['test']);
      expect(autoCompleteEngine.getCompletions('  te  ')).toContain('test');
    });

    it('should handle empty suggestions array', () => {
      autoCompleteEngine.setSuggestions([]);
      expect(autoCompleteEngine.getCompletions('test')).toEqual([]);
    });

    it('should handle special characters in suggestions', () => {
      autoCompleteEngine.setSuggestions(['test@example.com', 'test-file.txt']);
      const completions = autoCompleteEngine.getCompletions('test');
      expect(completions).toContain('test@example.com');
      expect(completions).toContain('test-file.txt');
    });

    it('should handle unicode characters', () => {
      autoCompleteEngine.setSuggestions(['tëst', '测试']);
      const completions = autoCompleteEngine.getCompletions('t');
      expect(completions).toContain('tëst');
    });
  });
});