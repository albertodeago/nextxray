// Core scanning functionality
export { scan } from "./scan.js";

// Crawler for building component trees
export { Crawler } from "./crawler.js";

// Aggregation utilities
export {
  aggregate,
  calculateStats,
  extractRoute,
  extractRouteInfo,
  getEntryType,
} from "./aggregator.js";
export type { RouteInfo } from "./aggregator.js";

// Path alias resolution
export { createPathAliasResolver } from "./path-alias.js";
export type { PathAliasConfig, PathAliasResolver } from "./path-alias.js";

// TSConfig parsing
export { parseTsconfig, mergeTsconfigs } from "./tsconfig-parser.js";
export type { ParsedTsconfig } from "./tsconfig-parser.js";

// Types
export type { AnalyzedComponent, ScanContext } from "./types.js";
export type { ScanResult, ScannerHost } from "./contract.js";
export type {
  EntryType,
  RouteEntry,
  SharedComponentUsage,
  ProjectStats,
  ProjectScanResult,
} from "./project-types.js";
