```markdown
# compound-agent-system Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the key development patterns, coding conventions, and workflows used in the `compound-agent-system` TypeScript project. You'll learn how to structure files, write imports and exports, follow commit conventions, and understand the project's testing approach. This guide is ideal for contributors aiming for consistency and best practices in this codebase.

## Coding Conventions

### File Naming
- Use **snake_case** for all file names.

  **Example:**
  ```
  agent_manager.ts
  compound_calculator.test.ts
  ```

### Import Style
- Use **absolute imports** throughout the codebase.

  **Example:**
  ```typescript
  import { AgentManager } from 'src/agents/agent_manager';
  ```

### Export Style
- Use **named exports** for all modules.

  **Example:**
  ```typescript
  // In agent_manager.ts
  export function createAgent() { ... }
  export const AGENT_VERSION = '1.0';
  ```

### Commit Messages
- Follow **conventional commit** format.
- Use the `feat` prefix for new features.
- Keep commit messages concise (average ~42 characters).

  **Example:**
  ```
  feat: add compound interest calculation
  ```

## Workflows

### Adding a New Feature
**Trigger:** When implementing a new feature or capability  
**Command:** `/add-feature`

1. Create a new file using snake_case naming.
2. Write your code using absolute imports and named exports.
3. Add or update relevant test files (see Testing Patterns).
4. Commit your changes using the `feat:` prefix and a concise description.
5. Open a pull request for review.

### Writing Tests
**Trigger:** When adding or updating functionality  
**Command:** `/write-test`

1. Create a test file with the `.test.` infix (e.g., `compound_calculator.test.ts`).
2. Write tests for your module or function.
3. Ensure tests cover both typical and edge cases.
4. Run tests to verify correctness (testing framework is currently unspecified).

## Testing Patterns

- Test files use the `*.test.*` naming pattern.
- Place tests alongside or near the modules they cover.
- The specific testing framework is not detected, so follow standard TypeScript testing practices.

  **Example:**
  ```
  compound_calculator.test.ts
  ```

  ```typescript
  import { calculateCompoundInterest } from 'src/finance/compound_calculator';

  // Example test (framework-agnostic)
  describe('calculateCompoundInterest', () => {
    it('calculates correctly for annual compounding', () => {
      // Test implementation here
    });
  });
  ```

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /add-feature   | Start the workflow for adding a new feature  |
| /write-test    | Begin writing tests for new or updated code  |
```
