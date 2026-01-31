# Next.js Component Scanner

Monorepo for static analysis of Next.js component trees. Layered architecture: core (platform-agnostic) → node/browser (platform-specific) → cli/apps.

## Packages

### @nextxray/core

Platform-agnostic AST parsing engine using Babel.

**Key exports:**

- `scan()` - Parse single file, extract "use client", imports, exports
- `Crawler` - Recursively traverse component trees from entry points
- `aggregate()` / `calculateStats()` - Transform results into route entries + stats
- `createPathAliasResolver()` - Resolve TS path aliases (@/\*, etc.)
- `parseTsconfig()` / `mergeTsconfigs()` - TSConfig utilities
- Types: `ScanResult`, `ScannerHost`, `RouteEntry`, `ProjectStats`

### @nextxray/node

Node.js implementation for filesystem scanning.

**Key exports:**

- `NodeHost` - `ScannerHost` impl with caching
- `ProjectScanner` - High-level project scanning API
- `discoverEntryPoints()` - Find page.tsx/layout.tsx in app dir
- Re-exports all core functionality

**Deps:** enhanced-resolve (webpack's resolution algorithm)

### @nextxray/browser

Browser implementation using File System Access API (Chrome/Edge/Opera only).

**Key exports:**

- `BrowserHost` - `ScannerHost` impl for browser
- `discoverEntryPoints()` - Find entry points in browser
- `isNextJsProject()` / `isFileSystemAccessSupported()`
- Re-exports all core functionality

### @nextxray/cli

CLI tool: `nextxray`

**Modes:**

- File mode: `nextxray <file>` → human-readable component tree
- Dir mode: `nextxray <dir>` → JSON output (routes, stats, results)

### @repo/ui

Shared React components (button, card, code).

### @repo/eslint-config

Shared ESLint configs: `./base`, `./next-js`, `./react-internal`

### @repo/typescript-config

Shared TS configs (ES2022, NodeNext, strict mode).

## Key Interfaces

```typescript
interface ScannerHost {
  readFile(path: string): Promise<string | null>;
  resolveImport(specifier: string, from: string): Promise<string | null>;
}
```

## Commands

```bash
npm run build        # Build all packages
npm run dev          # Dev mode
npm run lint         # Lint all
npm run ts:check     # Type check
```
