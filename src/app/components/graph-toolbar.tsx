import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowsPointingInIcon,
    ArrowsPointingOutIcon,
    ArrowPathRoundedSquareIcon,
    MagnifyingGlassIcon
} from "@heroicons/react/24/solid"
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, DocumentTextIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { UIGraphNode, ColorPalette } from "@/app/lib/types";
import { inter } from "@/app/ui/fonts";
import { ColorGradientIcon } from "@/app/ui/icons";
import { ColorPalettes } from "@/app/ui/color-palettes";

interface GraphToolbarProps {
    onAddNode: () => void;
    onEditNode: () => void;
    onDeleteNode: () => void;
    onResetView: () => void;
    onToggleFullScreen: () => void;
    selectedNode: UIGraphNode | null;
    isFullScreen: boolean;
    onDeleteGraph: () => void;
    onSearchSelect: (node: UIGraphNode) => void;
    nodes: UIGraphNode[];
    onColorPaletteSelect: (palette: ColorPalette) => void;
    currentColorPalette: ColorPalette;
    onUndo: () => void;
    onRedo: () => void;
    undoStackLength: number;
    redoStackLength: number;
    onGenerateSummary: () => void;
    onGenerateQuiz: () => void;
}

// Helper function to close search or color palette picker when you click outside of them
function useOnClickOutside<T extends HTMLElement>(
    ref: RefObject<T>,
    handler: (event: MouseEvent | TouchEvent) => void
) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };

        document.addEventListener("mousedown", listener, true);
        document.addEventListener("touchstart", listener, true);
        return () => {
            document.removeEventListener("mousedown", listener, true);
            document.removeEventListener("touchstart", listener, true);
        };
    }, [ref, handler]);
}

// Graph toolbar component
export default function GraphToolbar({
    onAddNode,
    onEditNode,
    onDeleteNode,
    onResetView,
    onToggleFullScreen,
    selectedNode,
    isFullScreen,
    onDeleteGraph,
    onSearchSelect,
    nodes,
    onColorPaletteSelect,
    currentColorPalette,
    onUndo,
    onRedo,
    undoStackLength,
    redoStackLength,
    onGenerateSummary,
    onGenerateQuiz
}: GraphToolbarProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Color palette state
    const [isColorPalettePickerOpen, setIsColorPalettePickerOpen] = useState(false);
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(currentColorPalette);
    const colorPaletteInputRef = useRef<HTMLInputElement>(null);

    // Delete graph dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Close search and color palette picker on click outside
    useOnClickOutside(containerRef as React.RefObject<HTMLDivElement>, () => {
        setIsSearchOpen(false);
        setIsColorPalettePickerOpen(false);
    });

    // Set the highlighted result as the first one when search term changes
    useEffect(() => {
        setHighlightIndex(0);
    }, [searchTerm]);

    // Update the color palette state when the select palette changes
    useEffect(() => {
        setSelectedPalette(currentColorPalette);
    }, [currentColorPalette]);

    // Memoize search results
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return nodes.filter((node) =>
            node.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, nodes]);

    // Reset search on open
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            // Reset highlighted index
            setHighlightIndex(0);
        }
        setSearchTerm("");
    }, [isSearchOpen]);

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
                }
                e.preventDefault();
            } else if (e.key === "Escape") {
                setIsSearchOpen(false);
            }

        },
        [isSearchOpen, searchResults, highlightIndex, onSearchSelect]
    );

    // Handle user selecting a node in the search results
    const handleSelectNode = useCallback((node: UIGraphNode) => {
        onSearchSelect(node);
        setIsSearchOpen(false);
    }, [onSearchSelect]);

    // Handle user selecting a new color palette
    const handlePaletteSelect = (palette: ColorPalette) => {
        setSelectedPalette(palette);
        onColorPaletteSelect(palette);
        setIsColorPalettePickerOpen(false);
    };

    return (
        <div ref={containerRef} className="flex items-center justify-between p-2 bg-gray-100">
            <TooltipProvider>
                <div className="flex items-center space-x-2">
                    {/* Add node button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onAddNode} variant="outline" size="icon" className="black">
                                <PlusIcon className="h-4 w-4" />
                                <span className="sr-only">Add Node</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Add Node
                        </TooltipContent>
                    </Tooltip>
                    {/* Edit node button - disabled when no node is selected */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onEditNode} variant="outline" size="icon" className="text-gray-600" disabled={!selectedNode}>
                                <PencilIcon className="h-4 w-4" />
                                <span className="sr-only">Edit Node</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Edit Selected Node
                        </TooltipContent>
                    </Tooltip>
                    {/* Delete node button - disabled when no node is selected */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onDeleteNode} variant="outline" size="icon" className="text-gray-600" disabled={!selectedNode}>
                                <TrashIcon className="h-4 w-4" />
                                <span className="sr-only">Delete Node</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Delete Selected Node
                        </TooltipContent>
                    </Tooltip>

                    {/* If a node is selected, display its name */}
                    {selectedNode && (
                        <Input type="text" value={selectedNode.name} readOnly className="ml-2 w-40" placeholder="Selected Node" />
                    )}

                    {/* Reset view button */}
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

                    {/* Fullscreen button */}
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

                    {/* Search button */}
                    <div className="relative">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => {
                                        setIsSearchOpen((prev) => !prev);
                                        // If the color palette picker was open, close it when opening search
                                        if (isColorPalettePickerOpen) {
                                            setIsColorPalettePickerOpen(false);
                                        }
                                    }}
                                    variant="outline"
                                    size="icon"
                                >
                                    <MagnifyingGlassIcon className="h-4 w-4" />
                                    <span className="sr-only">Search Nodes</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Search Nodes</TooltipContent>
                        </Tooltip>
                        
                        {/* Search bar input */}
                        {isSearchOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded shadow z-20">
                                <Input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search nodes..."
                                    className="w-full rounded px-2 py-1"
                                />
                                {/* Search results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-1 max-h-72 overflow-y-auto">
                                        {searchResults.map((node, index) => (
                                            <div
                                                key={node.id}
                                                className={`${inter.className} px-2 py-1 text-gray-600 cursor-pointer border-b last:border-0 ${index === highlightIndex ? "bg-gray-100" : "hover:bg-gray-100"
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
                    
                    {/* Color palette picker button */}
                    <div className="relative">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => {
                                        setIsColorPalettePickerOpen((prev) => !prev);
                                        // If search was open, close it when opening color palette picker
                                        if (isSearchOpen) {
                                            setIsSearchOpen(false);
                                        }
                                    }}
                                    variant="outline"
                                    size="icon"
                                >
                                    <ColorGradientIcon />
                                    <span className="sr-only">Select Color Palette</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Select Color Palette</TooltipContent>
                        </Tooltip>
                        
                        {/* Show available color palettes */}
                        {isColorPalettePickerOpen && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded shadow z-20">
                                {ColorPalettes.map((palette) => (
                                    <div
                                        ref={colorPaletteInputRef}
                                        key={palette.id}
                                        onClick={() => handlePaletteSelect(palette)}
                                        className={` ${inter.className} text-gray-600 px-2 py-1 cursor-pointer border-b last:border-0 hover:bg-gray-100 flex items-center ${selectedPalette.id === palette.id ? "bg-gray-100" : ""
                                            }`}
                                    >
                                        <span className="flex-grow">{palette.name}</span>
                                        <div className="flex space-x-1">
                                            {palette.colors.map((color, idx) => (
                                                <div
                                                    key={idx}
                                                    className="w-4 h-10 rounded"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                    
                    {/* Generate graph summary button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={onGenerateSummary}
                                variant="outline"
                                size="icon"
                                disabled={!nodes || nodes.length === 0}
                            >
                                <DocumentTextIcon />
                                <span className="sr-only">Generate Summary</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate Summary</TooltipContent>
                    </Tooltip>
                    
                    {/* Quiz button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={onGenerateQuiz}
                                variant="outline"
                                size="icon"
                                disabled={!nodes || nodes.length === 0}
                            >
                                <LightBulbIcon />
                                <span className="sr-only">Quiz Me</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Quiz Me</TooltipContent>
                    </Tooltip>
                    
                    {/* If undo stack is not empty, show undo button */}
                    {undoStackLength !== 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onUndo} variant="outline" size="icon">
                                    <ArrowUturnLeftIcon className="h-4 w-4" />
                                    <span className="sr-only">Undo</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Undo
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {/* If redo stack is not empty, show redo button */}
                    {redoStackLength !== 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onRedo} variant="outline" size="icon">
                                    <ArrowUturnRightIcon className="h-4 w-4" />
                                    <span className="sr-only">Redo</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Redo
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* Delete graph button */}
                <div className="flex items-center">
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-white text-sm bg-red-600 rounded-md border hover:bg-red-400"
                        onClick={() => setIsDialogOpen(true)}
                    >
                        <span>Delete Map</span>
                    </button>

                </div>
            </TooltipProvider >
            
            {/* Graph deletion confirmation dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Concept Map</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">Delete the data for this concept map.</DialogDescription>
                    </DialogHeader>
                    <div className="p-4">
                        <p className="text-md text-black">
                            Are you sure you want to delete this concept map? This action can&apos;t be undone.
                        </p>
                    </div>
                    <DialogFooter className="flex justify-end space-x-2">
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setIsDialogOpen(false);
                                onDeleteGraph();
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    )
}