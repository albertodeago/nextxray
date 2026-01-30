import fs from "fs";
import path from "path";
import EnhancedResolve from "enhanced-resolve";
import { ScannerHost } from "./contract.js";

const { ResolverFactory, CachedInputFileSystem } = EnhancedResolve;

// Create a resolver instance that mimics Node.js resolution + TypeScript support
const resolver = ResolverFactory.createResolver({
  // Use the cached file system to avoid hitting the disk too often
  // eslint-disable-next-line @typescript-eslint/no-explicit-any - Types are incompatible but it should work
  fileSystem: new CachedInputFileSystem(fs as any, 4000),
  // Extensions to try when resolving
  extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".d.ts"],
  // Main fields in package.json to look for
  mainFields: ["browser", "module", "main"],
  // Prefer relative paths? Yes.
  preferRelative: true,
  // Use node_modules? Yes.
  modules: ["node_modules"],
  // Condition names for exports field (modern node resolution)
  conditionNames: ["import", "module", "require", "node", "browser"],
});

export class NodeHost implements ScannerHost {
  private fileCache = new Map<string, string>();

  async readFile(filePath: string): Promise<string> {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }

    const content = await fs.promises.readFile(filePath, "utf-8");
    this.fileCache.set(filePath, content);
    return content;
  }

  async resolve(source: string, importer: string): Promise<string | null> {
    return new Promise((resolve) => {
      const context = path.dirname(importer);

      resolver.resolve({}, context, source, {}, (err, filepath) => {
        if (err || !filepath) {
          // Enhanced-resolve throws/returns error if not found.
          // We just return null as per our contract.
          resolve(null);
        } else {
          resolve(filepath);
        }
      });
    });
  }
}
