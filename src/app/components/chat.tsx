import { useState, useRef, useEffect } from 'react';
import { Message } from 'ai';
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CognitionIcon } from '@/app/ui/icons';
import ChatInput from '@/app/components/chat-input';
import { generateGraphFromMessage, getModelResponse, streamModelResponse } from '@/app/lib/model';
import { ChatBubble } from '@/app/components/chat-bubble';
import { GraphLink, GraphNode, KnowledgeGraph } from '@/app/lib/types';
import { ColorPalettes } from '@/app/ui/color-palettes';
import { useChat, useCurrentGraph } from '@/app/context/ChatContext';
import { useApiKey } from '@/app/context/APIContext';

// Chat component
export default function Chat() {
    // Chat context
    const {
        messages,
        addMessageToConversation,
        setIsLoading,
        isLoading,
        updateConversationTitle,
        currentConversationId,
        createNewConversation,
        addActionToUndoStack
    } = useChat();

    // API key + demo context
    const { apiKey, isDemoActive, userFingerprint, demoUsesRemaining, setDemoUsesRemaining } = useApiKey();

    // Graph context
    const { graphData, updateConversationGraphData } = useCurrentGraph();
    const [addingToGraphMessageId, setAddingToGraphMessageId] = useState<string | null>(null);

    // Local copy of messages for streaming/UI
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const stoppedRef = useRef(false);

    // Container state
    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const [hasScrollbar, setHasScrollbar] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);
    const messagesRef = useRef(messages);

    // Update scrollbar state when local messages changes
    useEffect(() => {
        if (chatContainerRef.current) {
            setHasScrollbar(chatContainerRef.current.scrollHeight > chatContainerRef.current.clientHeight);
        }
    }, [localMessages]);

    // Helper function to scroll chat to the bottom
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    };

    // Update messages ref on messages change
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // When the conversation changes, update local messages and scroll to the bottom of the chat
    useEffect(() => {
        setLocalMessages(messagesRef.current);

        requestAnimationFrame(() => {
            scrollToBottom();
        });
    }, [currentConversationId]);

    // Whenever messages changes, scroll to bottom
    // This is used to jump to the bottom of the chat when a message finishes streaming
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        setIsAtBottom(true);
    }, [messages]);

    // Generate a chat title from the first message in a conversation
    const generateChatTitle = async (message: string) => {
        // Prompt for title generation
        const introMessages: Message[] = [
            {
                // System prompt
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
                // User prompt
                id: uuidv4(),
                role: "user",
                content: `Generate a short, natural, and descriptive title for a conversation 
                that starts with this message:\n\n"${message}"\n\nTitle:`
            }
        ];

        // Check that either the api key is set or the demo is active before sending request
        if (!apiKey && !isDemoActive) {
            toast.error("No API key found. Please add your API key in Settings.")
            return;
        }

        // Send a request for title generation with the prompt
        try {
            const titleResponse = await getModelResponse(introMessages, isDemoActive, apiKey);

            // On success, update the chat tile
            if (titleResponse) {
                updateConversationTitle(titleResponse.trim());
            }
        } catch (error) {
            console.error("Error generating chat title:", error);

            const errMsg = error instanceof Error ? error.message : "Unknown error.";
            toast.error(errMsg);
        }

    };

    // Send a user message to the model
    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        // Check that either the api key is set or the demo is active before sending request
        if (!apiKey && !isDemoActive) {
            toast.error("No API key found. Please add your API key in Settings.")
            return;
        }

        // Create a new message object from the user message
        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: text,
            createdAt: new Date(),
        };

        if (!currentConversationId) {
            createNewConversation();
        }

        // Add user message to conversation (persistent)
        addMessageToConversation(userMessage);

        // Set local messages (for UI)
        setLocalMessages((prevMessages) => [...prevMessages, userMessage])

        // If this is the first message, generate a title for this conversation
        if (messages.length === 0) {
            await generateChatTitle(userMessage.content);
        }

        // Set message loading status
        setIsLoading(true);

        // Reset stopped
        stoppedRef.current = false;

        // Snap to the top of the view
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = 0;
        }

        // Create an empty assistant message to stream to
        const assistantMessage: Message = {
            id: uuidv4(),
            role: "assistant",
            content: "",
            createdAt: new Date(),
        };

        // Set this message ID as currently streaming
        setStreamingMessageId(assistantMessage.id);

        // Add assistant message to UI
        setLocalMessages((prevMessages) => [...prevMessages, assistantMessage]);

        let streamedContent = "";
        try {
            // Stream the assistant response message
            for await (const chunk of streamModelResponse([...messages, userMessage], isDemoActive, apiKey, userFingerprint)) {
                // If user stopped generation, stop streaming and finish message
                if (stoppedRef.current) {
                    break;
                }

                // Add latest chunk to content and update assistant message with it
                // This will create a streaming efect in the UI
                streamedContent += chunk;
                setLocalMessages((prev) => {
                    if (stoppedRef.current) {
                        return prev;
                    }
                    return prev.map((msg) =>
                        msg.id === assistantMessage.id ? { ...msg, content: streamedContent } : msg
                    );
                });
            }

            // After streaming is complete, add this message to the conversation (persistent)
            addMessageToConversation({ ...assistantMessage, content: streamedContent });
        } catch (error) {
            console.error("Error sending message:", error);
            const errMsg = error instanceof Error ? error.message : "Unknown error.";
            toast.error(errMsg);
        } finally {
            // Reset streaming ID and loading status
            setStreamingMessageId(null);
            setIsLoading(false);

            // If demo is active, decrement demo uses remaining
            // NOTE: This is for the UI only, demo usage is enforced server side
            if (isDemoActive) {
                setDemoUsesRemaining(Math.max(0, demoUsesRemaining - 1));
            }

        }
    };

    // Generate new nodes + edges from an assistant message
    async function addToGraph(msg: Message, existingGraph?: KnowledgeGraph) {
        try {
            // Make existing graph LLM-friendly
            // Remove IDs from the graph and replace them with string names
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

            // Create request body with stripped graph and assistant message
            const requestBody =
                strippedGraph !== null && strippedGraph.nodes.length !== 0
                    ? { assistantMessage: msg.content, existingGraph: strippedGraph }
                    : { assistantMessage: msg.content };
            
            // Check that either the api key is set or the demo is active before sending request
            if (!apiKey && !isDemoActive) {
                toast.error("No API key found. Please add your API key in Settings.")
                return;
            }

            // Await response
            const response = await generateGraphFromMessage(requestBody, isDemoActive, apiKey, userFingerprint);

            if (!response) {
                return;
            }

            // Create a new partial graph from the response
            const newGraphData: KnowledgeGraph = response;

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

                    // Ignore invalid links
                    if (!sourceNode || !targetNode) {
                        console.warn(`Invalid link detected: ${link.source} → ${link.target}`, link);
                        return null;
                    }

                    return {
                        source: sourceNode.id,
                        target: targetNode.id,
                        label: link.label,
                    };
                })
                .filter((link) => link !== null); // Remove invalid links

            // Merge the new graph with the current conversation graph:
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

            // Add this action to the undo stack
            addActionToUndoStack();

            // Update the conversation data with the new graph
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, mergedGraph);
            }

            // If demo is active, decrement demo uses remaining
            // NOTE: This is for the UI only, demo usage is enforced server side
            if (isDemoActive) {
                setDemoUsesRemaining(Math.max(0, demoUsesRemaining - 1));
            }

        } catch (error) {
            toast.error("Graph generation failed. Please try again.");
            console.error("Error generating graph:", error);
        }
    }

    // Handle adding a message to the graph
    const handleAddToGraph = async (msg: Message) => {
        setAddingToGraphMessageId(msg.id);

        // If a graph exists already, send it
        // otherwise send only the message
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

    // Compute when the user is at the bottom of the chat container
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const threshold = 50;
        const atBottom = scrollHeight - (scrollTop + clientHeight) <= threshold;
        setIsAtBottom(atBottom);
    };

    // Handle stop streaming button press
    const handleSetStopped = () => {
        stoppedRef.current = true;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Chat bubble area */}
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                // When a message is streaming, add excess padding so that the message streams down from the top of the chat area instead of the bottom
                // Remove the padding when streaming stops
                className={`flex-1 min-h-0 w-full overflow-y-auto ${streamingMessageId ? "pb-[50vh]" : "pb-4"}`
                }>
                {/* If chat is empty, show placeholder */}
                {messages.length === 0 && (
                    <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 p-10 border border-gray-200 rounded-xl shadow-sm bg-white text-gray-500 text-lg space-y-3 text-center">
                        <CognitionIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <p className="font-medium">Start a conversation</p>
                        <p className="text-sm text-gray-400">Ask a question or send a message.</p>
                    </div>
                )}
                {/* Show chat bubble for each message */}
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
                {/* If the user is not at the bottom of the chat, show scroll to bottom button */}
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
                {/* If chat is empty, show example prompt buttons */}
                {messages.length === 0 && (
                    <div className="grid grid-cols-3 gap-2 max-w-3xl mx-auto pb-2 px-4">
                        {[
                            { sample_prompt: "How does quantum computing work?" },
                            { sample_prompt: "Show me how to reverse a list in Python." },
                            { sample_prompt: "Which cultures have vampire myths?" },
                        ].map((prompt, index) => (
                            // If a user clicks on an example prompt, send it as a message
                            <button
                                key={index}
                                className="p-2 border border-gray-300 rounded-lg text-left hover:bg-gray-100 transition"
                                onClick={() => sendMessage(prompt.sample_prompt)}
                                disabled={isLoading}
                            >
                                <p className="text-gray-600 text-sm">{prompt.sample_prompt}</p>
                            </button>
                        ))}
                    </div>
                )}
                {/* Chat input area */}
                <div className="px-4 pb-4 bg-white">
                    <ChatInput sendMessage={sendMessage} isLoading={isLoading} handleStopGeneration={handleSetStopped} />
                </div>
            </div>
        </div>
    );
}