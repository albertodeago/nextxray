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
  totalFiles: number;
  // Source-level: files with "use client" directive
  clientComponents: number;
  // Source-level: files without "use client" directive
  serverComponents: number;
  // Runtime: files that end up in client bundle (client + descendants of client)
  effectiveClientComponents: number;
  // Runtime: files that stay on server
  effectiveServerComponents: number;
  // Ratio based on effective counts
  ratio: number;
  sharedComponents: SharedComponentUsage[];
};

export type ProjectScanResult = {
  routes: RouteEntry[];
  stats: ProjectStats;
};
