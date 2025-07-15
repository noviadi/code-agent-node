## Brief overview
This rule file outlines the preferred unit testing strategies and best practices for this project, derived from our recent work on adding tests.

## Testing Framework
- **Jest**: Use Jest as the primary testing framework for all unit tests. It is configured for TypeScript projects.

## Mocking External Dependencies
- **Isolation**: Unit tests should be isolated from external dependencies (e.g., APIs, file system, network calls).
- **Mocking**: Use Jest's mocking capabilities (`jest.mock()`, `jest.fn()`, `mockResolvedValueOnce()`, `mockRejectedValueOnce()`) to simulate the behavior of external modules and functions.
- **Anthropic API**: When testing components that interact with the Anthropic API, mock the `@anthropic-ai/sdk` to prevent actual API calls. Ensure `messages.create` is mocked appropriately.
- **File System**: When testing components that interact with the file system, mock the `fs/promises` module to avoid actual file operations.

## Console Output in Tests
- **Spying on Console**: When testing code that produces `console.log` or `console.error` output, use `jest.spyOn(console, 'log').mockImplementation(...)` to capture or suppress console output.
- **Stripping ANSI Codes**: If the production code includes ANSI escape codes for colored output, ensure these are stripped in the test's mock implementation of `console.log` to allow for plain text assertions.
- **Assertions**: Assert on the captured console output using `toContain` or `not.toContain` on the flattened array of mock calls (`consoleLogSpy.mock.calls.flat()`).

## Test File Structure
- **Naming Convention**: Test files should follow the `*.test.ts` naming convention (e.g., `src/agent.test.ts`, `src/tools/read-file.test.ts`).
- **Location**: Place test files alongside the code they are testing, typically in the same directory or a dedicated `__tests__` subdirectory if preferred for larger modules.

## Test Execution
- **NPM Script**: Run tests using the `npm test` command, which is configured to execute Jest.