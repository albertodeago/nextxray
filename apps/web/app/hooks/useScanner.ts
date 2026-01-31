"use client";

import { useState, useCallback } from "react";
import {
  BrowserHost,
  Crawler,
  aggregate,
  calculateStats,
  discoverEntryPoints,
  isNextJsProject,
  isFileSystemAccessSupported,
  type ProjectScanResult,
  type ScanResult,
} from "@nextxray/browser";

export type ScanState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "discovering"; progress: string }
  | { status: "scanning"; progress: string; current: number; total: number }
  | { status: "error"; error: string; isRecoverable: boolean }
  | { status: "done"; result: ProjectScanResult };

export function useScanner() {
  const [state, setState] = useState<ScanState>({ status: "idle" });

  const checkSupport = useCallback((): boolean => {
    if (!isFileSystemAccessSupported()) {
      setState({
        status: "error",
        error:
          "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.",
        isRecoverable: false,
      });
      return false;
    }
    return true;
  }, []);

  const scan = useCallback(async (handle: FileSystemDirectoryHandle) => {
    try {
      setState({ status: "checking" });

      // Check if it's a Next.js project
      const isNextJs = await isNextJsProject(handle);
      if (!isNextJs) {
        setState({
          status: "error",
          error:
            "This does not appear to be a Next.js project. Could not find next.config.* or next in package.json.",
          isRecoverable: true,
        });
        return;
      }

      // Discover entry points
      setState({
        status: "discovering",
        progress: "Looking for app directory...",
      });

      const entryPoints = await discoverEntryPoints(
        handle,
        "app",
        "/",
        (progress) => {
          setState({ status: "discovering", progress });
        },
      );

      if (entryPoints.length === 0) {
        setState({
          status: "error",
          error:
            "No entry points (page.tsx, layout.tsx) found in the app directory.",
          isRecoverable: true,
        });
        return;
      }

      // Create host and crawler
      const host = new BrowserHost({ rootHandle: handle });
      const crawler = new Crawler(host);

      // Crawl all entry points
      let results: Map<string, ScanResult> = new Map();
      for (let i = 0; i < entryPoints.length; i++) {
        const entry = entryPoints[i]!;
        setState({
          status: "scanning",
          progress: `Scanning ${entry}...`,
          current: i + 1,
          total: entryPoints.length,
        });
        results = await crawler.crawl(entry);
      }

      // Aggregate results
      const routes = aggregate(results, entryPoints, "/app");
      const stats = calculateStats(results, entryPoints);
      // Convert Map to Record for JSON serialization
      const resultsRecord: Record<string, ScanResult> = {};
      for (const [key, value] of results) {
        resultsRecord[key] = value;
      }
      const result: ProjectScanResult = {
        routes,
        stats,
        results: resultsRecord,
      };

      setState({ status: "done", result });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        isRecoverable: true,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, scan, reset, checkSupport };
}
