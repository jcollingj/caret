# Claude Guidelines for this Repository

## Build/Test/Lint Commands

```bash
# Install dependencies
bun install

# Run the application
bun run dev  # shorthand for: node esbuild.config.mjs

# Build for production
bun run build  # shorthand for: tsc -noEmit -skipLibCheck && node esbuild.config.mjs production

# Type check
bun run typecheck  # shorthand for: tsc -noEmit

# Lint code
bun run lint  # shorthand for: eslint .
```

## Code Style Guidelines

### General
- TypeScript is preferred over JavaScript
- Use ESNext features and modern syntax
- Maintain strict type checking (`strict: true`)

### Formatting & Structure
- Use 2-space indentation
- Use semicolons at the end of statements
- Prefer arrow functions for callbacks
- Keep files focused on a single responsibility

### Imports
- Order imports: external libraries first, then internal modules
- Use named imports where possible (`import { x } from 'y'`)
- Avoid wildcard imports (`import * as x from 'y'`)

### Naming Conventions
- `camelCase` for variables, functions, methods
- `PascalCase` for classes, interfaces, and type aliases
- `UPPER_SNAKE_CASE` for constants

### Error Handling
- Use async/await with try/catch for asynchronous operations
- Propagate errors with meaningful context
- Avoid swallowing errors without handling them

### Comments
- Add JSDoc comments for public APIs
- Include type information in comments when types are complex