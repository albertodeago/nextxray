"use client";

import { useState } from "react";
import type { ScanResult } from "@nextxray/browser";
import { cn } from "@/lib/utils";

interface ComponentTreeProps {
  node: ScanResult;
  results: Map<string, ScanResult>;
  depth?: number;
}

function shortenPath(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 3) return path;
  return ".../" + parts.slice(-3).join("/");
}

export function ComponentTree({ node, results, depth = 0 }: ComponentTreeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isClient = node.metadata.component.isClientComponent;
  const componentName = node.metadata.component.name || "(anonymous)";

  return (
    <div>
      <div
        className={cn(
          "mb-1 rounded p-2 border-l-3",
          isClient
            ? "border-l-client bg-client-bg"
            : "border-l-server bg-server-bg"
        )}
        style={{ marginLeft: depth * 20 }}
      >
        {hasChildren ? (
          <span
            className="mr-2 inline-block w-4 cursor-pointer select-none font-mono text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="mr-2 inline-block w-4 font-mono text-xs"> </span>
        )}
        <strong className="text-sm">{componentName}</strong>
        <span className="ml-2 text-xs text-muted-foreground">
          {shortenPath(node.id)}
        </span>
        {isClient && (
          <span className="ml-2 text-[11px] font-medium text-client">
            client
          </span>
        )}
      </div>

      {expanded &&
        hasChildren &&
        node.children.map((child, idx) => {
          const childNode = results.get(child.childId);
          if (!childNode) {
            return (
              <div
                key={child.childId + idx}
                className="mb-1 rounded border-l-3 border-l-muted-foreground bg-secondary/50 p-2 text-xs text-muted-foreground"
                style={{ marginLeft: (depth + 1) * 20 }}
              >
                <span className="mr-2 inline-block w-4 font-mono"> </span>
                {child.params.name}
                <span className="ml-2 opacity-60">
                  (unresolved: {child.params.source})
                </span>
              </div>
            );
          }
          return (
            <ComponentTree
              key={child.childId + idx}
              node={childNode}
              results={results}
              depth={depth + 1}
            />
          );
        })}
    </div>
  );
}
