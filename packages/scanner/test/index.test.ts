import { describe, it, expect } from "vitest";
import { scan } from "../src/index.js";
import fs from "node:fs";
import path from "node:path";

describe("scanner", () => {
  it("given a client-component, it recognize it and returns the information", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/client-component.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      component: {
        name: "Button",
        exportType: "default",
        isClientComponent: true,
      },
    });
  });

  it("given a server-component, it recognizes it", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/server-component.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      component: {
        name: "ServerComponent",
        exportType: "named",
        isClientComponent: false,
      },
    });
  });

  it("given a component with a dependency, it detects the import", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/component-with-dependency.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      component: {
        isClientComponent: false,
      },
      importedComponents: [
        {
          name: "Button",
          importedName: "Button",
          source: "./client-component",
          type: "named",
        },
      ],
    });
  });

  it("given a component with an aliased import, it detects the import using the local name", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/component-with-aliased-import.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      component: {
        isClientComponent: false,
      },
      importedComponents: [
        {
          name: "MyButton", // The local name used in JSX
          importedName: "Button", // The original name exported from the source
          source: "./client-component",
          type: "named",
        },
      ],
    });
  });

  it("given a component with a default import, it detects the import", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/component-default-import.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      importedComponents: [
        {
          name: "Button",
          importedName: "default",
          source: "./client-component",
          type: "default",
        },
      ],
    });
  });

  it("given a component with a namespace import, it detects the usage", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/component-namespace-import.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      importedComponents: [
        {
          name: "UI.Button",
          importedName: "*",
          source: "./ui-library",
          type: "namespace",
        },
      ],
    });
  });

  it("given a component with a local component, it detects it", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/component-local.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      localComponents: ["LocalButton"],
    });
  });

  it("given a barrel file, it detects re-exports", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/barrel-file.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result.exports).toEqual(
      expect.arrayContaining([
        {
          name: "*",
          type: "namespace",
          reExport: {
            source: "./button",
            importedName: "*",
          },
        },
        {
          name: "Card",
          type: "named",
          reExport: {
            source: "./card",
            importedName: "Card",
          },
        },
        {
          name: "Modal",
          type: "named",
          reExport: {
            source: "./modal",
            importedName: "default",
          },
        },
        {
          name: "Local",
          type: "named",
        },
      ]),
    );
  });

  it("given a component with dynamic imports, it detects them", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/dynamic-imports.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      importedComponents: expect.arrayContaining([
        {
          name: "LazyComponent",
          source: "./lazy-component",
          // For dynamic imports, we often treat them as default imports from the module
          type: "default",
          importedName: "default",
        },
        {
          name: "ReactLazyComponent",
          source: "./react-lazy-component",
          type: "default",
          importedName: "default",
        },
      ]),
    });
  });

  it("given a complex default export (e.g. HOC), it detects it", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/complex-export.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan({ code });

    expect(result).toMatchObject({
      component: {
        exportType: "default",
        // Name might be null or inferred, but we mainly care that export is detected
      },
      exports: expect.arrayContaining([
        {
          name: "default",
          type: "default",
        },
      ]),
    });
  });
});
