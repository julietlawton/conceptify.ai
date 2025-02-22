"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from "rehype-highlight";
//import 'highlight.js/styles/github.css';
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

// const colors = [
//     //" #c1e7ee",
//     " #90e0ef",
//     " #00b4d8",
//     " #0077b6",
//     " #03045e",
//     " #00a6fb", 
//     " #0582ca", 
//     " #006494", 
//     " #003554", 
//     "#05202e"
// ]

// const colors = [
//     " #fbf8cc",
//     " #fde4cf",
//     " #ffcfd2",
//     " #f1c0e8",
//     " #cfbaf0",
//     " #a3c4f3",
//     " #90dbf4",
//     " #8eecf5",
//     " #98f5e1",
//     " #b9fbc0"
// ]

const colors = [
    " #378d00",
    " #74b600",
    // " #e18800",
    " #df5734",
    " #9c0096",
    " #ff7f00",
    " #ffde21",
    " #20b2ad",
    // " #800080",
    " #000066",
    " #e37bd0",
    " #129edf",
    " #1912df",
]

// {node.info}

const NodeTooltip = ({ node, graphData }: { node: GraphNode, graphData: KnowledgeGraph }) => {

    console.log(graphData);

    const relatedLinks = graphData.links.filter((link: GraphLink) => {
        return link.source.id === node.id || link.target.id === node.id;
    });

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

            {relatedLinks.length > 0 ? (
                <div className="mt-2">
                    <h4 className="text-md font-semibold">Relationships:</h4>
                    <ul className="list-disc list-outside pl-5 space-y-1">
                        {relatedLinks.map((rel, index) => (
                            <li key={index} className="text-gray-700">
                                <ReactMarkdown className="prose prose-sm inline">
                                    {`**${rel.source.name}** ${rel.label} **${rel.target.name}**`}
                                </ReactMarkdown>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="text-gray-500">No relationships found.</p>
            )}
        </div>
    );
};


export default function NetworkGraph({ isFullScreen, onToggleFullScreen }: { isFullScreen: boolean, onToggleFullScreen: () => void }) {
    //   const [graphData, setGraphData] = useState(initialData)
    const { currentConversationId } = useChat();
    const { graphData, updateConversationGraphData } = useCurrentGraph();

    const [highlightNodes, setHighlightNodes] = useState(new Set())
    const [highlightLinks, setHighlightLinks] = useState(new Set())
    const [hoverNode, setHoverNode] = useState(null)
    const [selectedNode, setSelectedNode] = useState(null)
    const [hoverLink, setHoverLink] = useState(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
    const [newNodeData, setNewNodeData] = useState({ name: "", info: "", edges: [] })
    const graphRef = useRef(null)
    const forceGraphRef = useRef(null)

    const updateDimensions = useCallback(() => {
        if (graphRef.current) {
            setDimensions({
                width: graphRef.current.offsetWidth,
                height: graphRef.current.offsetHeight,
            })
        }
    }, [])

    useEffect(() => {
        updateDimensions()
        window.addEventListener("resize", updateDimensions)
        return () => window.removeEventListener("resize", updateDimensions)
    }, [updateDimensions])

    //   const handleNodeHover = useCallback(
    //     (node) => {
    //       setHighlightNodes(new Set(node ? [node.id] : []))
    //       setHighlightLinks(
    //         new Set(
    //           node
    //             ? graphData.links
    //                 .filter((link) => link.source.id === node.id || link.target.id === node.id)
    //                 .map((link) => link.id || `${link.source.id}-${link.target.id}`)
    //             : [],
    //         ),
    //       )
    //       setHoverNode(node || null)
    //     },
    //     [graphData.links],
    //   )

    const handleNodeHover = useCallback(
        (node) => {
            // Highlight the hovered node and its related links.
            setHighlightNodes(new Set(node ? [node.id] : []));
            setHighlightLinks(
                new Set(
                    node
                        ? graphData.links
                            .filter(
                                (link) =>
                                    link.source.id === node.id || link.target.id === node.id
                            )
                            .map(
                                (link) => link.id || `${link.source.id}-${link.target.id}`
                            )
                        : []
                )
            );
            setHoverNode(node || null);

            // Freeze the node's position when hovered,
            // or unfreeze all nodes if not hovering.
            if (node) {
                node.fx = node.x;
                node.fy = node.y;
            } else {
                graphData.nodes.forEach((n) => {
                    n.fx = null;
                    n.fy = null;
                });
            }

            // Reheat the simulation to apply the changes.
            if (forceGraphRef.current) {
                forceGraphRef.current.d3ReheatSimulation();
            }
        },
        [graphData.links, graphData.nodes]
    );

    const handleNodeClick = useCallback((node) => {
        setSelectedNode(node)
    }, [])

    const handleLinkHover = useCallback((link) => {
        setHighlightNodes(new Set(link ? [link.source.id, link.target.id] : []))
        setHighlightLinks(new Set(link ? [link.id || `${link.source.id}-${link.target.id}`] : []))
        setHoverLink(link || null)
    }, [])

    const nodeColor = useCallback((node) => {
        //return colors[node.group - 1] || colors[0]
        const hash = node.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return colors[hash % colors.length]
    }, [])

    const linkColor = useCallback(
        (link) => {
            return highlightLinks.has(link.id || `${link.source.id}-${link.target.id}`) ? " #FFA500" : " #b5b3b3"
        },
        [highlightLinks],
    )

    const handleAddNode = () => {
        setDialogMode("add")
        setNewNodeData({ name: "", info: "", edges: [] })
        setIsDialogOpen(true)
    }

    const handleEditNode = () => {
        if (selectedNode) {
            setDialogMode("edit")
            console.log("Handle edit node");
            const nodeEdges = graphData.links
                .filter((link) => link.source.id === selectedNode.id || link.target.id === selectedNode.id)
                .map((link) => ({
                    nodeId: link.source.id === selectedNode.id ? link.target.id : link.source.id,
                    label: link.label,
                    direction: link.source.id === selectedNode.id ? "source" : "target",
                }))
            console.log("NewNodeData");
            console.log({ name: selectedNode.name, info: selectedNode.info, edges: nodeEdges });
            setNewNodeData({ name: selectedNode.name, info: selectedNode.info, edges: nodeEdges })
            setIsDialogOpen(true)
        }
    }

    const handleDeleteNode = () => {
        if (selectedNode) {
            const newNodes = graphData.nodes.filter((node) => node.id !== selectedNode.id)
            const newLinks = graphData.links.filter(
                (link) => link.source.id !== selectedNode.id && link.target.id !== selectedNode.id,
            )
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, { nodes: newNodes, links: newLinks });
            }

            // setGraphData({ nodes: newNodes, links: newLinks })
            setSelectedNode(null)
        }
    }

    const handleResetView = useCallback(() => {
        if (forceGraphRef.current) {
            forceGraphRef.current.zoomToFit()
        }
    }, [])

    const handleDialogSubmit = () => {
        const avgX = graphData.nodes.reduce((sum, node) => sum + node.x, 0) / graphData.nodes.length
        const avgY = graphData.nodes.reduce((sum, node) => sum + node.y, 0) / graphData.nodes.length

        if (dialogMode === "add") {
            const newNode = {
                id: crypto.randomUUID(),
                name: newNodeData.name,
                info: newNodeData.info,
                x: avgX + (Math.random() - 0.5) * 100,
                y: avgY + (Math.random() - 0.5) * 100,
            }

            console.log(newNode);
            console.log(newNodeData);

            // Convert each simplified edge in newNodeData into a full graph link.
            // Look up the "other" node using edge.nodeId.
            const newLinks = newNodeData.edges
                .map((edge) => {
                    const otherNode = graphData.nodes.find((node) => node.id === edge.nodeId);
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

            //   const newLinks = newNodeData.edges.map((edge) => ({
            //     source: edge.direction === "source" ? newNodeId : edge.nodeId,
            //     target: edge.direction === "target" ? newNodeId : edge.nodeId,
            //     label: edge.label,
            //   }))

            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, {
                    nodes: [...graphData.nodes, newNode],
                    links: [...graphData.links, ...newLinks],
                });
            }
            // setGraphData((prevData) => ({
            //     nodes: [...prevData.nodes, newNode],
            //     links: [...prevData.links, ...newLinks],
            //   }));

            //   setGraphData((prevData) => ({
            //     nodes: [...prevData.nodes, newNode],
            //     links: [...prevData.links, ...newLinks],
            //   }))


        } else if (dialogMode === "edit" && selectedNode) {
            const updatedNodes = graphData.nodes.map((node) =>
                node.id === selectedNode.id
                    ? {
                        ...node,
                        name: newNodeData.name,
                        info: newNodeData.info,
                    }
                    : node,
            )
            const updatedLinks = graphData.links.filter(
                (link) => link.source.id !== selectedNode.id && link.target.id !== selectedNode.id,
            )
            const newLinks = newNodeData.edges.map((edge) => ({
                source: edge.direction === "source" ? selectedNode.id : edge.nodeId,
                target: edge.direction === "target" ? selectedNode.id : edge.nodeId,
                label: edge.label,
            }))
            // debug me
            console.log("Updated links", updatedLinks);
            console.log("New links", newLinks);
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, {
                    nodes: updatedNodes,
                    links: [...updatedLinks, ...newLinks],
                });
            }
            //   setGraphData((prevData) => ({
            //     nodes: [updatedNodes],
            //     links: [...prevData.links, ...newLinks],
            //   }));
            setSelectedNode(null);
        }
        setIsDialogOpen(false);
    }

    const handleEngineStop = useCallback(() => {
        forceGraphRef.current.d3ReheatSimulation()
    }, [])

    const handleAddEdge = () => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: [...prev.edges, { nodeId: "", label: "", direction: "source" }],
        }))
    }

    const handleRemoveEdge = (index) => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: prev.edges.filter((_, i) => i !== index),
        }))
    }

    const handleEdgeChange = (index, field, value) => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: prev.edges.map((edge, i) => (i === index ? { ...edge, [field]: value } : edge)),
        }))
    }

    const handleDeleteGraph = () => {
        if (currentConversationId) {
            console.log("Deleting graph");
            updateConversationGraphData(currentConversationId, null);
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
            />
            <div className="flex-grow">
                <ForceGraph2D
                    key={currentConversationId}
                    ref={forceGraphRef}
                    graphData={graphData}
                    nodeColor={nodeColor}
                    linkColor={linkColor}
                    nodeLabel={null}
                    onNodeHover={handleNodeHover}
                    onNodeClick={handleNodeClick}
                    onLinkHover={handleLinkHover}
                    linkWidth={2}
                    nodeRelSize={8}
                    width={dimensions.width}
                    height={dimensions.height}
                    d3AlphaDecay={0.05}
                    d3VelocityDecay={0.5}
                    //   d3Force="charge"
                    d3Force={(force) => {
                        force("link").distance(100)
                        force("charge").strength(500)
                        force("center").strength(0.1)
                    }}
                    zoom={0.7}
                    onEngineStop={handleEngineStop}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 14 / globalScale;
                        ctx.font = `${fontSize}px Arial`;

                        // Maximum width allowed for a line (adjust as needed)
                        const maxWidth = 100 / globalScale;
                        const lineHeight = fontSize * 1.2;

                        // Function to wrap text without splitting words
                        const wrapText = (context, text, maxWidth) => {
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

                        // Set text properties
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "white";

                        // Center the block of wrapped text vertically.
                        const totalHeight = lines.length * lineHeight;
                        let startY = node.y - totalHeight / 2 + lineHeight / 2;
                        lines.forEach((line, i) => {
                            ctx.fillText(line, node.x, startY + i * lineHeight);
                        });

                        // Highlight node
                        if (highlightNodes.has(node.id)) {
                            ctx.strokeStyle = "yellow";
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
            {hoverNode && <NodeTooltip node={hoverNode} graphData={graphData} />}
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
                                {/* <div className="relative group">
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
                    </div> */}
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
                    </div>
                    <DialogFooter className="sticky bottom-0 pt-2">
                        <Button onClick={handleDialogSubmit}>{dialogMode === "add" ? "Add" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}