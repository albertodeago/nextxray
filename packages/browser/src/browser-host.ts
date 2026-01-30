import type { ScannerHost } from "@nextxray/core";
import {
  createPathAliasResolver,
  parseTsconfig,
  mergeTsconfigs,
  type PathAliasResolver,
  type ParsedTsconfig,
} from "@nextxray/core";

export interface BrowserHostOptions {
  rootHandle: FileSystemDirectoryHandle;
  rootPath?: string;
  tsconfigPath?: string; // e.g., "tsconfig.json"
}

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const INDEX_FILES = EXTENSIONS.map((ext) => `index${ext}`);

export class BrowserHost implements ScannerHost {
  private rootHandle: FileSystemDirectoryHandle;
  private rootPath: string;
  private tsconfigPath?: string;
  private fileCache = new Map<string, string>();
  private handleCache = new Map<string, FileSystemFileHandle>();
  private aliasResolver: PathAliasResolver | null | undefined = undefined; // undefined = not loaded yet

  constructor(options: BrowserHostOptions) {
    this.rootHandle = options.rootHandle;
    this.rootPath = options.rootPath ?? "/";
    this.tsconfigPath = options.tsconfigPath;
  }

  async readFile(filePath: string): Promise<string> {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }

    const handle = await this.getFileHandle(filePath);
    if (!handle) {
      throw new Error(`File not found: ${filePath}`);
    }

    const file = await handle.getFile();
    const content = await file.text();
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
        // Try to resolve the aliased path with extensions
        const resolved = await this.tryResolve(aliasedPath);
        if (resolved) {
          return resolved;
        }
      }
    }

    // Skip external packages (not relative paths, not aliases)
    if (!source.startsWith(".") && !source.startsWith("/")) {
      return null;
    }

    // Get the directory of the importer
    const importerDir = this.dirname(importer);

    // Resolve the path relative to importer
    const resolvedPath = this.resolvePath(importerDir, source);

    // Try to find the file with various extensions
    const result = await this.tryResolve(resolvedPath);
    return result;
  }

  private async loadAliasResolver(): Promise<PathAliasResolver | null> {
    try {
      const config = await this.loadTsconfig();
      if (!config?.compilerOptions?.paths) {
        return null;
      }

      // baseUrl is relative to rootPath in browser context
      const baseUrl = config.compilerOptions.baseUrl
        ? this.resolvePath(this.rootPath, config.compilerOptions.baseUrl)
        : this.rootPath;

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
    // Try default tsconfig paths if not specified
    const candidates = this.tsconfigPath
      ? [this.tsconfigPath]
      : ["tsconfig.json", "tsconfig.app.json"];

    for (const candidate of candidates) {
      const fullPath = this.resolvePath(this.rootPath, candidate);
      try {
        const content = await this.readFile(fullPath);
        const config = parseTsconfig(content);

        // Handle extends (limited to same directory in browser)
        if (config.extends) {
          const resolved = await this.loadTsconfigWithExtends(config, fullPath);
          return resolved;
        }

        return config;
      } catch {
        // File doesn't exist, try next
      }
    }

    return null;
  }

  private async loadTsconfigWithExtends(
    config: ParsedTsconfig,
    configPath: string
  ): Promise<ParsedTsconfig> {
    if (!config.extends) {
      return config;
    }

    // Only support relative extends in same directory for browser
    if (!config.extends.startsWith(".")) {
      // Can't resolve node_modules in browser context
      return config;
    }

    const configDir = this.dirname(configPath);
    let extendsPath = this.resolvePath(configDir, config.extends);

    // Add .json if missing
    if (!extendsPath.endsWith(".json")) {
      extendsPath += ".json";
    }

    try {
      const parentContent = await this.readFile(extendsPath);
      const parentConfig = parseTsconfig(parentContent);

      // Recursively handle parent's extends
      const resolvedParent = await this.loadTsconfigWithExtends(
        parentConfig,
        extendsPath
      );

      return mergeTsconfigs(resolvedParent, config);
    } catch {
      // Parent not found, just return current config
      return config;
    }
  }

  private async getFileHandle(
    filePath: string
  ): Promise<FileSystemFileHandle | null> {
    if (this.handleCache.has(filePath)) {
      return this.handleCache.get(filePath)!;
    }

    // Remove root path prefix if present
    let relativePath = filePath;
    if (relativePath.startsWith(this.rootPath)) {
      relativePath = relativePath.slice(this.rootPath.length);
    }
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }

    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length === 0) {
      return null;
    }

    try {
      // Traverse directories to get to the file
      let currentHandle: FileSystemDirectoryHandle = this.rootHandle;

      for (let i = 0; i < parts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(parts[i]!);
      }

      const fileName = parts[parts.length - 1]!;
      const fileHandle = await currentHandle.getFileHandle(fileName);
      this.handleCache.set(filePath, fileHandle);
      return fileHandle;
    } catch {
      return null;
    }
  }

  private async tryResolve(basePath: string): Promise<string | null> {
    // Try exact path first (if it has an extension)
    if (this.hasExtension(basePath)) {
      const handle = await this.getFileHandle(basePath);
      if (handle) return basePath;
      return null;
    }

    // Try adding extensions
    for (const ext of EXTENSIONS) {
      const pathWithExt = `${basePath}${ext}`;
      const handle = await this.getFileHandle(pathWithExt);
      if (handle) return pathWithExt;
    }

    // Try as directory with index file
    for (const indexFile of INDEX_FILES) {
      const indexPath = `${basePath}/${indexFile}`;
      const handle = await this.getFileHandle(indexPath);
      if (handle) return indexPath;
    }

    return null;
  }

  private hasExtension(path: string): boolean {
    const lastPart = path.split("/").pop() ?? "";
    return lastPart.includes(".") && !lastPart.startsWith(".");
  }

  private dirname(filePath: string): string {
    const parts = filePath.split("/");
    parts.pop();
    return parts.join("/") || "/";
  }

  private resolvePath(base: string, relative: string): string {
    if (relative.startsWith("/")) {
      return relative;
    }

    // Remove rootPath prefix from base if present to avoid duplication
    let normalizedBase = base;
    const rootWithoutTrailing = this.rootPath.endsWith("/")
      ? this.rootPath.slice(0, -1)
      : this.rootPath;
    if (normalizedBase.startsWith(rootWithoutTrailing)) {
      normalizedBase = normalizedBase.slice(rootWithoutTrailing.length);
    }

    const baseParts = normalizedBase.split("/").filter(Boolean);
    const relativeParts = relative.split("/");

    for (const part of relativeParts) {
      if (part === ".") {
        continue;
      } else if (part === "..") {
        baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }

    const joinedPath = baseParts.join("/");
    if (this.rootPath.endsWith("/")) {
      return this.rootPath + joinedPath;
    }
    return this.rootPath + "/" + joinedPath;
  }
}
