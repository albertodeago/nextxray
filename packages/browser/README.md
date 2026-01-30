# @nextxray/browser

Browser implementation of the scanner host using the File System Access API. Enables scanning Next.js projects directly in the browser without a server.

## Features

- Uses File System Access API (`showDirectoryPicker`)
- File and handle caching for performance
- Automatic tsconfig path alias support
- Next.js project detection
- Entry point discovery

## Browser Support

Requires File System Access API (Chrome, Edge, Opera). Not supported in Firefox or Safari.

## Usage

### Full Project Scan

```ts
import {
  BrowserHost,
  Crawler,
  aggregate,
  calculateStats,
  discoverEntryPoints,
  isNextJsProject,
  isFileSystemAccessSupported,
} from "@nextxray/browser";

// Check browser support
if (!isFileSystemAccessSupported()) {
  throw new Error("File System Access API not supported");
}

// Let user pick a directory
const handle = await window.showDirectoryPicker();

// Verify it's a Next.js project
if (!await isNextJsProject(handle)) {
  throw new Error("Not a Next.js project");
}

// Discover entry points
const entryPoints = await discoverEntryPoints(handle, "app", "/");

// Create host and crawl
const host = new BrowserHost({ rootHandle: handle });
const crawler = new Crawler(host);

let results = new Map();
for (const entry of entryPoints) {
  results = await crawler.crawl(entry);
}

// Aggregate results
const routes = aggregate(results, entryPoints, "/app");
const stats = calculateStats(results, entryPoints);
```

### With Progress Callback

```ts
const entryPoints = await discoverEntryPoints(
  handle,
  "app",
  "/",
  (message) => console.log(message) // "Scanning /app/blog..."
);
```

## API

### `BrowserHost`

Implements `ScannerHost` for browser File System Access API.

```ts
interface BrowserHostOptions {
  rootHandle: FileSystemDirectoryHandle;
  rootPath?: string;      // virtual path prefix, defaults to "/"
  tsconfigPath?: string;  // e.g., "tsconfig.json"
}
```

### `discoverEntryPoints`

Finds all `page.tsx` and `layout.tsx` files.

```ts
function discoverEntryPoints(
  rootHandle: FileSystemDirectoryHandle,
  appDirName?: string,    // defaults to "app"
  rootPath?: string,      // defaults to "/"
  onProgress?: (message: string) => void
): Promise<string[]>;
```

### `isNextJsProject`

Checks for `next.config.*` or `next` in package.json.

```ts
function isNextJsProject(handle: FileSystemDirectoryHandle): Promise<boolean>;
```

### `isFileSystemAccessSupported`

Checks if the browser supports the File System Access API.

```ts
function isFileSystemAccessSupported(): boolean;
```

## Re-exports

For convenience, this package re-exports from `@nextxray/core`:
- `scan`, `Crawler`, `aggregate`, `calculateStats`, `extractRoute`, `getEntryType`
- All types: `ScanResult`, `RouteEntry`, `ProjectStats`, etc.
