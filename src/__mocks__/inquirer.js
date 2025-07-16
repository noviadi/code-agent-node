// Mock inquirer for Jest testing
const mockInquirer = {
  prompt: jest.fn(),
  createPromptModule: jest.fn(() => mockInquirer.prompt),
  registerPrompt: jest.fn(),
  Separator: jest.fn()
};

module.exports = mockInquirer;