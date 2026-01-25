import { Crawler } from "./crawler.js";
import { NodeHost } from "./node-host.js";
import path from "path";

const main = async () => {
  const entryArg = process.argv[2];

  if (!entryArg) {
    console.error("Please provide an entry file path");
    process.exit(1);
  }

  const entryPath = path.resolve(process.cwd(), entryArg);
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

main().catch(console.error);
