# Next.js X-Ray - Future Plans

## Current State

Phase 4 (Browser MVP) is complete. The scanner works in the browser via File System Access API.

## Known Limitations

- No tsconfig path alias support (relative imports only)
- External packages always return null (expected)
- No `node_modules` resolution (not needed for component scanning)
- File System Access API: Chrome/Edge only (no Firefox/Safari)

## Phase 5: Path Alias Support

**Goal**: Resolve `@/components/*` and other tsconfig path aliases

**Tasks**:
- Parse `tsconfig.json` from project root
- Extract `compilerOptions.paths` and `baseUrl`
- Implement alias resolution in both BrowserHost and NodeHost
- Handle `paths` with wildcards (`@/*` → `./src/*`)

## Phase 6: UI Improvements

**Goal**: Replace JSON dump with proper visualization

**Tasks**:
- Component tree visualization (collapsible tree view)
- Route-by-route breakdown with stats
- Client/server component highlighting (color coding)
- Shared components panel with usage graph
- Search/filter by component name or route

## Phase 7: Analysis Features

**Goal**: Add actionable insights

**Ideas**:
- "Client boundary opportunities" - server components that could stay server
- Large component detection (high import count)
- Circular dependency detection
- Unused local component detection
- Route complexity score

## Phase 8: Export & Integration

**Ideas**:
- Export to JSON/CSV
- GitHub Action for CI scanning
- VS Code extension
- Comparison between scans (track changes over time)

## Unresolved Questions

1. Should path alias support be browser-only or also improve NodeHost?
2. Priority: UI improvements vs analysis features?
3. Target audience: developers debugging or architects auditing?
