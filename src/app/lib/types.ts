import { Message } from 'ai';
import type { NodeObject, LinkObject} from 'react-force-graph-2d';

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    graphData?: KnowledgeGraph;
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

export interface KnowledgeGraph {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface UIGraphNode extends NodeObject {
    id: string;
    name: string;
    info: string;
    showRelationships?: boolean;
}

export interface UIGraphLink extends LinkObject {
    label: string;
}

export interface UIGraph {
    nodes: UIGraphNode[];
    links: UIGraphLink[];
}

export interface NodeEdge {
    nodeId: string;
    label: string;
    direction: "source" | "target";
}