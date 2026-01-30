# @nextxray/node

Node.js implementation of the scanner host for analyzing Next.js projects from the filesystem.

## Features

- Filesystem-based file reading with caching
- Import resolution via `enhanced-resolve` (same algorithm as webpack)
- Automatic tsconfig path alias support (`@/*`, etc.)
- Entry point discovery for Next.js app router

## Usage

### Scan a Full Project

```ts
import { NodeHost, ProjectScanner, discoverEntryPoints } from "@nextxray/node";

const appDir = "/path/to/project/app";
const entryPoints = await discoverEntryPoints(appDir);

const host = new NodeHost({ projectRoot: "/path/to/project" });
const scanner = new ProjectScanner(host);

const result = await scanner.scan(entryPoints, appDir);
// result.routes - array of RouteEntry with component trees
// result.stats - project statistics
// result.results - all scan results for tree lookups
```

### Scan a Single Entry Point

```ts
import { NodeHost, Crawler } from "@nextxray/node";

const host = new NodeHost();
const crawler = new Crawler(host);

const results = await crawler.crawl("/path/to/app/page.tsx");
// results is Map<string, ScanResult>
```

### With Custom tsconfig Path

```ts
const host = new NodeHost({
  projectRoot: "/path/to/project",
  tsconfigPath: "tsconfig.app.json", // relative to projectRoot
});
```

## API

### `NodeHost`

Implements `ScannerHost` interface for Node.js filesystem.

```ts
interface NodeHostOptions {
  projectRoot?: string;  // defaults to process.cwd()
  tsconfigPath?: string; // defaults to auto-detect tsconfig.json
}
```

### `ProjectScanner`

High-level API for scanning entire projects.

```ts
class ProjectScanner {
  constructor(host: ScannerHost);
  scan(entryPoints: string[], appDir: string): Promise<ProjectScanResult>;
}
```

### `discoverEntryPoints`

Finds all `page.tsx` and `layout.tsx` files in an app directory.

```ts
function discoverEntryPoints(appDir: string): Promise<string[]>;
```

## Re-exports

For convenience, this package re-exports from `@nextxray/core`:
- `scan`, `Crawler`, `aggregate`, `calculateStats`, `extractRoute`, `getEntryType`
- All types: `ScanResult`, `RouteEntry`, `ProjectStats`, etc.
