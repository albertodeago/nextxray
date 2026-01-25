import { Visitor } from "@babel/traverse";
import { ScanContext } from "../types.js";

/**
 * Visitor to capture all JSX elements used in the component.
 * This is the primary way we determine what is "used".
 */
export const createJsxVisitor = (ctx: ScanContext): Visitor => ({
  JSXOpeningElement(path) {
    // Normal usage: <Button /> -> name is "Button"
    if (path.node.name.type === "JSXIdentifier") {
      ctx.usedJsxNames.add(path.node.name.name);
    } else if (path.node.name.type === "JSXMemberExpression") {
      // Namespaced usage: <UI.Button /> -> name is "UI.Button"
      const object = path.node.name.object;
      const property = path.node.name.property;

      if (
        object.type === "JSXIdentifier" &&
        property.type === "JSXIdentifier"
      ) {
        ctx.usedJsxNames.add(`${object.name}.${property.name}`);
      }
    }
  },
});
