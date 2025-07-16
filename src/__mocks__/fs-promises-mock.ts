/**
 * Mock for fs/promises module
 */
export function createMockFs() {
  return {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn()
  };
}

// Default mock implementation
const mockFs = createMockFs();

// Set up default behaviors
mockFs.access.mockResolvedValue(undefined);
mockFs.mkdir.mockResolvedValue(undefined);
mockFs.writeFile.mockResolvedValue(undefined);
mockFs.readFile.mockResolvedValue('{}');
mockFs.readdir.mockResolvedValue([]);
mockFs.unlink.mockResolvedValue(undefined);
mockFs.stat.mockResolvedValue({
  isFile: () => true,
  mtime: new Date()
} as any);

export default mockFs;