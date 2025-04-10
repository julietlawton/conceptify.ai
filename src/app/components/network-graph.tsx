"use client"
import { useCallback, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import 'katex/dist/katex.min.css';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Loader } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { inter } from "@/app/ui/fonts";
import { useChat, useCurrentGraph } from "@/app/context/ChatContext";
import { useApiKey } from "@/app/context/APIContext";
import { colorPaletteById } from "@/app/ui/color-palettes";
import { NodeTooltip } from "@/app/components/node-tooltip";
import SummaryCard from "@/app/components/summary-card";
import GraphToolbar from "@/app/components/graph-toolbar";
import QuizScreen from "@/app/components/quiz-screen";
import toast from "react-hot-toast";
import { generateQuizFromGraph } from "@/app/lib/model";
import {
    KnowledgeGraph,
    UIGraphNode,
    UIGraphLink,
    UIGraph,
    NodeEdge,
    ColorPalette
} from "@/app/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })
import type { NodeObject, LinkObject, ForceGraphMethods } from 'react-force-graph-2d';

// Custom type for updating node data (used for adding and editing nodes)
interface NewNodeData {
    name: string;
    info: string;
    showRelationships: boolean;
    edges: NodeEdge[];
}

// Helper function to convert a UIGraph to a KnowledgeGraph
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

// Interactive graph visualizer component
export default function NetworkGraph({
    isFullScreen,
    isGraphVisible,
    onToggleFullScreen
}: {
    isFullScreen: boolean,
    isGraphVisible: boolean,
    onToggleFullScreen: () => void
}) {

    // Conversation context
    const {
        currentConversationId,
        getConversationTitle,
        addActionToUndoStack,
        undoAction,
        redoAction,
        undoStackLength,
        redoStackLength
    } = useChat();

    // Graph context
    const { graphData, updateConversationGraphData } = useCurrentGraph();

    // API key + demo context
    const { apiKey, isDemoActive, userFingerprint, demoUsesRemaining, setDemoUsesRemaining } = useApiKey();

    // UI Graph state - used to separate pure graph (data only) and UI concerns
    // Initialize by cloning current graph data
    const [uiGraphData, setUiGraphData] = useState<UIGraph>(() => {
        // Clone the pure data
        const cloned = JSON.parse(JSON.stringify(graphData));
        return cloned;
    });
    const nodeColorMapRef = useRef<Map<string, string>>(new Map());
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState<UIGraphNode | null>(null);

    // View state
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const graphRef = useRef<HTMLDivElement | null>(null);
    const forceGraphRef = useRef<ForceGraphMethods | undefined>(undefined);

    // Add/edit dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
    const [newNodeData, setNewNodeData] = useState<NewNodeData>({ name: "", info: "", showRelationships: false, edges: [] });
    const [typedLetter, setTypedLetter] = useState<string>("");
    const [selectedNode, setSelectedNode] = useState<UIGraphNode | null>(null);

    // Graph summary card state
    const [isSummaryCardVisible, setIsSummaryCardVisible] = useState(false);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [summaryContent, setSummaryContent] = useState<string[]>([]);

    // Quiz generation state
    const [isQuizConfigOpen, setIsQuizConfigOpen] = useState(false);
    const [quizDifficulty, setQuizDifficulty] = useState("Easy");
    const [numQuizQuestions, setNumQuizQuestions] = useState(5);
    const [isQuizScreenOpen, setIsQuizScreenOpen] = useState(false);
    const [quizData, setQuizData] = useState<{
        questions: {
            question: string;
            hint: string;
            exampleAnswer: string;
        }[];
    } | null>(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [excludedQuizNodes, setExcludedQuizNodes] = useState<string[]>([]);
    const [quizConfigSearchTerm, setQuizConfigSearchTerm] = useState("");

    const toggleNodeQuizExclusion = (nodeName: string) => {
        setExcludedQuizNodes((prev) =>
            prev.includes(nodeName)
                ? prev.filter((name) => name !== nodeName)
                : [...prev, nodeName]
        );
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const char = event.key.toLowerCase();
        if (char.length === 1 && char.match(/[a-z]/i)) {
            setTypedLetter(char);
        }
    };

    // If the use types a letter, jump to the first node that matches that letter alphabetically
    // Used for node edges dropdown
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

    // Update graph dimensions when window resizes
    const updateDimensions = useCallback(() => {
        if (graphRef.current) {
            setDimensions({
                width: graphRef.current.offsetWidth,
                height: graphRef.current.offsetHeight,
            })
        }
    }, []);

    useEffect(() => {
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [updateDimensions]);

    // When the graph data changes, clone it again for the UI graph
    useEffect(() => {
        setSelectedNode(null);
        const cloned = JSON.parse(JSON.stringify(graphData));
        setUiGraphData(cloned);
    }, [graphData]);

    // Clear color assignments when palette changes
    useEffect(() => {
        nodeColorMapRef.current.clear();
    }, [uiGraphData.settings.colorPaletteId]);

    // Define node hover behavior
    const handleNodeHover = useCallback(
        (node: NodeObject | null) => {
            const typedNode = node as UIGraphNode | null;

            // Set highlight for the hovered node
            setHighlightNodes(new Set(node ? [node.id] : []));

            // Filter and set links that include the hovered node
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

            // Freeze hover node position by setting fixed coordinates with current position
            if (typedNode) {
                typedNode.fx = typedNode.x;
                typedNode.fy = typedNode.y;
                // Once the user stops hovering, reset fixed position
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

    // Set selected node on click
    const handleNodeClick = useCallback((node: NodeObject) => {
        const typedNode = node as UIGraphNode;
        setSelectedNode(typedNode);
    }, []);

    // Define link hover behavior
    const handleLinkHover = useCallback((link: LinkObject | null) => {
        const typedLink = link as UIGraphLink;
        if (!typedLink) {
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
            return;
        }

        // Get source and target nodes for this link
        const sourceId =
            typeof typedLink.source === "object" && typedLink.source
                ? typedLink.source.id
                : typedLink.source;
        const targetId =
            typeof typedLink.target === "object" && typedLink.target
                ? typedLink.target.id
                : typedLink.target;

        // Highlight link and source and target nodes
        setHighlightNodes(new Set([sourceId, targetId].filter(Boolean) as string[]));
        setHighlightLinks(new Set([typedLink.id || `${sourceId}-${targetId}`]));
    }, []);

    // Define node color on color palette change
    const nodeColor = useCallback((node: NodeObject) => {
        const typedNode = node as UIGraphNode;

        // Get the palette from the graph settings
        const palette = colorPaletteById[uiGraphData.settings.colorPaletteId] ?? colorPaletteById.defaultPalette;

        // Check if color already assigned
        if (nodeColorMapRef.current.has(typedNode.id)) {
            return nodeColorMapRef.current.get(typedNode.id)!;
        }

        // Assign color based on current count
        const assignedCount = nodeColorMapRef.current.size;
        const color = palette.colors[assignedCount % palette.colors.length];

        // Add this node and its assigned color to the color map
        nodeColorMapRef.current.set(typedNode.id, color);

        return color;
    }, [uiGraphData.settings.colorPaletteId]);

    // Define link color on color palette change
    const linkColor = useCallback((link: LinkObject) => {
        const typedLink = link as UIGraphLink;
        const sourceId =
            typeof typedLink.source === "object" && typedLink.source
                ? typedLink.source.id
                : typedLink.source;
        const targetId =
            typeof typedLink.target === "object" && typedLink.target
                ? typedLink.target.id
                : typedLink.target;

        // Get palette from the graph settings
        const palette = colorPaletteById[uiGraphData.settings.colorPaletteId] ?? colorPaletteById.defaultPalette;

        // Set link highlight color based on palette
        const linkHighlightColor = palette.linkHighlight ?? colorPaletteById.defaultPalette.linkHighlight;
        return highlightLinks.has(typedLink.id || `${sourceId}-${targetId}`) ? linkHighlightColor : " #dedfde";

    }, [highlightLinks, uiGraphData.settings.colorPaletteId]);

    // On reset view, zoom to fit the graph container 
    const handleResetView = useCallback(() => {
        if (forceGraphRef.current) {
            forceGraphRef.current.zoomToFit();
        }
    }, []);

    // On add, set the dialog mode to add and initialize new node data
    const handleAddNode = () => {
        setDialogMode("add");
        setNewNodeData({ name: "", info: "", showRelationships: false, edges: [] });
        setIsDialogOpen(true);
    }

    // On edit, set the dialog mode to edit and fill in node data
    const handleEditNode = () => {
        if (selectedNode) {
            setDialogMode("edit");

            // Get edges for this node
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

            // Initialize new node data with the information for this node
            setNewNodeData({
                name: selectedNode.name,
                info: selectedNode.info,
                showRelationships: uiGraphData.settings.showNodeRelationships[selectedNode.id],
                edges: nodeEdges
            });
            setIsDialogOpen(true);
        }
    };

    // Handle delete node
    const handleDeleteNode = () => {
        if (selectedNode) {

            // Add this action to the undo stack
            addActionToUndoStack();

            // Get new graph nodes and links without the selected node
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

            // Copy current settings and remove this node from show relationships dict
            const currentSettings = uiGraphData.settings;
            const newShowRelationships = Object.fromEntries(
                Object.entries(currentSettings.showNodeRelationships).filter(
                    ([key]) => key !== selectedNode.id
                )
            );

            // Set new settings
            const newSettings = {
                ...currentSettings,
                showNodeRelationships: newShowRelationships,
            };

            // Create new UI graph
            const newUIGraph: UIGraph = { nodes: newNodes, links: newLinks, settings: newSettings };

            // Strip UI graph and update the conversation graph data
            const pureGraph = stripUIGraph(newUIGraph);
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, pureGraph);
            }

            setSelectedNode(null);
        }
    };

    // Handle add and edit dialog submit
    const handleDialogSubmit = () => {
        // Get average x and y positions to position new nodes
        const avgX = uiGraphData.nodes.reduce((sum, node) => sum + (node.x ?? 0), 0) / uiGraphData.nodes.length;
        const avgY = uiGraphData.nodes.reduce((sum, node) => sum + (node.y ?? 0), 0) / uiGraphData.nodes.length;

        // Add this action (either add or edit) to undo stack
        addActionToUndoStack();

        // Add node operation
        if (dialogMode === "add") {

            // Create a new node with the entered new node data and position it relative to the existing nodes
            const newNode = {
                id: uuidv4(),
                name: newNodeData.name,
                info: newNodeData.info,
                showRelationships: newNodeData.showRelationships,
                x: avgX + (Math.random() - 0.5) * 100,
                y: avgY + (Math.random() - 0.5) * 100,
            }

            // Convert each simplified edge in newNodeData into a full graph link
            const newLinks = newNodeData.edges
                .map((edge) => {
                    // Get the other node this node links with
                    const otherNode = uiGraphData.nodes.find((node) => node.id === edge.nodeId);
                    if (!otherNode) {
                        console.warn("Other node not found for edge", edge);
                        return null;
                    }
                    return {
                        // Set new node as either the source or target for each link
                        source: edge.direction === "source" ? newNode : otherNode,
                        target: edge.direction === "target" ? newNode : otherNode,
                        label: edge.label,
                    };
                })
                .filter((link) => link !== null);

            // Copy current settings and add the realtions for this node to show relationships dict
            const currentSettings = uiGraphData.settings;

            const updatedShowRelationships = {
                ...currentSettings.showNodeRelationships,
                [newNode.id]: newNodeData.showRelationships,
            };

            const newSettings = {
                ...currentSettings,
                showNodeRelationships: updatedShowRelationships,
            };

            // Update UI graph
            const newUIGraph: UIGraph = {
                nodes: [...uiGraphData.nodes, newNode],
                links: [...uiGraphData.links, ...newLinks],
                settings: newSettings
            };

            // Update conversation graph
            const pureGraph = stripUIGraph(newUIGraph);
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, pureGraph);
            }

            // Edit node operation
        } else if (dialogMode === "edit" && selectedNode) {

            // Update graph nodes and links with new node data for this node
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

                    // Check if an edge already exists between these nodes
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

            // Update settings
            const currentSettings = uiGraphData.settings;
            const updatedShowRelationships = {
                ...currentSettings.showNodeRelationships,
                [selectedNode.id]: newNodeData.showRelationships,
            };

            const newSettings = {
                ...currentSettings,
                showNodeRelationships: updatedShowRelationships,
            };

            // Update UI graph and conversation graph
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
    };

    // Add edge
    const handleAddEdge = () => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: [...prev.edges, { nodeId: "", label: "", direction: "source" }],
        }));
    };

    // Remove edge
    const handleRemoveEdge = (index: number) => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: prev.edges.filter((_, i) => i !== index),
        }));
    };

    // Update edge
    const handleEdgeChange = (index: number, field: string, value: string) => {
        setNewNodeData((prev) => ({
            ...prev,
            edges: prev.edges.map((edge, i) => (i === index ? { ...edge, [field]: value } : edge)),
        }));
    };

    // On delete graph, clear the graph data for this conversation
    const handleDeleteGraph = () => {
        if (currentConversationId) {
            updateConversationGraphData(currentConversationId, null);
        }
    };

    // Handle selecting a node in the search results
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

    // On color palette change, 
    const handleColorPaletteSelect = (palette: ColorPalette) => {
        if (currentConversationId && uiGraphData.settings) {
            // Create a new graph object with updated settings
            const newGraph = {
                ...uiGraphData,
                settings: {
                    ...uiGraphData.settings,
                    colorPaletteId: palette.id,
                },
            };

            // Update conversation graph data
            const pureGraph = stripUIGraph(newGraph);
            updateConversationGraphData(currentConversationId, pureGraph);
        }
    };

    // Handle graph summary creation
    const handleGenerateSummary = () => {
        if (!currentConversationId || !graphData) return;

        // Set card state
        setIsSummaryLoading(true);
        setIsSummaryCardVisible(true);

        setTimeout(() => {
            const { nodes, links } = graphData;

            // Get outgoing links for this node
            // Incoming links aren't shown so each relation only appears once in the summary
            const outgoingLinksMap: Record<string, { relation: string, targetName: string }[]> = {};
            nodes.forEach((node) => { outgoingLinksMap[node.id] = []; });

            links.forEach((link) => {
                const sourceId = link.source;
                const targetNode = nodes.find(n => n.id === link.target);
                if (targetNode) {
                    outgoingLinksMap[sourceId].push({
                        relation: link.label,
                        targetName: targetNode.name
                    });
                }
            });

            // Build summary by joining each node's name, information, and outgoing relations
            const summaryBlocks = nodes.map((node) => {
                let block = `## ${node.name}\n${node.info}\n\n`;

                const related = outgoingLinksMap[node.id];
                if (related.length > 0) {
                    block += `**Related Concepts:**\n\n`;
                    related.forEach(rel => {
                        block += `→ *${rel.relation}* ${rel.targetName}\n\n`;
                    });
                }

                return block.trim();
            });

            // Set summary content
            setSummaryContent(summaryBlocks);
            setIsSummaryLoading(false);
        }, 400);
    };

    // Handle quiz question generation
    const handleGenerateQuiz = async () => {
        try {
            setQuizLoading(true);
            // Make existing graph LLM-friendly
            // Remove IDs from the graph and replace them with string names
            const strippedGraph = graphData
                ? {
                    nodes: graphData.nodes
                        // Filter user excluded nodes
                        .filter(node => !excludedQuizNodes.includes(node.name))
                        .map(node => node.name),

                    links: graphData.links
                        .filter(link => {
                            const sourceNode = graphData.nodes.find(n => n.id === link.source);
                            const targetNode = graphData.nodes.find(n => n.id === link.target);

                            // Only keep the link if neither source nor target is excluded
                            return (
                                sourceNode && targetNode &&
                                !excludedQuizNodes.includes(sourceNode.name) &&
                                !excludedQuizNodes.includes(targetNode.name)
                            );
                        })
                        .map(link => ({
                            source: graphData.nodes.find(n => n.id === link.source)?.name || "",
                            target: graphData.nodes.find(n => n.id === link.target)?.name || "",
                            label: link.label
                        }))
                }
                : null;

            if (!strippedGraph) {
                return;
            }

            // Create request body with stripped graph and quiz config
            const requestBody =
            {
                graphData: strippedGraph,
                difficulty: quizDifficulty,
                numQuestions: numQuizQuestions
            };

            // Check that either the api key is set or the demo is active before sending request
            if (!apiKey && !isDemoActive) {
                toast.error("No API key found. Please add your API key in Settings.")
                return;
            }

            // Await quiz data response
            const quizData = await generateQuizFromGraph(requestBody, isDemoActive, apiKey, userFingerprint);

            if (!quizData) {
                setQuizLoading(false);
                return;
            }

            // Set the quiz data and launch the quiz
            setQuizData(quizData);
            setIsQuizScreenOpen(true);

            // Clost the quiz config
            setQuizLoading(false);
            setIsQuizConfigOpen(false);
            setExcludedQuizNodes([]);

            // If demo is active, decrement demo uses remaining
            // NOTE: This is for the UI only, demo usage is enforced server side
            if (isDemoActive) {
                setDemoUsesRemaining(Math.max(0, demoUsesRemaining - 1));
            }

        } catch (error) {
            toast.error("Quiz generation failed. Please try again.");
            console.error("Error generating quiz", error);
            setQuizLoading(false);
        }
    };

    return (
        <div id="graph-container" ref={graphRef} className="h-full w-full flex flex-col relative">
            {/* Graph toolbar */}
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
                onGenerateSummary={handleGenerateSummary}
                onGenerateQuiz={() => setIsQuizConfigOpen(true)}
            />
            <div className={`flex-grow transition-opacity duration-400 ${isGraphVisible ? "visible opacity-100" : "invisible opacity-0"}`}>
                {/* Force graph simulation */}
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
                    // Simulation behavior
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
                    // Node display properties
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        // Set font for node labels
                        const label = node.name;
                        const fontSize = 13 / globalScale;
                        ctx.font = `600 ${fontSize}px ${inter.style.fontFamily}`;

                        // Maximum width allowed for a line
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
                        const padding = 6;
                        const nodeSize = Math.max(10, maxLineWidth / 2) + padding;

                        // Draw the node as a circle
                        ctx.beginPath();
                        ctx.arc(node.x ?? 0, node.y ?? 0, nodeSize, 0, 2 * Math.PI);

                        // Color the node
                        ctx.fillStyle = nodeColor(node);
                        ctx.fill();

                        // Get text color and highlight color from the palette
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

                        // Default node border
                        ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // Highlight node (overrides border)
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
            {/* Node hover card */}
            {hoverNode && <NodeTooltip node={hoverNode} graphData={uiGraphData} />}
            {/* Add/edit dialog */}
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
                        {/* Node name input */}
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

                        {/* Node info text area */}
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

                        {/* Node edges section */}
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
                                {/* For each edge, create a drop down to select the other node, a label for the relationship, and radio buttons to set source/target */}
                                {newNodeData.edges.map((edge, index) => (
                                    <div key={index} className="flex flex-wrap items-center gap-2">
                                        <Select value={edge.nodeId} onValueChange={(value) => handleEdgeChange(index, "nodeId", value)}>
                                            <SelectTrigger className="w-[200px]" onKeyDown={handleKeyDown}>
                                                <SelectValue placeholder="Select node" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* Sort nodes in the dropdown alphabetically to enable jumping to typed letter */}
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
                                        {/* Relationship label */}
                                        <Input
                                            placeholder="Edge label"
                                            value={edge.label}
                                            onChange={(e) => handleEdgeChange(index, "label", e.target.value)}
                                            className="flex-grow min-w-[200px]"
                                        />
                                        {/* Source/target radio buttons */}
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
                                        {/* Remove edge button */}
                                        <Button variant="outline" size="icon" onClick={() => handleRemoveEdge(index)}>
                                            X
                                        </Button>
                                    </div>
                                ))}
                                {/* Button to add an additional edge input */}
                                <Button onClick={handleAddEdge}>Add Edge</Button>
                            </div>
                        </div>
                        {/* Checkbox for toggling show edges */}
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
                    {/* Submit button */}
                    <DialogFooter className="sticky bottom-0 pt-2">
                        <Button onClick={handleDialogSubmit}>{dialogMode === "add" ? "Add" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Floating hallucination disclaimer text for the bottom of the graph container */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-600 italic px-4 py-4 rounded text-sm w-[80%] w-auto text-center">
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

            {/* Quiz creation dialog */}
            <Dialog
                open={isQuizConfigOpen}
                onOpenChange={(open) => {
                    setIsQuizConfigOpen(open);
                    setExcludedQuizNodes([]);
                }
                }>
                <DialogContent className="flex flex-col max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Create Quiz</DialogTitle>
                        <DialogDescription>Create a quiz to test your recall.</DialogDescription>
                    </DialogHeader>
                    {quizLoading ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <Loader className="animate-spin w-12 h-12 text-gray-600" />
                            <p className="mt-4 text-gray-600 mb-6">Generating quiz...</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 pt-4">
                                {/* Difficulty selector */}
                                <div className="flex flex-col space-y-2">
                                    <Label>Difficulty</Label>
                                    <Select
                                        value={quizDifficulty}
                                        onValueChange={setQuizDifficulty}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Easy">Easy</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Hard">Hard</SelectItem>
                                            <SelectItem value="Expert">Expert</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Number of questions input */}
                                <div className="flex flex-col space-y-2">
                                    <Label>Number of Questions</Label>
                                    <Input
                                        type="number"
                                        value={numQuizQuestions}
                                        min={1}
                                        max={20}
                                        onChange={(e) => setNumQuizQuestions(Number(e.target.value))}
                                    />
                                    {(numQuizQuestions < 1 || numQuizQuestions > 20) && (
                                        <p className="text-sm text-red-500">
                                            Number of questions must be between 1 and 20.
                                        </p>
                                    )}
                                </div>

                                {/* Exclude from quiz section */}
                                <div className="flex flex-col space-y-1">
                                    <Label>Concepts to Exclude</Label>
                                    {/* Labels for currently excluded concepts */}
                                    <div className={`flex flex-wrap gap-2 ${excludedQuizNodes.length > 0 ? "py-2" : "py-0"}`}>
                                        {excludedQuizNodes.length <= 5 ? (
                                            excludedQuizNodes.map((nodeName) => (
                                                <div key={nodeName} className="bg-gray-200 text-sm px-2 py-1 rounded">
                                                    {nodeName}
                                                </div>

                                            ))
                                        ) : (
                                            <>
                                                {excludedQuizNodes.slice(0, 5).map((nodeName) => (
                                                    <div key={nodeName} className="bg-gray-200 text-sm px-2 py-1 rounded">
                                                        {nodeName}
                                                    </div>
                                                ))}
                                                <div className="bg-gray-200 text-sm px-2 py-1 rounded">
                                                    +{excludedQuizNodes.length - 5} more
                                                </div>
                                            </>
                                        )}

                                        {/* Clear selection button */}
                                        {excludedQuizNodes.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setExcludedQuizNodes([])}
                                                className="h-5 w-5 mt-1"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                                <span className="sr-only">Clear selections</span>
                                            </Button>
                                        )}

                                    </div>

                                    {/* Concept selection list */}
                                    <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                                        <div className="flex flex-col space-y-1">
                                            <div className="mb-2">
                                                <Input
                                                    type="text"
                                                    placeholder="Search..."
                                                    value={quizConfigSearchTerm}
                                                    onChange={(e) => setQuizConfigSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {/* Select All option */}
                                        <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={excludedQuizNodes.length === graphData.nodes.length}
                                                onChange={() => {
                                                    if (excludedQuizNodes.length === graphData.nodes.length) {
                                                        // Unselect all
                                                        setExcludedQuizNodes([]); 
                                                    } else {
                                                        // Select all
                                                        setExcludedQuizNodes(graphData.nodes.map(node => node.name));
                                                    }
                                                }}
                                                className="accent-black"
                                            />
                                            <span>(Select All)</span>
                                        </label>
                                        {/* Excludable concepts + toggle checkbox */}
                                        {graphData.nodes
                                            .filter((node) => node.name.toLowerCase().includes(quizConfigSearchTerm.toLowerCase()))
                                            .map((node) => (
                                                <label key={node.id} className="flex items-center space-x-2 mb-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={excludedQuizNodes.includes(node.name)}
                                                        onChange={() => toggleNodeQuizExclusion(node.name)}
                                                        className="accent-black"
                                                    />
                                                    <span>{node.name}</span>
                                                </label>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Create quiz button */}
                            <DialogFooter className="pt-2">
                                <Button
                                    onClick={handleGenerateQuiz}
                                    // Disable the button if an invalid number of question is selected or if all nodes are excluded
                                    disabled={
                                        numQuizQuestions < 1 || 
                                        numQuizQuestions > 20 || 
                                        excludedQuizNodes.length === graphData.nodes.length
                                    }
                                >
                                    Create Quiz
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Graph summary card */}
            {isSummaryCardVisible && (
                <SummaryCard
                    isSummaryLoading={isSummaryLoading}
                    setIsSummaryCardVisible={setIsSummaryCardVisible}
                    summaryTitle={(currentConversationId && getConversationTitle(currentConversationId)) || "Conversation Summary"}
                    summaryContent={summaryContent}
                />
            )}

            {/*  Graph quiz */}
            {isQuizScreenOpen && quizData && (
                <QuizScreen
                    isQuizOpen={isQuizScreenOpen}
                    setIsQuizOpen={setIsQuizScreenOpen}
                    quizData={quizData}
                />
            )}
        </div>

    )
}