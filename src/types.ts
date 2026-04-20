export type GridMode = "grid" | "plain";

export interface NodeImage {
  id: string;
  src: string;
  alt?: string;
}

export interface MindNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  images: NodeImage[];
}

export interface MindEdge {
  id: string;
  from: string;
  to: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface DraftRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MindMapState {
  nodes: Record<string, MindNode>;
  nodeOrder: string[];
  edges: MindEdge[];
  viewport: Viewport;
  gridMode: GridMode;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  draftRect: DraftRect | null;
  linkingFromId: string | null;
  linkCursor: { x: number; y: number } | null;
  panPointerId: number | null;
  panLast: { sx: number; sy: number } | null;
  dragNode: { id: string } | null;
}
