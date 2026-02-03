import type { Node, Edge } from "@xyflow/react";
import type { RouteEntry, ScanResult } from "@nextxray/browser";
import type { ComponentNodeData } from "./ComponentNode";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 30;
const ROUTE_SPACING = 50;

type TreeNode = {
  id: string;
  children: TreeNode[];
  data: ComponentNodeData;
};

// Use hex colors directly since React Flow SVG edges may not have access to CSS variables
function getEdgeColor(data: ComponentNodeData): string {
  if (data.isClient) return "#f87171"; // --color-client
  if (data.isInheritedClient) return "#fbbf24"; // --color-inherited
  return "#2dd4bf"; // --color-server
}

/**
 * Option B: Stacked/Duplicated graph
 * Each route has its own subtree, stacked vertically.
 * Shared components are duplicated per route.
 */
export function buildStackedGraph(
  routes: RouteEntry[],
  results: Map<string, ScanResult>
): { nodes: Node<ComponentNodeData>[]; edges: Edge[] } {
  const allNodes: Node<ComponentNodeData>[] = [];
  const allEdges: Edge[] = [];
  let globalYOffset = 0;

  for (const route of routes) {
    const { nodes, edges, height } = buildRouteSubgraph(
      route,
      results,
      globalYOffset
    );
    allNodes.push(...nodes);
    allEdges.push(...edges);
    globalYOffset += height + ROUTE_SPACING;
  }

  return { nodes: allNodes, edges: allEdges };
}

function buildRouteSubgraph(
  route: RouteEntry,
  results: Map<string, ScanResult>,
  yOffset: number
): { nodes: Node<ComponentNodeData>[]; edges: Edge[]; height: number } {
  const nodes: Node<ComponentNodeData>[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();
  let localYOffset = yOffset;
  const startY = yOffset;

  function buildTree(
    node: ScanResult,
    parentId: string,
    underClientBoundary: boolean
  ): TreeNode {
    const isClient = node.metadata.component.isClientComponent;
    const isInheritedClient = !isClient && underClientBoundary;
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

  const entryNode = route.tree;
  const entryNodeId = `entry-${route.entryFile}`;
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

  function layoutTree(tree: TreeNode, depth: number): number {
    const x = depth * (NODE_WIDTH + HORIZONTAL_SPACING);

    if (tree.children.length === 0) {
      const y = localYOffset;
      localYOffset += NODE_HEIGHT + VERTICAL_SPACING;

      nodes.push({
        id: tree.id,
        type: "component",
        position: { x, y },
        data: tree.data,
      });

      return y;
    }

    const childYs: number[] = [];
    for (const child of tree.children) {
      const childY = layoutTree(child, depth + 1);
      childYs.push(childY);

      edges.push({
        id: `edge-${tree.id}-${child.id}`,
        source: tree.id,
        target: child.id,
        style: { stroke: getEdgeColor(child.data) },
      });
    }

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

  const height = localYOffset - startY;
  return { nodes, edges, height };
}

/**
 * Option A: Deduplicated graph
 * Shared components appear once with multiple incoming edges.
 * Shows true dependency structure as a DAG.
 */
export function buildDeduplicatedGraph(
  routes: RouteEntry[],
  results: Map<string, ScanResult>
): { nodes: Node<ComponentNodeData>[]; edges: Edge[] } {
  // Map from file path to node ID
  const fileToNodeId = new Map<string, string>();
  const nodeDataMap = new Map<string, ComponentNodeData>();
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  // Track if a node is under any client boundary
  const nodeUnderClientBoundary = new Map<string, boolean>();

  // First pass: collect all unique components and edges
  for (const route of routes) {
    const entryNodeId = `file:${route.entryFile}`;
    const entryIsClient = route.tree.metadata.component.isClientComponent;

    fileToNodeId.set(route.entryFile, entryNodeId);
    nodeUnderClientBoundary.set(entryNodeId, false); // Entry points start fresh

    // Entry point data (may be overwritten if same file is entry for multiple routes)
    const existingData = nodeDataMap.get(entryNodeId);
    nodeDataMap.set(entryNodeId, {
      label: existingData?.label
        ? `${existingData.label}, ${route.route || "/"}`
        : route.route || "/",
      filePath: route.entryFile,
      isClient: entryIsClient,
      isEntryPoint: true,
      entryType: existingData?.entryType
        ? `${existingData.entryType}, ${route.entryType}`
        : route.entryType,
    });

    // Traverse the tree
    traverseForDedup(
      route.tree,
      entryNodeId,
      entryIsClient,
      results,
      fileToNodeId,
      nodeDataMap,
      nodeUnderClientBoundary,
      edgeSet,
      edges
    );
  }

  // Second pass: update isInheritedClient based on nodeUnderClientBoundary
  for (const [nodeId, data] of nodeDataMap) {
    if (!data.isClient && nodeUnderClientBoundary.get(nodeId)) {
      data.isInheritedClient = true;
    }
  }

  // Update edge colors based on final node data
  for (const edge of edges) {
    const targetData = nodeDataMap.get(edge.target);
    if (targetData) {
      edge.style = { stroke: getEdgeColor(targetData) };
    }
  }

  // Build adjacency for topological sort
  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const nodeId of nodeDataMap.keys()) {
    adjacency.set(nodeId, new Set());
    inDegree.set(nodeId, 0);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find entry points (nodes with no incoming edges)
  const entryPoints = Array.from(nodeDataMap.keys()).filter(
    (id) => nodeDataMap.get(id)?.isEntryPoint
  );

  // Assign depths using BFS from entry points
  const depth = new Map<string, number>();
  const queue: string[] = [...entryPoints];
  for (const ep of entryPoints) {
    depth.set(ep, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current) || 0;

    for (const neighbor of adjacency.get(current) || []) {
      const existingDepth = depth.get(neighbor);
      if (existingDepth === undefined || existingDepth < currentDepth + 1) {
        depth.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  // Group nodes by depth
  const nodesByDepth = new Map<number, string[]>();
  for (const [nodeId, d] of depth) {
    if (!nodesByDepth.has(d)) {
      nodesByDepth.set(d, []);
    }
    nodesByDepth.get(d)!.push(nodeId);
  }

  // Position nodes
  const nodes: Node<ComponentNodeData>[] = [];

  for (const [d, nodeIds] of nodesByDepth) {
    const x = d * (NODE_WIDTH + HORIZONTAL_SPACING);
    nodeIds.forEach((nodeId, index) => {
      const y = index * (NODE_HEIGHT + VERTICAL_SPACING);
      const data = nodeDataMap.get(nodeId)!;

      nodes.push({
        id: nodeId,
        type: "component",
        position: { x, y },
        data,
      });
    });
  }

  return { nodes, edges };
}

function traverseForDedup(
  node: ScanResult,
  parentNodeId: string,
  underClientBoundary: boolean,
  results: Map<string, ScanResult>,
  fileToNodeId: Map<string, string>,
  nodeDataMap: Map<string, ComponentNodeData>,
  nodeUnderClientBoundary: Map<string, boolean>,
  edgeSet: Set<string>,
  edges: Edge[]
) {
  for (const child of node.children) {
    const childResult = results.get(child.childId);
    if (!childResult) continue;

    const childIsClient = childResult.metadata.component.isClientComponent;
    let childNodeId = fileToNodeId.get(child.childId);

    if (!childNodeId) {
      childNodeId = `file:${child.childId}`;
      fileToNodeId.set(child.childId, childNodeId);

      nodeDataMap.set(childNodeId, {
        label: childResult.metadata.component.name || child.params.name,
        filePath: child.childId,
        isClient: childIsClient,
      });

      nodeUnderClientBoundary.set(childNodeId, underClientBoundary);
    } else {
      // Node already exists, update underClientBoundary if this path is under client
      if (underClientBoundary) {
        nodeUnderClientBoundary.set(childNodeId, true);
      }
    }

    // Add edge if not already present
    const edgeKey = `${parentNodeId}->${childNodeId}`;
    if (!edgeSet.has(edgeKey)) {
      edgeSet.add(edgeKey);
      edges.push({
        id: `edge-${edgeKey}`,
        source: parentNodeId,
        target: childNodeId,
        style: { stroke: "var(--color-server)" }, // Will be updated in second pass
      });
    }

    // Continue traversal - children are under client boundary if parent is client or already under
    const childUnderClient = underClientBoundary || childIsClient;
    traverseForDedup(
      childResult,
      childNodeId,
      childUnderClient,
      results,
      fileToNodeId,
      nodeDataMap,
      nodeUnderClientBoundary,
      edgeSet,
      edges
    );
  }
}
