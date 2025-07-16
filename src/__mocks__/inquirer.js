// Mock inquirer for Jest testing
const mockInquirer = {
  prompt: () => Promise.resolve({ input: 'test input' }),
  createPromptModule: () => mockInquirer.prompt,
  registerPrompt: () => {},
  Separator: function() { return '---'; }
};

module.exports = mockInquirer;