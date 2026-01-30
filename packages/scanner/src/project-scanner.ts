import { ScannerHost, ScanResult } from "./contract.js";
import { Crawler } from "./crawler.js";
import { aggregate, calculateStats } from "./aggregator.js";
import { ProjectScanResult } from "./project-types.js";

export class ProjectScanner {
  private host: ScannerHost;

  constructor(host: ScannerHost) {
    this.host = host;
  }

  /**
   * Scans a Next.js project starting from the given entry points.
   * Uses a single Crawler instance to share cache across all entry points.
   * @param entryPoints Array of absolute paths to page.tsx/layout.tsx files
   * @param appDir The path to the app directory (for route extraction)
   */
  async scan(entryPoints: string[], appDir: string): Promise<ProjectScanResult> {
    // Single crawler instance ensures cache sharing
    const crawler = new Crawler(this.host);
    let results = new Map<string, ScanResult>();

    // Crawl each entry point - crawler handles deduplication via visited set
    for (const entry of entryPoints) {
      results = await crawler.crawl(entry);
    }

    const routes = aggregate(results, entryPoints, appDir);
    const stats = calculateStats(results, entryPoints);

    return { routes, stats };
  }
}
