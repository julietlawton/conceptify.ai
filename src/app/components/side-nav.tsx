"use client";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import { useChat } from "../context/ChatContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newChatName, setNewChatName] = useState("");
    const [editingChatId, setEditingChatId] = useState<string | null>(null);

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

    const handleEditChatName = (conversationId: string, currentTitle: string) => {
        setNewChatName(currentTitle);
        setEditingChatId(conversationId);
        setIsDialogOpen(true);
    };

    const handleSaveChatName = () => {
        if (editingChatId) {
            setConversations((prev) => ({
                ...prev,
                [editingChatId]: { ...prev[editingChatId], title: newChatName }
            }));
        }
        setIsDialogOpen(false);
        setEditingChatId(null);
    };


    return (
        <div className="w-72 min-64 flex h-full flex-col bg-gray-100">
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

            <div className="w-72 flex flex-col space-y-2 overflow-y-auto">
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

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                className="py-1 pr-1 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-opacity duration-200"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent switching conversations when clicking
                                                    handleEditChatName(conv.id, conv.title);
                                                }}
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Edit Name</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                className="p-1 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-opacity duration-200"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent switching conversations when clicking delete
                                                    handleDeleteConversation(conv.id);
                                                }}
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Delete Chat</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                            </div>
                        ))
                ) : (
                    <div className="p-4 w-full text-gray-400">
                        <span className="block w-full truncate text-center px-4">No chats yet</span>
                    </div>
                )}
            </div>
            <div className="flex-grow"></div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Chat Name</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <Input
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter className="flex justify-end space-x-2">
                        <Button onClick={handleSaveChatName}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
        </div>
    );
}