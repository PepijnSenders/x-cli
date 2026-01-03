# Contributing to X CLI

Thank you for your interest in contributing to x-cli! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- Node.js 18+ (for compatibility)
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/x-cli
   cd x-cli
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Run in development mode:
   ```bash
   bun run dev <command>
   ```

### Project Structure

```
x-cli/
├── src/
│   ├── api/          # X API clients (posts, users, dm, etc.)
│   ├── auth/         # OAuth 2.0 PKCE authentication
│   ├── cli/          # Commander.js command definitions
│   ├── config/       # Configuration and token management
│   ├── output/       # Formatters (JSON, pretty, tables)
│   └── types/        # Zod schemas and TypeScript types
├── tests/            # Test files
├── .github/          # GitHub Actions workflows
└── docs/             # Documentation
```

## Development Workflow

### Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Type check
bun run typecheck
```

### Building

```bash
# Build binary for current platform
bun run build

# Build for specific platforms
bun run build:darwin      # macOS ARM64
bun run build:darwin-x64  # macOS x64
bun run build:linux       # Linux x64
bun run build:win         # Windows x64
```

### Code Style

- TypeScript strict mode is enabled
- Use Zod schemas for all API response validation
- Follow existing patterns in the codebase
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Commit Messages

Use conventional commit format:

```
type: short description

longer description if needed
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: add user search command
fix: handle rate limit errors gracefully
docs: update README with new commands
```

## Adding New Features

### Adding a New API Client

1. Create a new file in `src/api/`:
   ```typescript
   // src/api/newfeature.ts
   import { z } from "zod";
   import { getClient } from "./client.js";

   const ResponseSchema = z.object({
     // Define response shape
   });

   export async function newFunction() {
     const client = getClient();
     return client.get("/endpoint", ResponseSchema);
   }
   ```

2. Export from `src/api/index.ts` if needed

### Adding a New CLI Command

1. Create a new file in `src/cli/`:
   ```typescript
   // src/cli/newcommand.ts
   import { Command } from "commander";
   import { output, isJsonMode } from "../output/index.js";

   export function createNewCommand(): Command {
     return new Command("newcmd")
       .description("Description here")
       .argument("<arg>", "Argument description")
       .option("--flag", "Flag description")
       .action(async (arg, options) => {
         // Implementation
       });
   }
   ```

2. Register in `src/index.ts`:
   ```typescript
   import { createNewCommand } from "./cli/newcommand.js";
   program.addCommand(createNewCommand());
   ```

### Adding New Types

1. Create or update schemas in `src/types/`:
   ```typescript
   // src/types/newtype.ts
   import { z } from "zod";

   export const NewTypeSchema = z.object({
     id: z.string(),
     name: z.string(),
   });

   export type NewType = z.infer<typeof NewTypeSchema>;
   ```

2. Export from `src/types/index.ts`

## Testing

### Writing Tests

Tests use Bun's built-in test runner:

```typescript
// tests/newfeature.test.ts
import { describe, it, expect } from "bun:test";

describe("newFeature", () => {
  it("should do something", () => {
    expect(result).toBe(expected);
  });
});
```

### Test Guidelines

- Test both success and error cases
- Mock API calls when possible
- Keep tests focused and isolated
- Use descriptive test names

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and ensure:
   - All tests pass: `bun test`
   - Type checking passes: `bun run typecheck`
   - Code follows existing style

3. Commit your changes with a descriptive message

4. Push to your fork and create a pull request

5. In your PR description:
   - Describe the changes
   - Link any related issues
   - Include test coverage for new code

## Reporting Issues

When reporting bugs, please include:

- x-cli version (`x --version`)
- Operating system and version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## Getting Help

- Check existing [issues](https://github.com/ps/x-cli/issues)
- Read the [documentation](docs/)
- Ask questions in issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
