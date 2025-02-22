interface GraphNode {
    id: string;
    name: string;
    info: string;
}

interface GraphLink {
    source: string;
    target: string;
    label: string;
}

interface KnowledgeGraph {
    nodes: GraphNode[];
    links: GraphLink[];
}