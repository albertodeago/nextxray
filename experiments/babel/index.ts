import fs from "node:fs"; // Importing fs to read files
import * as parser from "@babel/parser";
import _traverse, { NodePath } from "@babel/traverse"; // Import 'traverse' as default and NodePath for type
import * as t from "@babel/types"; // Import all of @babel/types for AST node types

const traverse = _traverse.default;

// Generate AST starting from a page component in a Next.js app
// This code will parse the JSX and identify components, imports, and whether it's a client or server component.

const pagePath = "../../fixtures/nextjs-test-app/src/app/page.tsx"; // Path to the page component file
const pageCode = fs.readFileSync(pagePath, "utf-8"); // Read the file content

// const code = `
//   "use client";
//   import Button from './Button';
//   import { Icon } from './IconLibrary';
//   import * as Forms from './FormControls';

//   const MyComponent = () => (
//     <div>
//       <Button primary />
//       <Icon name="user" />
//       <Forms.Input placeholder="Enter text" />
//       <AnotherLocalComponent />
//     </div>
//   );

//   const AnotherLocalComponent = () => <p>Hi from local</p>;
// `;

try {
  const ast = parser.parse(pageCode, {
    sourceType: "module",
    plugins: ["jsx", "typescript"], // Add 'typescript' plugin if your components might use TS syntax features
  });

  const renderedComponents = new Set<string>();
  const importedComponents: Record<
    string,
    { source: string; isDefault: boolean; localName: string }
  > = {};

  // First pass: gather imports
  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const source = path.node.source.value;
      path.node.specifiers.forEach((specifier) => {
        if (t.isImportDefaultSpecifier(specifier)) {
          importedComponents[specifier.local.name] = {
            source,
            isDefault: true,
            localName: specifier.local.name,
          };
        } else if (t.isImportSpecifier(specifier)) {
          // For named imports, t.isIdentifier(specifier.imported) is not enough,
          // specifier.imported can be Identifier or StringLiteral (for `import { "foo" as Foo } ...`)
          // We'll assume Identifier for simplicity here for most common cases.
          const importedName = t.isIdentifier(specifier.imported)
            ? specifier.imported.name
            : specifier.imported.value;
          importedComponents[specifier.local.name] = {
            source,
            isDefault: false,
            localName: importedName,
          };
        } else if (t.isImportNamespaceSpecifier(specifier)) {
          // For namespace imports like `import * as Forms from './Forms';`
          // We'll store the namespace. Resolution of <Forms.Input /> will need special handling.
          importedComponents[specifier.local.name] = {
            source,
            isDefault: false,
            localName: "*",
          }; // Using '*' to signify namespace
        }
      });
    },
  });

  console.log("--- Imported Components Info ---");
  console.log(importedComponents);
  console.log("-------------------------------\n");

  traverse(ast, {
    JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
      const nodeName = path.node.name;
      let componentName: string | null = null;

      if (t.isJSXIdentifier(nodeName)) {
        // e.g., <Button /> or <div />
        componentName = nodeName.name;
      } else if (t.isJSXMemberExpression(nodeName)) {
        // e.g., <Forms.Input />
        // object is JSXIdentifier (Forms), property is JSXIdentifier (Input)
        if (
          t.isJSXIdentifier(nodeName.object) &&
          t.isJSXIdentifier(nodeName.property)
        ) {
          componentName = `${nodeName.object.name}.${nodeName.property.name}`;
        }
      }

      if (componentName) {
        // Basic heuristic: if the first letter is uppercase, it's likely a custom component.
        // HTML tags are typically lowercase.
        // This is a simplification; a more robust solution would check against known HTML tags.
        const firstChar = componentName.charAt(0);
        if (firstChar === firstChar.toUpperCase()) {
          // Check if it's an imported component or a locally defined one
          let resolvedName = componentName;
          const parts = componentName.split(".");

          if (parts.length === 1 && importedComponents[parts[0]]) {
            // e.g. <Button /> where Button is imported
            resolvedName = `${componentName} (imported from ${importedComponents[parts[0]].source})`;
          } else if (
            parts.length > 1 &&
            importedComponents[parts[0]] &&
            importedComponents[parts[0]].localName === "*"
          ) {
            // e.g. <Forms.Input /> where Forms is an imported namespace
            resolvedName = `${componentName} (imported from ${importedComponents[parts[0]].source})`;
          }
          // Further logic would be needed to confirm if it's locally defined
          // by checking the AST for const/function declarations with that name.

          renderedComponents.add(resolvedName);
        } else {
          // It's likely an HTML element, you might want to track these differently or ignore them
          // For this example, we'll add them to see everything.
          renderedComponents.add(
            `${componentName} (HTML element or unresolvable)`,
          );
        }
      }
    },
  });

  console.log("--- Potentially Rendered Components/Elements ---");
  Array.from(renderedComponents)
    .sort()
    .forEach((name) => console.log(name));
  console.log("--------------------------------------------\n");

  // Now we check if the component is a client component or a server component.
  // We can check this by looking for the presence of 'use client' directive at the top of the file.
  // We do it recursively for each component we find
  traverse(ast, {
    Program(path: NodePath<t.Program>) {
      const directives = path.node.directives || [];
      const isClientComponent = directives.some(
        (directive) =>
          t.isDirective(directive) && directive.value.value === "use client",
      );

      if (isClientComponent) {
        console.log("This component is a Client Component.");
      } else {
        console.log("This component is a Server Component.");
      }
    },
  });

  // To build the actual tree view, you would:
  // 1. Start with a root component (e.g., a page in Next.js).
  // 2. Parse it.
  // 3. For each custom component JSX tag found:
  //    a. Resolve its import path.
  //    b. If not already parsed, parse that component's file.
  //    c. Add an edge in your tree from the current component to the rendered component.
  //    d. Recursively process the rendered component.
} catch (error) {
  console.error("Error parsing code:", error);
}
