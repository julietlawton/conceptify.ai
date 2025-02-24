"use client";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useChat } from "../context/ChatContext";
import { Conversation } from "../lib/types";

export default function SideNav() {
    const {
        conversations,
        setConversations,
        currentConversationId,
        setCurrentConversationId,
        createNewConversation,
        switchConversation,
        getLastMessageTime
    } = useChat();


    const handleDeleteConversation = (conversationId: string) => {
        setConversations((prev) => {
            const updated = { ...prev };
            delete updated[conversationId]; // Remove from state
            return updated;
        });

        // If the deleted conversation is the current one, switch to another
        if (currentConversationId === conversationId) {
            const remainingIds = Object.keys(conversations).filter(id => id !== conversationId);
            setCurrentConversationId(remainingIds.length > 0 ? remainingIds[0] : null);
        }
    };

    return (
        <div className="w-64 min-64 flex h-full flex-col bg-gray-100">
            <div className="flex items-center justify-between px-4 py-5">
                <h2 className="text-lg font-bold">Chats</h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PlusIcon
                                className="size-6 cursor-pointer text-gray-500 hover:text-gray-800 relative -translate-y-1"
                                onClick={createNewConversation}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>New Chat</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="w-64 flex flex-col space-y-2 overflow-y-auto">
                {Object.keys(conversations).length > 0 ? (
                    Object.values(conversations)
                    .sort((a, b) => getLastMessageTime(b) - getLastMessageTime(a))
                    .map((conv) => (
                        //Object.values(conversations).map((conv) => (
                        <div
                            key={conv.id}
                            className={`p-2 cursor-pointer hover:bg-gray-200 flex items-center justify-between relative group
                    ${conv.id === currentConversationId ? "bg-gray-200" : "hover:bg-gray-200"}`}
                            onClick={() => switchConversation(conv.id)}
                        >
                            <span className="truncate px-4 flex-grow">{conv.title}</span>

                            <button
                                className="p-1 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-opacity duration-200"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent switching conversations when clicking delete
                                    handleDeleteConversation(conv.id);
                                }}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="p-4 w-full text-gray-400">
                        <span className="block w-full truncate text-center px-4">No chats yet</span>
                    </div>
                )}
            </div>
            <div className="flex-grow"></div>
        </div>
    );
}