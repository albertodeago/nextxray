# @nextjs-component-scanner/scanner

A deeper static analysis tool for React/Next.js components. It scans source functionality to build a dependency graph of components, detecting "use client" directives, imports, and exports.

## Features

- **Static Analysis**: Uses `@babel/parser` to scan code without executing it.
- **Isomorphic Core**: The core logic is decoupled from the file system, allowing it to run in Node.js or the Browser.
- **Dependency Graphing**: Recursively crawls imports to build a tree of used components.
- **Monorepo Ready**: Uses `enhanced-resolve` to handle workspace packages and aliased imports.

## CLI Usage

You can try out the scanner using the included CLI tool.

### From the root of the monorepo:

```bash
npm run cli --workspace=packages/scanner -- <path-to-entry-file>
```

**Example:**

```bash
npm run cli --workspace=packages/scanner -- apps/web/app/page.tsx
```

## Programmatic Usage

The package exports a recursive `Crawler` and a file-system adapter `NodeHost`.

```typescript
import { Crawler, NodeHost } from "@nextjs-component-scanner/scanner";
import path from "path";

const run = async () => {
  const host = new NodeHost();
  const crawler = new Crawler(host);

  const entryPoint = path.resolve("./src/app/page.tsx");
  const graph = await crawler.crawl(entryPoint);

  console.log(graph);
};

run();
```
