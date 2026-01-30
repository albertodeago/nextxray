import fs from "fs";
import path from "path";
import EnhancedResolve from "enhanced-resolve";
import type { ScannerHost } from "@nextxray/core";
import {
  createPathAliasResolver,
  parseTsconfig,
  mergeTsconfigs,
  type PathAliasResolver,
  type ParsedTsconfig,
} from "@nextxray/core";

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

export interface NodeHostOptions {
  tsconfigPath?: string; // optional, defaults to auto-detect
  projectRoot?: string; // for tsconfig lookup, defaults to cwd
}

export class NodeHost implements ScannerHost {
  private fileCache = new Map<string, string>();
  private projectRoot: string;
  private tsconfigPath?: string;
  private aliasResolver: PathAliasResolver | null | undefined = undefined; // undefined = not loaded yet

  constructor(options: NodeHostOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
    this.tsconfigPath = options.tsconfigPath;
  }

  async readFile(filePath: string): Promise<string> {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }

    const content = await fs.promises.readFile(filePath, "utf-8");
    this.fileCache.set(filePath, content);
    return content;
  }

  async resolve(source: string, importer: string): Promise<string | null> {
    // Lazy load alias resolver on first call
    if (this.aliasResolver === undefined) {
      this.aliasResolver = await this.loadAliasResolver();
    }

    // Try alias resolution first
    if (this.aliasResolver) {
      const aliasedPath = this.aliasResolver.resolve(source);
      if (aliasedPath) {
        // Resolve the aliased path with enhanced-resolve to handle extensions/index
        const resolved = await this.resolveWithEnhanced(aliasedPath, importer);
        if (resolved) {
          return resolved;
        }
      }
    }

    // Fall back to standard resolution
    return this.resolveWithEnhanced(source, importer);
  }

  private resolveWithEnhanced(
    source: string,
    importer: string
  ): Promise<string | null> {
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

  private async loadAliasResolver(): Promise<PathAliasResolver | null> {
    try {
      const config = await this.loadTsconfig();
      if (!config?.compilerOptions?.paths) {
        return null;
      }

      const baseUrl = config.compilerOptions.baseUrl
        ? path.resolve(this.projectRoot, config.compilerOptions.baseUrl)
        : this.projectRoot;

      return createPathAliasResolver({
        baseUrl,
        paths: config.compilerOptions.paths,
      });
    } catch {
      // Graceful fallback on error
      return null;
    }
  }

  private async loadTsconfig(): Promise<ParsedTsconfig | null> {
    // Find tsconfig path
    const tsconfigPath = this.tsconfigPath
      ? path.resolve(this.projectRoot, this.tsconfigPath)
      : await this.findTsconfig();

    if (!tsconfigPath) {
      return null;
    }

    // Load and parse with extends chain
    return this.loadTsconfigWithExtends(tsconfigPath);
  }

  private async findTsconfig(): Promise<string | null> {
    const candidates = ["tsconfig.json", "tsconfig.app.json"];

    for (const candidate of candidates) {
      const fullPath = path.join(this.projectRoot, candidate);
      try {
        await fs.promises.access(fullPath);
        return fullPath;
      } catch {
        // File doesn't exist, try next
      }
    }

    return null;
  }

  private async loadTsconfigWithExtends(
    tsconfigPath: string
  ): Promise<ParsedTsconfig> {
    const content = await fs.promises.readFile(tsconfigPath, "utf-8");
    const config = parseTsconfig(content);

    if (!config.extends) {
      return config;
    }

    // Resolve extends path relative to current tsconfig
    const extendsPath = this.resolveExtendsPath(
      config.extends,
      path.dirname(tsconfigPath)
    );

    try {
      const parentConfig = await this.loadTsconfigWithExtends(extendsPath);
      return mergeTsconfigs(parentConfig, config);
    } catch {
      // Parent not found, just return current config
      return config;
    }
  }

  private resolveExtendsPath(extendsValue: string, baseDir: string): string {
    // Handle relative paths
    if (extendsValue.startsWith(".")) {
      let resolved = path.resolve(baseDir, extendsValue);
      // Add .json if missing
      if (!resolved.endsWith(".json")) {
        resolved += ".json";
      }
      return resolved;
    }

    // Handle node_modules packages (e.g., "@tsconfig/node18/tsconfig.json")
    // Try to resolve from node_modules
    const possiblePaths = [
      path.join(baseDir, "node_modules", extendsValue),
      path.join(this.projectRoot, "node_modules", extendsValue),
    ];

    for (const p of possiblePaths) {
      let resolved = p;
      if (!resolved.endsWith(".json")) {
        resolved += ".json";
      }
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    // Default: treat as relative
    return path.resolve(baseDir, extendsValue);
  }
}
