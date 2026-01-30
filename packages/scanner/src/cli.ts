import fs from "fs";
import path from "path";
import { Crawler } from "./crawler.js";
import { NodeHost } from "./node-host.js";
import { ProjectScanner } from "./project-scanner.js";
import { discoverEntryPoints } from "./node-discovery.js";

const runFileMode = async (entryPath: string) => {
  console.log(`Starting crawl from: ${entryPath}`);

  const host = new NodeHost();
  const crawler = new Crawler(host);

  const start = Date.now();
  const results = await crawler.crawl(entryPath);
  const end = Date.now();

  console.log("\n--- Crawl Results ---\n");
  console.log(`Scanned ${results.size} files in ${end - start}ms`);

  // Sort keys for deterministic output
  const files = Array.from(results.keys()).sort();

  files.forEach((file) => {
    const result = results.get(file)!;
    const relativePath = path.relative(process.cwd(), file);

    console.log(`\nFile: ${relativePath}`);
    console.log(
      `Client Component: ${result.metadata.component.isClientComponent}`,
    );

    if (result.children.length > 0) {
      console.log(`Children:`);
      result.children.forEach((child) => {
        const childRel = path.relative(process.cwd(), child.childId);
        console.log(`  - <${child.params.name} /> -> ${childRel}`);
      });
    } else {
      console.log("Children: (none)");
    }
  });
};

const runDirectoryMode = async (appDir: string) => {
  console.error(`Discovering entry points in: ${appDir}`);

  const entryPoints = await discoverEntryPoints(appDir);

  if (entryPoints.length === 0) {
    console.error("No page.tsx or layout.tsx files found");
    process.exit(1);
  }

  console.error(`Found ${entryPoints.length} entry points`);

  const host = new NodeHost();
  const scanner = new ProjectScanner(host);

  const start = Date.now();
  const result = await scanner.scan(entryPoints, appDir);
  const end = Date.now();

  console.error(`Scanned in ${end - start}ms`);

  // Output JSON to stdout
  console.log(JSON.stringify(result, null, 2));
};

const main = async () => {
  const entryArg = process.argv[2];

  if (!entryArg) {
    console.error("Usage: scanner <file|directory>");
    console.error("  file:      Scan a single file and print component tree");
    console.error("  directory: Scan Next.js app directory and output JSON");
    process.exit(1);
  }

  const entryPath = path.resolve(process.cwd(), entryArg);

  // Detect if input is directory or file
  const stat = fs.statSync(entryPath);

  if (stat.isDirectory()) {
    await runDirectoryMode(entryPath);
  } else {
    await runFileMode(entryPath);
  }
};

main().catch(console.error);
