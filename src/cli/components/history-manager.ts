import storage from 'node-persist';
import * as path from 'path';
import * as os from 'os';
import { HistoryEntry } from '../types';

/**
 * Manages command history with file-based persistence
 */
export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number;
  private storageDir: string;
  private isInitialized: boolean = false;

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
    this.storageDir = path.join(os.homedir(), '.code-agent-cli', 'history');
  }

  /**
   * Initialize storage
   */
  private async initStorage(): Promise<void> {
    if (this.isInitialized) return;
    
    await storage.init({
      dir: this.storageDir,
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false,
      ttl: false,
      expiredInterval: 2 * 60 * 1000, // 2 minutes
      forgiveParseErrors: true
    });
    
    this.isInitialized = true;
  }

  /**
   * Add entry to history
   */
  add(entry: HistoryEntry): void {
    // Don't add empty commands or duplicates of the last command
    if (!entry.command.trim()) return;
    
    const lastEntry = this.history[this.history.length - 1];
    if (lastEntry && lastEntry.command === entry.command) return;

    this.history.push(entry);
    
    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
    
    // Reset navigation index
    this.currentIndex = -1;
    
    // Auto-persist (fire and forget)
    this.persist().catch(console.error);
  }

  /**
   * Get previous command from history (up arrow functionality)
   */
  getPrevious(): string | null {
    if (this.history.length === 0) return null;
    
    // If we're at the beginning, start from the end
    if (this.currentIndex === -1) {
      this.currentIndex = this.history.length - 1;
    } else if (this.currentIndex > 0) {
      this.currentIndex--;
    }
    
    return this.history[this.currentIndex]?.command || null;
  }

  /**
   * Get next command from history (down arrow functionality)
   */
  getNext(): string | null {
    if (this.history.length === 0 || this.currentIndex === -1) return null;
    
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex].command;
    } else {
      // Reset to end of history
      this.currentIndex = -1;
      return '';
    }
  }

  /**
   * Reset navigation index (call when user starts typing new command)
   */
  resetNavigation(): void {
    this.currentIndex = -1;
  }

  /**
   * Search history for matching commands
   */
  search(query: string): HistoryEntry[] {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return this.history.filter(entry => 
      entry.command.toLowerCase().includes(lowerQuery)
    ).reverse(); // Most recent first
  }

  /**
   * Get all history entries
   */
  getAll(): HistoryEntry[] {
    return [...this.history].reverse(); // Most recent first
  }

  /**
   * Get recent history entries
   */
  getRecent(count: number = 10): HistoryEntry[] {
    return this.history.slice(-count).reverse(); // Most recent first
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.persist().catch(console.error);
  }

  /**
   * Get history size
   */
  size(): number {
    return this.history.length;
  }

  /**
   * Persist history to storage
   */
  async persist(): Promise<void> {
    try {
      await this.initStorage();
      await storage.setItem('command_history', this.history);
    } catch (error) {
      console.error('Failed to persist command history:', error);
    }
  }

  /**
   * Load history from storage
   */
  async load(): Promise<void> {
    try {
      await this.initStorage();
      const savedHistory = await storage.getItem('command_history');
      
      if (Array.isArray(savedHistory)) {
        // Validate and convert timestamps
        this.history = savedHistory
          .map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }))
          .filter(entry => 
            typeof entry.command === 'string' && 
            entry.timestamp instanceof Date &&
            !isNaN(entry.timestamp.getTime())
          );
        
        // Ensure we don't exceed max size
        if (this.history.length > this.maxHistorySize) {
          this.history = this.history.slice(-this.maxHistorySize);
        }
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
      this.history = [];
    }
    
    this.currentIndex = -1;
  }
}