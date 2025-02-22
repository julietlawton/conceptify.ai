"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { Message } from "ai";

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    graphData?: KnowledgeGraph;
}

interface ChatContextType {
    conversations: Record<string, Conversation>;
    setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
    currentConversationId: string | null;
    setCurrentConversationId: React.Dispatch<React.SetStateAction<string | null>>;
    messages: Message[];
    // graphData: KnowledgeGraph | null;
    // setGraphData: (graphData: KnowledgeGraph) => void;
    updateConversationGraphData: (conversationId: string, graphData: KnowledgeGraph | null) => void;
    // getNodeName: (id: string) => string;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isLoadingConversations: boolean;
    setIsLoadingConversations: (loading: boolean) => void;
    createNewConversation: () => void;
    updateConversationTitle: (title: string) => void;
    switchConversation: (conversationId: string) => void;
    addMessageToConversation: (message: Message) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);


export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const [conversations, setConversations] = useState<Record<string, Conversation>>({});
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);

    const getLastMessageTime = (conversation) => {
        const { messages, createdAt } = conversation;
        if (messages && messages.length > 0) {
            // Assume messages are in chronological order; get the last one
            return new Date(messages[messages.length - 1].createdAt).getTime();
        }
        // If no messages, fallback to the conversation's creation time.
        return new Date(createdAt).getTime();
    };

    useEffect(() => {
        const savedConversations = localStorage.getItem("conversations");
        if (savedConversations) {
            const parsedConversations = JSON.parse(savedConversations);
            // Sort conversations based on last message time
            const sorted = Object.values(parsedConversations).sort(
                (a, b) => getLastMessageTime(b) - getLastMessageTime(a)
            );
            setConversations(parsedConversations);

            if (Object.keys(parsedConversations).length > 0) {
                setCurrentConversationId(Object.keys(parsedConversations)[0]);
                setGraphData(parsedConversations[Object.keys(parsedConversations)[0]].graphData || null);
            } else {
                console.log("Creating convo on line 54");
                createNewConversation();
            }

            //   if (sorted.length > 0) {
            //     // Set the current conversation to the one with the most recent message.
            //     setCurrentConversationId(sorted[0].id);
            //   }
        } else {
            createNewConversation();
        }
        setIsLoadingConversations(false);
    }, []);

    // // Load conversations from local storage on mount
    // useEffect(() => {
    //     const savedConversations = localStorage.getItem("conversations");
    //     if (savedConversations) {
    //         const parsedConversations = JSON.parse(savedConversations);
    //         setConversations(parsedConversations);

    //         if (Object.keys(parsedConversations).length > 0) {
    //             setCurrentConversationId(Object.keys(parsedConversations)[0]);
    //             setGraphData(parsedConversations[Object.keys(parsedConversations)[0]].graphData || null);
    //         } else {
    //             console.log("Creating convo on line 54");
    //             createNewConversation();
    //         }
    //     } else {
    //         console.log("Creating convo on line 58");
    //         createNewConversation();
    //     }

    //     setIsLoadingConversations(false);
    // }, []);

    useEffect(() => {
        localStorage.setItem("conversations", JSON.stringify(conversations));
    }, [conversations]);

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            // Skip on initial mount
            isInitialMount.current = false;
        } else {
            if (Object.keys(conversations).length === 0) {
                console.log("User deleted all conversations, creating new one");
                createNewConversation();
            }
        }
    }, [conversations]);

    // Get messages from the active conversation
    const messages = currentConversationId ? conversations[currentConversationId]?.messages || [] : [];

    // const getNodeName = (id: string) => {
    //     return graphData?.nodes.find((n) => n.id === id)?.name || "Unknown";
    // };

    // Create a new conversation
    const createNewConversation = () => {
        const newId = crypto.randomUUID();
        const newConversation: Conversation = {
            id: newId,
            title: "New Chat",
            messages: [],
            createdAt: new Date(),
        };
        setCurrentConversationId(newId);

        setConversations((prev) => ({
            [newId]: newConversation,
            ...prev,
        }));

        setGraphData(null);
    };

    const updateConversationTitle = (title: string) => {
        if (!currentConversationId) return;

        setConversations((prev) => {
            const updatedConversation = {
                ...prev[currentConversationId],
                title: title || "Untitled Chat",
            };
            return { ...prev, [currentConversationId]: updatedConversation };
        });
    };

    const updateConversationGraphData = (conversationId: string, newGraph: KnowledgeGraph | null) => {
        setConversations((prevConversations) => {
            const updatedConversations = {
                ...prevConversations,
                [conversationId]: {
                    ...prevConversations[conversationId],
                    graphData: newGraph,
                },
            };

            localStorage.setItem("conversations", JSON.stringify(updatedConversations));
            return updatedConversations;
        });

        setGraphData(newGraph);
    };

    const switchConversation = (conversationId: string) => {
        if (conversations[conversationId]) {
            setCurrentConversationId(conversationId);
            setGraphData(conversations[conversationId]?.graphData || null);
        }
    };

    // Add a message to the current conversation
    const addMessageToConversation = (message: Message) => {
        console.log(conversations);
        console.log(currentConversationId);

        if (!currentConversationId) return;

        setConversations((prev) => {
            const updatedConversation = {
                ...prev[currentConversationId],
                messages: [...prev[currentConversationId].messages, message],
            };
            return { ...prev, [currentConversationId]: updatedConversation };
        });
    };

    return (
        <ChatContext.Provider
            value={{
                conversations,
                setConversations,
                currentConversationId,
                setCurrentConversationId,
                messages,
                // graphData,
                // setGraphData,
                updateConversationGraphData,
                isLoading,
                setIsLoading,
                isLoadingConversations,
                setIsLoadingConversations,
                createNewConversation,
                updateConversationTitle,
                switchConversation,
                addMessageToConversation,
                // setMessages
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}

export const useCurrentGraph = () => {
    const { conversations, currentConversationId, updateConversationGraphData } = useChat();
    const graphData =
        currentConversationId && conversations[currentConversationId]?.graphData
            ? conversations[currentConversationId].graphData
            : { nodes: [], links: [] };

    return { graphData, updateConversationGraphData };
};