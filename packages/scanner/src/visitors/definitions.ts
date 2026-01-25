import { Visitor } from "@babel/traverse";
import { ScanContext } from "../types.js";
import { getDynamicImportSource } from "./shared/detect-dynamic-import.js";

/**
 * Visitor to track locally defined variables and functions.
 * Used to distinguish between imports and local components.
 */
export const createDefinitionsVisitor = (ctx: ScanContext): Visitor => ({
  VariableDeclarator(path) {
    if (path.node.id.type === "Identifier") {
      // If it is a dynamic import, it's already handled by dynamic imports visitor.
      // We explicitly skip it here to avoid double counting it as a local definition.
      if (!getDynamicImportSource(path.node)) {
        ctx.localDefinitions.add(path.node.id.name);
      }
    }
  },
  FunctionDeclaration(path) {
    // function MyComp() ...
    if (path.node.id?.type === "Identifier") {
      ctx.localDefinitions.add(path.node.id.name);
    }
  },
});
