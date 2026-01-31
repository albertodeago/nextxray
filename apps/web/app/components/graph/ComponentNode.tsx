"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ComponentNodeData = {
  label: string;
  filePath: string;
  isClient: boolean;
  isInheritedClient?: boolean; // Server component rendered under client boundary
  isEntryPoint?: boolean;
  entryType?: string;
};

interface ComponentNodeProps {
  data: ComponentNodeData;
}

type ColorVariant = "server" | "client" | "inherited";

function getColorVariant(data: ComponentNodeData): ColorVariant {
  if (data.isClient) return "client";
  if (data.isInheritedClient) return "inherited";
  return "server";
}

// Use hex colors directly since React Flow nodes may not have access to CSS variables
const colorValues: Record<ColorVariant, string> = {
  server: "#22c55e",
  client: "#ef4444",
  inherited: "#f59e0b",
};

function ComponentNodeComponent({ data }: ComponentNodeProps) {
  const { label, filePath, isEntryPoint, entryType } = data;
  const variant = getColorVariant(data);
  const color = colorValues[variant];

  return (
    <div
      className={cn(
        "rounded-lg border-2 px-4 py-3 shadow-md min-w-32 max-w-48",
        "bg-background transition-all"
      )}
      style={{ borderColor: color }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2 !bg-background"
        style={{ borderColor: color }}
      />

      {isEntryPoint && entryType && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {entryType}
        </div>
      )}

      <div
        className="font-medium text-sm truncate"
        style={{ color }}
      >
        {label}
      </div>

      {!isEntryPoint && (
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
          {shortenPath(filePath)}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2 !bg-background"
        style={{ borderColor: color }}
      />
    </div>
  );
}

function shortenPath(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 2) return path;
  return ".../" + parts.slice(-2).join("/");
}

export const ComponentNode = memo(ComponentNodeComponent);
