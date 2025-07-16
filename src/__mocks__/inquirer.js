// Mock inquirer for Jest testing
const mockInquirer = {
  prompt: jest.fn(() => Promise.resolve({ input: 'test input' })),
  createPromptModule: jest.fn(() => mockInquirer.prompt),
  registerPrompt: jest.fn(),
  Separator: jest.fn(() => '---')
};

module.exports = mockInquirer;