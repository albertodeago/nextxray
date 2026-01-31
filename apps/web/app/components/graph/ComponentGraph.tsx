"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { RouteEntry, ScanResult } from "@nextxray/browser";
import { ComponentNode, type ComponentNodeData } from "./ComponentNode";
import { buildGraphFromRoute } from "./graph-layout";

const nodeTypes: NodeTypes = {
  component: ComponentNode,
};

interface ComponentGraphProps {
  route: RouteEntry;
  results: Map<string, ScanResult>;
}

export function ComponentGraph({ route, results }: ComponentGraphProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphFromRoute(route, results);
    return { initialNodes: nodes, initialEdges: edges };
  }, [route, results]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-80 w-full rounded-lg border border-border bg-background/50">
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
        <MiniMap
          className="!bg-secondary !border-border"
          nodeColor={(node: Node<ComponentNodeData>) => {
            return node.data?.isClient ? "var(--color-client)" : "var(--color-server)";
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  );
}
