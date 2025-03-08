import { useState, useRef, useEffect } from 'react';
import { useChat, useCurrentGraph } from '../context/ChatContext';
import { Message } from 'ai';
import { getModelResponse, streamModelResponse } from '../lib/model';
import ChatInput from './chat-input'
import { ChatBubble } from './chat-bubble';
import { GraphLink, GraphNode, KnowledgeGraph } from '../lib/types';
import { ColorPalettes } from '../ui/color-palettes';
import { v4 as uuidv4 } from 'uuid';

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
    const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    // // Auto-scroll when messages update
    // useLayoutEffect(() => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [messages]);

    useEffect(() => {
        // Whenever the conversation changes, reset localMessages to match it
        setLocalMessages(messages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentConversationId]);

    // useEffect(() => {
    //     if (currentConversationId && conversations[currentConversationId]) {
    //       setLocalMessages(conversations[currentConversationId].messages);
    //     }
    //   }, [currentConversationId, conversations]);

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
        setLoadingMessageId(msg.id);

        try {
            if (graphData) {
                await addToGraph(msg, graphData);
            } else {
                await addToGraph(msg);
            }
        } catch (error) {
            console.error("Error adding to graph:", error);
        } finally {
            setLoadingMessageId(null);
        }
    };

    return (
        <div className="flex flex-col flex-grow h-full bg-white overflow-x-hidden w-full">
            <div className="w-full max-w-5xl mx-auto flex flex-col flex-grow">
                <div ref={chatContainerRef} className="flex-grow w-full mx-auto pb-4 flex flex-col space-y-2 px-4 py-6 pb-12">
                    {localMessages.map((msg, index) => (
                        < ChatBubble
                            key={msg.id}
                            index={index}
                            msg={msg}
                            isLoading={isLoading}
                            onAddToGraph={() => handleAddToGraph(msg)}
                            loadingMessageId={loadingMessageId}
                        />
                    ))}
                    {/* <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" /> */}
                </div>
            </div>
            <div className="sticky-bottom w-full bg-white px-4 pb-4">
                {/* <ChatInput sendMessage={sendMessage} input={input} setInput={setInput} isLoading={isLoading} /> */}
                <ChatInput sendMessage={sendMessage} isLoading={isLoading} />
            </div>
        </div>
    );
}