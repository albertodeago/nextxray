/**
 * TSConfig parsing utilities.
 * Pure JSON parsing - no file I/O. Hosts handle file reading and extends chain.
 */

export interface ParsedTsconfig {
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
  extends?: string;
}

/**
 * Parse tsconfig.json content into a typed structure.
 * This is pure JSON parsing - hosts handle file I/O and extends resolution.
 *
 * @param content - Raw JSON content of tsconfig.json
 * @returns Parsed tsconfig with compilerOptions and extends fields
 */
export function parseTsconfig(content: string): ParsedTsconfig {
  try {
    // TSConfig allows comments and trailing commas in some environments,
    // but standard JSON.parse doesn't. We'll strip comments first.
    const stripped = stripJsonComments(content);
    const parsed = JSON.parse(stripped) as ParsedTsconfig;

    return {
      compilerOptions: parsed.compilerOptions,
      extends: parsed.extends,
    };
  } catch {
    // Return empty config on parse error - graceful fallback
    return {};
  }
}

/**
 * Strip single-line and multi-line comments from JSON.
 * TSConfig files allow // and /* comments which aren't valid JSON.
 */
function stripJsonComments(content: string): string {
  let result = "";
  let i = 0;
  let inString = false;
  let stringChar = "";

  while (i < content.length) {
    const char = content[i]!;
    const next = content[i + 1];

    // Track string boundaries
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }

    if (inString) {
      result += char;
      // Handle escape sequences
      if (char === "\\") {
        i++;
        if (i < content.length) {
          result += content[i];
        }
        i++;
        continue;
      }
      // End of string
      if (char === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    // Single-line comment
    if (char === "/" && next === "/") {
      // Skip until newline
      while (i < content.length && content[i] !== "\n") {
        i++;
      }
      continue;
    }

    // Multi-line comment
    if (char === "/" && next === "*") {
      i += 2;
      while (i < content.length - 1) {
        if (content[i] === "*" && content[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Merge two tsconfig objects, with child taking precedence.
 * Used when resolving `extends` chains.
 */
export function mergeTsconfigs(
  parent: ParsedTsconfig,
  child: ParsedTsconfig
): ParsedTsconfig {
  const merged: ParsedTsconfig = {};

  // Merge compilerOptions
  if (parent.compilerOptions || child.compilerOptions) {
    merged.compilerOptions = {
      ...parent.compilerOptions,
      ...child.compilerOptions,
    };

    // Paths need special handling - child completely overrides parent
    if (child.compilerOptions?.paths) {
      merged.compilerOptions.paths = child.compilerOptions.paths;
    } else if (parent.compilerOptions?.paths) {
      merged.compilerOptions.paths = parent.compilerOptions.paths;
    }
  }

  // Don't include extends in merged result
  return merged;
}
