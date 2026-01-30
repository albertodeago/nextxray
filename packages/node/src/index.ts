// Node.js specific implementations
export { NodeHost } from "./node-host.js";
export type { NodeHostOptions } from "./node-host.js";
export { ProjectScanner } from "./project-scanner.js";
export { discoverEntryPoints } from "./node-discovery.js";

// Re-export core for convenience
export {
  scan,
  Crawler,
  aggregate,
  calculateStats,
  extractRoute,
  getEntryType,
} from "@nextxray/core";

// Re-export types
export type {
  AnalyzedComponent,
  ScanContext,
  ScanResult,
  ScannerHost,
  EntryType,
  RouteEntry,
  SharedComponentUsage,
  ProjectStats,
  ProjectScanResult,
} from "@nextxray/core";
