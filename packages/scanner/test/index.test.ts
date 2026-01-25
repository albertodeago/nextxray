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
      isClientComponent: true,
      component: {
        name: "Button",
        exportType: "default",
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
      isClientComponent: false,
      component: {
        name: "ServerComponent",
        exportType: "named",
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
      isClientComponent: false,
      importedComponents: [
        {
          name: "Button",
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
      isClientComponent: false,
      importedComponents: [
        {
          name: "MyButton", // The local name used in JSX
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
});
