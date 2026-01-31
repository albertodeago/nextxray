# Next.js X-Ray

Static analysis tool for visualizing Next.js component trees. See which components are server vs client, understand your app's component hierarchy, and identify optimization opportunities.

**[Try it online](https://albertodeago.github.io/nextxray/)** - No installation required, runs entirely in your browser (no data sent anywhere).

## Features

- Visualize component trees with server/client boundaries
- Identify "use client" directives and their cascade effects
- Analyze route structure and shared components
- Works with TypeScript path aliases (`@/*`, etc.)

## Usage

Roadmap

- [x] Web application using File System Access API
- [] Publish packages (cli) to enable usages without UI
- [] (Maybe?) create Github Action for automatic reports (or show an example)

### Web App

Visit [albertodeago.github.io/nextxray](https://albertodeago.github.io/nextxray/) and select your Next.js project folder. Uses the File System Access API (Chrome/Edge/Opera).

### CLI

```bash
npx @nextxray/cli <path>
```

**File mode** - Analyze a single component:

```bash
npx @nextxray/cli src/app/page.tsx
```

**Directory mode** - Analyze entire project:

```bash
npx @nextxray/cli .
```

## Packages

| Package                                | Description                                   |
| -------------------------------------- | --------------------------------------------- |
| [@nextxray/core](packages/core/)       | Platform-agnostic AST parsing engine          |
| [@nextxray/node](packages/node/)       | Node.js filesystem implementation             |
| [@nextxray/browser](packages/browser/) | Browser File System Access API implementation |
| [@nextxray/cli](packages/cli/)         | Command-line interface                        |

## Development

> [!TIP]
> Application is deployed automatically in GitHub Pages on push to `main` branch.

## License

MIT
