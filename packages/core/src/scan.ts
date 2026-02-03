import { parse } from "@babel/parser";
import { debug } from "./debug.js";
import _traverse from "@babel/traverse";
import { AnalyzedComponent, ScanContext } from "./types.js";
import { createImportsVisitor } from "./visitors/imports.js";
import { createExportsVisitor } from "./visitors/exports.js";
import { createDynamicImportsVisitor } from "./visitors/dynamic.js";
import { createDefinitionsVisitor } from "./visitors/definitions.js";
import { createJsxVisitor } from "./visitors/jsx.js";

// Handle the default export format from @babel/traverse which can vary between environments (ESM/CJS)
const traverse = _traverse.default || _traverse;

type Input = {
  code: string;
};

const logDebug = (msg: string, obj?: unknown) => {
  debug(`[scanner] ${msg} ${obj ? JSON.stringify(obj, null, 2) : ""}`);
};

/**
 * Given a component's source code, statically analyze it to extract metadata.
 * It determines if it's a client component and identifies which other components it renders.
 */
export const scan = ({ code }: Input): AnalyzedComponent => {
  // Parse the code into an AST (Abstract Syntax Tree).
  // We enable JSX and TypeScript plugins to handle modern React code.
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // Check for "use client" directive using AST
  // This avoids false positives from comments, strings, or JSX content
  const isClientComponent = ast.program.directives.some(
    (directive) => directive.value.value === "use client",
  );

  const ctx: ScanContext = {
    exactImports: new Map(),
    localDefinitions: new Set(),
    usedJsxNames: new Set(),
    exports: [],
    exportedComponent: null,
  };

  const visitors = [
    createImportsVisitor(ctx),
    createExportsVisitor(ctx),
    createDynamicImportsVisitor(ctx),
    createDefinitionsVisitor(ctx),
    createJsxVisitor(ctx),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Babel types are complex
  traverse(ast as any, _traverse.visitors.merge(visitors));

  const importedComponents: AnalyzedComponent["importedComponents"] = [];
  const localComponents: string[] = [];

  // Resolution: Match used JSX names against identified Source (Import vs Local)
  ctx.usedJsxNames.forEach((name) => {
    // Case A: Namespaced Component (e.g. <UI.Button />)
    if (name.includes(".")) {
      const [root] = name.split(".");
      // If 'UI' is imported, we count 'UI.Button' as an imported component usage
      if (root && ctx.exactImports.has(root)) {
        const importInfo = ctx.exactImports.get(root)!;
        importedComponents.push({
          name: name,
          importedName: importInfo.importedName,
          source: importInfo.source,
          type: "namespace",
        });
      }
      // Note: We currently don't track locally defined objects used as namespaces - I think I've never seen them
    } else {
      // Case B: Standard Component (e.g. <Button />)
      if (ctx.exactImports.has(name)) {
        const importInfo = ctx.exactImports.get(name)!;
        importedComponents.push({
          name: name,
          importedName: importInfo.importedName,
          source: importInfo.source,
          type: importInfo.type,
        });
      } else if (ctx.localDefinitions.has(name)) {
        localComponents.push(name);
      }
    }
  });

  logDebug("imported components:", importedComponents);
  logDebug("local components:", localComponents);

  return {
    component: {
      name: ctx.exportedComponent?.name ?? null,
      exportType: ctx.exportedComponent?.exportType ?? null,
      isClientComponent,
    },
    exports: ctx.exports,
    importedComponents,
    localComponents,
  };
};
