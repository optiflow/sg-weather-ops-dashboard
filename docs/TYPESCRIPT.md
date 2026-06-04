# TypeScript Conventions

The `sg-weather-ops-dashboard` project enforces strict TypeScript across both frontend and backend workspaces.

## Configuration Differences

Because this is a full-stack monorepo, the TypeScript environments differ slightly by workspace:

- **Frontend (`frontend/tsconfig.json`)**:
  - Uses `Bundler` module resolution.
  - Relies on Vite for actual transpilation (`"noEmit": true`).
  - Optimized for React (`"jsx": "react-jsx"`).
- **Backend (`backend/tsconfig.json`)**:
  - Uses `NodeNext` for both module and module resolution.
  - Compiles output to the `dist` folder.
  - Targets `ES2022`.

## Core Guidelines

### 1. Strict Typing

The project runs with `"strict": true` everywhere.

- **No Implicit Any:** Always define types for function parameters and return values if they cannot be inferred.
- **Error Handling:** Caught errors in `catch` blocks are typed as `unknown`. You must check `err instanceof Error` before accessing `err.message`.

### 2. Type Inference vs. Explicit Types

- Rely on TypeScript's inference for simple variables and standard React hook initializations where the type is obvious.
- Use explicit types for complex `useState` hooks, context definitions, and function signatures.

### 3. Centralized Types

To avoid circular dependencies and keep components clean, prefer defining shared interfaces and types in dedicated files (e.g., `types.ts` or `src/types/index.ts`) and importing them using the `import type` syntax:

```typescript
import type { Location, StoreValue } from '../types';
```

## Type Checking

Type checking is integrated into the build pipeline. To manually verify types without running a full build, you can run the TypeScript compiler directly from the respective workspace:

- `npx tsc --noEmit` (Frontend)
- `npx tsc --noEmit` (Backend)
