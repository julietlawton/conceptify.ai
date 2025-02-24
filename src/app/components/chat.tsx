import { createContext, useContext, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useChat, useCurrentGraph } from '../context/ChatContext';
import { Message } from 'ai';
import { getModelResponse, streamModelResponse } from '../lib/model';
import ChatInput from './chat-input'
import { SparklesIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/solid';
import { send, title } from 'process';
import { ChatBubble } from './chat-bubble';
import { KnowledgeGraph } from '../lib/types';

export default function Chat() {
    const {
        messages,
        addMessageToConversation,
        // graphData,
        // setGraphData,
        // updateConversationGraphData,
        setIsLoading,
        isLoading,
        updateConversationTitle,
        currentConversationId,
        createNewConversation
    } = useChat();

    const { graphData, updateConversationGraphData } = useCurrentGraph();

    const [input, setInput] = useState("");
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [isGraphLoading, setIsGraphLoading] = useState(false);
    const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // // Auto-scroll when messages update
    // useLayoutEffect(() => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [messages]);

    useEffect(() => {
        // Whenever the conversation changes, reset localMessages to match it
        setLocalMessages(messages);
    }, [currentConversationId]);


    // useEffect(() => {
    //     // Update messages when conversation changes
    //     if (currentConversationId && conversations[currentConversationId]) {
    //         setLocalMessages(conversations[currentConversationId].messages || []);
    //     } else {
    //         setLocalMessages([]); // Empty chat for new conversation
    //     }
    // }, [currentConversationId, conversations]);

    const generateChatTitle = async (message: string) => {
        const messages: Message[] = [
            {
                id: crypto.randomUUID(),
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
                id: crypto.randomUUID(),
                role: "user",
                content: `Generate a short, natural, and descriptive title for a conversation 
                that starts with this message:\n\n"${message}"\n\nTitle:`
            }
        ];

        const titleResponse = await getModelResponse(messages);
        console.log(titleResponse)

        if (titleResponse) {
            updateConversationTitle(titleResponse.trim());
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
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

        setInput(""); // Clear input
        setIsLoading(true);

        let streamedContent = "";

        const assistantMessage: Message = {
            id: crypto.randomUUID(),
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
            const updatedNodes = newGraphData.nodes.map((node: any) => ({
                id: crypto.randomUUID(),
                name: node.name,
                info: node.info,
            }));

            // Use existing nodes + new ones
            const allNodes = [...(graphData?.nodes || []), ...updatedNodes];

            // Convert links to correct format with ID references
            const updatedLinks = newGraphData.links
                .map((link: any) => {
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

            // // Merge the new graph with existing one
            // setGraphData((prevGraph: KnowledgeGraph | null) => {
            //     if (!prevGraph) return { nodes: updatedNodes, links: updatedLinks };

            //     const mergedNodes = [
            //         ...prevGraph.nodes,
            //         ...updatedNodes.filter(newNode => !prevGraph.nodes.some(existingNode => existingNode.name === newNode.name))
            //     ];

            //     const mergedLinks = [
            //         ...prevGraph.links,
            //         ...updatedLinks.filter(newLink =>
            //             !prevGraph.links.some(existingLink =>
            //                 existingLink.source === newLink.source && existingLink.target === newLink.target
            //             )
            //         )
            //     ];

            //     return { nodes: mergedNodes, links: mergedLinks };
            // });
            // Merge the new graph with the current conversation's graph:
            let mergedGraph;
            if (!graphData || graphData.nodes.length === 0) {
                mergedGraph = { nodes: updatedNodes, links: updatedLinks };
            } else {
                const mergedNodes = [
                    ...graphData.nodes,
                    ...updatedNodes.filter(newNode =>
                        !graphData.nodes.some((existingNode: { name: string; }) => existingNode.name === newNode.name)
                    )
                ];
                const mergedLinks = [
                    ...graphData.links,
                    ...updatedLinks.filter(newLink =>
                        !graphData.links.some((existingLink: { source: string; target: string; }) =>
                            existingLink.source === newLink.source && existingLink.target === newLink.target
                        )
                    )
                ];
                mergedGraph = { nodes: mergedNodes, links: mergedLinks };
            }

            // Now update the conversation's graph using the context's updater
            if (currentConversationId) {
                updateConversationGraphData(currentConversationId, mergedGraph);
            }

            // if (currentConversationId) {
            //     updateConversationGraphData(currentConversationId, updatedGraph);
            // }

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
                <div className="flex-grow w-full mx-auto pb-4 flex flex-col space-y-2 px-4 py-6">
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
                    <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
                </div>
            </div>
            <div className="sticky bottom-0 w-full bg-white">
                <div className="max-w-5xl mx-auto mb-6 px-4">
                    <ChatInput sendMessage={sendMessage} input={input} setInput={setInput} isLoading={isLoading} />
                </div>
            </div>
        </div>
    );

    // function ChatBubble(index: number, msg: Message) {
    //     return (
    //         <div
    //             key={index}
    //             className={`p-3 rounded-lg ${msg.role === "user"
    //                 ? "max-w-xs md:max-w-md bg-gray-200 text-black self-end"
    //                 : "text-gray-900"
    //                 }`}
    //         >
    //             <div className="flex items-start gap-4">
    //                 {/* Assistant Icon */}
    //                 {msg.role === "assistant" && (
    //                     <SparklesIcon className="size-8 p-2 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0" />
    //                 )}

    //                 {/* Message Content - User Text or Assistant Markdown */}
    //                 <div className="space-y-4">
    //                     {msg.role === "user" ? (
    //                         <span>{msg.content}</span>
    //                     ) : (
    //                         <Markdown>{msg.content}</Markdown>
    //                     )}

    //                     {/* Button below assistant messages */}
    //                     {msg.role === "assistant" && !isLoading && (
    //                         <button className="mt-2 flex items-center gap-1 px-2 py-1 text-black border text-sm bg-white rounded-md hover:bg-gray-100">
    //                             <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
    //                             <span>Add to graph</span>
    //                         </button>
    //                     )}
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // }


    // function ChatBubble(index: number, msg: Message) {
    //     return <div
    //         key={index}
    //         className={`p-3 rounded-lg ${msg.role === "user"
    //             ? "max-w-xs md:max-w-md bg-gray-200 text-black self-end"
    //             : "text-gray-900"}`}
    //     >
    //         <div className="flex items-start gap-4">
    //             {/* Assistant Icon */}
    //             {msg.role === "assistant" && (
    //                 <SparklesIcon className="size-8 p-2 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0" />
    //             )}

    //             {/* Message Content - User Text or Assistant Markdown */}
    //             {msg.role === "user" ? (
    //                 <span>{msg.content}</span>
    //             ) : (
    //                 <div className="space-y-4">
    //                     <Markdown>{msg.content}</Markdown>
    //                 </div>
    //             )}
    //         </div>
    //     </div>;
    // }
}