# @nextxray/core

Platform-agnostic static analysis engine for Next.js component trees. Parses React/TypeScript code to detect client/server components and build dependency graphs.

## How It Works

1. **`scan()`** - Parses a single file's source code using Babel AST to extract:
   - `"use client"` directive detection
   - Imported components (with source paths)
   - Local component definitions
   - Export information

2. **`Crawler`** - Recursively traverses the component tree starting from entry points. Requires a `ScannerHost` implementation for file I/O and import resolution.

3. **`aggregate()` / `calculateStats()`** - Transforms crawl results into route entries and project statistics.

## Usage

### Single File Analysis

```ts
import { scan } from "@nextxray/core";

const result = scan({
  code: `
    "use client";
    import { Button } from "@/components/ui";
    export default function Page() {
      return <Button>Click</Button>;
    }
  `
});

// result.component.isClientComponent → true
// result.importedComponents → [{ name: "Button", source: "@/components/ui", ... }]
```

### Full Project Crawl

```ts
import { Crawler, aggregate, calculateStats, type ScannerHost } from "@nextxray/core";

// Implement ScannerHost for your platform (Node.js, browser, etc.)
const host: ScannerHost = {
  async readFile(path) { /* return file contents */ },
  async resolve(source, importer) { /* return resolved path or null */ }
};

const crawler = new Crawler(host);
const results = await crawler.crawl("/app/page.tsx");

const routes = aggregate(results, ["/app/page.tsx"], "/app");
const stats = calculateStats(results, ["/app/page.tsx"]);
```

### Path Alias Resolution

```ts
import { parseTsconfig, createPathAliasResolver } from "@nextxray/core";

const tsconfig = parseTsconfig(tsconfigContent);
const resolver = createPathAliasResolver({
  baseUrl: tsconfig.baseUrl,
  paths: tsconfig.paths,
  projectRoot: "/project"
});

resolver.resolve("@/components/Button", "/project/app/page.tsx");
// → "/project/src/components/Button"
```

## Types

```ts
interface ScannerHost {
  readFile(path: string): Promise<string>;
  resolve(source: string, importer: string): Promise<string | null>;
}

type ScanResult = {
  id: string;
  metadata: AnalyzedComponent;
  children: { params: { name: string; source: string }; childId: string }[];
};

type AnalyzedComponent = {
  component: { name: string | null; isClientComponent: boolean };
  importedComponents: { name: string; source: string; type: "default" | "named" | "namespace" }[];
  localComponents: string[];
};
```

## Platform Implementations

- **`@nextxray/node`** - Node.js host with filesystem access
- **`@nextxray/browser`** - Browser host using File System Access API
