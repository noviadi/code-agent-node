import { ToolsCommand } from './tools-command';
import { DisplayManager } from '../display-manager';
import { Agent } from '../../agent';
import { MessageType } from '../types';
import { Tool } from '../../tools';

// Mock dependencies
jest.mock('../display-manager');
jest.mock('../../agent');

describe('ToolsCommand', () => {
  let toolsCommand: ToolsCommand;
  let mockDisplayManager: jest.Mocked<DisplayManager>;
  let mockAgent: jest.Mocked<Agent>;

  beforeEach(() => {
    mockDisplayManager = new DisplayManager({} as any) as jest.Mocked<DisplayManager>;
    mockAgent = new Agent(jest.fn(), jest.fn()) as jest.Mocked<Agent>;
    toolsCommand = new ToolsCommand(mockDisplayManager, mockAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('properties', () => {
    it('should have correct name and description', () => {
      expect(toolsCommand.name).toBe('tools');
      expect(toolsCommand.description).toBe('List available tools and their descriptions');
    });
  });

  describe('handler', () => {
    it('should display available tools', async () => {
      const mockTools: Tool[] = [
        { name: 'read-file', description: 'Read file contents', input_schema: {} as any, execute: jest.fn() },
        { name: 'list-files', description: 'List directory contents', input_schema: {} as any, execute: jest.fn() },
        { name: 'edit-file', description: 'Edit file contents', input_schema: {} as any, execute: jest.fn() }
      ];

      mockAgent.getAvailableTools.mockReturnValue(mockTools);

      await toolsCommand.handler([]);

      expect(mockAgent.getAvailableTools).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Available Tools:', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  read-file      - Read file contents', MessageType.TOOL);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  list-files     - List directory contents', MessageType.TOOL);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('  edit-file      - Edit file contents', MessageType.TOOL);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('', MessageType.SYSTEM);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith(
        'Tools are automatically used by Claude when needed during conversations.',
        MessageType.SYSTEM
      );
    });

    it('should display message when no tools available', async () => {
      mockAgent.getAvailableTools.mockReturnValue([]);

      await toolsCommand.handler([]);

      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('No tools are currently available.', MessageType.SYSTEM);
    });

    it('should ignore arguments', async () => {
      const mockTools: Tool[] = [
        { name: 'test-tool', description: 'Test tool', input_schema: {} as any, execute: jest.fn() }
      ];

      mockAgent.getAvailableTools.mockReturnValue(mockTools);

      await toolsCommand.handler(['arg1', 'arg2']);

      expect(mockAgent.getAvailableTools).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.displayMessage).toHaveBeenCalledWith('Available Tools:', MessageType.SYSTEM);
    });
  });

  describe('autoComplete', () => {
    it('should return empty array', () => {
      const result = toolsCommand.autoComplete();
      expect(result).toEqual([]);
    });
  });
});