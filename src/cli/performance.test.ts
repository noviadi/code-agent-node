import { ConversationStorage } from './components/conversation-storage';
import { HistoryManager } from './components/history-manager';
import { DisplayManager } from './components/display-manager';
import { ThemeEngine } from './components/theme-engine';
import { ProgressManager } from './components/progress-manager';
import { MessageType, HistoryEntry } from './types';

// Mock file system operations
jest.mock('fs/promises');
jest.mock('node-persist');

describe('Performance Tests', () => {
  describe('ConversationStorage Performance', () => {
    let storage: ConversationStorage;

    beforeEach(() => {
      storage = new ConversationStorage('./test-conversations');
    });

    it('should handle large conversation saves efficiently', async () => {
      const largeConversation = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} with some longer content to simulate real conversations. This message contains multiple sentences and should represent a typical conversation entry that might be found in a real-world scenario.`
      }));

      const startTime = Date.now();
      
      await storage.save('large-conversation', largeConversation);
      
      const endTime = Date.now();
      const saveTime = endTime - startTime;

      // Should save within 2 seconds
      expect(saveTime).toBeLessThan(2000);
    });

    it('should handle large conversation loads efficiently', async () => {
      const largeConversation = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} content`
      }));

      // Mock the file system to return our large conversation
      const fs = require('fs/promises');
      fs.readFile.mockResolvedValue(JSON.stringify({
        metadata: {
          id: 'large-conversation',
          name: 'Large Conversation',
          created: new Date(),
          lastModified: new Date(),
          messageCount: largeConversation.length
        },
        messages: largeConversation
      }));

      const startTime = Date.now();
      
      const loaded = await storage.load('large-conversation');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within 1 second
      expect(loadTime).toBeLessThan(1000);
      expect(loaded).toHaveLength(1000);
    });

    it('should handle multiple concurrent operations', async () => {
      const conversations = Array.from({ length: 10 }, (_, i) => ({
        name: `conversation-${i}`,
        messages: Array.from({ length: 100 }, (_, j) => ({
          role: j % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${j} in conversation ${i}`
        }))
      }));

      const startTime = Date.now();

      // Save all conversations concurrently
      await Promise.all(
        conversations.map(conv => storage.save(conv.name, conv.messages))
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete all operations within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('HistoryManager Performance', () => {
    let historyManager: HistoryManager;

    beforeEach(() => {
      historyManager = new HistoryManager(1000);
    });

    it('should handle large history efficiently', async () => {
      const largeHistory: HistoryEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        command: `command-${i} with some additional parameters and longer text`,
        timestamp: new Date(Date.now() - i * 1000),
        success: i % 10 !== 0 // 90% success rate
      }));

      const startTime = Date.now();

      // Add all entries
      for (const entry of largeHistory) {
        historyManager.add(entry);
      }

      const endTime = Date.now();
      const addTime = endTime - startTime;

      // Should add all entries within 1 second
      expect(addTime).toBeLessThan(1000);
    });

    it('should search large history efficiently', async () => {
      // Add large history
      for (let i = 0; i < 1000; i++) {
        historyManager.add({
          command: `command-${i} git status branch-${i % 10}`,
          timestamp: new Date(Date.now() - i * 1000),
          success: true
        });
      }

      const startTime = Date.now();

      // Search for specific pattern
      const results = historyManager.search('git status');

      const endTime = Date.now();
      const searchTime = endTime - startTime;

      // Should search within 100ms
      expect(searchTime).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should maintain performance with frequent operations', async () => {
      const startTime = Date.now();

      // Simulate frequent operations
      for (let i = 0; i < 100; i++) {
        historyManager.add({
          command: `frequent-command-${i}`,
          timestamp: new Date(),
          success: true
        });

        // Occasionally search and navigate
        if (i % 10 === 0) {
          historyManager.search('frequent');
          historyManager.getPrevious();
          historyManager.getNext();
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete all operations within 500ms
      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('DisplayManager Performance', () => {
    let displayManager: DisplayManager;
    let themeEngine: ThemeEngine;
    let progressManager: ProgressManager;

    beforeEach(() => {
      themeEngine = new ThemeEngine('light');
      progressManager = new ProgressManager();
      displayManager = new DisplayManager(themeEngine, progressManager);
    });

    it('should handle rapid message display efficiently', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        content: `Message ${i} with some content that might be displayed rapidly in the CLI interface`,
        type: i % 4 === 0 ? MessageType.USER : 
              i % 4 === 1 ? MessageType.ASSISTANT :
              i % 4 === 2 ? MessageType.SYSTEM : MessageType.SUCCESS
      }));

      const startTime = Date.now();

      // Display all messages rapidly
      for (const message of messages) {
        displayManager.displayMessage(message.content, message.type);
      }

      const endTime = Date.now();
      const displayTime = endTime - startTime;

      // Should display all messages within 1 second
      expect(displayTime).toBeLessThan(1000);
    });

    it('should handle large text formatting efficiently', async () => {
      const largeText = 'A'.repeat(10000); // 10KB of text

      const startTime = Date.now();

      displayManager.displayMessage(largeText, MessageType.ASSISTANT);

      const endTime = Date.now();
      const formatTime = endTime - startTime;

      // Should format large text within 100ms
      expect(formatTime).toBeLessThan(100);
    });

    it('should handle multiple progress indicators efficiently', async () => {
      const startTime = Date.now();

      // Create multiple progress indicators
      const indicators = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          displayManager.showProgress(`Operation ${i}`)
        )
      );

      // Update all indicators multiple times
      for (let i = 0; i < 5; i++) {
        indicators.forEach((indicator, index) => {
          indicator.update(`Operation ${index} - Step ${i}`);
        });
      }

      // Complete all indicators
      indicators.forEach(indicator => indicator.succeed());

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle all progress operations within 1 second
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory with repeated operations', async () => {
      const storage = new ConversationStorage('./test-conversations');
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        const conversation = Array.from({ length: 20 }, (_, j) => ({
          role: j % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${j} in iteration ${i}`
        }));

        await storage.save(`test-conversation-${i}`, conversation);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    }, 10000); // 10 second timeout

    it('should handle memory pressure gracefully', async () => {
      const historyManager = new HistoryManager(10000);

      // Add many entries to test memory management
      for (let i = 0; i < 5000; i++) {
        historyManager.add({
          command: `memory-test-command-${i}`.repeat(10), // Larger commands
          timestamp: new Date(),
          success: true
        });
      }

      // Should not crash and should maintain reasonable memory usage
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent file operations safely', async () => {
      const storage = new ConversationStorage('./test-conversations');

      const operations = Array.from({ length: 20 }, (_, i) => {
        const conversation = Array.from({ length: 10 }, (_, j) => ({
          role: j % 2 === 0 ? 'user' : 'assistant',
          content: `Concurrent message ${j} in operation ${i}`
        }));

        return storage.save(`concurrent-test-${i}`, conversation);
      });

      const startTime = Date.now();

      // Execute all operations concurrently
      await Promise.all(operations);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete all concurrent operations within 3 seconds
      expect(totalTime).toBeLessThan(3000);
    });

    it('should maintain data integrity under concurrent access', async () => {
      const historyManager = new HistoryManager(1000);

      // Simulate concurrent access from multiple sources
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            for (let j = 0; j < 10; j++) {
              historyManager.add({
                command: `concurrent-${i}-${j}`,
                timestamp: new Date(),
                success: true
              });
            }
            resolve();
          }, Math.random() * 100);
        });
      });

      await Promise.all(concurrentOperations);

      // Should have all entries without corruption
      const recentHistory = historyManager.getRecent(200);
      expect(recentHistory.length).toBe(100); // 10 operations × 10 entries each
    });
  });
});