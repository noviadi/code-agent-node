# Project Structure

## Directory Organization

```
├── src/                    # Source code
│   ├── index.ts           # Application entry point
│   ├── agent.ts           # Core Agent class with conversation logic
│   ├── tools.ts           # Tool interface definition
│   ├── tools/             # Individual tool implementations
│   │   ├── read-file.ts   # File reading tool
│   │   ├── list-files.ts  # Directory listing tool
│   │   ├── edit-file.ts   # File editing tool
│   │   └── *.test.ts      # Tool unit tests
│   └── utils/             # Utility functions
│       └── tool-utils.ts  # Tool schema formatting utilities
├── dist/                  # Compiled JavaScript output
├── .env                   # Environment variables (not in git)
├── .env.example          # Environment template
└── package.json          # Dependencies and scripts
```

## Architecture Patterns

### Dependency Injection
- Agent class accepts tools array in constructor
- Tools are injected at startup in `index.ts`
- Enables easy testing and modularity

### Tool Pattern
- All tools implement the `Tool<TInput, TOutput>` interface
- Each tool defines:
  - `name`: Unique identifier
  - `description`: Human-readable purpose
  - `input_schema`: Zod schema for validation
  - `execute`: Async function implementation

### File Naming Conventions
- Use kebab-case for file names (`read-file.ts`)
- Test files use `.test.ts` suffix
- Index files export main functionality
- Utility files grouped in `utils/` directory

### Code Organization
- One tool per file in `src/tools/`
- Corresponding test file for each tool
- Shared utilities in `src/utils/`
- Main application logic in root `src/`

## Key Files

- `src/index.ts`: CLI setup, tool registration, and app startup
- `src/agent.ts`: Core conversation and tool execution logic
- `src/tools.ts`: Tool interface and type definitions
- `src/utils/tool-utils.ts`: Schema conversion for Anthropic API