"use client";

import { useEffect } from "react";
import { useScanner } from "./hooks/useScanner";
import { ProjectPicker } from "./components/ProjectPicker";
import { ScanResults } from "./components/ScanResults";
import { ThemeToggle } from "./components/ThemeToggle";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { state, scan, reset, checkSupport } = useScanner();

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  const isScanning =
    state.status === "checking" ||
    state.status === "discovering" ||
    state.status === "scanning";

  return (
    <div className="min-h-screen px-5 py-10">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <a
          href="https://github.com/albertodeago/nextxray/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Report issue
        </a>
        <ThemeToggle />
      </div>
      <header className="mx-auto max-w-225 text-center">
        <h1 className="glow-title mb-3 text-4xl font-bold tracking-tight">Next.js X-Ray</h1>
        <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
          Visualize your component tree and see server/client boundaries at a
          glance. Runs entirely in your browser — your code never leaves your
          machine.
        </p>

        {state.status === "error" && (
          <Alert variant="destructive" className="mb-6 text-left">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {state.error}
              <div className="mt-3 flex gap-2">
                {state.isRecoverable && (
                  <Button variant="outline" size="sm" onClick={reset}>
                    Try Again
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://github.com/albertodeago/nextxray/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Report issue
                  </a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {state.status !== "done" && state.status !== "error" && (
          <ProjectPicker onSelect={scan} disabled={isScanning} />
        )}

        {state.status === "checking" && (
          <p className="mt-4 text-muted-foreground">
            Checking if this is a Next.js project...
          </p>
        )}

        {state.status === "discovering" && (
          <p className="mt-4 text-muted-foreground">{state.progress}</p>
        )}

        {state.status === "scanning" && (
          <div className="mt-4 text-muted-foreground">
            <p>{state.progress}</p>
            <p>
              Entry point {state.current} of {state.total}
            </p>
          </div>
        )}

        {state.status === "done" && (
          <Button variant="outline" onClick={reset} className="mb-6">
            Scan Another Project
          </Button>
        )}
      </header>

      {state.status === "done" && (
        <main>
          <ScanResults result={state.result} />
        </main>
      )}
    </div>
  );
}
