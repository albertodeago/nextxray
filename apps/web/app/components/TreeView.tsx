"use client";

import { useState, useMemo } from "react";
import type { RouteEntry, ScanResult } from "@nextxray/browser";
import { ComponentTree } from "./ComponentTree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TreeViewProps {
  routes: RouteEntry[];
  results: Record<string, ScanResult>;
}

export function TreeView({ routes, results }: TreeViewProps) {
  const resultsMap = useMemo(() => new Map(Object.entries(results)), [results]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Trees</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-server bg-server-bg" />
            Server Component
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-client bg-client-bg" />
            Client Component
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {routes.map((route) => (
          <RouteTreeSection
            key={route.route + route.entryFile}
            route={route}
            resultsMap={resultsMap}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface RouteTreeSectionProps {
  route: RouteEntry;
  resultsMap: Map<string, ScanResult>;
}

function RouteTreeSection({ route, resultsMap }: RouteTreeSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="overflow-hidden rounded-lg border border-border">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 bg-secondary/50 p-3 hover:bg-secondary/70">
          <span className="font-mono text-xs">{expanded ? "▼" : "▶"}</span>
          <span className="font-medium">{route.route}</span>
          <Badge variant="outline" className="text-[10px]">
            {route.entryType}
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3">
            <ComponentTree node={route.tree} results={resultsMap} depth={0} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
