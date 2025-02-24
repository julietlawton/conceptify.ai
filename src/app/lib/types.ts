import { Message } from 'ai';
import type { NodeObject, LinkObject} from 'react-force-graph-2d';

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    graphData?: KnowledgeGraph | null;
}

export interface GraphNode {
    id: string;
    name: string;
    info: string;
}

export interface GraphLink {
    source: string;
    target: string;
    label: string;
}

export interface GraphSettings {
    colorPaletteId: string;
    showNodeRelationships: {[nodeId: string]: boolean};
}

export interface KnowledgeGraph {
    nodes: GraphNode[];
    links: GraphLink[];
    settings: GraphSettings;
}

export interface UIGraphNode extends NodeObject {
    id: string;
    name: string;
    info: string;
}

export interface UIGraphLink extends LinkObject {
    label: string;
}

export interface UIGraph {
    nodes: UIGraphNode[];
    links: UIGraphLink[];
    settings: GraphSettings;
}

export interface NodeEdge {
    nodeId: string;
    label: string;
    direction: "source" | "target";
}

export interface ColorPalette {
    id: string;
    name: string;
    colors: string[];
    nodeHighlight: string;
    linkHighlight: string;
    textColor: "black" | "white";
}