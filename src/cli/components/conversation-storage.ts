import { ConversationMetadata } from '../types';

/**
 * Handles conversation persistence and storage operations
 * Implementation will be added in task 5.1
 */
export class ConversationStorage {
  private storageDir: string = './conversations';

  /**
   * Save conversation to storage
   */
  async save(name: string, messages: any[]): Promise<void> {
    console.log('ConversationStorage.save - implementation pending');
  }

  /**
   * Load conversation from storage
   */
  async load(name: string): Promise<any[]> {
    console.log('ConversationStorage.load - implementation pending');
    return [];
  }

  /**
   * List all saved conversations
   */
  async list(): Promise<ConversationMetadata[]> {
    console.log('ConversationStorage.list - implementation pending');
    return [];
  }

  /**
   * Delete conversation from storage
   */
  async delete(name: string): Promise<void> {
    console.log('ConversationStorage.delete - implementation pending');
  }

  /**
   * Export conversation to specified format
   */
  async export(name: string, format: 'json' | 'markdown'): Promise<string> {
    console.log('ConversationStorage.export - implementation pending');
    return '';
  }

  /**
   * Check if conversation exists
   */
  async exists(name: string): Promise<boolean> {
    console.log('ConversationStorage.exists - implementation pending');
    return false;
  }
}