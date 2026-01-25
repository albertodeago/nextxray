import { Visitor } from "@babel/traverse";
import { ScanContext } from "../types.js";

/**
 * Visitor to capture static imports.
 * Example: import { Button } from "./button";
 */
export const createImportsVisitor = (ctx: ScanContext): Visitor => ({
  ImportDeclaration(path) {
    const source = path.node.source.value;
    // Iterate over all specifiers in an import statement
    path.node.specifiers.forEach((specifier) => {
      // Handle: import Default from "./source"
      if (specifier.type === "ImportDefaultSpecifier") {
        ctx.exactImports.set(specifier.local.name, {
          source,
          type: "default",
          importedName: "default",
        });
      }
      // Handle: import * as Namespace from "./source"
      else if (specifier.type === "ImportNamespaceSpecifier") {
        ctx.exactImports.set(specifier.local.name, {
          source,
          type: "namespace",
          importedName: "*",
        });
      }
      // Handle: import { Named } from "./source"
      else if (specifier.type === "ImportSpecifier") {
        const importedName =
          specifier.imported.type === "Identifier"
            ? specifier.imported.name
            : specifier.imported.value;

        ctx.exactImports.set(specifier.local.name, {
          source,
          type: "named",
          importedName,
        });
      }
    });
  },
});
