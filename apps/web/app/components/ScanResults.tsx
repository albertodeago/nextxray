"use client";

import { useState } from "react";
import type { ProjectScanResult } from "@nextxray/browser";
import { TreeView } from "./TreeView";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowCard } from "@/components/ui/glow-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardIcon, CheckIcon, XIcon } from "@/components/ui/icons";

interface ScanResultsProps {
  result: ProjectScanResult;
}

export function ScanResults({ result }: ScanResultsProps) {
  const { stats, routes, results } = result;
  const { sharedComponents } = stats;
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="mx-auto w-full max-w-[95vw]">
        <TreeView routes={routes} results={results} />
      </div>

      <div className="mx-auto max-w-200 space-y-6">
        <GlowCard>
          <CardHeader>
            <CardTitle>Project Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">
                  Total files scanned
                </span>
                <span className="font-medium">{stats.totalFiles}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Entry points</span>
                <span className="font-medium">{routes.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Client components</span>
                <span className="font-medium">
                  {stats.clientComponents}{" "}
                  <span className="text-muted-foreground">
                    (effective: {stats.effectiveClientComponents})
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Server components</span>
                <span className="font-medium">
                  {stats.serverComponents}{" "}
                  <span className="text-muted-foreground">
                    (effective: {stats.effectiveServerComponents})
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">
                  Client/Server ratio
                </span>
                <span className="font-medium">
                  {(stats.ratio * 100).toFixed(1)}%
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Shared components</span>
                <span className="font-medium">{sharedComponents.length}</span>
              </li>
            </ul>
          </CardContent>
        </GlowCard>

        <GlowCard>
          <CardHeader>
            <CardTitle>Routes ({routes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {routes.map((route) => (
                <li
                  key={route.route + route.entryFile}
                  className="rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{route.route}</span>
                    <Badge variant="secondary">{route.entryType}</Badge>
                    {route.tree.metadata.component.isClientComponent && (
                      <Badge variant="destructive" className="text-[10px]">
                        client boundary
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {route.entryFile} — {route.tree.children.length} direct
                    children
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </GlowCard>

        {sharedComponents.length > 0 && (
          <GlowCard>
            <CardHeader>
              <CardTitle>Most Used Shared Components</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {sharedComponents.slice(0, 10).map((comp) => (
                  <li
                    key={comp.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <code className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                      {comp.id}
                    </code>
                    <span className="text-muted-foreground">
                      used by {comp.usageCount} file(s)
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </GlowCard>
        )}

        <Collapsible>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <span className="font-mono">▶</span>
              Raw JSON Output
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              {copyState === "success" && (
                <CheckIcon className="h-4 w-4 text-green-500" />
              )}
              {copyState === "error" && (
                <XIcon className="h-4 w-4 text-red-500" />
              )}
              {copyState === "idle" && <ClipboardIcon className="h-4 w-4" />}
            </Button>
          </div>
          <CollapsibleContent>
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-border bg-secondary/50 p-4 font-mono text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
