import type { Node, Edge } from "@xyflow/react";
import type { RouteEntry, ScanResult } from "@nextxray/browser";
import type { ComponentNodeData } from "./ComponentNode";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 30;

type TreeNode = {
  id: string;
  children: TreeNode[];
  data: ComponentNodeData;
};

// Use hex colors directly since React Flow SVG edges may not have access to CSS variables
function getEdgeColor(data: ComponentNodeData): string {
  if (data.isClient) return "#ef4444"; // --color-client
  if (data.isInheritedClient) return "#f59e0b"; // --color-inherited
  return "#22c55e"; // --color-server
}

export function buildGraphFromRoute(
  route: RouteEntry,
  results: Map<string, ScanResult>
): { nodes: Node<ComponentNodeData>[]; edges: Edge[] } {
  const nodes: Node<ComponentNodeData>[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  // Build tree structure first, tracking client boundary context
  function buildTree(
    node: ScanResult,
    parentId: string,
    underClientBoundary: boolean
  ): TreeNode {
    const isClient = node.metadata.component.isClientComponent;
    // If this node is under a client boundary but isn't itself a client component,
    // it's an inherited client component
    const isInheritedClient = !isClient && underClientBoundary;
    // Children will be under client boundary if this node is client or already inherited
    const childrenUnderClient = underClientBoundary || isClient;

    const treeNode: TreeNode = {
      id: parentId,
      children: [],
      data: {
        label: node.metadata.component.name || "Component",
        filePath: node.id,
        isClient,
        isInheritedClient,
      },
    };

    for (const child of node.children) {
      const childNode = results.get(child.childId);
      if (!childNode) continue;

      const nodeId = `${parentId}->${child.childId}`;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const childTree = buildTree(childNode, nodeId, childrenUnderClient);
      childTree.data.label = childNode.metadata.component.name || child.params.name;
      childTree.data.filePath = child.childId;
      treeNode.children.push(childTree);
    }

    return treeNode;
  }

  // Create entry point node
  const entryNode = route.tree;
  const entryNodeId = `entry-${route.route}`;
  const entryIsClient = entryNode.metadata.component.isClientComponent;

  const rootTree: TreeNode = {
    id: entryNodeId,
    children: [],
    data: {
      label: route.route || "/",
      filePath: route.entryFile,
      isClient: entryIsClient,
      isEntryPoint: true,
      entryType: route.entryType,
    },
  };

  // Build children - they're under client boundary if entry is client
  for (const child of entryNode.children) {
    const childNode = results.get(child.childId);
    if (!childNode) continue;

    const nodeId = `${entryNodeId}->${child.childId}`;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const childTree = buildTree(childNode, nodeId, entryIsClient);
    childTree.data.label = childNode.metadata.component.name || child.params.name;
    childTree.data.filePath = child.childId;
    rootTree.children.push(childTree);
  }

  // Calculate positions using simple tree layout
  let yOffset = 0;

  function layoutTree(tree: TreeNode, depth: number): number {
    const x = depth * (NODE_WIDTH + HORIZONTAL_SPACING);

    if (tree.children.length === 0) {
      // Leaf node
      const y = yOffset;
      yOffset += NODE_HEIGHT + VERTICAL_SPACING;

      nodes.push({
        id: tree.id,
        type: "component",
        position: { x, y },
        data: tree.data,
      });

      return y;
    }

    // Process children first to get their positions
    const childYs: number[] = [];
    for (const child of tree.children) {
      const childY = layoutTree(child, depth + 1);
      childYs.push(childY);

      // Add edge with color based on child's status
      edges.push({
        id: `edge-${tree.id}-${child.id}`,
        source: tree.id,
        target: child.id,
        style: { stroke: getEdgeColor(child.data) },
      });
    }

    // Center parent among children
    const minY = Math.min(...childYs);
    const maxY = Math.max(...childYs);
    const y = (minY + maxY) / 2;

    nodes.push({
      id: tree.id,
      type: "component",
      position: { x, y },
      data: tree.data,
    });

    return y;
  }

  layoutTree(rootTree, 0);

  return { nodes, edges };
}
