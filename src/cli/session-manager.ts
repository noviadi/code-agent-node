import { InteractiveCLIConfig, ConversationMetadata } from './types';
import { ConversationStorage } from './components/conversation-storage';
import { ConfigurationManager } from './components/configuration-manager';

/**
 * Manages conversation persistence and configuration
 */
export class SessionManager {
  private configManager: ConfigurationManager;
  private storage: ConversationStorage;
  private currentConversation: string | null = null;
  private currentMessages: any[] = [];

  constructor(configManager?: ConfigurationManager, storageDir?: string) {
    this.configManager = configManager || new ConfigurationManager();
    this.storage = new ConversationStorage(storageDir);
  }

  /**
   * Save conversation with given name
   */
  async saveConversation(name: string, messages: any[]): Promise<void> {
    if (!name || name.trim() === '') {
      throw new Error('Conversation name cannot be empty');
    }

    if (!messages || messages.length === 0) {
      throw new Error('Cannot save empty conversation');
    }

    try {
      await this.storage.save(name.trim(), messages);
      this.currentConversation = name.trim();
      this.currentMessages = [...messages];
    } catch (error) {
      throw new Error(`Failed to save conversation '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * Load conversation by name
   */
  async loadConversation(name: string): Promise<any[]> {
    if (!name || name.trim() === '') {
      throw new Error('Conversation name cannot be empty');
    }

    try {
      const messages = await this.storage.load(name.trim());
      this.currentConversation = name.trim();
      this.currentMessages = [...messages];
      return messages;
    } catch (error) {
      throw new Error(`Failed to load conversation '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * List all saved conversations
   */
  async listConversations(): Promise<ConversationMetadata[]> {
    try {
      return await this.storage.list();
    } catch (error) {
      throw new Error(`Failed to list conversations: ${(error as Error).message}`);
    }
  }

  /**
   * Export conversation to specified format
   */
  async exportConversation(name: string, format: 'json' | 'markdown'): Promise<string> {
    if (!name || name.trim() === '') {
      throw new Error('Conversation name cannot be empty');
    }

    if (format !== 'json' && format !== 'markdown') {
      throw new Error(`Unsupported export format: ${format}. Supported formats: json, markdown`);
    }

    try {
      return await this.storage.export(name.trim(), format);
    } catch (error) {
      throw new Error(`Failed to export conversation '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * Delete conversation by name
   */
  async deleteConversation(name: string): Promise<void> {
    if (!name || name.trim() === '') {
      throw new Error('Conversation name cannot be empty');
    }

    try {
      await this.storage.delete(name.trim());
      
      // Clear current conversation if it was deleted
      if (this.currentConversation === name.trim()) {
        this.currentConversation = null;
        this.currentMessages = [];
      }
    } catch (error) {
      throw new Error(`Failed to delete conversation '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * Check if conversation exists
   */
  async conversationExists(name: string): Promise<boolean> {
    if (!name || name.trim() === '') {
      return false;
    }

    try {
      return await this.storage.exists(name.trim());
    } catch (error) {
      return false;
    }
  }

  /**
   * Start a new conversation (optionally saving current one)
   */
  async startNewConversation(saveCurrentAs?: string): Promise<void> {
    // Save current conversation if requested and has messages
    if (saveCurrentAs && this.currentMessages.length > 0) {
      await this.saveConversation(saveCurrentAs, this.currentMessages);
    }

    // Clear current conversation state
    this.currentConversation = null;
    this.currentMessages = [];
  }

  /**
   * Get current conversation name
   */
  getCurrentConversationName(): string | null {
    return this.currentConversation;
  }

  /**
   * Get current conversation messages
   */
  getCurrentMessages(): any[] {
    return [...this.currentMessages];
  }

  /**
   * Update current conversation messages
   */
  updateCurrentMessages(messages: any[]): void {
    this.currentMessages = [...messages];
  }

  /**
   * Add message to current conversation
   */
  addMessageToCurrentConversation(message: any): void {
    this.currentMessages.push(message);
  }

  /**
   * Auto-save current conversation if enabled in config
   */
  async autoSaveIfEnabled(): Promise<void> {
    const config = this.configManager.getConfig();
    if (config.autoSave && this.currentConversation && this.currentMessages.length > 0) {
      try {
        await this.saveConversation(this.currentConversation, this.currentMessages);
      } catch (error) {
        // Log error but don't throw - auto-save failures shouldn't break the flow
        console.warn(`Auto-save failed: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): InteractiveCLIConfig {
    return this.configManager.getConfig();
  }

  /**
   * Update configuration settings
   */
  async updateConfig(updates: Partial<InteractiveCLIConfig>): Promise<void> {
    try {
      await this.configManager.update(updates);
    } catch (error) {
      throw new Error(`Failed to update configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Save current session (called during shutdown)
   */
  async saveCurrentSession(): Promise<void> {
    // Auto-save current conversation if enabled
    await this.autoSaveIfEnabled();
  }

  /**
   * Get configuration manager instance
   */
  getConfigurationManager(): ConfigurationManager {
    return this.configManager;
  }
}