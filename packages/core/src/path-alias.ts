/**
 * Path alias resolution for tsconfig paths support.
 * Pure logic - no I/O operations.
 */

export interface PathAliasConfig {
  baseUrl: string; // Absolute path like "/project" or "/app"
  paths: Record<string, string[]>; // e.g., {"@/*": ["./src/*"]}
}

interface CompiledPattern {
  pattern: string;
  regex: RegExp;
  replacements: string[];
}

export interface PathAliasResolver {
  resolve(source: string): string | null;
}

/**
 * Create a path alias resolver from a tsconfig-style paths configuration.
 *
 * @param config - The path alias configuration with baseUrl and paths
 * @returns A resolver that can resolve aliased imports to absolute paths
 */
export function createPathAliasResolver(
  config: PathAliasConfig
): PathAliasResolver {
  const { baseUrl, paths } = config;

  // Compile patterns sorted by specificity (longer prefix first)
  const compiledPatterns = compilePatterns(paths);

  return {
    resolve(source: string): string | null {
      for (const { regex, replacements } of compiledPatterns) {
        const match = source.match(regex);
        if (match) {
          // Extract the wildcard capture (if any)
          const wildcard = match[1] ?? "";

          // Try each replacement path
          for (const replacement of replacements) {
            const resolved = substituteWildcard(replacement, wildcard);
            const absolutePath = resolvePath(baseUrl, resolved);
            return absolutePath;
          }
        }
      }

      return null;
    },
  };
}

/**
 * Compile tsconfig path patterns into regex matchers.
 * Patterns are sorted by specificity (more specific patterns first).
 */
function compilePatterns(
  paths: Record<string, string[]>
): CompiledPattern[] {
  const patterns: CompiledPattern[] = [];

  for (const [pattern, replacements] of Object.entries(paths)) {
    // Convert tsconfig pattern to regex
    // "@/*" -> "^@/(.*)$"
    // "@/components/*" -> "^@/components/(.*)$"
    // "utils" -> "^utils$" (exact match)
    const hasWildcard = pattern.includes("*");

    let regexStr: string;
    if (hasWildcard) {
      // Escape special regex characters except *
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      // Replace * with capture group
      regexStr = "^" + escaped.replace(/\*/g, "(.*)") + "$";
    } else {
      // Exact match
      regexStr = "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + "$";
    }

    patterns.push({
      pattern,
      regex: new RegExp(regexStr),
      replacements,
    });
  }

  // Sort by specificity: longer patterns first (more specific)
  // "@/components/*" should match before "@/*"
  patterns.sort((a, b) => {
    // Count non-wildcard prefix length
    const aPrefixLen = a.pattern.indexOf("*");
    const bPrefixLen = b.pattern.indexOf("*");
    const aLen = aPrefixLen === -1 ? a.pattern.length : aPrefixLen;
    const bLen = bPrefixLen === -1 ? b.pattern.length : bPrefixLen;
    return bLen - aLen;
  });

  return patterns;
}

/**
 * Substitute wildcard value into replacement pattern.
 * "./src/*" with wildcard "utils/helpers" -> "./src/utils/helpers"
 */
function substituteWildcard(replacement: string, wildcard: string): string {
  if (replacement.includes("*")) {
    return replacement.replace("*", wildcard);
  }
  return replacement;
}

/**
 * Resolve a potentially relative path against a base URL.
 * "./src/utils" with baseUrl "/project" -> "/project/src/utils"
 */
function resolvePath(baseUrl: string, relativePath: string): string {
  // Remove leading "./" if present
  let normalized = relativePath;
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  // Ensure baseUrl doesn't end with slash
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  // Handle absolute paths in replacement
  if (normalized.startsWith("/")) {
    return normalized;
  }

  return `${base}/${normalized}`;
}
