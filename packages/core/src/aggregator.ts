import { ScanResult } from "./contract.js";
import {
  EntryType,
  RouteEntry,
  ProjectStats,
  SharedComponentUsage,
} from "./project-types.js";

export type RouteInfo = {
  route: string;
  routeGroup?: string;
};

/**
 * Extracts the route and route group from a file path relative to the app directory.
 * e.g. app/(marketing)/blog/[slug]/page.tsx → { route: "/blog/[slug]", routeGroup: "(marketing)" }
 */
export function extractRouteInfo(filePath: string, appDir: string): RouteInfo {
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

  // Extract route groups (parenthesized segments)
  const groupSegments = segments.filter((seg) => /^\(.*\)$/.test(seg));

  // Filter out group folders (parenthesized) and build route
  const routeSegments = segments.filter((seg) => !/^\(.*\)$/.test(seg));

  // Build final route
  const route = "/" + routeSegments.join("/");

  // Build route group string (join multiple groups if nested)
  const routeGroup =
    groupSegments.length > 0 ? groupSegments.join("") : undefined;

  return {
    route: route === "/" ? "/" : route.replace(/\/$/, ""),
    routeGroup,
  };
}

/**
 * Extracts the route from a file path relative to the app directory.
 * e.g. app/(marketing)/blog/[slug]/page.tsx → /blog/[slug]
 * @deprecated Use extractRouteInfo() instead to also get route group information
 */
export function extractRoute(filePath: string, appDir: string): string {
  return extractRouteInfo(filePath, appDir).route;
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

    const { route, routeGroup } = extractRouteInfo(entryFile, appDir);

    return {
      route,
      routeGroup,
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

  // Count routes vs layouts from entry points
  let totalRoutes = 0;
  let totalLayouts = 0;
  for (const entry of entryPoints) {
    if (getEntryType(entry) === "layout") {
      totalLayouts++;
    } else {
      totalRoutes++;
    }
  }

  // Track which files are effectively in the client bundle
  const effectiveClientSet = new Set<string>();

  // Track imported component usage by "source:name" key
  // e.g., "@/components/ui:Card" or "next/link:default"
  const importUsageMap = new Map<string, Set<string>>();

  // Track unique local components
  const uniqueLocalSet = new Set<string>();

  // Count total usages
  let totalImportedComponents = 0;
  let totalLocalComponents = 0;

  // Initialize and count source-level components
  for (const [id, result] of results) {
    if (result.metadata.component.isClientComponent) {
      clientComponents++;
      effectiveClientSet.add(id);
    } else {
      serverComponents++;
    }

    // Track imported component usage from metadata
    for (const imp of result.metadata.importedComponents) {
      totalImportedComponents++;
      // Create a unique key for this component
      // Use source + importedName for uniqueness
      const key = `${imp.source}:${imp.importedName}`;
      if (!importUsageMap.has(key)) {
        importUsageMap.set(key, new Set());
      }
      importUsageMap.get(key)!.add(id);
    }

    // Track local components
    for (const local of result.metadata.localComponents) {
      totalLocalComponents++;
      // Local components are unique per file, so combine file + name
      uniqueLocalSet.add(`${id}:${local}`);
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

  // Find shared components (imported by more than one file)
  const sharedComponents: SharedComponentUsage[] = [];
  for (const [key, usedBy] of importUsageMap) {
    if (usedBy.size > 1) {
      sharedComponents.push({
        id: key,
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
    totalRoutes,
    totalLayouts,
    totalImportedComponents,
    totalLocalComponents,
    uniqueImportedComponents: importUsageMap.size,
    uniqueLocalComponents: uniqueLocalSet.size,
    clientComponents,
    serverComponents,
    effectiveClientComponents,
    effectiveServerComponents,
    ratio: Math.round(ratio * 1000) / 1000,
    sharedComponents,
  };
}
