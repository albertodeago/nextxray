"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ComponentNodeData = {
  label: string;
  filePath: string;
  isClient: boolean;
  isEntryPoint?: boolean;
  entryType?: string;
};

interface ComponentNodeProps {
  data: ComponentNodeData;
}

function ComponentNodeComponent({ data }: ComponentNodeProps) {
  const { label, filePath, isClient, isEntryPoint, entryType } = data;

  return (
    <div
      className={cn(
        "rounded-lg border-2 px-4 py-3 shadow-md min-w-32 max-w-48",
        "bg-background transition-all",
        isClient ? "border-client" : "border-server"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!w-2 !h-2 !border-2 !bg-background",
          isClient ? "!border-client" : "!border-server"
        )}
      />

      {isEntryPoint && entryType && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {entryType}
        </div>
      )}

      <div
        className={cn(
          "font-medium text-sm truncate",
          isClient ? "text-client" : "text-server"
        )}
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
        className={cn(
          "!w-2 !h-2 !border-2 !bg-background",
          isClient ? "!border-client" : "!border-server"
        )}
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
