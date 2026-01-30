# implementation Plan: `packages/scanner`

## Goal

Create a Node.js and Browser compatible package (isomorphic) that accepts React component source code (as a string) and extracts information about used child components.

## Architecture

- **Input**: Source code string (no file system access).
- **Core Dependencies**: `@babel/parser`, `@babel/traverse`, `@babel/types`.
- **Environment**: Isomorphic (Node.js + Browser).

## Todo List

- [x] **Setup Dependencies**: Install `@babel/parser`, `@babel/traverse`, `@babel/types` in `packages/scanner`.
- [x] **Define Types**: Create TypeScript interfaces for the scanner output (e.g., `ComponentInfo`, `ScanResult`).
- [x] **Implement Core Scanner**:
  - [x] Setup parser to handle TypeScript and JSX.
  - [x] Implement Import Collection (gathering all imports and their local names).
  - [x] Implement JSX Traversal (identifying JSX tags).
  - [x] Implement Resolution Logic (linking JSX tags to Imports).
- [x] **Refine Heuristics**:
  - [x] Handle Named Imports (`import { A } ...`).
  - [x] Handle Default Imports (`import A ...`).
  - [x] Handle Aliased Imports (`import { A as B } ...`).
  - [x] Handle Namespace Imports (`import * as N ...`).
  - [x] Handle Local Component Definitions.
- [x] **Add Tests**: Create unit tests with hardcoded component strings to verify detection logic.

## Phase 2: Component Tree Crawler

We need to stitch the single-file scans into a graph. To keep this isomorphic, we will invert the control of file access and path resolution.

### New Goals

- Build a dependency graph (Tree/DAG) of components.
- Abstract file system operations behind a `ScannerHost` interface.

### Todo List

- [x] **Define Host Interface**:
  - `read(path: string): Promise<string>`: Fetch file content.
  - `resolve(contextPath: string, importPath: string): Promise<string | null>`: Resolve an import path (e.g. `./button` -> `/abs/path/button.tsx`).
- [x] **Define Tree Types**:
  - `ComponentNode`: Contains `id` (path), `metadata` (from scanner), and `children` (edges).
- [x] **Implement Crawler**:
  - Input: `entryPath` + `ScannerHost`.
  - Logic: Recursive or Queue-based traversal.
  - Features:
    - Cycle detection (visited set).
    - Concurrency control (optional, but good for performance).
- [x] **Implement Node.js Adapter (Wrappers)**:
  - Create a reference implementation of `ScannerHost` for Node.js.
  - Use `fs` for reading.
  - Handle resolution (extensions `.tsx`, `.ts`, `index` files, `tsconfig paths` aliases).

## Phase 3: Next.js Project Scanner

We now have the tools to analyze a single component tree. We need to scale this up to understand a full Next.js application by analyzing its directory structure.

### New Goals

- Automatically discover entry points (`page.tsx`, `layout.tsx`) in the `app/` directory.
- Perform efficient bulk scanning (reusing shared component analysis).
- Aggregate data to answer project-wide questions.

### Todo List

- [x] **Implement File Discovery**:
  - Create logic to recursively find all `page.tsx` and `layout.tsx` files in a given directory (`app/`).
- [x] **Implement Project Scanner**:
  - Input: Project Root Path.
  - Logic:
    - Find all standard Next.js entry points.
    - Run the `Crawler` on each entry point.
    - Use a shared cache/visited map to ensure shared components (like `ui/button`) are only scanned once across the whole project.
- [x] **Data Aggregation**:
  - Create a structure to represent the "Application Map" (Routes -> Component Trees).
  - Calculate stats: Client vs Server component ratio, most used shared components.
- [x] **CLI Update**:
  - Update CLI to accept a directory.
  - If directory -> Run Project Scan.
  - If file -> Run Single Crawler.
- [x] **Improve "use client" detection**:
  - ~~Current implementation uses simple string check (`code.includes('"use client"')`) which can give false positives if the string appears in comments.~~
  - Now uses AST-based detection via `ast.program.directives` - no false positives from comments, strings, or JSX content.

## Phase 3.5: Browser Compatibility Safety Check

Ensure we haven't accidentally coupled the core logic to Node.js APIs.

- [ ] **Browser Test**:
  - Create a test that runs the `scan` function (without `NodeHost`) in a simulated browser environment (or just verify imports).
  - Ensure no `fs`, `path`, or `enhanced-resolve` imports leak into the core `scanner/index.ts` or visitors.

## Phase 4: Browser Implementation

Bring the scanner to the web using the File System Access API.

### Todo List

- [ ] **Browser Host Adapter**:
  - Implement `ScannerHost` using `FileSystemDirectoryHandle`.
  - Implement a basic resolution strategy for the browser (mapping paths to handles).
- [ ] **Web UI**:
  - Simple React UI to pick a folder.
  - Visualize the dependency graph (D3.js or React Flow?).
