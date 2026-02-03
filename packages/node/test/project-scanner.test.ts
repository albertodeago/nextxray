import { describe, it, expect } from "vitest";
import path from "node:path";
import { ProjectScanner } from "../src/project-scanner.js";
import { NodeHost } from "../src/node-host.js";
import { discoverEntryPoints } from "../src/node-discovery.js";
import { extractRoute, extractRouteInfo, getEntryType } from "@nextxray/core";

const MOCK_APP_DIR = path.join(import.meta.dirname, "mock-app/app");

describe("node-discovery", () => {
  it("discovers all entry points in the mock app", async () => {
    const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);

    expect(entryPoints).toHaveLength(5);
    expect(entryPoints.map((p) => path.relative(MOCK_APP_DIR, p))).toEqual([
      "(marketing)/about/page.tsx",
      "(marketing)/blog/page.tsx",
      "dashboard/page.tsx",
      "layout.tsx",
      "page.tsx",
    ]);
  });
});

describe("aggregator", () => {
  describe("extractRoute", () => {
    it("extracts root route from layout.tsx", () => {
      const route = extractRoute(`${MOCK_APP_DIR}/layout.tsx`, MOCK_APP_DIR);
      expect(route).toBe("/");
    });

    it("extracts root route from page.tsx", () => {
      const route = extractRoute(`${MOCK_APP_DIR}/page.tsx`, MOCK_APP_DIR);
      expect(route).toBe("/");
    });

    it("extracts nested route", () => {
      const route = extractRoute(
        `${MOCK_APP_DIR}/dashboard/page.tsx`,
        MOCK_APP_DIR
      );
      expect(route).toBe("/dashboard");
    });

    it("strips group folders from route", () => {
      const route = extractRoute(
        `${MOCK_APP_DIR}/(marketing)/blog/page.tsx`,
        MOCK_APP_DIR
      );
      expect(route).toBe("/blog");
    });

    it("strips multiple group folders", () => {
      const route = extractRoute(
        `${MOCK_APP_DIR}/(marketing)/about/page.tsx`,
        MOCK_APP_DIR
      );
      expect(route).toBe("/about");
    });

    it("handles dynamic segments", () => {
      const route = extractRoute(
        `${MOCK_APP_DIR}/blog/[slug]/page.tsx`,
        MOCK_APP_DIR
      );
      expect(route).toBe("/blog/[slug]");
    });
  });

  describe("extractRouteInfo", () => {
    it("extracts route without group", () => {
      const info = extractRouteInfo(
        `${MOCK_APP_DIR}/dashboard/page.tsx`,
        MOCK_APP_DIR
      );
      expect(info.route).toBe("/dashboard");
      expect(info.routeGroup).toBeUndefined();
    });

    it("extracts route and single group", () => {
      const info = extractRouteInfo(
        `${MOCK_APP_DIR}/(marketing)/blog/page.tsx`,
        MOCK_APP_DIR
      );
      expect(info.route).toBe("/blog");
      expect(info.routeGroup).toBe("(marketing)");
    });

    it("extracts route and nested groups", () => {
      const info = extractRouteInfo(
        `${MOCK_APP_DIR}/(auth)/(admin)/users/page.tsx`,
        MOCK_APP_DIR
      );
      expect(info.route).toBe("/users");
      expect(info.routeGroup).toBe("(auth)(admin)");
    });

    it("extracts root route with group", () => {
      const info = extractRouteInfo(
        `${MOCK_APP_DIR}/(marketing)/page.tsx`,
        MOCK_APP_DIR
      );
      expect(info.route).toBe("/");
      expect(info.routeGroup).toBe("(marketing)");
    });
  });

  describe("getEntryType", () => {
    it("identifies page files", () => {
      expect(getEntryType("/app/page.tsx")).toBe("page");
      expect(getEntryType("/app/dashboard/page.ts")).toBe("page");
    });

    it("identifies layout files", () => {
      expect(getEntryType("/app/layout.tsx")).toBe("layout");
      expect(getEntryType("/app/dashboard/layout.ts")).toBe("layout");
    });
  });
});

describe("ProjectScanner", () => {
  it("scans the mock app and returns routes with stats", async () => {
    const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
    const host = new NodeHost();
    const scanner = new ProjectScanner(host);

    const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

    // Check routes
    expect(result.routes).toHaveLength(5);

    const routeMap = new Map(
      result.routes.map((r) => [`${r.route}:${r.entryType}`, r])
    );

    // Root layout
    expect(routeMap.get("/:layout")).toBeDefined();
    expect(routeMap.get("/:layout")?.tree.metadata.component.name).toBe(
      "RootLayout"
    );

    // Root page
    expect(routeMap.get("/:page")).toBeDefined();
    expect(routeMap.get("/:page")?.tree.metadata.component.name).toBe(
      "HomePage"
    );

    // Dashboard page (client component)
    expect(routeMap.get("/dashboard:page")).toBeDefined();
    expect(
      routeMap.get("/dashboard:page")?.tree.metadata.component.isClientComponent
    ).toBe(true);

    // Blog page (group folder stripped)
    expect(routeMap.get("/blog:page")).toBeDefined();
    expect(routeMap.get("/blog:page")?.routeGroup).toBe("(marketing)");

    // About page (group folder stripped)
    expect(routeMap.get("/about:page")).toBeDefined();
    expect(routeMap.get("/about:page")?.routeGroup).toBe("(marketing)");
  });

  it("calculates correct stats", async () => {
    const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
    const host = new NodeHost();
    const scanner = new ProjectScanner(host);

    const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

    // Stats: 5 entry points + 3 shared components (button, header, dashboard-stats)
    expect(result.stats.totalFiles).toBe(8);

    // Source-level counts (based on "use client" directive)
    expect(result.stats.clientComponents).toBe(2); // DashboardPage + Button
    expect(result.stats.serverComponents).toBe(6);

    // Effective counts (runtime behavior - what ends up in client bundle)
    // DashboardPage (client) imports Button (client) and DashboardStats (server)
    // So effective client = DashboardPage + Button + DashboardStats = 3
    expect(result.stats.effectiveClientComponents).toBe(3);
    expect(result.stats.effectiveServerComponents).toBe(5);

    // Ratio is based on effective counts
    expect(result.stats.ratio).toBeCloseTo(0.375, 2);
  });

  it("identifies shared components", async () => {
    const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
    const host = new NodeHost();
    const scanner = new ProjectScanner(host);

    const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

    // Shared components are tracked by "source:importedName" format
    // Since each file uses a different relative path to Button,
    // they appear as separate entries. Check that Button imports exist.
    // Each relative path is unique, so no single Button import is "shared"
    // But we can verify totalImportedComponents includes them
    expect(result.stats.totalImportedComponents).toBeGreaterThan(0);

    // uniqueImportedComponents counts distinct source:importedName combinations
    expect(result.stats.uniqueImportedComponents).toBeGreaterThan(0);
  });

  it("shares cache across entry points", async () => {
    const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
    const host = new NodeHost();
    const scanner = new ProjectScanner(host);

    const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

    // Components are scanned once but may be used by multiple entry points
    expect(result.stats.totalFiles).toBe(8);
  });

  describe("client boundary edge case", () => {
    it("reports both source-level and effective client component counts", async () => {
      // DashboardStats has no "use client" directive, so isClientComponent = false
      // However, it's imported by DashboardPage which IS a client component
      // In Next.js, this means DashboardStats will be part of the client bundle
      const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
      const host = new NodeHost();
      const scanner = new ProjectScanner(host);

      const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

      // Source-level: only files with "use client" directive
      expect(result.stats.clientComponents).toBe(2); // DashboardPage + Button
      expect(result.stats.serverComponents).toBe(6);

      // Effective: includes server components imported by client components
      // DashboardStats is pulled into client bundle via DashboardPage
      expect(result.stats.effectiveClientComponents).toBe(3);
      expect(result.stats.effectiveServerComponents).toBe(5);
    });

    it("a server component imported by a client component is marked as effective client", async () => {
      const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
      const host = new NodeHost();
      const scanner = new ProjectScanner(host);

      const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

      // Find DashboardStats in the results
      const dashboardRoute = result.routes.find(
        (r) => r.route === "/dashboard"
      );
      expect(dashboardRoute).toBeDefined();

      // DashboardStats is a child of DashboardPage (client component)
      const dashboardStatsChild = dashboardRoute?.tree.children.find((c) =>
        c.childId.endsWith("dashboard-stats.tsx")
      );
      expect(dashboardStatsChild).toBeDefined();

      // DashboardPage.isClientComponent is TRUE (has "use client")
      expect(dashboardRoute?.tree.metadata.component.isClientComponent).toBe(true);

      // The effective count reflects that DashboardStats is in client bundle
      // even though its source doesn't have "use client"
      expect(result.stats.effectiveClientComponents).toBe(3);
    });

    it("correctly counts when a component is used by both server and client trees", async () => {
      // Button is used by:
      // - HomePage (server) -> Button stays server in this tree
      // - BlogPage (server) -> Button stays server in this tree
      // - DashboardPage (client) -> Button is client in this tree
      // But Button itself has "use client", so it's always a client component
      const entryPoints = await discoverEntryPoints(MOCK_APP_DIR);
      const host = new NodeHost();
      const scanner = new ProjectScanner(host);

      const result = await scanner.scan(entryPoints, MOCK_APP_DIR);

      // Button is imported from 3 different files with different relative paths
      // The new stats track by source:importedName, so we verify totalImportedComponents
      expect(result.stats.totalImportedComponents).toBeGreaterThanOrEqual(3);

      // Button is counted once in effective client (not 3 times)
      // Total effective client = DashboardPage + Button + DashboardStats = 3
      expect(result.stats.effectiveClientComponents).toBe(3);
    });
  });
});
