import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowsPointingInIcon,
    ArrowsPointingOutIcon,
    ArrowPathRoundedSquareIcon,
    MagnifyingGlassIcon
} from "@heroicons/react/24/solid"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UIGraphNode } from "../lib/types";

interface GraphToolbarProps {
    onAddNode: () => void
    onEditNode: () => void
    onDeleteNode: () => void
    onResetView: () => void
    onToggleFullScreen: () => void
    selectedNode: any | null
    isFullScreen: boolean
    onDeleteGraph: () => void
    onSearchSelect: (node: UIGraphNode) => void;
    nodes: UIGraphNode[];
}

export function GraphToolbar({
    onAddNode,
    onEditNode,
    onDeleteNode,
    onResetView,
    onToggleFullScreen,
    selectedNode,
    isFullScreen,
    onDeleteGraph,
    onSearchSelect,
    nodes
}: GraphToolbarProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return nodes.filter((node) =>
            node.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, nodes]);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
            // Reset highlighted index
            setHighlightIndex(0);
        }
    }, [isSearchOpen]);

    useEffect(() => {
        setHighlightIndex(0);
    }, [searchTerm]);

    // Handle keydown events for arrow navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!isSearchOpen) return;
            if (e.key === "ArrowDown") {
                setHighlightIndex((prev) =>
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                e.preventDefault();
            } else if (e.key === "ArrowUp") {
                // Move highlight up
                setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
                e.preventDefault();
            } else if (e.key === "Enter") {
                if (searchResults[highlightIndex]) {
                    onSearchSelect(searchResults[highlightIndex]);
                    setIsSearchOpen(false);
                    setSearchTerm("");
                }
                e.preventDefault();
            } else if (e.key === "Escape"){
                setIsSearchOpen(false);
                setSearchTerm("");
            }

        },
        [isSearchOpen, searchResults, highlightIndex, onSearchSelect]
    );

    const handleSelectNode = useCallback((node: UIGraphNode) => {
        onSearchSelect(node);
        setIsSearchOpen(false);
        setSearchTerm("");
    }, [onSearchSelect]);

    return (
        <div className="flex items-center justify-between p-2 bg-gray-100">
            <TooltipProvider>
                <div className="flex items-center space-x-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onAddNode} variant="outline" size="icon" className="text-gray-600">
                                <PlusIcon className="h-4 w-4" />
                                <span className="sr-only">Add Node</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Add Node
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onEditNode} variant="outline" size="icon" className="text-gray-600" disabled={!selectedNode}>
                                <PencilIcon className="h-4 w-4" />
                                <span className="sr-only">Edit Node</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Edit Node
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onDeleteNode} variant="outline" size="icon" className="text-gray-600" disabled={!selectedNode}>
                                <TrashIcon className="h-4 w-4" />
                                <span className="sr-only">Delete Node</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Delete Node
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onResetView} variant="outline" size="icon">
                                <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                                <span className="sr-only">Reset View</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Reset View
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onToggleFullScreen} variant="outline" size="icon">
                                {isFullScreen ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
                                <span className="sr-only">{isFullScreen ? "Exit Full Screen" : "Full Screen"}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Toggle Fullscreen
                        </TooltipContent>
                    </Tooltip>

                    <div className="relative">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => setIsSearchOpen((prev) => !prev)}
                                    variant="outline"
                                    size="icon"
                                >
                                    <MagnifyingGlassIcon className="h-4 w-4" />
                                    <span className="sr-only">Search Nodes</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Search Nodes</TooltipContent>
                        </Tooltip>

                        {isSearchOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded shadow z-20">
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search nodes..."
                                    className="w-full border rounded px-2 py-1"
                                />
                                {searchResults.length > 0 && (
                                    <div className="mt-1 max-h-72 overflow-y-auto">
                                        {searchResults.map((node, index) => (
                                            <div
                                                key={node.id}
                                                className={`px-2 py-1 cursor-pointer border-b last:border-0 ${
                                                    index === highlightIndex ? "bg-gray-100" : "hover:bg-gray-100"
                                                }`}
                                                onClick={() => handleSelectNode(node)}
                                            >
                                                {node.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    {selectedNode && (
                        <Input type="text" value={selectedNode.name} readOnly className="ml-2 w-40" placeholder="Selected Node" />
                    )}
                </div>
            </TooltipProvider>

            <div className="flex items-center">
                <button
                    className="flex items-center gap-1 px-2 py-1 text-white text-sm bg-red-600 rounded-md border hover:bg-red-400"
                    onClick={onDeleteGraph}
                >
                    <span>Delete graph</span>
                </button>

            </div>

        </div>
    )
}