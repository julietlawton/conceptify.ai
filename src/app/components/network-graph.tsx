"use client"
import { useCallback, useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import 'katex/dist/katex.min.css';
import { GraphToolbar } from "./graph-toolbar"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useChat, useCurrentGraph } from "../context/ChatContext"
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { v4 as uuidv4 } from 'uuid';

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })
import type { NodeObject, LinkObject, ForceGraphMethods } from 'react-force-graph-2d';
import {
    KnowledgeGraph,
    UIGraphNode,
    UIGraphLink,
    UIGraph,
    NodeEdge,
    ColorPalette
} from "../lib/types";
import { inter } from "../ui/fonts";
import { colorPaletteById } from "../ui/color-palettes";
import { NodeTooltip } from "./node-tooltip";

interface NewNodeData {
    name: string;
    info: string;
    showRelationships: boolean;
    edges: NodeEdge[];
}

function djb2(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0;
}

function stripUIGraph(uiGraph: UIGraph): KnowledgeGraph {
    return {
        nodes: uiGraph.nodes.map((node) => ({
            id: node.id,
            name: node.name,
            info: node.info,
        })),
        links: uiGraph.links.map((link) => {
            // Extract source and target as strings.
            const sourceId =
                typeof link.source === "object" ? link.source.id : link.source;
            const targetId =
                typeof link.target === "object" ? link.target.id : link.target;
            return {
                source: String(sourceId),
                target: String(targetId),
                label: link.label,
            };
        }),
        settings: uiGraph.settings
    };
}

export default function NetworkGraph({
    isFullScreen,
    isGraphVisible,
    onToggleFullScreen
}: {
    isFullScreen: boolean,
    isGraphVisible: boolean,
    onToggleFullScreen: () => void
}) {
    const { 
        currentConversationId,
        addActionToUndoStack,
        undoAction,
        redoAction,
        undoStackLength,
        redoStackLength
    } = useChat();

    const { graphData, updateConversationGraphData } = useCurrentGraph();

    const [uiGraphData, setUiGraphData] = useState<UIGraph>(() => {
        // Clone the pure data
        const cloned = JSON.parse(JSON.stringify(graphData));
        return cloned;
    });

    const [highlightNodes, setHighlightNodes] = useState(new Set())
    const [highlightLinks, setHighlightLinks] = useState(new Set())
    const [hoverNode, setHoverNode] = useState<UIGraphNode | null>(null)
    const [selectedNode, setSelectedNode] = useState<UIGraphNode | null>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
    const [newNodeData, setNewNodeData] = useState<NewNodeData>({ name: "", info: "", showRelationships: false, edges: [] })
    const graphRef = useRef<HTMLDivElement | null>(null);
    const forceGraphRef = useRef<ForceGraphMethods | undefined>(undefined);
    const [typedLetter, setTypedLetter] = useState<string>("");

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const char = event.key.toLowerCase();
        if (char.length === 1 && char.match(/[a-z]/i)) {
            setTypedLetter(char);
        }
    };

    useEffect(() => {
        if (typedLetter) {
            const matchedNode = graphData.nodes
                .sort((a, b) => a.name.localeCompare(b.name))
                .find((node) => node.name.toLowerCase().startsWith(typedLetter));

            if (matchedNode) {
                setNewNodeData((prev) => ({
                    ...prev,
                    edges: prev.edges.map((edge, index) =>
                        index === prev.edges.length - 1 ? { ...edge, nodeId: matchedNode.id } : edge
                    )
                }));
            }

            const timeout = setTimeout(() => setTypedLetter(""), 1000);
            return () => clearTimeout(timeout);
        }
    }, [typedLetter, graphData.nodes]);

    const updateDimensions = useCallback(() => {
        if (graphRef.current) {
            setDimensions({
                width: graphRef.current.offsetWidth,
                height: graphRef.current.offsetHeight,
            })
        }
    }, [])

    useEffect(() => {
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [updateDimensions])

    useEffect(() => {
        // Clone pure graph data and add default value for showRelationships
        setSelectedNode(null);
        const cloned = JSON.parse(JSON.stringify(graphData));
        setUiGraphData(cloned);
    }, [graphData]);

    useEffect(() => {
        console.log("Conversation changed, clearing undo/redo")
    }, [currentConversationId]);

    const handleNodeHover = useCallback(
        (node: NodeObject | null) => {
            const typedNode = node as UIGraphNode | null;

            // Set highlight for the hovered node, if any
            setHighlightNodes(new Set(node ? [node.id] : []));

            // Filter links that involve the hovered node, safely extracting IDs
            setHighlightLinks(
                new Set(
                    typedNode
                        ? uiGraphData.links
                            .filter((link) => {
                                const sourceId =
                                    typeof link.source === "object" && link.source
                                        ? link.source.id
                                        : link.source;
                                const targetId =
                                    typeof link.target === "object" && link.target
                                        ? link.target.id
                                        : link.target;
                                return sourceId === typedNode.id || targetId === typedNode.id;
                            })
                            .map((link) => {
                                const sourceId =
                                    typeof link.source === "object" && link.source
                                        ? link.source.id
                                        : link.source;
                                const targetId =
                                    typeof link.target === "object" && link.target
                                        ? link.target.id
                                        : link.target;
                                // If link.id is missing, create one from source and target IDs
                                return link.id || `${sourceId}-${targetId}`;
                            })
                        : []
                )
            );

            // Set the hover state
            setHoverNode(typedNode);

            if (typedNode) {
                typedNode.fx = typedNode.x;
                typedNode.fy = typedNode.y;
            } else {
                uiGraphData.nodes.forEach((n) => {
                    n.fx = undefined;
                    n.fy = undefined;
                });
            }

            // Reheat the simulation to apply changes
            if (forceGraphRef.current) {
                forceGraphRef.current.d3ReheatSimulation();
            }
        },
        [uiGraphData.links, uiGraphData.nodes]
    );

    const handleNodeClick = useCallback((node: NodeObject) => {
        const typedNode = node as UIGraphNode;
        setSelectedNode(typedNode);
    }, [])

    const handleLinkHover = useCallback((link: LinkObject | null) => {
        const typedLink = link as UIGraphLink;
        if (!typedLink) {
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
            return;
        }
        const sourceId =
            typeof typedLink.source === "object" && typedLink.source
                ? typedLink.source.id
                : typedLink.source;
        const targetId =
            typeof typedLink.target === "object" && typedLink.target
                ? typedLink.target.id
                : typedLink.target;

        setHighlightNodes(new Set([sourceId, targetId].filter(Boolean) as string[]));
        setHighlightLinks(new Set([typedLink.id || `${sourceId}-${targetId}`]));
    }, [])

    const nodeColor = useCallback((node: NodeObject) => {
        const typedNode = node as UIGraphNode;
        const palette = colorPaletteById[uiGraphData.settings.colorPaletteId] ?? colorPaletteById.defaultPalette;
        const hash = djb2(typedNode.id);

        return palette.colors[hash % palette.colors.length];
    },
        [uiGraphData.settings.colorPaletteId]
    );

    const linkColor = useCallback(
        (link: LinkObject) => {
            const typedLink = link as UIGraphLink;
            const sourceId =
                typeof typedLink.source === "object" && typedLink.source
                    ? typedLink.source.id
                    : typedLink.source;
            const targetId =
                typeof typedLink.target === "object" && typedLink.target
                    ? typedLink.target.id
                    : typedLink.target;
            
            const palette = colorPaletteById[uiGraphData.settings.colorPaletteId] ?? colorPaletteById.defaultPalette;
            const linkHighlightColor = palette.linkHighlight ?? colorPaletteById.defaultPalette.linkHighlight;
            return highlightLinks.has(typedLink.id || `${sourceId}-${targetId}`) ? linkHighlightColor : " #dedfde"
        },
        [highlightLinks, uiGraphData.settings.colorPaletteId],
    )

    const handleResetView = useCallback(() => {
        if (forceGraphRef.current) {
            forceGraphRef.current.zoomToFit();
        }
    }, [])

    const handleAddNode = () => {
        setDialogMode("add");
        setNewNodeData({ name: "", info: "", showRelationships: false, edges: [] });
        setIsDialogOpen(true);
    }

    const handleEditNode = () => {
        if (selectedNode) {
            setDialogMode("edit");

            const nodeEdges: NodeEdge[] = uiGraphData.links
                .filter((link) => {
                    const sourceId =
                        typeof link.source === "object" && link.source ? link.source.id : link.source;
                    const targetId =
                        typeof link.target === "object" && link.target ? link.target.id : link.target;
                    // Only keep links where both sourceId and targetId are defined, and one of them matches the selected node
                    return Boolean(sourceId) && Boolean(targetId) && (sourceId === selectedNode.id || targetId === selectedNode.id);
                })
                .map((link) => {
                    const sourceId =
                        typeof link.source === "object" && link.source ? link.source.id : link.source;
                    const targetId =
                        typeof link.target === "object" && link.target ? link.target.id : link.target;
                    return {
                        nodeId: sourceId === selectedNode.id ? String(targetId) : String(sourceId),
                        label: link.label,
                        direction: sourceId === selectedNode.id ? "source" : "target",
                    };
                });

            setNewNodeData({
                name: selectedNode.name,
                info: selectedNode.info,
                showRelationships: uiGraphData.settings.showNodeRelationships[selectedNode.id],
                edges: nodeEdges
            });
            setIsDialogOpen(true);
        }
    }

    const handleDeleteNode = () => {
        if (selectedNode) {

            addActionToUndoStack();

            const newNodes = uiGraphData.nodes.filter(
                (node) => node.id !== selectedNode.id
            );
            const newLinks = uiGraphData.links.filter((link) => {
                const sourceId =
                    typeof link.source === "object" ? link.source.id : link.source;
                const targetId =
                    typeof link.target === "object" ? link.target.id : link.target;
                return sourceId !== selectedNode.id && targetId !== selectedNode.id;
            });

            const currentSettings = uiGraphData.settings;
            const newShowRelationships = Object.fromEntries(
                Object.entries(currentSettings.showNodeRelationships).filter(
                    ([key]) => key !== selectedNode.id
                )
            );
            const newSettings = {
                ...currentSettings,
                showNodeRelationships: newShowRelationships,
            };

            const newUIGraph: UIGraph = { nodes: newNodes, links: newLinks, settings: newSettings };
            const pureGraph = stripUIGraph(newUIGraph);

            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, pureGraph);
            }

            setSelectedNode(null);
        }
    };

    const handleDialogSubmit = () => {
        const avgX = uiGraphData.nodes.reduce((sum, node) => sum + (node.x ?? 0), 0) / uiGraphData.nodes.length
        const avgY = uiGraphData.nodes.reduce((sum, node) => sum + (node.y ?? 0), 0) / uiGraphData.nodes.length

        addActionToUndoStack();

        if (dialogMode === "add") {
            const newNode = {
                id: uuidv4(),
                name: newNodeData.name,
                info: newNodeData.info,
                showRelationships: newNodeData.showRelationships,
                x: avgX + (Math.random() - 0.5) * 100,
                y: avgY + (Math.random() - 0.5) * 100,
            }

            console.log(newNode);
            console.log(newNodeData);

            // Convert each simplified edge in newNodeData into a full graph link.
            // Look up the "other" node using edge.nodeId.
            const newLinks = newNodeData.edges
                .map((edge) => {
                    const otherNode = uiGraphData.nodes.find((node) => node.id === edge.nodeId);
                    if (!otherNode) {
                        console.warn("Other node not found for edge", edge);
                        return null;
                    }
                    return {
                        // If the new node should be the source, then the link's source is newNode
                        // and the target is the other node; vice versa otherwise.
                        source: edge.direction === "source" ? newNode : otherNode,
                        target: edge.direction === "target" ? newNode : otherNode,
                        label: edge.label,
                    };
                })
                .filter((link) => link !== null);

            const currentSettings = uiGraphData.settings;

            const updatedShowRelationships = {
                ...currentSettings.showNodeRelationships,
                [newNode.id]: newNodeData.showRelationships,
            };

            const newSettings = {
                ...currentSettings,
                showNodeRelationships: updatedShowRelationships,
            };

            const newUIGraph: UIGraph = {
                nodes: [...uiGraphData.nodes, newNode],
                links: [...uiGraphData.links, ...newLinks],
                settings: newSettings
            };
            const pureGraph = stripUIGraph(newUIGraph);

            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, pureGraph);
            }


        } else if (dialogMode === "edit" && selectedNode) {
            const updatedNodes = uiGraphData.nodes.map((node) =>
                node.id === selectedNode.id
                    ? {
                        ...node,
                        name: newNodeData.name,
                        info: newNodeData.info,
                    }
                    : node,
            );
            const updatedLinks = uiGraphData.links.filter((link) => {
                // Safely extract IDs from the link
                const sourceId = typeof link.source === "object" && link.source ? link.source.id : link.source;
                const targetId = typeof link.target === "object" && link.target ? link.target.id : link.target;
                // Remove all edges that involve the selected node
                return sourceId !== selectedNode.id && targetId !== selectedNode.id;
            });

            const newLinks = newNodeData.edges
                .map((edge) => {
                    const sourceId =
                        typeof edge.direction === "string" && edge.direction === "source"
                            ? selectedNode.id
                            : edge.nodeId;
                    const targetId =
                        typeof edge.direction === "string" && edge.direction === "target"
                            ? selectedNode.id
                            : edge.nodeId;

                    // Ensure sourceId and targetId are valid
                    if (!sourceId || !targetId) return null;

                    // Check if an edge already exists between these nodes in updatedLinks.
                    const edgeAlreadyExists = updatedLinks.some((link) => {
                        const existingSource =
                            typeof link.source === "object" && link.source ? link.source.id : link.source;
                        const existingTarget =
                            typeof link.target === "object" && link.target ? link.target.id : link.target;
                        return existingSource === sourceId && existingTarget === targetId;
                    });

                    if (edgeAlreadyExists) {
                        console.warn("Edge already exists between these nodes", edge);
                        return null;
                    }

                    return {
                        source: String(sourceId),
                        target: String(targetId),
                        label: edge.label,
                    } as UIGraphLink;
                })
                .filter((link): link is UIGraphLink => link !== null);

            const currentSettings = uiGraphData.settings;

            const updatedShowRelationships = {
                ...currentSettings.showNodeRelationships,
                [selectedNode.id]: newNodeData.showRelationships,
            };

            const newSettings = {
                ...currentSettings,
                showNodeRelationships: updatedShowRelationships,
            };

            const newUIGraph: UIGraph = {
                nodes: updatedNodes,
                links: [...updatedLinks, ...newLinks],
                settings: newSettings
            };
            const pureGraph = stripUIGraph(newUIGraph);

            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, pureGraph);
            }

            setSelectedNode(null);
        }
        setIsDialogOpen(false);
    }

    const handleAddEdge = () => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: [...prev.edges, { nodeId: "", label: "", direction: "source" }],
        }))
    }

    const handleRemoveEdge = (index: number) => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: prev.edges.filter((_, i) => i !== index),
        }))
    }

    const handleEdgeChange = (index: number, field: string, value: string) => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: prev.edges.map((edge, i) => (i === index ? { ...edge, [field]: value } : edge)),
        }))
    }

    const handleDeleteGraph = () => {
        if (currentConversationId) {
            updateConversationGraphData(currentConversationId, null);
        }
    };

    const handleSearchSelect = (node: UIGraphNode) => {
        if (forceGraphRef.current && node) {
            const graphContainer = document.getElementById('graph-container');
            if (!graphContainer) return;
            
            // Get width of the graph container to compute zoom
            const width = graphContainer.getBoundingClientRect().width;
    
            // Zoom to 20% width if the container is fullscreen, otherwise 35%
            const zoomProportion = isFullScreen ? 0.20 : 0.35;
    
            // Compute zoom level based on container size, normalized by node size
            const zoomLevel = (width * zoomProportion) / 10; 
    
            // Center the graph on the selected node
            forceGraphRef.current.centerAt(node.x!, node.y!, 500);
    
            // Apply zoom
            forceGraphRef.current.zoom(zoomLevel, 500);
        }
    };

    const handleColorPaletteSelect = (palette: ColorPalette) => {
        if (currentConversationId && uiGraphData.settings) {
            // Create a new graph object with updated settings:
            const newGraph = {
                ...uiGraphData,
                settings: {
                    ...uiGraphData.settings,
                    colorPaletteId: palette.id,
                },
            };
            const pureGraph = stripUIGraph(newGraph);
            updateConversationGraphData(currentConversationId, pureGraph);
        }
    };

    return (
        <div id="graph-container" ref={graphRef} className="h-full w-full flex flex-col relative">
            <GraphToolbar
                onAddNode={handleAddNode}
                onEditNode={handleEditNode}
                onDeleteNode={handleDeleteNode}
                onResetView={handleResetView}
                onToggleFullScreen={onToggleFullScreen}
                selectedNode={selectedNode}
                isFullScreen={isFullScreen}
                onDeleteGraph={handleDeleteGraph}
                nodes={uiGraphData.nodes}
                onSearchSelect={handleSearchSelect}
                onColorPaletteSelect={handleColorPaletteSelect}
                currentColorPalette={colorPaletteById[uiGraphData.settings.colorPaletteId] ?? colorPaletteById.defaultPalette}
                onUndo={undoAction}
                onRedo={redoAction}
                undoStackLength={undoStackLength}
                redoStackLength={redoStackLength}
            />
            <div className={`flex-grow transition-opacity duration-400 ${isGraphVisible ? "visible opacity-100" : "invisible opacity-0"}`}>
                <ForceGraph2D
                    ref={forceGraphRef}
                    graphData={uiGraphData}
                    nodeColor={nodeColor}
                    linkColor={linkColor}
                    nodeLabel={null}
                    onNodeHover={handleNodeHover}
                    onNodeClick={handleNodeClick}
                    onLinkHover={handleLinkHover}
                    linkWidth={2}
                    nodeRelSize={6}
                    width={dimensions.width}
                    height={dimensions.height}
                    d3VelocityDecay={0.5}
                    {...({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        d3Force: (force: any) => {
                            force("link").distance(1000);
                            force("charge").strength(-500);
                            force("center").strength(0.05);
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any)}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 14 / globalScale;
                        ctx.font = `600 ${fontSize}px ${inter.style.fontFamily}`;

                        // Maximum width allowed for a line (adjust as needed)
                        const maxWidth = 100 / globalScale;
                        const lineHeight = fontSize * 1.2;

                        // Function to wrap text without splitting words
                        const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
                            const words = text.split(" ");
                            const lines = [];
                            let currentLine = words[0];
                            for (let i = 1; i < words.length; i++) {
                                const word = words[i];
                                const testLine = currentLine + " " + word;
                                const testWidth = context.measureText(testLine).width;
                                if (testWidth > maxWidth && currentLine !== "") {
                                    lines.push(currentLine);
                                    currentLine = word;
                                } else {
                                    currentLine = testLine;
                                }
                            }
                            lines.push(currentLine);
                            return lines;
                        };

                        // Wrap the label
                        const lines = wrapText(ctx, label, maxWidth);

                        // Compute the maximum line width among the wrapped lines
                        let maxLineWidth = 0;
                        lines.forEach((line) => {
                            const lineWidth = ctx.measureText(line).width;
                            if (lineWidth > maxLineWidth) {
                                maxLineWidth = lineWidth;
                            }
                        });

                        // Set node size based on the maximum wrapped line width
                        const nodeSize = Math.max(8, maxLineWidth / 2) + 4;

                        // Draw the node as a circle
                        ctx.beginPath();
                        ctx.arc(node.x ?? 0, node.y ?? 0, nodeSize, 0, 2 * Math.PI);
                        ctx.fillStyle = nodeColor(node);
                        ctx.fill();
                        
                        const palette = colorPaletteById[uiGraphData.settings.colorPaletteId] ?? colorPaletteById.defaultPalette;
                        const paletteTextColor = palette.textColor ?? colorPaletteById.defaultPalette.textColor;
                        const paletteNodeHighlightColor = palette.nodeHighlight ?? colorPaletteById.defaultPalette.nodeHighlight;

                        // Set text properties
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = paletteTextColor;

                        // Center the block of wrapped text vertically.
                        const totalHeight = lines.length * lineHeight;

                        // @ts-expect-error node.y can be undefined
                        const startY = node.y - totalHeight / 2 + lineHeight / 2;

                        lines.forEach((line, i) => {
                            ctx.fillText(line, node.x ?? 0, startY + i * lineHeight);
                        });

                        // Highlight node
                        if (highlightNodes.has(node.id)) {
                            ctx.strokeStyle = paletteNodeHighlightColor;
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }
                    }}
                    linkDirectionalParticles={4}
                    linkDirectionalParticleWidth={2}
                    linkCanvasObjectMode={() => "after"}
                />
            </div>
            {hoverNode && <NodeTooltip node={hoverNode} graphData={uiGraphData} />}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] w-11/12 max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{dialogMode === "add" ? "Add New Node" : "Edit Node"}</DialogTitle>
                        <DialogDescription>
                            {dialogMode === "add"
                                ? "Create a new node in the concept map."
                                : "Edit the selected node."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 px-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="flex items-center justify-end gap-1">
                                <Label htmlFor="name" className="whitespace-nowrap">Name</Label>

                                <div className="relative group">
                                    <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                    <div className="absolute w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>The name of this concept.</p>
                                    </div>
                                </div>
                            </div>
                            <Input
                                id="name"
                                value={newNodeData.name}
                                onChange={(e) => setNewNodeData((prev) => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <div className="flex items-start justify-end gap-1">
                                <Label htmlFor="info" className="whitespace-nowrap">Info</Label>
                                <div className="relative group">
                                    <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-1 -translate-y-1/4" />
                                    <div className="absolute w-[250px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>The description of this concept. Supports:</p>
                                        <ul className="mt-1 list-disc list-inside">
                                            <li>Markdown (e.g., <strong>bold</strong>, <em>italic</em>)</li><br></br>
                                            <li>LaTeX (e.g., $(1+x)^2$)</li><br></br>
                                            <li>Code Blocks (e.g., <code>```python print(&quot;Hello&quot;) ```</code>)</li><br></br>
                                            <li>Images (e.g., <code>![alt text](https://example.com/image.png)</code>)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <Textarea
                                id="info"
                                value={newNodeData.info}
                                onChange={(e) => setNewNodeData((prev) => ({ ...prev, info: e.target.value }))}
                                className="col-span-3 h-32"
                                placeholder="Supports Markdown, LaTeX, code blocks, and images."
                            />
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <div className="flex items-center justify-end gap-1">
                                <Label htmlFor="name" className="whitespace-nowrap">Edges</Label>

                                <div className="relative group">
                                    <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                    <div className="absolute -top-[50px] w-[320px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>Edges are connections between concepts.</p>
                                        <ul className="mt-1 list-disc list-inside">
                                            <li><strong>Select Node</strong>: A node this concept is related to.</li>
                                            <li><strong>Edge Label</strong>: Defines the relation between these concepts.</li>
                                            <li><strong>Source vs. Target</strong>: Defines the direction of the relationship.</li>
                                            <ul className="ml-4 list-disc list-inside">
                                                <li><strong>Source</strong>: The broader or more general concept.</li>
                                                <li><strong>Target</strong>: The specific concept being classified or described.</li>
                                                <li>Example: <strong>Fruit</strong> (source) <em>is a type of</em> <strong>Apple</strong> (target).</li>
                                            </ul>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-3 space-y-4">
                                {newNodeData.edges.map((edge, index) => (
                                    <div key={index} className="flex flex-wrap items-center gap-2">
                                        <Select value={edge.nodeId} onValueChange={(value) => handleEdgeChange(index, "nodeId", value)}>
                                            <SelectTrigger className="w-[200px]" onKeyDown={handleKeyDown}>
                                                <SelectValue placeholder="Select node" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {graphData.nodes
                                                    .filter((node) => dialogMode === "edit" ? node.id !== selectedNode?.id : true)
                                                    .filter((node) =>
                                                        newNodeData.edges[index]?.nodeId === node.id || 
                                                        !newNodeData.edges.some((edge) => edge.nodeId === node.id)
                                                    )
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map((node) => (
                                                        <SelectItem key={node.id} value={node.id}>
                                                            {node.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            placeholder="Edge label"
                                            value={edge.label}
                                            onChange={(e) => handleEdgeChange(index, "label", e.target.value)}
                                            className="flex-grow min-w-[200px]"
                                        />
                                        <RadioGroup
                                            value={edge.direction}
                                            onValueChange={(value) => handleEdgeChange(index, "direction", value)}
                                            className="flex space-x-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="source" id={`source-${index}`} />
                                                <Label htmlFor={`source-${index}`}>Source</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="target" id={`target-${index}`} />
                                                <Label htmlFor={`target-${index}`}>Target</Label>
                                            </div>
                                        </RadioGroup>
                                        <Button variant="outline" size="icon" onClick={() => handleRemoveEdge(index)}>
                                            X
                                        </Button>
                                    </div>
                                ))}
                                <Button onClick={handleAddEdge}>Add Edge</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="flex items-center justify-end gap-1">
                                <Label htmlFor="showRelationships" className="text-right">
                                    Show Edges
                                </Label>

                                <div className="relative group">
                                    <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                    <div className="absolute w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>Toggles displaying the edges for this node on the hover card.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-3">
                                <input
                                    type="checkbox"
                                    id="showRelationships"
                                    checked={newNodeData.showRelationships}
                                    onChange={(e) =>
                                        setNewNodeData((prev) => ({ ...prev, showRelationships: e.target.checked }))
                                    }
                                    className="h-5 w-5 accent-black align-middle mt-[1px]"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sticky bottom-0 pt-2">
                        <Button onClick={handleDialogSubmit}>{dialogMode === "add" ? "Add" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-600 italic px-4 py-2 rounded text-sm w-[70%] w-auto text-center">
                LLMs can {" "}
                <a
                    href="https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                >
                    hallucinate
                </a>. Remember to fact check generated content.
            </div>
        </div>
    )
}