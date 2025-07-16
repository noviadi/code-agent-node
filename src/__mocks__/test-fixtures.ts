import { HistoryEntry, ConversationMetadata } from '../cli/types';

// Mock conversation data for testing
export const mockConversations = [
  {
    role: 'user',
    content: 'Hello Claude, can you help me with a coding problem?'
  },
  {
    role: 'assistant',
    content: 'Hello! I\'d be happy to help you with your coding problem. What specific issue are you working on?'
  },
  {
    role: 'user',
    content: 'I need to implement a function that sorts an array of objects by multiple properties.'
  },
  {
    role: 'assistant',
    content: 'I can help you with that! Here\'s a flexible function that can sort by multiple properties:\n\n```javascript\nfunction multiSort(array, sortKeys) {\n  return array.sort((a, b) => {\n    for (let key of sortKeys) {\n      const { prop, direction = \'asc\' } = typeof key === \'string\' ? { prop: key } : key;\n      const aVal = a[prop];\n      const bVal = b[prop];\n      \n      if (aVal < bVal) return direction === \'asc\' ? -1 : 1;\n      if (aVal > bVal) return direction === \'asc\' ? 1 : -1;\n    }\n    return 0;\n  });\n}\n```\n\nWould you like me to explain how this works or show you some examples?'
  },
  {
    role: 'user',
    content: 'That looks great! Can you show me an example of how to use it?'
  },
  {
    role: 'assistant',
    content: 'Absolutely! Here are some examples:\n\n```javascript\nconst people = [\n  { name: \'Alice\', age: 30, salary: 50000 },\n  { name: \'Bob\', age: 25, salary: 60000 },\n  { name: \'Charlie\', age: 30, salary: 45000 }\n];\n\n// Sort by age (ascending), then by salary (descending)\nconst sorted = multiSort(people, [\n  \'age\',\n  { prop: \'salary\', direction: \'desc\' }\n]);\n\nconsole.log(sorted);\n// Result: Charlie (30, 45000), Alice (30, 50000), Bob (25, 60000)\n```\n\nThe function is flexible - you can pass simple strings for ascending sort, or objects with direction specified!'
  }
];

export const mockLargeConversation = Array.from({ length: 100 }, (_, i) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `Message ${i + 1}: This is a longer message that simulates a real conversation. It contains multiple sentences and provides enough content to test performance with larger datasets. The message includes various types of content like code examples, explanations, and questions that would typically appear in a coding assistance conversation.`
}));

export const mockHistoryEntries: HistoryEntry[] = [
  {
    command: 'git status',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    success: true
  },
  {
    command: 'npm install',
    timestamp: new Date('2024-01-15T10:25:00Z'),
    success: true
  },
  {
    command: 'git commit -m "Add new feature"',
    timestamp: new Date('2024-01-15T10:20:00Z'),
    success: true
  },
  {
    command: 'npm test',
    timestamp: new Date('2024-01-15T10:15:00Z'),
    success: false
  },
  {
    command: 'git add .',
    timestamp: new Date('2024-01-15T10:10:00Z'),
    success: true
  },
  {
    command: '/help',
    timestamp: new Date('2024-01-15T10:05:00Z'),
    success: true
  },
  {
    command: '/tools',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    success: true
  },
  {
    command: 'How do I implement a binary search?',
    timestamp: new Date('2024-01-15T09:55:00Z'),
    success: true
  },
  {
    command: '/clear',
    timestamp: new Date('2024-01-15T09:50:00Z'),
    success: true
  },
  {
    command: 'Explain async/await in JavaScript',
    timestamp: new Date('2024-01-15T09:45:00Z'),
    success: true
  }
];

export const mockConversationMetadata: ConversationMetadata[] = [
  {
    id: 'conv-001',
    name: 'JavaScript Help Session',
    created: new Date('2024-01-15T09:00:00Z'),
    lastModified: new Date('2024-01-15T10:30:00Z'),
    messageCount: 12
  },
  {
    id: 'conv-002',
    name: 'Python Data Analysis',
    created: new Date('2024-01-14T14:00:00Z'),
    lastModified: new Date('2024-01-14T16:45:00Z'),
    messageCount: 8
  },
  {
    id: 'conv-003',
    name: 'React Component Design',
    created: new Date('2024-01-13T11:30:00Z'),
    lastModified: new Date('2024-01-13T13:15:00Z'),
    messageCount: 15
  },
  {
    id: 'conv-004',
    name: 'Database Optimization',
    created: new Date('2024-01-12T16:20:00Z'),
    lastModified: new Date('2024-01-12T18:00:00Z'),
    messageCount: 6
  },
  {
    id: 'conv-005',
    name: 'API Design Discussion',
    created: new Date('2024-01-11T10:15:00Z'),
    lastModified: new Date('2024-01-11T12:30:00Z'),
    messageCount: 20
  }
];

export const mockToolExecutions = [
  {
    toolName: 'read-file',
    input: { file: 'src/index.ts' },
    result: 'import { Agent } from \'./agent\';\nimport { readFileTool } from \'./tools/read-file\';\n\n// Application entry point\nconst agent = new Agent([readFileTool]);\nagent.start();'
  },
  {
    toolName: 'list-files',
    input: { directory: 'src' },
    result: ['index.ts', 'agent.ts', 'tools.ts', 'tools/']
  },
  {
    toolName: 'edit-file',
    input: { 
      file: 'src/test.ts', 
      content: 'console.log("Hello, World!");' 
    },
    result: 'File successfully written'
  }
];

export const mockErrorScenarios = [
  {
    type: 'NetworkError',
    message: 'Failed to connect to Anthropic API',
    context: 'agent processing'
  },
  {
    type: 'FileSystemError',
    message: 'Permission denied: Cannot write to file',
    context: 'conversation storage'
  },
  {
    type: 'ValidationError',
    message: 'Invalid input schema for tool execution',
    context: 'tool validation'
  },
  {
    type: 'ConfigurationError',
    message: 'Invalid theme configuration',
    context: 'theme engine'
  },
  {
    type: 'InputError',
    message: 'Malformed command syntax',
    context: 'command parsing'
  }
];

export const mockPerformanceData = {
  largeHistorySize: 1000,
  largeConversationSize: 500,
  concurrentOperations: 20,
  memoryThresholdMB: 50,
  timeThresholdMs: 1000
};

// Helper functions for creating test data
export function createMockConversation(messageCount: number) {
  return Array.from({ length: messageCount }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Mock message ${i + 1} with some content for testing purposes.`
  }));
}

export function createMockHistoryEntries(count: number): HistoryEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    command: `mock-command-${i + 1}`,
    timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
    success: i % 10 !== 0 // 90% success rate
  }));
}

export function createMockConversationMetadata(count: number): ConversationMetadata[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-conv-${i + 1}`,
    name: `Mock Conversation ${i + 1}`,
    created: new Date(Date.now() - i * 86400000), // 1 day apart
    lastModified: new Date(Date.now() - i * 86400000 + 3600000), // 1 hour later
    messageCount: Math.floor(Math.random() * 50) + 5 // 5-55 messages
  }));
}

// Configuration presets for testing
export const testConfigurations = {
  minimal: {
    theme: 'light',
    historySize: 10,
    autoSave: false,
    progressIndicators: false,
    multiLineEditor: false,
    autoComplete: false,
    fallbackMode: true
  },
  standard: {
    theme: 'light',
    historySize: 100,
    autoSave: true,
    progressIndicators: true,
    multiLineEditor: true,
    autoComplete: true,
    fallbackMode: false
  },
  performance: {
    theme: 'dark',
    historySize: 1000,
    autoSave: true,
    progressIndicators: true,
    multiLineEditor: true,
    autoComplete: true,
    fallbackMode: false
  }
};