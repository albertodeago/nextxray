import { describe, it, expect } from "vitest";
import { scan } from "../src/index.js";
import fs from "node:fs";
import path from "node:path";

describe("scanner", () => {
  it("given a client-component, it recognize it and returns the information", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/a-component.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan(code);

    expect(result).toMatchObject({
      isClientComponent: true,
    });
  });

  it("given a server-component, it recognizes it", () => {
    const fixturePath = path.join(
      process.cwd(),
      "test/fixtures/server-component.tsx",
    );
    const code = fs.readFileSync(fixturePath, "utf-8");

    const result = scan(code);

    expect(result).toMatchObject({
      isClientComponent: false,
    });
  });
});
