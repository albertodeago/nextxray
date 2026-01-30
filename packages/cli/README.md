# @nextxray/cli

Command-line interface for scanning Next.js projects.

## Usage

```bash
# Scan a single file (prints component tree to stdout)
nextxray path/to/page.tsx

# Scan entire app directory (outputs JSON to stdout)
nextxray path/to/app
```

## Modes

### File Mode

Scans a single file and recursively crawls its imports. Prints a human-readable component tree.

```bash
$ nextxray app/page.tsx

Starting crawl from: /project/app/page.tsx

--- Crawl Results ---

Scanned 5 files in 42ms

File: app/page.tsx
Client Component: false
Children:
  - <Header /> -> components/Header.tsx
  - <Button /> -> components/ui/Button.tsx

File: components/Header.tsx
Client Component: true
Children: (none)
...
```

### Directory Mode

Scans an entire Next.js app directory. Discovers all entry points (`page.tsx`, `layout.tsx`) and outputs full project analysis as JSON.

```bash
$ nextxray app > results.json

Discovering entry points in: /project/app
Found 12 entry points
Scanned in 156ms
```

Output JSON structure:
```json
{
  "routes": [
    {
      "route": "/blog",
      "entryType": "page",
      "entryFile": "/project/app/blog/page.tsx",
      "tree": { /* ScanResult */ }
    }
  ],
  "stats": {
    "totalFiles": 45,
    "clientComponents": 12,
    "serverComponents": 33,
    "ratio": 0.267
  },
  "results": { /* all ScanResult by file path */ }
}
```

## Development

```bash
# Run CLI in development
npm run cli -- path/to/app

# Build
npm run build
```
