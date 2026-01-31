"use client";

import { useEffect } from "react";
import { useScanner } from "./hooks/useScanner";
import { ProjectPicker } from "./components/ProjectPicker";
import { ScanResults } from "./components/ScanResults";
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
      <header className="mx-auto max-w-225 text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Next.js X-Ray</h1>
        <p className="mb-8 text-muted-foreground">
          Analyze your Next.js project&apos;s component structure
        </p>

        {state.status === "error" && (
          <Alert variant="destructive" className="mb-6 text-left">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {state.error}
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-3"
              >
                Try Again
              </Button>
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
