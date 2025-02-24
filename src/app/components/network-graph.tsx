"use client"

import { useCallback, useState, useRef, useEffect, SetStateAction, RefObject } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from "rehype-highlight";
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

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })
import type { NodeObject, LinkObject, ForceGraphMethods } from 'react-force-graph-2d';
import { 
    GraphNode, 
    GraphLink, 
    KnowledgeGraph,
    UIGraphNode,
    UIGraphLink,
    UIGraph,
    NodeEdge, 
    ColorPalette
} from "../lib/types";
import { inter } from "../ui/fonts";
import { colorPaletteById, ColorPalettes } from "../ui/color-palettes";

interface NewNodeData {
    name: string;
    info: string;
    showRelationships: boolean;
    edges: NodeEdge[];
}

const NodeTooltip = ({ node, graphData }: { node: UIGraphNode, graphData: UIGraph }) => {

    const relatedLinks = graphData.links.filter((link: UIGraphLink) => {
        const sourceId =
        typeof link.source === "object" && link.source
            ? link.source.id
            : link.source;
        const targetId =
        typeof link.target === "object" && link.target
            ? link.target.id
            : link.target;
        return sourceId === node.id || targetId === node.id;
    })
    .map((link: UIGraphLink) => {
        let sourceName: string;
        if (typeof link.source === "object" && link.source) {
            sourceName = link.source.name;
        } else {
        // Lookup in graphData.nodes if link.source is a string
            const found = graphData.nodes.find(n => n.id === link.source);
            sourceName = found ? found.name : String(link.source);
        }

        let targetName: string;
        if (typeof link.target === "object" && link.target) {
            targetName = link.target.name;
        } else {
            const found = graphData.nodes.find(n => n.id === link.target);
            targetName = found ? found.name : String(link.target);
        }

        let label: string;
        label = link.label;

        // Attach the precomputed names to the link object
        return {label, sourceName, targetName};
    });

    const showRelationshipsForNode = graphData.settings.showNodeRelationships[node.id];

    return (
        <div
            className="bg-white p-4 rounded-lg shadow-lg absolute bottom-4 left-1/2 transform -translate-x-1/2 overflow-y-auto"
            style={{ zIndex: 10 }}
        >
            <h3 className="text-lg font-semibold mb-2">{node.name}</h3>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                className="prose prose-sm"
            >

                {node.info}
            </ReactMarkdown>

            
            {showRelationshipsForNode && relatedLinks.length > 0 ? (
                <div className="mt-2">
                    <h4 className="text-md font-semibold">Relationships:</h4>
                    <ul className="list-disc list-outside pl-5 space-y-1">
                        {relatedLinks.map((rel, index) => (
                            <li key={index} className="text-gray-700">
                                <ReactMarkdown className="prose prose-sm inline">
                                    {`**${rel.sourceName}** ${rel.label} **${rel.targetName}**`}
                                </ReactMarkdown>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : showRelationshipsForNode ? (
                <p className="text-gray-500">No relationships found.</p>
            ) : null }
        </div>
    );
};

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

function djb2(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0; 
  }


export default function NetworkGraph({ isFullScreen, onToggleFullScreen}: { isFullScreen: boolean, onToggleFullScreen: () => void}) {
    //   const [graphData, setGraphData] = useState(initialData)
    const { currentConversationId } = useChat();
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
    const [hoverLink, setHoverLink] = useState<UIGraphLink | null>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
    const [newNodeData, setNewNodeData] = useState<NewNodeData>({ name: "", info: "", showRelationships: true, edges: [] })
    const graphRef = useRef<HTMLElement | null>(null);
    const forceGraphRef = useRef<ForceGraphMethods| null>(null);

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

    const handleNodeHover = useCallback(
        (node: UIGraphNode | null, previousNode?: UIGraphNode | null) => {
          // Set highlight for the hovered node, if any
          setHighlightNodes(new Set(node ? [node.id] : []));
          
          // Filter links that involve the hovered node, safely extracting IDs
          setHighlightLinks(
            new Set(
              node
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
                      return sourceId === node.id || targetId === node.id;
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
            setHoverNode(node);

            if (node){
                node.fx = node.x;
                node.fy = node.y;
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
        [uiGraphData.links, uiGraphData.nodes] // Include additional dependencies if needed
    );
    
    const handleNodeClick = useCallback((node: UIGraphNode) => {
        setSelectedNode(node);
    }, [])

    const handleLinkHover = useCallback((link: UIGraphLink | null) => {
        if (!link) {
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
            setHoverLink(null);
            return;
        }
        const sourceId =
            typeof link.source === "object" && link.source
            ? link.source.id
            : link.source;
        const targetId =
            typeof link.target === "object" && link.target
            ? link.target.id
            : link.target;

        setHighlightNodes(new Set([sourceId, targetId].filter(Boolean) as string[]));
        setHighlightLinks(new Set([link.id || `${sourceId}-${targetId}`]));
        setHoverLink(link);
    }, [])

    const nodeColor = useCallback((node: UIGraphNode) => {
        const hash = djb2(node.id);
        const palette = colorPaletteById[uiGraphData.settings.colorPaletteId];
            return palette.colors[hash % palette.colors.length];
        },
        [uiGraphData.settings.colorPaletteId]
    );

    const linkColor = useCallback(
        (link: UIGraphLink) => {
            const sourceId =
                typeof link.source === "object" && link.source
                    ? link.source.id
                    : link.source;
            const targetId =
                typeof link.target === "object" && link.target
                    ? link.target.id
                    : link.target;
            const linkHighlightColor = colorPaletteById[uiGraphData.settings.colorPaletteId].linkHighlight;
            return highlightLinks.has(link.id || `${sourceId}-${targetId}`) ? linkHighlightColor : " #dedfde"
        },
        [highlightLinks],
    )

    const handleResetView = useCallback(() => {
        if (forceGraphRef.current) {
            forceGraphRef.current.zoomToFit();
        }
    }, [])

    const handleAddNode = () => {
        setDialogMode("add");
        setNewNodeData({ name: "", info: "", showRelationships: true, edges: [] });
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

        if (dialogMode === "add") {
            const newNode = {
                id: crypto.randomUUID(),
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
        console.log("Zooming to", node);
        console.log("Zooming to", node.id);
        // Zoom to the node
        if (forceGraphRef.current && node) {
          forceGraphRef.current.zoomToFit(500, 400, (n) => String(n.id) === String(node.id));
        }
    };

    const handleColorPaletteSelect = (palette: ColorPalette) => {
        console.log("Selected palette:", palette.id);
        console.log(currentConversationId)
        console.log(uiGraphData.settings)
        if (currentConversationId && uiGraphData.settings) {
          // Create a new graph object with updated settings:
          const newGraph = {
            ...uiGraphData,
            settings: {
              ...uiGraphData.settings,
              colorPaletteId: palette.id,
            },
          };
          console.log("new graph", newGraph)
          const pureGraph = stripUIGraph(newGraph);
          console.log("pure graph", pureGraph)
          updateConversationGraphData(currentConversationId, pureGraph);
        }
    };

    return (
        <div ref={graphRef} className="h-full w-full flex flex-col relative">
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
                currentColorPalette={colorPaletteById[uiGraphData.settings.colorPaletteId]}
            />
            <div className="flex-grow">
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
                    // d3AlphaDecay={0.05}
                    d3VelocityDecay={0.5}
                    //d3Force="charge"
                    d3Force={(force) => {
                        force("link").distance(1000)
                        force("charge").strength(-500)
                        force("center").strength(0.05)
                    }}
                    //zoom={1}
                    // onEngineStop={handleEngineStop}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 14 / globalScale;
                        ctx.font = `${fontSize}px Arial`;

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
                        ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
                        ctx.fillStyle = nodeColor(node);
                        ctx.fill();

                        const paletteTextColor = colorPaletteById[uiGraphData.settings.colorPaletteId].textColor;
                        const paletteNodeHighlightColor = colorPaletteById[uiGraphData.settings.colorPaletteId].nodeHighlight;

                        // Set text properties
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = paletteTextColor;

                        // ctx.strokeStyle = "black";
                        // ctx.lineWidth = 0.25;
                        // ctx.stroke();

                        // Center the block of wrapped text vertically.
                        const totalHeight = lines.length * lineHeight;
                        let startY = node.y - totalHeight / 2 + lineHeight / 2;
                        lines.forEach((line, i) => {
                            ctx.fillText(line, node.x, startY + i * lineHeight);
                        });

                        // Highlight node
                        if (highlightNodes.has(node.id)) {
                            ctx.strokeStyle = paletteNodeHighlightColor;
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }}
                    linkDirectionalParticles={4}
                    linkDirectionalParticleWidth={2}
                    //   linkCanvasObject={(link, ctx) => {
                    //     if (hoverLink === link) {
                    //       const start = link.source
                    //       const end = link.target

                    //       const textPos = Object.assign({}, start)
                    //       textPos.x += (end.x - start.x) / 2
                    //       textPos.y += (end.y - start.y) / 2

                    //       ctx.save()
                    //       ctx.fillStyle = "black"
                    //       ctx.font = "10px Sans-Serif"
                    //       ctx.textAlign = "center"
                    //       ctx.textBaseline = "middle"

                    //       const padding = 2
                    //       const textWidth = ctx.measureText(link.label).width
                    //       ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
                    //       ctx.fillRect(textPos.x - textWidth / 2 - padding, textPos.y - 7, textWidth + 2 * padding, 14)

                    //       ctx.fillStyle = "black"
                    //       ctx.fillText(link.label, textPos.x, textPos.y)
                    //       ctx.restore()
                    //     }
                    //   }}
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
                                ? "Create a new node in the network graph."
                                : "Edit the selected node."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 px-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
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
                                    <div className="absolute left-1/2 -top-[140px] w-[250px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>Supports:</p>
                                        <ul className="mt-1 list-disc list-inside">
                                        <li>Markdown (e.g., <strong>bold</strong>, <em>italic</em>)</li><br></br>
                                        <li>LaTeX (e.g., $(1+x)^2$)</li><br></br>
                                        <li>Code Blocks (e.g., <code>```python print("Hello") ```</code>)</li><br></br>
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
                            <Label className="text-right">Edges</Label>
                            <div className="col-span-3 space-y-4">
                                {newNodeData.edges.map((edge, index) => (
                                    <div key={index} className="flex flex-wrap items-center gap-2">
                                        <Select value={edge.nodeId} onValueChange={(value) => handleEdgeChange(index, "nodeId", value)}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Select node" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {graphData.nodes
                                                    .filter((node) => node.id !== selectedNode?.id)
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
                            <Label htmlFor="showRelationships" className="text-right">
                                Show Relationships
                            </Label>
                            <div className="col-span-3">
                                <input
                                type="checkbox"
                                id="showRelationships"
                                checked={newNodeData.showRelationships}
                                onChange={(e) =>
                                    setNewNodeData((prev) => ({ ...prev, showRelationships: e.target.checked }))
                                }
                                className="h-5 w-5 accent-black"
                                />
                            </div>
                            </div>
                    </div>
                    <DialogFooter className="sticky bottom-0 pt-2">
                        <Button onClick={handleDialogSubmit}>{dialogMode === "add" ? "Add" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}