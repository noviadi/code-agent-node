import { HistoryEntry } from '../types';

/**
 * Provides auto-completion functionality for commands and input
 */
export class AutoCompleteEngine {
  private staticSuggestions: string[] = [];
  private contextualSuggestions: Map<string, string[]> = new Map();
  private commandHistory: HistoryEntry[] = [];
  private specialCommands: string[] = [];

  constructor() {
    // Initialize with common special commands
    this.specialCommands = [
      '/help',
      '/clear',
      '/exit',
      '/history',
      '/tools',
      '/config',
      '/save',
      '/load',
      '/new',
      '/export',
      '/theme'
    ];
  }

  /**
   * Set available static suggestions
   */
  setSuggestions(suggestions: string[]): void {
    this.staticSuggestions = [...suggestions];
  }

  /**
   * Set special commands for auto-completion
   */
  setSpecialCommands(commands: string[]): void {
    this.specialCommands = [...commands];
  }

  /**
   * Update command history for history-based suggestions
   */
  updateHistory(history: HistoryEntry[]): void {
    this.commandHistory = [...history];
  }

  /**
   * Get completions for partial input
   */
  getCompletions(partial: string): string[] {
    if (!partial || partial.trim().length === 0) {
      return [];
    }

    const trimmedPartial = partial.trim();
    const completions = new Set<string>();

    // Special command completions (highest priority)
    if (trimmedPartial.startsWith('/')) {
      const specialMatches = this.getSpecialCommandCompletions(trimmedPartial);
      specialMatches.forEach(match => completions.add(match));
    } else {
      // Regular completions
      
      // 1. Static suggestions
      const staticMatches = this.getStaticCompletions(trimmedPartial);
      staticMatches.forEach(match => completions.add(match));

      // 2. History-based suggestions
      const historyMatches = this.getHistoryCompletions(trimmedPartial);
      historyMatches.forEach(match => completions.add(match));

      // 3. Contextual suggestions
      const contextualMatches = this.getContextualCompletions(trimmedPartial);
      contextualMatches.forEach(match => completions.add(match));
    }

    // Convert to array and sort by relevance
    return this.sortCompletions(Array.from(completions), trimmedPartial);
  }

  /**
   * Get special command completions
   */
  private getSpecialCommandCompletions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    return this.specialCommands.filter(cmd => 
      cmd.toLowerCase().startsWith(lowerPartial)
    );
  }

  /**
   * Get static suggestion completions
   */
  private getStaticCompletions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    return this.staticSuggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(lowerPartial)
    );
  }

  /**
   * Get history-based completions
   */
  private getHistoryCompletions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    const matches = new Set<string>();

    // Get unique commands from history that match
    this.commandHistory.forEach(entry => {
      const command = entry.command.trim();
      if (command.toLowerCase().includes(lowerPartial)) {
        matches.add(command);
      }
    });

    return Array.from(matches);
  }

  /**
   * Get contextual completions
   */
  private getContextualCompletions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    const matches: string[] = [];

    // Check all contextual suggestion sets
    this.contextualSuggestions.forEach((suggestions) => {
      suggestions.forEach(suggestion => {
        if (suggestion.toLowerCase().includes(lowerPartial)) {
          matches.push(suggestion);
        }
      });
    });

    return matches;
  }

  /**
   * Sort completions by relevance
   */
  private sortCompletions(completions: string[], partial: string): string[] {
    const lowerPartial = partial.toLowerCase();

    return completions.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Exact matches first
      if (aLower === lowerPartial && bLower !== lowerPartial) return -1;
      if (bLower === lowerPartial && aLower !== lowerPartial) return 1;

      // Starts with matches next
      const aStartsWith = aLower.startsWith(lowerPartial);
      const bStartsWith = bLower.startsWith(lowerPartial);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;

      // Shorter matches preferred
      if (aStartsWith && bStartsWith) {
        return a.length - b.length;
      }

      // Alphabetical order for remaining
      return a.localeCompare(b);
    });
  }

  /**
   * Add dynamic suggestions based on context
   */
  addContextualSuggestions(context: string, suggestions: string[]): void {
    this.contextualSuggestions.set(context, [...suggestions]);
  }

  /**
   * Remove contextual suggestions for a specific context
   */
  removeContextualSuggestions(context: string): void {
    this.contextualSuggestions.delete(context);
  }

  /**
   * Clear all contextual suggestions
   */
  clearContextualSuggestions(): void {
    this.contextualSuggestions.clear();
  }

  /**
   * Get the best single completion for tab completion
   */
  getBestCompletion(partial: string): string | null {
    const completions = this.getCompletions(partial);
    
    if (completions.length === 0) {
      return null;
    }

    // If there's a common prefix among all completions, return it
    if (completions.length > 1) {
      const commonPrefix = this.findCommonPrefix(completions);
      if (commonPrefix.length > partial.length) {
        return commonPrefix;
      }
    }

    // Return the best match
    return completions[0];
  }

  /**
   * Find common prefix among completions
   */
  private findCommonPrefix(completions: string[]): string {
    if (completions.length === 0) return '';
    if (completions.length === 1) return completions[0];

    let prefix = completions[0];
    
    for (let i = 1; i < completions.length; i++) {
      const current = completions[i];
      let j = 0;
      
      while (j < prefix.length && j < current.length && 
             prefix[j].toLowerCase() === current[j].toLowerCase()) {
        j++;
      }
      
      prefix = prefix.substring(0, j);
      
      if (prefix.length === 0) break;
    }

    return prefix;
  }

  /**
   * Check if input has potential completions
   */
  hasCompletions(partial: string): boolean {
    return this.getCompletions(partial).length > 0;
  }

  /**
   * Get completion count for partial input
   */
  getCompletionCount(partial: string): number {
    return this.getCompletions(partial).length;
  }

  /**
   * Add common phrases and patterns
   */
  addCommonPhrases(phrases: string[]): void {
    this.addContextualSuggestions('common_phrases', phrases);
  }

  /**
   * Add tool-related suggestions
   */
  addToolSuggestions(toolNames: string[]): void {
    const toolSuggestions = toolNames.flatMap(tool => [
      `use ${tool}`,
      `help with ${tool}`,
      `${tool} help`,
      `how to use ${tool}`
    ]);
    
    this.addContextualSuggestions('tools', toolSuggestions);
  }
}