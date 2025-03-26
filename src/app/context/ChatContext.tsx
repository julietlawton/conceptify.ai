"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { Message } from "ai";
import { Conversation, KnowledgeGraph } from "@/app/lib/types";
import { ColorPalettes } from "@/app/ui/color-palettes";
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
    getConversationTitle: (conversationId: string) => string;
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

// Context provider for conversations and graphs
export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    // Conversation state
    const [conversations, setConversations] = useState<Record<string, Conversation>>({});
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);

    // Graph state
    const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null);
    const [undoGraphActionStack, setUndoGraphActionStack] = useState<KnowledgeGraph[]>([]);
    const [redoGraphActionStack, setRedoGraphActionStack] = useState<KnowledgeGraph[]>([]);
    const [undoStackLength, setUndoStackLength] = useState(0);
    const [redoStackLength, setRedoStackLength] = useState(0);
    const MAX_GRAPH_REVISION_STEPS = 3;

    // Helper function to get the timestamp of the most recent message in a conversation
    // Used for sorting conversations by recency
    const getLastMessageTime = (conversation: Conversation) => {
        const { messages, createdAt } = conversation;
        if (messages && messages.length > 0) {

            const most_recent_message_date = messages[messages.length - 1].createdAt;

            // Return the time of the most recent message if one exists,
            // otherwise return the time this conversation was created
            if (most_recent_message_date) {
                return new Date(most_recent_message_date).getTime();
            } else {
                return new Date(createdAt).getTime();
            }

        }

        return new Date(createdAt).getTime();
    };

    // On page load, set the conversations object using saved data
    useEffect(() => {
        const savedConversations = localStorage.getItem("conversations");
        if (savedConversations) {
            const parsedConversations = JSON.parse(savedConversations) as Record<string, Conversation>;;
            setConversations(parsedConversations);

            // Sort the conversations by most recent message time
            const sorted = Object.values(parsedConversations).sort(
                (a, b) => getLastMessageTime(b) - getLastMessageTime(a)
            );

            // Set the currently active conversation as the first conversation in the sorted results
            if (sorted.length > 0) {
                setCurrentConversationId(sorted[0].id);
                setGraphData(parsedConversations[sorted[0].id].graphData || null);
            } else {
                createNewConversation();
            }
        // If there are no conversations saved, create a new empty one
        } else {
            createNewConversation();
        }
        // Set UI loading status to false
        setIsLoadingConversations(false);
    }, []);

    // When conversation data changes, update storage
    useEffect(() => {
        localStorage.setItem("conversations", JSON.stringify(conversations));
    }, [conversations]);

    // If this is not the first page load and conversations is empty, create a new conversation
    // This occurs if the user deletes all conversations
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            // Skip on initial mount
            isInitialMount.current = false;
        } else {
            if (Object.keys(conversations).length === 0) {
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

    // Overwrite the current conversation title with a new one
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

    // Return the title of the current conversation
    const getConversationTitle = (conversationId: string) => {
        return conversations[conversationId].title;
    }

    // Update the graph for a conversation
    const updateConversationGraphData = (conversationId: string, newGraph: KnowledgeGraph | null) => {
        setConversations((prevConversations) => {
            const updatedConversations = {
                ...prevConversations,
                [conversationId]: {
                    ...prevConversations[conversationId],
                    graphData: newGraph,
                },
            };

            // Update saved conversations data with new graph data
            localStorage.setItem("conversations", JSON.stringify(updatedConversations));
            return updatedConversations;
        });
        setGraphData(newGraph);
    };

    // Switch conversations
    const switchConversation = (conversationId: string) => {
        if (conversations[conversationId]) {

            // Switch conversation ID and load graph for that conversation
            setCurrentConversationId(conversationId);
            setGraphData(conversations[conversationId]?.graphData || null);

            // Reset undo and redo stacks
            setUndoGraphActionStack([]);
            setRedoGraphActionStack([]);
        }
    };

    // Add a message to the current conversation
    const addMessageToConversation = (message: Message) => {
        if (!currentConversationId) return;

        setConversations((prev) => {
            const updatedConversation = {
                ...prev[currentConversationId],
                messages: [...prev[currentConversationId].messages, message],
            };
            return { ...prev, [currentConversationId]: updatedConversation };
        });
    };

    // Create an empty graph (cold start)
    // This option allows users to start building a graph from scratch
    const coldStartGraph = (conversationId: string) => {
        // Instantiate an empty graph
        const emptyGraph = {
            nodes: [],
            links: [],
            settings: {
                colorPaletteId: ColorPalettes[0].id,
                showNodeRelationships: {}
            }
        };

        // Add the empty graph to the conversation
        setConversations((prevConversations) => {
            const updatedConversations = {
                ...prevConversations,
                [conversationId]: {
                    ...prevConversations[conversationId],
                    graphData: emptyGraph,
                },
            };

            localStorage.setItem("conversations", JSON.stringify(updatedConversations));
            return updatedConversations;
        });
        setGraphData(emptyGraph);
    };

    // When the undo or redo action stack changes, update the length used by the UI
    useEffect(() => {
        setUndoStackLength(undoGraphActionStack.length);
        setRedoStackLength(redoGraphActionStack.length);
    }, [undoGraphActionStack, redoGraphActionStack]);

    // Add an action (add to graph, edit node, delete node) to the undo stack
    const addActionToUndoStack = () => {
        setUndoGraphActionStack((prev) => {
            // Save the current state of the graph to be able to undo the next change
            // If the graph data is empty, the previous state to save is an empty graph
            const safeGraphData = graphData ?? {
                nodes: [],
                links: [],
                settings: {
                    colorPaletteId: "defaultPalette",
                    showNodeRelationships: {},
                },
            };

            // Push the copy of the graph to the undo stack
            const newStack = [...prev, JSON.parse(JSON.stringify(safeGraphData))];

            // If more than 3 undo-able actions have occurred, take the last state off the end of the stack
            if (newStack.length > MAX_GRAPH_REVISION_STEPS) {
                newStack.shift();
            }

            return newStack;
        });

        // Clear redo stack
        setRedoGraphActionStack([]);
    };

    // On undo, restore the graph to the previous state one action back
    const undoAction = () => {
        if (undoGraphActionStack.length === 0) return;
    
        let nextState: KnowledgeGraph | null = null;
        
        // Pop the last graph state off the top of the undo stack
        setUndoGraphActionStack((prev) => {
            if (prev.length === 0) return prev;
    
            const newStack = prev.slice(0, -1);
            nextState = prev[prev.length - 1];
    
            return newStack;
        });
    
        if (!nextState) return;
        
        // Add the current graph state to the redo stack to reverse this undo
        setRedoGraphActionStack((redoPrev) => {
            const newRedoStack = [...redoPrev, JSON.parse(JSON.stringify(graphData))];
    
            if (newRedoStack.length > MAX_GRAPH_REVISION_STEPS) {
                newRedoStack.shift();
            }
    
            return newRedoStack;
        });
        
        // Restore the graph to the last state
        if (currentConversationId) {
            updateConversationGraphData(currentConversationId, nextState);
        }
    };

    // On redp, restore the graph to the previous state one action forward
    const redoAction = () => {
        if (redoGraphActionStack.length === 0) return;
    
        let nextState: KnowledgeGraph | null = null;
        
        // Pop the last graph state off the top of the redo stack
        setRedoGraphActionStack((prev) => {
            if (prev.length === 0) return prev;
    
            const newStack = prev.slice(0, -1);
            nextState = prev[prev.length - 1];
    
            return newStack;
        });
    
        if (!nextState) return;
        
        // Add the current graph state to the undo stack to reverse this redo
        setUndoGraphActionStack((redoPrev) => {
            const newUndoStack = [...redoPrev, JSON.parse(JSON.stringify(graphData))];
    
            if (newUndoStack.length > MAX_GRAPH_REVISION_STEPS) {
                newUndoStack.shift();
            }
    
            return newUndoStack;
        });
        
        // Restore the graph to the last state
        if (currentConversationId) {
            updateConversationGraphData(currentConversationId, nextState);
        }
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
                getConversationTitle,
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

// Export chat (conversation) context
export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}

// Export graph context
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