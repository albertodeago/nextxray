// Helperes to identify specific AST patterns

export const getDynamicImportSource = (node: any): string | null => {
  // Check for const Lazy = dynamic(() => import('./foo'))
  // or const Lazy = React.lazy(() => import('./foo'))
  if (
    node.init?.type === "CallExpression" &&
    (node.init.callee.type === "Identifier" || // dynamic(...)
      node.init.callee.type === "MemberExpression") // React.lazy(...)
  ) {
    const callee = node.init.callee;
    const isDynamic = callee.type === "Identifier" && callee.name === "dynamic";
    const isReactLazy =
      callee.type === "MemberExpression" &&
      callee.object.type === "Identifier" &&
      callee.object.name === "React" &&
      callee.property.type === "Identifier" &&
      callee.property.name === "lazy";

    if (isDynamic || isReactLazy) {
      // Traverse the first argument to find import()
      const arg = node.init.arguments[0];
      if (arg) {
        const getLocationFromImportCall = (n: any) => {
          if (n.type === "CallExpression" && n.callee.type === "Import") {
            return n.arguments[0]?.value;
          }
          return null;
        };

        if (
          arg.type === "ArrowFunctionExpression" ||
          arg.type === "FunctionExpression"
        ) {
          if (arg.body.type === "CallExpression") {
            return getLocationFromImportCall(arg.body);
          } else if (arg.body.type === "BlockStatement") {
            // () => { return import('./foo') }
            const returnStmt = arg.body.body.find(
              (stmt: any) => stmt.type === "ReturnStatement",
            ) as any;
            if (returnStmt?.argument) {
              return getLocationFromImportCall(returnStmt.argument);
            }
          }
        }
      }
    }
  }
  return null;
};
