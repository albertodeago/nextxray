"use client";

import { useState, useMemo } from "react";
import type { RouteEntry, ScanResult } from "@nextxray/browser";
import { ComponentGraph } from "./graph";
import { UnifiedGraph, type GraphMode } from "./graph/UnifiedGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface TreeViewProps {
  routes: RouteEntry[];
  results: Record<string, ScanResult>;
}

type ViewMode = "individual" | "stacked" | "deduplicated";

export function TreeView({ routes, results }: TreeViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("stacked");
  const resultsMap = useMemo(() => new Map(Object.entries(results)), [results]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Component Trees</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "stacked" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("stacked")}
            >
              Stacked
            </Button>
            <Button
              variant={viewMode === "deduplicated" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("deduplicated")}
            >
              Deduplicated
            </Button>
            <Button
              variant={viewMode === "individual" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("individual")}
            >
              Individual
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-server" />
            Server Component
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-client" />
            Client Component
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border-2"
              style={{ borderColor: "#f59e0b" }}
            />
            Server (but inside a client boundary)
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewMode === "individual" ? (
          routes.map((route) => (
            <RouteGraphSection
              key={route.route + route.entryFile}
              route={route}
              resultsMap={resultsMap}
            />
          ))
        ) : (
          <UnifiedGraph
            key={viewMode}
            routes={routes}
            results={resultsMap}
            mode={viewMode as GraphMode}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface RouteGraphSectionProps {
  route: RouteEntry;
  resultsMap: Map<string, ScanResult>;
}

function RouteGraphSection({ route, resultsMap }: RouteGraphSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="overflow-hidden rounded-lg border border-border">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 bg-secondary/50 p-3 hover:bg-secondary/70">
          <span className="font-mono text-xs">{expanded ? "▼" : "▶"}</span>
          <span className="font-medium">{route.route || "/"}</span>
          <Badge variant="outline" className="text-[10px]">
            {route.entryType}
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2">
            <ComponentGraph route={route} results={resultsMap} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
