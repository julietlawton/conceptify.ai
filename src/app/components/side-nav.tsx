"use client";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, Cog8ToothIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useChat } from "../context/ChatContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newChatName, setNewChatName] = useState("");
    const [editingChatId, setEditingChatId] = useState<string | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");

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
        setIsRenameDialogOpen(true);
    };

    const handleSaveChatName = () => {
        if (editingChatId) {
            setConversations((prev) => ({
                ...prev,
                [editingChatId]: { ...prev[editingChatId], title: newChatName }
            }));
        }
        setIsRenameDialogOpen(false);
        setEditingChatId(null);
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
                                                className="pl-1 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-opacity duration-200"
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
                        <span className="block w-full truncate text-center px-4">Loading...</span>
                    </div>
                )}
            </div>
            <div className="flex-grow"></div>

            <div className="border-t">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center w-full gap-2 p-6 hover:bg-gray-200"
                >
                    <Cog8ToothIcon className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-700">Settings</span>
                </button>
            </div>

            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
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

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-4 items-center gap-4 pl-2">
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap mr-2">
                                <Label htmlFor="apiKey">OpenAI API Key</Label>
                                <div className="relative group mr-2">
                                    <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                    <div className="absolute left-1/2 w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>This is your API key from OpenAI. It can be found on platform.openai.com.</p>
                                    </div>
                                </div>
                            </div>
                            <Input
                                id="apiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="col-span-3"
                                placeholder="sk-..."
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4 pl-2">
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap mr-2">
                                <Label htmlFor="dataTools">Data Tools</Label>
                                <div className="relative group mr-2">
                                    <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                    <div className="absolute left-1/2 w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                        <p>Export or import your data (chats + graphs) as a JSON file.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-3 flex justify-startr gap-4">
                                <button
                                    className="mt-2 flex items-center gap-1 px-2 py-1 text-black text-sm bg-white rounded-md border hover:bg-gray-100"
                                    onClick={() => console.log("Export Data")}
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    <span>Export Data</span>
                                </button>
                                <button
                                    className="mt-2 flex items-center gap-1 px-2 py-1 text-black text-sm bg-white rounded-md border hover:bg-gray-100"
                                    onClick={() => console.log("Import Data")}
                                >
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                    <span>Import Data</span>
                                </button>
                            </div>
                        </div>

                    </div>
                    <DialogFooter className="flex justify-end space-x-2">
                        <Button onClick={() => setIsSettingsOpen(false)}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}