import { useState, useRef, useEffect } from 'react';
import { useChat, useCurrentGraph } from '../context/ChatContext';
import { Message } from 'ai';
import { getModelResponse, streamModelResponse } from '../lib/model';
import ChatInput from './chat-input'
import { ChatBubble } from './chat-bubble';
import { GraphLink, GraphNode, KnowledgeGraph } from '../lib/types';
import { ColorPalettes } from '../ui/color-palettes';
import { v4 as uuidv4 } from 'uuid';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function Chat() {
    const {
        messages,
        addMessageToConversation,
        setIsLoading,
        isLoading,
        updateConversationTitle,
        currentConversationId,
        createNewConversation
    } = useChat();

    const { graphData, updateConversationGraphData } = useCurrentGraph();

    const [localMessages, setLocalMessages] = useState<Message[]>([]);

    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [addingToGraphMessageId, setAddingToGraphMessageId] = useState<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    const [hasScrollbar, setHasScrollbar] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);

    useEffect(() => {
        if (chatContainerRef.current) {
            setHasScrollbar(chatContainerRef.current.scrollHeight > chatContainerRef.current.clientHeight);
        }
    }, [localMessages]);

    useEffect(() => {
        if (chatContainerRef.current && isAtBottom) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [localMessages, isAtBottom]);

    useEffect(() => {
        // Whenever the conversation changes, reset localMessages to match it
        setLocalMessages(messages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentConversationId]);

    useEffect(() => {
        // Whenever messages changes, scroll to bottom
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const generateChatTitle = async (message: string) => {
        const introMessages: Message[] = [
            {
                id: uuidv4(),
                role: "system",
                content: `
                    You are an AI that generates concise and descriptive titles for conversations. 
                    Your goal is to create a **short and natural title (≤10 words)** that summarizes the user's first message. 
                    - Do not include unnecessary words like "Assistance Needed" or "Help With".
                    - Do not use quotation marks or colons.
                    - The title should be **concise**, natural, and **not a full sentence**.
                `
            },
            {
                id: uuidv4(),
                role: "user",
                content: `Generate a short, natural, and descriptive title for a conversation 
                that starts with this message:\n\n"${message}"\n\nTitle:`
            }
        ];

        const titleResponse = await getModelResponse(introMessages);
        console.log(titleResponse)

        if (titleResponse) {
            updateConversationTitle(titleResponse.trim());
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: text,
            createdAt: new Date(),
        };

        if (!currentConversationId) {
            createNewConversation();
        }

        console.log(messages.length);
        if (messages.length === 0) {
            generateChatTitle(userMessage.content);
        }

        // Add user message to conversation (persistent)
        addMessageToConversation(userMessage);
        setLocalMessages((prevMessages) => [...prevMessages, userMessage])

        setIsLoading(true);

        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = 0;
        }

        let streamedContent = "";

        const assistantMessage: Message = {
            id: uuidv4(),
            role: "assistant",
            content: "",
            createdAt: new Date(),
        };

        setStreamingMessageId(assistantMessage.id);

        // Temporarily add assistant message to UI
        setLocalMessages((prevMessages) => [...prevMessages, assistantMessage]);

        for await (const chunk of await streamModelResponse([...messages, userMessage])) {
            streamedContent += chunk;
            setLocalMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessage.id ? { ...msg, content: streamedContent } : msg
                )
            );
        }
        addMessageToConversation({ ...assistantMessage, content: streamedContent });
        setStreamingMessageId(null);
        setIsLoading(false);
    };

    async function addToGraph(msg: Message, existingGraph?: KnowledgeGraph) {
        try {

            // Remove IDs from the graph
            const strippedGraph = existingGraph
                ? {
                    nodes: existingGraph.nodes.map(node => node.name),

                    links: existingGraph.links.map(link => ({
                        source: existingGraph.nodes.find(n => n.id === link.source)?.name || "",
                        target: existingGraph.nodes.find(n => n.id === link.target)?.name || "",
                        label: link.label
                    }))
                }
                : null;

            console.log(existingGraph);

            console.log(strippedGraph);

            const requestBody = existingGraph
                ? { assistantMessage: msg.content, existingGraph: strippedGraph }
                : { assistantMessage: msg.content };

            console.log(requestBody);

            const response = await fetch("/api/graph/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error("Failed to generate graph");
            }

            const newGraphData: KnowledgeGraph = await response.json();
            console.log("Data returned from model:", newGraphData);

            // Convert nodes into correct format with unique IDs
            const newNodes = newGraphData.nodes.map((node: GraphNode) => ({
                id: uuidv4(),
                name: node.name,
                info: node.info,
            }));

            // Use existing nodes + new ones
            const allNodes = [...(graphData?.nodes || []), ...newNodes];

            // Convert links to correct format with ID references
            const newLinks = newGraphData.links
                .map((link: GraphLink) => {
                    const sourceNode = allNodes.find(node => node.name === link.source);
                    const targetNode = allNodes.find(node => node.name === link.target);

                    if (!sourceNode || !targetNode) {
                        console.warn(`Invalid link detected: ${link.source} → ${link.target}`, link);
                        return null; // Ignore invalid links
                    }

                    return {
                        source: sourceNode.id,
                        target: targetNode.id,
                        label: link.label,
                    };
                })
                .filter((link) => link !== null); // Remove invalid links

            // Merge the new graph with the current conversation's graph:
            let mergedGraph;
            if (!graphData || graphData.nodes.length === 0) {
                mergedGraph = {
                    nodes: newNodes,
                    links: newLinks,
                    settings: {
                        colorPaletteId: ColorPalettes[0].id,
                        showNodeRelationships: newNodes.reduce((acc, node) => {
                            acc[node.id] = false;
                            return acc;
                        }, {} as { [nodeId: string]: boolean }),
                    },
                };
            } else {
                const mergedNodes = [
                    ...graphData.nodes,
                    ...newNodes.filter(newNode =>
                        !graphData.nodes.some((existingNode: { name: string; }) => existingNode.name === newNode.name)
                    )
                ];
                const mergedLinks = [
                    ...graphData.links,
                    ...newLinks.filter(newLink =>
                        !graphData.links.some((existingLink: { source: string; target: string; }) =>
                            existingLink.source === newLink.source && existingLink.target === newLink.target
                        )
                    )
                ];
                const existingSettings = graphData.settings;
                const updatedShowNodeRelationships = { ...existingSettings.showNodeRelationships };
                newNodes.forEach((node) => {
                    if (!(node.id in updatedShowNodeRelationships)) {
                        updatedShowNodeRelationships[node.id] = false;
                    }
                });

                mergedGraph = {
                    nodes: mergedNodes,
                    links: mergedLinks,
                    settings: {
                        colorPaletteId: existingSettings.colorPaletteId,
                        showNodeRelationships: updatedShowNodeRelationships,
                    },
                };
            }

            // Now update the conversation's graph using the context's updater
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, mergedGraph);
            }

        } catch (error) {
            console.error("Error generating graph:", error);
        }
    }

    const handleAddToGraph = async (msg: Message) => {
        setAddingToGraphMessageId(msg.id);

        try {
            if (graphData) {
                await addToGraph(msg, graphData);
            } else {
                await addToGraph(msg);
            }
        } catch (error) {
            console.error("Error adding to graph:", error);
        } finally {
            setAddingToGraphMessageId(null);
        }
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const threshold = 50;
        const atBottom = scrollHeight - (scrollTop + clientHeight) <= threshold;
        setIsAtBottom(atBottom);
    };

    return (
        <div className="flex flex-col h-full">
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className={`flex-1 min-h-0 w-full overflow-y-auto ${streamingMessageId ? "pb-[50vh]" : "pb-12"}`
                }>
                <div className={`max-w-5xl mx-auto flex flex-col space-y-2 pl-8 py-6 ${hasScrollbar ? "pr-11" : "pr-14"}`}>
                    {localMessages.map((msg, index) => (
                        < ChatBubble
                            key={msg.id}
                            index={index}
                            msg={msg}
                            onAddToGraph={() => handleAddToGraph(msg)}
                            streamingMessageId={streamingMessageId}
                            addingToGraphMessageId={addingToGraphMessageId}
                        />
                    ))}
                </div>
            </div>

            <div className="relative">
                {!isAtBottom && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={scrollToBottom}
                                        className="bg-white size-8 p-1 ring-gray-300 flex items-center justify-center rounded-full ring-1 shadow-md shrink-0 hover:bg-gray-100"
                                    >
                                        <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Scroll To Bottom</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                    </div>
                )}
                <div className="px-4 pb-4 bg-white">
                    <ChatInput sendMessage={sendMessage} isLoading={isLoading} />
                </div>
            </div>
        </div>
    );
}