# implementation Plan: `packages/scanner`

## Goal

Create a Node.js and Browser compatible package (isomorphic) that accepts React component source code (as a string) and extracts information about used child components.

## Architecture

- **Input**: Source code string (no file system access).
- **Core Dependencies**: `@babel/parser`, `@babel/traverse`, `@babel/types`.
- **Environment**: Isomorphic (Node.js + Browser).

## Todo List

- [x] **Setup Dependencies**: Install `@babel/parser`, `@babel/traverse`, `@babel/types` in `packages/scanner`.
- [ ] **Define Types**: Create TypeScript interfaces for the scanner output (e.g., `ComponentInfo`, `ScanResult`).
- [ ] **Implement Core Scanner**:
  - [ ] Setup parser to handle TypeScript and JSX.
  - [ ] Implement Import Collection (gathering all imports and their local names).
  - [ ] Implement JSX Traversal (identifying JSX tags).
  - [ ] Implement Resolution Logic (linking JSX tags to Imports).
- [ ] **Refine Heuristics**:
  - [ ] Handle Named Imports (`import { A } ...`).
  - [ ] Handle Default Imports (`import A ...`).
  - [ ] Handle Aliased Imports (`import { A as B } ...`).
  - [ ] Handle Namespace Imports (`import * as N ...`).
  - [ ] Handle Local Component Definitions.
- [ ] **Add Tests**: Create unit tests with hardcoded component strings to verify detection logic.
