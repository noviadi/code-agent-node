import * as fs from 'fs/promises';
import * as path from 'path';
import { ConversationMetadata } from '../types';

interface StoredConversation {
  metadata: ConversationMetadata;
  messages: any[];
}

/**
 * Handles conversation persistence and storage operations
 */
export class ConversationStorage {
  private storageDir: string;

  constructor(storageDir: string = './conversations') {
    this.storageDir = storageDir;
  }

  /**
   * Initialize storage directory
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Generate conversation file path
   */
  private getConversationPath(name: string): string {
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.storageDir, `${sanitizedName}.json`);
  }

  /**
   * Generate unique conversation ID
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save conversation to storage
   */
  async save(name: string, messages: any[]): Promise<void> {
    await this.ensureStorageDir();
    
    const filePath = this.getConversationPath(name);
    const now = new Date();
    
    // Check if conversation already exists to preserve creation date
    let existingMetadata: ConversationMetadata | null = null;
    try {
      const existing = await this.load(name);
      if (existing.length > 0) {
        const existingData = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(existingData) as StoredConversation;
        existingMetadata = parsed.metadata;
      }
    } catch {
      // File doesn't exist, which is fine
    }

    const metadata: ConversationMetadata = {
      id: existingMetadata?.id || this.generateId(),
      name,
      created: existingMetadata?.created || now,
      lastModified: now,
      messageCount: messages.length
    };

    const conversation: StoredConversation = {
      metadata,
      messages
    };

    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
  }

  /**
   * Load conversation from storage
   */
  async load(name: string): Promise<any[]> {
    const filePath = this.getConversationPath(name);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const conversation = JSON.parse(data) as StoredConversation;
      return conversation.messages;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Conversation '${name}' not found`);
      }
      throw new Error(`Failed to load conversation '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * List all saved conversations
   */
  async list(): Promise<ConversationMetadata[]> {
    await this.ensureStorageDir();
    
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const conversations: ConversationMetadata[] = [];
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const conversation = JSON.parse(data) as StoredConversation;
          conversations.push(conversation.metadata);
        } catch (error) {
          // Skip corrupted files
          console.warn(`Warning: Could not read conversation file ${file}: ${(error as Error).message}`);
        }
      }
      
      // Sort by last modified date (newest first)
      return conversations.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      throw new Error(`Failed to list conversations: ${(error as Error).message}`);
    }
  }

  /**
   * Delete conversation from storage
   */
  async delete(name: string): Promise<void> {
    const filePath = this.getConversationPath(name);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Conversation '${name}' not found`);
      }
      throw new Error(`Failed to delete conversation '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * Export conversation to specified format
   */
  async export(name: string, format: 'json' | 'markdown'): Promise<string> {
    const messages = await this.load(name);
    const conversations = await this.list();
    const metadata = conversations.find(c => c.name === name);
    
    if (!metadata) {
      throw new Error(`Conversation '${name}' not found`);
    }

    if (format === 'json') {
      return JSON.stringify({
        metadata,
        messages
      }, null, 2);
    } else if (format === 'markdown') {
      let markdown = `# Conversation: ${name}\n\n`;
      markdown += `**Created:** ${new Date(metadata.created).toLocaleString()}\n`;
      markdown += `**Last Modified:** ${new Date(metadata.lastModified).toLocaleString()}\n`;
      markdown += `**Messages:** ${metadata.messageCount}\n\n`;
      markdown += '---\n\n';
      
      for (const message of messages) {
        const role = message.role || 'unknown';
        const content = message.content || '';
        
        markdown += `## ${role.charAt(0).toUpperCase() + role.slice(1)}\n\n`;
        markdown += `${content}\n\n`;
        
        if (message.tool_calls && message.tool_calls.length > 0) {
          markdown += '### Tool Calls\n\n';
          for (const toolCall of message.tool_calls) {
            markdown += `**${toolCall.function?.name || 'Unknown Tool'}**\n`;
            markdown += '```json\n';
            markdown += JSON.stringify(toolCall.function?.arguments || {}, null, 2);
            markdown += '\n```\n\n';
          }
        }
        
        if (message.tool_call_id) {
          markdown += `*Tool Response (ID: ${message.tool_call_id})*\n\n`;
        }
      }
      
      return markdown;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Check if conversation exists
   */
  async exists(name: string): Promise<boolean> {
    const filePath = this.getConversationPath(name);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}