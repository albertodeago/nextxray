import { parse } from "@babel/parser";
import { debug } from "./debug.js";
import _traverse from "@babel/traverse";

// Handle the default export format from @babel/traverse which can vary between environments (ESM/CJS)
const traverse = _traverse.default || _traverse;

type AnalyzedComponent = {
  component: {
    name: string | null;
    exportType: "default" | "named" | null;
    isClientComponent: boolean;
  };
  importedComponents: {
    name: string;
    importedName: string;
    source: string;
    type: "default" | "named" | "namespace";
  }[];
  exports: {
    name: string;
    type: "default" | "named" | "namespace";
    reExport?: {
      source: string;
      importedName: string;
    };
  }[];
  localComponents: string[];
};

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
  // Quick string check for the "use client" directive.
  // We don't need the full AST for this, and it's faster.
  const isClientComponent =
    code.includes('"use client"') || code.includes("'use client'");

  // Parse the code into an AST (Abstract Syntax Tree).
  // We enable JSX and TypeScript plugins to handle modern React code.
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // Sets to track identifiers found during traversal
  const exactImports = new Map<
    string,
    {
      source: string;
      type: "default" | "named" | "namespace";
      importedName: string;
    }
  >();
  const localDefinitions = new Set<string>(); // Names of locally defined variables/functions
  const usedJsxNames = new Set<string>(); // Names of components actually used in JSX

  const state = {
    exportedComponent: null as {
      name: string | null;
      exportType: "default" | "named";
    } | null,
  };

  const exports: AnalyzedComponent["exports"] = [];

  // Traverse the AST to populate our sets
  traverse(ast as any, {
    // 1. Collect Imports
    ImportDeclaration(path) {
      const source = path.node.source.value;
      // Iterate over all specifiers in an import statement
      path.node.specifiers.forEach((specifier) => {
        if (specifier.type === "ImportDefaultSpecifier") {
          exactImports.set(specifier.local.name, {
            source,
            type: "default",
            importedName: "default",
          });
        } else if (specifier.type === "ImportNamespaceSpecifier") {
          exactImports.set(specifier.local.name, {
            source,
            type: "namespace",
            importedName: "*",
          });
        } else if (specifier.type === "ImportSpecifier") {
          const importedName =
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value;

          exactImports.set(specifier.local.name, {
            source,
            type: "named",
            importedName,
          });
        }
      });
    },

    // 2. Collect Local Definitions & Exports
    VariableDeclarator(path) {
      // const MyComp = ...
      if (path.node.id.type === "Identifier") {
        let isHasDynamicImport = false;

        // Check for const Lazy = dynamic(() => import('./foo'))
        // or const Lazy = React.lazy(() => import('./foo'))
        if (
          path.node.init?.type === "CallExpression" &&
          (path.node.init.callee.type === "Identifier" || // dynamic(...)
            path.node.init.callee.type === "MemberExpression") // React.lazy(...)
        ) {
          const callee = path.node.init.callee;
          const isDynamic =
            callee.type === "Identifier" && callee.name === "dynamic";
          const isReactLazy =
            callee.type === "MemberExpression" &&
            callee.object.type === "Identifier" &&
            callee.object.name === "React" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "lazy";

          if (isDynamic || isReactLazy) {
            // Traverse the first argument to find import()
            const arg = path.node.init.arguments[0];
            if (arg) {
              // We need to find `import("source")` inside the arrow function
              // Simple heuristic: Look for string literal inside CallExpression named "import"
              // Since we are inside a visitor, we can't easily traverse *down* with the same visitor.
              // We can rely on manual inspection of the AST node structure for typical cases.
              // Typical case: () => import('./foo')
              // AST: ArrowFunctionExpression -> body: CallExpression(import, [StringLiteral])

              let importSource: string | null = null;

              const getLocationFromImportCall = (node: any) => {
                if (
                  node.type === "CallExpression" &&
                  node.callee.type === "Import"
                ) {
                  return node.arguments[0]?.value;
                }
                return null;
              };

              if (
                arg.type === "ArrowFunctionExpression" ||
                arg.type === "FunctionExpression"
              ) {
                if (arg.body.type === "CallExpression") {
                  importSource = getLocationFromImportCall(arg.body);
                } else if (arg.body.type === "BlockStatement") {
                  // () => { return import('./foo') }
                  // This is more complex, let's look for the first ReturnStatement
                  const returnStmt = arg.body.body.find(
                    (stmt: any) => stmt.type === "ReturnStatement",
                  ) as any;
                  if (returnStmt?.argument) {
                    importSource = getLocationFromImportCall(returnStmt.argument);
                  }
                }
              }

              if (importSource) {
                isHasDynamicImport = true;
                exactImports.set(path.node.id.name, {
                  source: importSource,
                  type: "default",
                  importedName: "default",
                });
              }
            }
          }
        }

        if (!isHasDynamicImport) {
          localDefinitions.add(path.node.id.name);
        }
      }
    },
    FunctionDeclaration(path) {
      // function MyComp() ...
      if (path.node.id?.type === "Identifier") {
        localDefinitions.add(path.node.id.name);
      }
    },

    ExportAllDeclaration(path) {
      exports.push({
        name: "*",
        type: "namespace",
        reExport: {
          source: path.node.source.value,
          importedName: "*",
        },
      });
    },

    ExportDefaultDeclaration(path) {
      exports.push({ name: "default", type: "default" });

      if (path.node.declaration.type === "Identifier") {
        // export default ExistingVar
        state.exportedComponent = {
          name: path.node.declaration.name,
          exportType: "default",
        };
      } else if (
        path.node.declaration.type === "FunctionDeclaration" &&
        path.node.declaration.id
      ) {
        // export default function NewFunc() {}
        state.exportedComponent = {
          name: path.node.declaration.id.name,
          exportType: "default",
        };
      } else if (path.node.declaration.type === "CallExpression") {
        // export default withAuth(Profile)
        // export default dynamic(...)
        // We might not be able to infer a name easily, but we know it's a default export
        state.exportedComponent = {
          name: null, // Anonymous / Wrapped component
          exportType: "default",
        };
      }
    },

    ExportNamedDeclaration(path) {
      if (path.node.source) {
        // export { A } from './b'
        const source = path.node.source.value;
        path.node.specifiers.forEach((specifier) => {
          if (specifier.type === "ExportSpecifier") {
            const exportedName =
              specifier.exported.type === "Identifier"
                ? specifier.exported.name
                : specifier.exported.value;
            const localName = specifier.local.name;
            exports.push({
              name: exportedName,
              type: "named",
              reExport: {
                source,
                importedName: localName,
              },
            });
          }
        });
      } else {
        if (path.node.declaration?.type === "VariableDeclaration") {
          // export const A = ...
          path.node.declaration.declarations.forEach((decl) => {
            if (decl.id.type === "Identifier") {
              exports.push({ name: decl.id.name, type: "named" });
              // If we haven't found a component yet, take the first named export
              // This is a heuristic: "First exported component is the main one"
              if (!state.exportedComponent) {
                state.exportedComponent = {
                  name: decl.id.name,
                  exportType: "named",
                };
              }
            }
          });
        } else if (path.node.declaration?.type === "FunctionDeclaration") {
          // export function A() ...
          if (path.node.declaration.id) {
            exports.push({
              name: path.node.declaration.id.name,
              type: "named",
            });
            if (!state.exportedComponent) {
              state.exportedComponent = {
                name: path.node.declaration.id.name,
                exportType: "named",
              };
            }
          }
        } else if (path.node.specifiers) {
          // export { A, B }
          path.node.specifiers.forEach((specifier) => {
            if (specifier.type === "ExportSpecifier") {
              const exportedName =
                specifier.exported.type === "Identifier"
                  ? specifier.exported.name
                  : specifier.exported.value;
              exports.push({ name: exportedName, type: "named" });
            }
          });
        }
      }
    },

    // 3. Collect Used JSX Elements
    JSXOpeningElement(path) {
      // Normal usage: <Button /> -> name is "Button"
      if (path.node.name.type === "JSXIdentifier") {
        usedJsxNames.add(path.node.name.name);
      } else if (path.node.name.type === "JSXMemberExpression") {
        // Namespaced usage: <UI.Button /> -> name is "UI.Button"
        // We capture the full expression name to matching against imports later.
        const object = path.node.name.object;
        const property = path.node.name.property;

        if (
          object.type === "JSXIdentifier" &&
          property.type === "JSXIdentifier"
        ) {
          usedJsxNames.add(`${object.name}.${property.name}`);
        }
      }
    },
  });

  const importedComponents: AnalyzedComponent["importedComponents"] = [];
  const localComponents: string[] = [];

  // Resolution: Match used JSX names against identified Source (Import vs Local)
  usedJsxNames.forEach((name) => {
    // Case A: Namespaced Component (e.g. <UI.Button />)
    if (name.includes(".")) {
      const [root] = name.split(".");
      // If 'UI' is imported, we count 'UI.Button' as an imported component usage
      if (root && exactImports.has(root)) {
        const importInfo = exactImports.get(root)!;
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
      if (exactImports.has(name)) {
        const importInfo = exactImports.get(name)!;
        importedComponents.push({
          name: name,
          importedName: importInfo.importedName,
          source: importInfo.source,
          type: importInfo.type,
        });
      } else if (localDefinitions.has(name)) {
        localComponents.push(name);
      }
    }
  });

  logDebug("imported components:", importedComponents);
  logDebug("local components:", localComponents);

  return {
    component: {
      name: state.exportedComponent?.name ?? null,
      exportType: state.exportedComponent?.exportType ?? null,
      isClientComponent,
    },
    exports,
    importedComponents,
    localComponents,
  };
};
