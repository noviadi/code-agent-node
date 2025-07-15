# Technology Stack

## Core Technologies

- **Runtime**: Node.js with TypeScript
- **AI Provider**: Anthropic Claude API (@anthropic-ai/sdk)
- **Schema Validation**: Zod for runtime type checking
- **Environment Management**: dotenv for configuration
- **Testing Framework**: Jest with ts-jest preset
- **Build System**: TypeScript compiler (tsc)

## Build Configuration

- **Target**: ES2020 with CommonJS modules
- **Source Directory**: `./src`
- **Output Directory**: `./dist`
- **Strict Mode**: Enabled for maximum type safety

## Common Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the application
npm start

# Run tests
npm test

# Development workflow
npm run build && npm start
```

## Environment Setup

Required environment variables (see `.env.example`):
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude access

## Dependencies

### Production
- `@anthropic-ai/sdk`: Claude API integration
- `dotenv`: Environment variable management
- `zod`: Schema validation and type safety

### Development
- `typescript`: TypeScript compiler
- `jest` + `ts-jest`: Testing framework
- `@types/node` + `@types/jest`: Type definitions