"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { Message } from "ai";
import { Conversation, KnowledgeGraph } from "../lib/types";
import { ColorPalettes } from "../ui/color-palettes";
import { v4 as uuidv4 } from 'uuid';

interface ChatContextType {
    conversations: Record<string, Conversation>;
    setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
    currentConversationId: string | null;
    setCurrentConversationId: React.Dispatch<React.SetStateAction<string | null>>;
    messages: Message[];
    updateConversationGraphData: (conversationId: string, graphData: KnowledgeGraph | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isLoadingConversations: boolean;
    setIsLoadingConversations: (loading: boolean) => void;
    createNewConversation: () => void;
    updateConversationTitle: (title: string) => void;
    switchConversation: (conversationId: string) => void;
    addMessageToConversation: (message: Message) => void;
    getLastMessageTime: (conversation: Conversation) => number;
    coldStartGraph: (conversationId: string) => void;
    addActionToUndoStack: () => void;
    undoAction: () => void;
    redoAction: () => void;
    undoStackLength: number;
    redoStackLength: number;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);


export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const [conversations, setConversations] = useState<Record<string, Conversation>>({});
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
    const [undoGraphActionStack, setUndoGraphActionStack] = useState<KnowledgeGraph[]>([]);
    const [redoGraphActionStack, setRedoGraphActionStack] = useState<KnowledgeGraph[]>([]);
    const [undoStackLength, setUndoStackLength] = useState(0);
    const [redoStackLength, setRedoStackLength] = useState(0);
    const MAX_GRAPH_REVISION_STEPS = 3;
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);

    useEffect(() => {
        setUndoStackLength(undoGraphActionStack.length);
        setRedoStackLength(redoGraphActionStack.length);
    }, [undoGraphActionStack, redoGraphActionStack]);

    const addActionToUndoStack = () => {
        setUndoGraphActionStack((prev) => {
            const newStack = [...prev, JSON.parse(JSON.stringify(graphData))];

            if (newStack.length > MAX_GRAPH_REVISION_STEPS) {
                newStack.shift();
            }

            return newStack;
        });

        setRedoGraphActionStack([]);
    };

    const undoAction = () => {
        if (undoGraphActionStack.length === 0) return;
    
        let nextState: KnowledgeGraph | null = null;
    
        setUndoGraphActionStack((prev) => {
            if (prev.length === 0) return prev;
    
            const newStack = prev.slice(0, -1);
            nextState = prev[prev.length - 1];
    
            return newStack;
        });
    
        if (!nextState) return;
    
        setRedoGraphActionStack((redoPrev) => {
            const newRedoStack = [...redoPrev, JSON.parse(JSON.stringify(graphData))];
    
            if (newRedoStack.length > MAX_GRAPH_REVISION_STEPS) {
                newRedoStack.shift();
            }
    
            return newRedoStack;
        });
    
        if (currentConversationId) {
            updateConversationGraphData(currentConversationId, nextState);
        }
    };

    const redoAction = () => {
        if (redoGraphActionStack.length === 0) return;
    
        let nextState: KnowledgeGraph | null = null;
    
        setRedoGraphActionStack((prev) => {
            if (prev.length === 0) return prev;
    
            const newStack = prev.slice(0, -1);
            nextState = prev[prev.length - 1];
    
            return newStack;
        });
    
        if (!nextState) return;
    
        setUndoGraphActionStack((redoPrev) => {
            const newUndoStack = [...redoPrev, JSON.parse(JSON.stringify(graphData))];
    
            if (newUndoStack.length > MAX_GRAPH_REVISION_STEPS) {
                newUndoStack.shift();
            }
    
            return newUndoStack;
        });
    
        if (currentConversationId) {
            updateConversationGraphData(currentConversationId, nextState);
        }
    };

    const getLastMessageTime = (conversation: Conversation) => {
        const { messages, createdAt } = conversation;
        if (messages && messages.length > 0) {

            const most_recent_message_date = messages[messages.length - 1].createdAt;

            if (most_recent_message_date) {
                return new Date(most_recent_message_date).getTime();
            } else {
                return new Date(createdAt).getTime();
            }

        }

        return new Date(createdAt).getTime();
    };

    useEffect(() => {
        const savedConversations = localStorage.getItem("conversations");
        if (savedConversations) {
            const parsedConversations = JSON.parse(savedConversations) as Record<string, Conversation>;;
            setConversations(parsedConversations); // Still an object

            // If you want to auto-select the “most recent” conversation:
            const sorted = Object.values(parsedConversations).sort(
                (a, b) => getLastMessageTime(b) - getLastMessageTime(a)
            );

            if (sorted.length > 0) {
                setCurrentConversationId(sorted[0].id);
                setGraphData(parsedConversations[sorted[0].id].graphData || null);
            } else {
                createNewConversation();
            }
        } else {
            createNewConversation();
        }
        setIsLoadingConversations(false);
    }, []);

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

    // Create a new conversation
    const createNewConversation = () => {
        const newId = uuidv4();
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

    const coldStartGraph = (conversationId: string) => {
        const newGraph = {
            nodes: [],
            links: [],
            settings: {
                colorPaletteId: ColorPalettes[0].id,
                showNodeRelationships: {}
            }
        };

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
        console.log("Cold starting graph:", newGraph);
        setGraphData(newGraph);
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
        console.log("Updating graph:", newGraph);
        setGraphData(newGraph);
    };

    const switchConversation = (conversationId: string) => {
        if (conversations[conversationId]) {
            setCurrentConversationId(conversationId);
            console.log("Graph data", conversations[conversationId]?.graphData);
            setGraphData(conversations[conversationId]?.graphData || null);
            setUndoGraphActionStack([]);
            setRedoGraphActionStack([]);
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
                updateConversationGraphData,
                isLoading,
                setIsLoading,
                isLoadingConversations,
                setIsLoadingConversations,
                createNewConversation,
                updateConversationTitle,
                switchConversation,
                addMessageToConversation,
                getLastMessageTime,
                coldStartGraph,
                addActionToUndoStack,
                undoAction,
                redoAction,
                undoStackLength,
                redoStackLength
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
            : {
                nodes: [],
                links: [],
                settings: {
                    colorPaletteId: ColorPalettes[0].id,
                    showNodeRelationships: {}
                }
            };

    return { graphData, updateConversationGraphData };
};