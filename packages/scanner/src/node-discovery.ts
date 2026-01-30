import fs from "fs/promises";
import path from "path";

const ENTRY_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js", "layout.tsx", "layout.ts", "layout.jsx", "layout.js"];

/**
 * Discovers Next.js entry points (page.tsx and layout.tsx) in an app directory.
 * @param appDir The path to the Next.js app directory
 * @returns Array of absolute paths to entry point files
 */
export async function discoverEntryPoints(appDir: string): Promise<string[]> {
  const entryPoints: string[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
          await walkDir(fullPath);
        }
      } else if (entry.isFile() && ENTRY_FILES.includes(entry.name)) {
        entryPoints.push(fullPath);
      }
    }
  }

  await walkDir(appDir);
  return entryPoints.sort();
}
