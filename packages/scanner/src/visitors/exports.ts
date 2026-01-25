import { Visitor } from "@babel/traverse";
import { ScanContext } from "../types.js";

/**
 * Visitor to capture all types of exports (default, named, all).
 * It also determines the "main" exported component if possible.
 */
export const createExportsVisitor = (ctx: ScanContext): Visitor => ({
  // Handle: export * from "./source"
  ExportAllDeclaration(path) {
    ctx.exports.push({
      name: "*",
      type: "namespace",
      reExport: {
        source: path.node.source.value,
        importedName: "*",
      },
    });
  },

  // Handle: export default ...
  ExportDefaultDeclaration(path) {
    ctx.exports.push({ name: "default", type: "default" });

    if (path.node.declaration.type === "Identifier") {
      // export default ExistingVar
      ctx.exportedComponent = {
        name: path.node.declaration.name,
        exportType: "default",
      };
    } else if (
      path.node.declaration.type === "FunctionDeclaration" &&
      path.node.declaration.id
    ) {
      // export default function NewFunc() {}
      ctx.exportedComponent = {
        name: path.node.declaration.id.name,
        exportType: "default",
      };
    } else if (path.node.declaration.type === "CallExpression") {
      // export default withAuth(Profile)
      // export default dynamic(...)
      ctx.exportedComponent = {
        name: null, // Anonymous / Wrapped component
        exportType: "default",
      };
    }
  },

  // Handle: export { A } or export const A = ...
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
          ctx.exports.push({
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
            ctx.exports.push({ name: decl.id.name, type: "named" });
            if (!ctx.exportedComponent) {
              ctx.exportedComponent = {
                name: decl.id.name,
                exportType: "named",
              };
            }
          }
        });
      } else if (path.node.declaration?.type === "FunctionDeclaration") {
        // export function A() ...
        if (path.node.declaration.id) {
          ctx.exports.push({
            name: path.node.declaration.id.name,
            type: "named",
          });
          if (!ctx.exportedComponent) {
            ctx.exportedComponent = {
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
            ctx.exports.push({ name: exportedName, type: "named" });
          }
        });
      }
    }
  },
});
