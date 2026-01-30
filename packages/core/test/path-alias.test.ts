import { describe, it, expect } from "vitest";
import { createPathAliasResolver } from "../src/path-alias.js";
import { parseTsconfig, mergeTsconfigs } from "../src/tsconfig-parser.js";

describe("createPathAliasResolver", () => {
  it("resolves basic @/* pattern", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project",
      paths: { "@/*": ["./*"] },
    });

    expect(resolver.resolve("@/utils")).toBe("/project/utils");
    expect(resolver.resolve("@/components/Button")).toBe(
      "/project/components/Button"
    );
  });

  it("resolves @/components/* pattern before @/*", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project",
      paths: {
        "@/*": ["./src/*"],
        "@/components/*": ["./src/components/shared/*"],
      },
    });

    // More specific pattern should match first
    expect(resolver.resolve("@/components/Button")).toBe(
      "/project/src/components/shared/Button"
    );
    // Less specific pattern for non-components
    expect(resolver.resolve("@/utils")).toBe("/project/src/utils");
  });

  it("returns null for non-matching imports", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project",
      paths: { "@/*": ["./*"] },
    });

    expect(resolver.resolve("./local")).toBeNull();
    expect(resolver.resolve("react")).toBeNull();
    expect(resolver.resolve("../parent")).toBeNull();
  });

  it("handles exact match patterns (no wildcard)", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project",
      paths: {
        "@utils": ["./src/utils/index"],
      },
    });

    expect(resolver.resolve("@utils")).toBe("/project/src/utils/index");
    expect(resolver.resolve("@utils/helper")).toBeNull();
  });

  it("handles multiple replacement paths (uses first)", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project",
      paths: {
        "@/*": ["./src/*", "./lib/*"],
      },
    });

    // Should use first replacement path
    expect(resolver.resolve("@/utils")).toBe("/project/src/utils");
  });

  it("handles baseUrl with trailing slash", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project/",
      paths: { "@/*": ["./*"] },
    });

    expect(resolver.resolve("@/utils")).toBe("/project/utils");
  });

  it("handles paths with ./ prefix in replacement", () => {
    const resolver = createPathAliasResolver({
      baseUrl: "/project",
      paths: { "@/*": ["./src/*"] },
    });

    expect(resolver.resolve("@/utils")).toBe("/project/src/utils");
  });
});

describe("parseTsconfig", () => {
  it("parses basic tsconfig content", () => {
    const content = JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
    });

    const result = parseTsconfig(content);

    expect(result.compilerOptions?.baseUrl).toBe(".");
    expect(result.compilerOptions?.paths).toEqual({ "@/*": ["./src/*"] });
  });

  it("parses tsconfig with extends", () => {
    const content = JSON.stringify({
      extends: "./tsconfig.base.json",
      compilerOptions: {
        paths: { "@/*": ["./src/*"] },
      },
    });

    const result = parseTsconfig(content);

    expect(result.extends).toBe("./tsconfig.base.json");
    expect(result.compilerOptions?.paths).toEqual({ "@/*": ["./src/*"] });
  });

  it("handles single-line comments", () => {
    const content = `{
      // This is a comment
      "compilerOptions": {
        "baseUrl": "."
      }
    }`;

    const result = parseTsconfig(content);

    expect(result.compilerOptions?.baseUrl).toBe(".");
  });

  it("handles multi-line comments", () => {
    const content = `{
      /* This is a
         multi-line comment */
      "compilerOptions": {
        "baseUrl": "."
      }
    }`;

    const result = parseTsconfig(content);

    expect(result.compilerOptions?.baseUrl).toBe(".");
  });

  it("returns empty object for invalid JSON", () => {
    const content = "not valid json";

    const result = parseTsconfig(content);

    expect(result).toEqual({});
  });

  it("returns empty object for empty content", () => {
    const result = parseTsconfig("");

    expect(result).toEqual({});
  });
});

describe("mergeTsconfigs", () => {
  it("merges compilerOptions with child taking precedence", () => {
    const parent = {
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["./parent/*"] },
      },
    };
    const child = {
      compilerOptions: {
        baseUrl: "./src",
      },
    };

    const result = mergeTsconfigs(parent, child);

    expect(result.compilerOptions?.baseUrl).toBe("./src");
    // paths from parent should be preserved when child doesn't have them
    expect(result.compilerOptions?.paths).toEqual({ "@/*": ["./parent/*"] });
  });

  it("child paths completely override parent paths", () => {
    const parent = {
      compilerOptions: {
        paths: { "@/*": ["./parent/*"], "@lib/*": ["./lib/*"] },
      },
    };
    const child = {
      compilerOptions: {
        paths: { "@/*": ["./child/*"] },
      },
    };

    const result = mergeTsconfigs(parent, child);

    // Child paths should completely replace parent paths
    expect(result.compilerOptions?.paths).toEqual({ "@/*": ["./child/*"] });
  });

  it("handles missing compilerOptions in parent", () => {
    const parent = {};
    const child = {
      compilerOptions: {
        baseUrl: ".",
      },
    };

    const result = mergeTsconfigs(parent, child);

    expect(result.compilerOptions?.baseUrl).toBe(".");
  });

  it("handles missing compilerOptions in child", () => {
    const parent = {
      compilerOptions: {
        baseUrl: ".",
      },
    };
    const child = {};

    const result = mergeTsconfigs(parent, child);

    expect(result.compilerOptions?.baseUrl).toBe(".");
  });

  it("does not include extends in merged result", () => {
    const parent = { extends: "./base.json" };
    const child = { extends: "./child-base.json" };

    const result = mergeTsconfigs(parent, child);

    expect(result.extends).toBeUndefined();
  });
});
