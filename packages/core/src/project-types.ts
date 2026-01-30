import { ScanResult } from "./contract.js";

export type EntryType = "page" | "layout";

export type RouteEntry = {
  route: string;
  entryType: EntryType;
  entryFile: string;
  tree: ScanResult;
};

export type SharedComponentUsage = {
  id: string;
  usageCount: number;
  usedBy: string[];
};

export type ProjectStats = {
  // File counts
  totalFiles: number;
  totalRoutes: number;
  totalLayouts: number;

  // Component counts (usages across all files)
  totalImportedComponents: number;
  totalLocalComponents: number;

  // Unique component counts
  uniqueImportedComponents: number;
  uniqueLocalComponents: number;

  // Source-level: files with "use client" directive
  clientComponents: number;
  // Source-level: files without "use client" directive
  serverComponents: number;
  // Runtime: files that end up in client bundle (client + descendants of client)
  effectiveClientComponents: number;
  // Runtime: files that stay on server
  effectiveServerComponents: number;
  // Client/total ratio based on effective counts
  ratio: number;

  // Components imported by multiple files
  sharedComponents: SharedComponentUsage[];
};

export type ProjectScanResult = {
  routes: RouteEntry[];
  stats: ProjectStats;
  // All scan results for tree lookup (Record instead of Map for JSON serialization)
  results: Record<string, ScanResult>;
};
