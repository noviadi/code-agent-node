# Testing Guidelines

## Shell-Specific Test Execution

### PowerShell Environment
When running in PowerShell (Windows), use proper PowerShell syntax for test commands:

```powershell
# Run specific test files
npm test -- --testPathPattern="file1\.test\.ts|file2\.test\.ts"

# Run tests with verbose output
npm test -- --verbose

# Run tests in specific directory
npm test -- src/cli/components

# Run single test file
npm test -- src/cli/components/configuration-manager.test.ts
```

### Bash/Zsh Environment
When running in Bash or Zsh (Linux/macOS), use proper shell escaping:

```bash
# Run specific test files
npm test -- --testPathPattern="file1.test.ts|file2.test.ts"

# Run tests with verbose output
npm test -- --verbose

# Run tests in specific directory
npm test -- src/cli/components

# Run single test file
npm test -- "src/cli/components/configuration-manager.test.ts"
```

### CMD Environment
When running in Windows CMD, use appropriate escaping:

```cmd
npm test -- --testPathPattern=file1.test.ts^|file2.test.ts

npm test -- --verbose

npm test -- src/cli/components
```

## Test Execution Best Practices

- Always use proper escaping for regex patterns in test path patterns
- Use quotes around file paths that contain spaces or special characters
- For PowerShell, escape backslashes in regex patterns with double backslashes
- When running multiple test files, separate patterns with pipe (|) character
- Use `--verbose` flag for detailed test output during debugging
- Use `--run` flag for tools like vitest to ensure tests terminate properly

## Common Test Commands

### Run All Tests
```
npm test
```

### Run Tests in Watch Mode
```
npm test -- --watch
```

### Run Tests with Coverage
```
npm test -- --coverage
```

### Run Specific Test Suite
```
npm test -- --testNamePattern="describe block name"
```

### Run Tests and Exit (No Watch Mode)
```
npm test -- --watchAll=false
```