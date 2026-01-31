"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { RouteEntry, ScanResult } from "@nextxray/browser";
import { ComponentNode } from "./ComponentNode";
import { buildStackedGraph, buildDeduplicatedGraph } from "./unified-graph-layout";

const nodeTypes: NodeTypes = {
  component: ComponentNode,
};

export type GraphMode = "stacked" | "deduplicated";

interface UnifiedGraphProps {
  routes: RouteEntry[];
  results: Map<string, ScanResult>;
  mode: GraphMode;
}

export function UnifiedGraph({ routes, results, mode }: UnifiedGraphProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } =
      mode === "stacked"
        ? buildStackedGraph(routes, results)
        : buildDeduplicatedGraph(routes, results);
    return { initialNodes: nodes, initialEdges: edges };
  }, [routes, results, mode]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Calculate dynamic height based on node count
  const graphHeight = Math.max(400, Math.min(800, nodes.length * 40));

  return (
    <div
      className="w-full rounded-lg border border-border bg-background/50"
      style={{ height: graphHeight }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--color-border)" gap={16} />
        <Controls
          className="!bg-secondary !border-border !shadow-md [&>button]:!bg-secondary [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
