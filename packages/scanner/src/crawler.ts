import { ScannerHost, ScanResult } from "./contract.js";
import { scan } from "./index.js";
import { debug } from "./debug.js";

export class Crawler {
  private host: ScannerHost;
  private visited = new Set<string>();
  private results = new Map<string, ScanResult>();

  constructor(host: ScannerHost) {
    this.host = host;
  }

  async crawl(entryPath: string): Promise<Map<string, ScanResult>> {
    // If already visited, return the current results to stop recursion
    if (this.visited.has(entryPath)) {
      return this.results;
    }

    this.visited.add(entryPath);
    debug(`[crawler] Crawling ${entryPath}`);

    let code: string;
    try {
      code = await this.host.readFile(entryPath);
    } catch (e) {
      console.error(`[crawler] Failed to read file: ${entryPath}`, e);
      // We return the partial graph we have so far
      return this.results;
    }

    // specific handling for JSON files (like package.json) if needed,
    // but for now assume we only crawl valid source code.
    // The scanner expects JS/TS/JSX content.

    let analysis;
    try {
      analysis = scan({ code });
    } catch (e) {
      console.error(`[crawler] Failed to scan file: ${entryPath}`, e);
      return this.results;
    }

    const children: ScanResult["children"] = [];

    // Resolve dependencies (imports)
    // We process them sequentially to keep it simple, but could be parallelized.
    for (const imported of analysis.importedComponents) {
      try {
        const resolvedPath = await this.host.resolve(
          imported.source,
          entryPath,
        );

        if (resolvedPath) {
          children.push({
            params: {
              name: imported.name,
              source: imported.source,
            },
            childId: resolvedPath,
          });

          // Recursively crawl the child
          await this.crawl(resolvedPath);
        } else {
          debug(
            `[crawler] Could not resolve ${imported.source} from ${entryPath}`,
          );
        }
      } catch (e) {
        console.error(
          `[crawler] Error resolving ${imported.source} from ${entryPath}`,
          e,
        );
      }
    }

    const result: ScanResult = {
      id: entryPath,
      metadata: analysis,
      children,
    };

    this.results.set(entryPath, result);

    return this.results;
  }
}
