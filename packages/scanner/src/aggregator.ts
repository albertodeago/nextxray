import { ScanResult } from "./contract.js";
import {
  EntryType,
  RouteEntry,
  ProjectStats,
  SharedComponentUsage,
} from "./project-types.js";

/**
 * Extracts the route from a file path relative to the app directory.
 * e.g. app/(marketing)/blog/[slug]/page.tsx → /blog/[slug]
 */
export function extractRoute(filePath: string, appDir: string): string {
  // Normalize paths for comparison
  const normalizedFile = filePath.replace(/\\/g, "/");
  const normalizedAppDir = appDir.replace(/\\/g, "/").replace(/\/$/, "");

  // Get relative path from app dir
  let relative = normalizedFile;
  if (normalizedFile.startsWith(normalizedAppDir)) {
    relative = normalizedFile.slice(normalizedAppDir.length);
  }

  // Remove leading slash
  if (relative.startsWith("/")) {
    relative = relative.slice(1);
  }

  // Split into segments
  const segments = relative.split("/");

  // Remove filename (page.tsx, layout.tsx, etc.)
  segments.pop();

  // Filter out group folders (parenthesized) and build route
  const routeSegments = segments.filter((seg) => !seg.match(/^\(.*\)$/));

  // Build final route
  const route = "/" + routeSegments.join("/");

  // Normalize trailing slash for root
  return route === "/" ? "/" : route.replace(/\/$/, "");
}

/**
 * Determines entry type from filename.
 */
export function getEntryType(filePath: string): EntryType {
  const fileName = filePath.split("/").pop() || "";
  if (fileName.startsWith("layout.")) {
    return "layout";
  }
  return "page";
}

/**
 * Aggregates crawl results into RouteEntry array.
 */
export function aggregate(
  results: Map<string, ScanResult>,
  entryPoints: string[],
  appDir: string
): RouteEntry[] {
  return entryPoints.map((entryFile) => {
    const tree = results.get(entryFile);
    if (!tree) {
      throw new Error(`No scan result found for entry point: ${entryFile}`);
    }

    return {
      route: extractRoute(entryFile, appDir),
      entryType: getEntryType(entryFile),
      entryFile,
      tree,
    };
  });
}

/**
 * Calculates project statistics from scan results.
 */
export function calculateStats(
  results: Map<string, ScanResult>,
  entryPoints: string[]
): ProjectStats {
  const totalFiles = results.size;
  let clientComponents = 0;
  let serverComponents = 0;

  // Track usage of each file
  const usageMap = new Map<string, Set<string>>();

  // Track which files are effectively in the client bundle
  const effectiveClientSet = new Set<string>();

  // Initialize usage map and count source-level components
  for (const [id, result] of results) {
    if (result.metadata.component.isClientComponent) {
      clientComponents++;
      effectiveClientSet.add(id);
    } else {
      serverComponents++;
    }

    // Track which files use each child
    for (const child of result.children) {
      if (!usageMap.has(child.childId)) {
        usageMap.set(child.childId, new Set());
      }
      usageMap.get(child.childId)!.add(id);
    }
  }

  // Propagate client boundary: traverse from each client component
  // and mark all descendants as effective client components
  const markDescendantsAsClient = (id: string, visited: Set<string>) => {
    if (visited.has(id)) return;
    visited.add(id);

    const result = results.get(id);
    if (!result) return;

    for (const child of result.children) {
      effectiveClientSet.add(child.childId);
      markDescendantsAsClient(child.childId, visited);
    }
  };

  // Start propagation from each source-level client component
  for (const [id, result] of results) {
    if (result.metadata.component.isClientComponent) {
      markDescendantsAsClient(id, new Set());
    }
  }

  const effectiveClientComponents = effectiveClientSet.size;
  const effectiveServerComponents = totalFiles - effectiveClientComponents;

  // Find shared components (used by more than one file)
  const sharedComponents: SharedComponentUsage[] = [];
  for (const [id, usedBy] of usageMap) {
    if (usedBy.size > 1) {
      sharedComponents.push({
        id,
        usageCount: usedBy.size,
        usedBy: Array.from(usedBy).sort(),
      });
    }
  }

  // Sort by usage count descending
  sharedComponents.sort((a, b) => b.usageCount - a.usageCount);

  // Ratio based on effective counts
  const ratio = totalFiles > 0 ? effectiveClientComponents / totalFiles : 0;

  return {
    totalFiles,
    clientComponents,
    serverComponents,
    effectiveClientComponents,
    effectiveServerComponents,
    ratio: Math.round(ratio * 1000) / 1000,
    sharedComponents,
  };
}
