"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowDownTrayIcon, ArrowUpTrayIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useChat } from "../context/ChatContext";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { z } from "zod";
import { MODEL_PROVIDERS } from "../lib/modelConfig"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsDialog({
    isSettingsOpen,
    setIsSettingsOpen
}: {
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
}) {
    const {
        conversations,
        setConversations,
        setCurrentConversationId,
    } = useChat();

    const messageSchema = z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        createdAt: z.string().transform((str) => new Date(str)),
    });

    const graphNodeSchema = z.object({
        id: z.string(),
        name: z.string(),
        info: z.string(),
    });

    const graphLinkSchema = z.object({
        source: z.string(),
        target: z.string(),
        label: z.string(),
    });

    const graphSettingsSchema = z.object({
        colorPaletteId: z.string(),
        showNodeRelationships: z.record(z.boolean()),
    });

    const knowledgeGraphSchema = z.object({
        nodes: z.array(graphNodeSchema),
        links: z.array(graphLinkSchema),
        settings: graphSettingsSchema,
    });

    const conversationSchema = z.object({
        id: z.string(),
        title: z.string(),
        messages: z.array(messageSchema),
        createdAt: z.string().transform((str) => new Date(str)),
        graphData: knowledgeGraphSchema.optional().nullable(),
    });

    const conversationsSchema = z.record(conversationSchema);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedModelProvider, setSelectedModelProvider] = useState<string | null>(null);
    const [selectedChatModel, setSelectedChatModel] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState("");

    useEffect(() => {
        const storedProvider = localStorage.getItem("selectedProvider");
        const storedModel = localStorage.getItem("selectedChatModel");
        const storedKey = localStorage.getItem("apiKey");
    
        if (storedProvider) setSelectedModelProvider(storedProvider);
        if (storedModel) setSelectedChatModel(storedModel);
        if (storedKey) setApiKey(storedKey);
    }, []);

    const handleExportData = () => {
        const data = JSON.stringify(conversations, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hour = String(now.getHours()).padStart(2, "0");
        const minute = String(now.getMinutes()).padStart(2, "0");
        const fileName = `conversations-${year}-${month}-${day}-${hour}-${minute}.json`;

        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonStr = event.target?.result as string;
                const importedData = JSON.parse(jsonStr);
                const validatedData = conversationsSchema.parse(importedData);
                setConversations(validatedData);
                setTimeout(() => {
                    const firstConvId = Object.keys(validatedData)[0];
                    if (firstConvId) {
                        setCurrentConversationId(firstConvId);
                    } else {
                        toast.error("No conversation found in imported data.");
                    }
                }, 10);
                toast.success("Data imported successfully!");
            } catch (error) {
                console.error("Error importing data:", error);
                toast.error("Validation failed: the imported file is invalid or corrupted.");
            }
        };
        reader.readAsText(file);
    };

    const handleSaveSettings = () => {
        if (!selectedModelProvider) {
            toast.error("Please select a model provider.");
            return;
        }
        if (!selectedChatModel) {
            toast.error("Please select a model.");
            return;
        }

        console.log("selectedProvider", selectedModelProvider);
        console.log("selectedChatModel", selectedChatModel);
        console.log("apiKey", apiKey);

        localStorage.setItem("selectedProvider", selectedModelProvider);
        localStorage.setItem("selectedChatModel", selectedChatModel);
        localStorage.setItem("apiKey", apiKey);

        setIsSettingsOpen(false);
        toast.success("Settings saved!");
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = e.target.value.replace(/[^A-Za-z0-9-_]/g, "");
        setApiKey(sanitizedValue);
    };

    return (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Configure your model provider settings and manage your data.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4 pl-2">
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap mr-2">
                            <Label htmlFor="modelProvider">Model Provider</Label>
                            <div className="relative group mr-2">
                                <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                <div className="absolute left-1/2 w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                    <p>Select the model provider for the app.</p><br></br>
                                    <p>OpenAI is recommended for the most consistent graph generation.</p>
                                </div>
                            </div>
                        </div>

                        <Select value={selectedModelProvider || ""} onValueChange={setSelectedModelProvider}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(MODEL_PROVIDERS).map(([providerKey, providerData]) => (
                                    <SelectItem key={providerKey} value={providerKey} className="flex items-center justify-between">
                                        <span>{providerData.displayName}</span>
                                        {providerKey === "openai" && <span className="italic text-gray-500 ml-2">(Recommended)</span>}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedModelProvider && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4 pl-2">
                                <div className="flex items-center justify-center gap-1 whitespace-nowrap mr-2">
                                    <Label htmlFor="apiKey">
                                        Provider API Key
                                    </Label>
                                    <div className="relative group mr-2">
                                        <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 mr-2 -translate-y-1/4" />
                                        <div className="absolute left-1/2 w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                            <p>Set your API key from {MODEL_PROVIDERS[selectedModelProvider as keyof typeof MODEL_PROVIDERS].displayName}.</p>
                                        </div>
                                    </div>
                                </div>
                                <Input
                                    id="apiKey"
                                    value={apiKey}
                                    onChange={handleApiKeyChange}
                                    className="col-span-3"
                                    placeholder="sk-..."
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4 pl-2">
                                <div className="flex items-center justify-center gap-1 mr-2 whitespace-nowrap">
                                    <Label htmlFor="modelVersion">Model Version</Label>
                                    <div className="relative group">
                                        <InformationCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer mt-2 -translate-y-1/4" />
                                        <div className="absolute left-1/2 w-[200px] -translate-x-1/2 scale-0 transition-all rounded bg-gray-800 text-white text-xs py-2 px-3 group-hover:scale-100 whitespace-normal">
                                            <p>Select the model you want to use for chats.</p> <br></br>
                                            <p><i>Note:</i> {MODEL_PROVIDERS[selectedModelProvider as keyof typeof MODEL_PROVIDERS].graphModel} will be used for graph generation.</p>
                                        </div>
                                    </div>
                                </div>

                                <Select
                                    value={selectedChatModel || ""}
                                    onValueChange={setSelectedChatModel}
                                >
                                    <SelectTrigger className="col-span-3 w-full">
                                        <SelectValue placeholder="Select model version" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MODEL_PROVIDERS[selectedModelProvider as keyof typeof MODEL_PROVIDERS].models.map((model) => (
                                            <SelectItem key={model} value={model}>
                                                {model}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>


                        </>
                    )}

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
                                onClick={handleExportData}
                            >
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                <span>Export Data</span>
                            </button>
                            <button
                                className="mt-2 flex items-center gap-1 px-2 py-1 text-black text-sm bg-white rounded-md border hover:bg-gray-100"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ArrowUpTrayIcon className="w-5 h-5" />
                                <span>Import Data</span>
                            </button>
                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                onChange={handleImportData}
                                className="hidden"
                            />
                        </div>
                    </div>

                </div>
                <DialogFooter className="flex justify-end space-x-2">
                    <Button onClick={handleSaveSettings}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}