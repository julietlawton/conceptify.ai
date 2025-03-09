import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ArrowsPointingInIcon,
    ArrowsPointingOutIcon,
    ArrowPathRoundedSquareIcon,
    MagnifyingGlassIcon
} from "@heroicons/react/24/solid"
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UIGraphNode, ColorPalette } from "../lib/types";
import { inter } from "../ui/fonts";
import { ColorGradientIcon } from "../ui/icons";
import { ColorPalettes } from "../ui/color-palettes";

interface GraphToolbarProps {
    onAddNode: () => void
    onEditNode: () => void
    onDeleteNode: () => void
    onResetView: () => void
    onToggleFullScreen: () => void
    selectedNode: UIGraphNode | null
    isFullScreen: boolean
    onDeleteGraph: () => void
    onSearchSelect: (node: UIGraphNode) => void;
    nodes: UIGraphNode[];
    onColorPaletteSelect: (palette: ColorPalette) => void;
    currentColorPalette: ColorPalette;
}

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
    nodes,
    onColorPaletteSelect,
    currentColorPalette
}: GraphToolbarProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [isColorPalettePickerOpen, setIsColorPalettePickerOpen] = useState(false);
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(currentColorPalette);
    const colorPaletteInputRef = useRef<HTMLInputElement>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useOnClickOutside(containerRef as React.RefObject<HTMLDivElement>, () => {
        setIsSearchOpen(false);
        setIsColorPalettePickerOpen(false);
    });

    useEffect(() => {
        setHighlightIndex(0);
    }, [searchTerm]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return nodes.filter((node) =>
            node.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, nodes]);

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            // Reset highlighted index
            setHighlightIndex(0);
        }
        setSearchTerm("");
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
                }
                e.preventDefault();
            } else if (e.key === "Escape") {
                setIsSearchOpen(false);
            }

        },
        [isSearchOpen, searchResults, highlightIndex, onSearchSelect]
    );

    const handleSelectNode = useCallback((node: UIGraphNode) => {
        onSearchSelect(node);
        setIsSearchOpen(false);
    }, [onSearchSelect]);

    const handlePaletteSelect = (palette: ColorPalette) => {
        setSelectedPalette(palette);
        onColorPaletteSelect(palette);
        setIsColorPalettePickerOpen(false);
    };

    return (
        <div ref={containerRef} className="flex items-center justify-between p-2 bg-gray-100">
            <TooltipProvider>
                <div className="flex items-center space-x-2">
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
                                    onClick={() => {
                                        setIsSearchOpen((prev) => !prev);
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

                    <div className="relative">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => {
                                        setIsColorPalettePickerOpen((prev) => !prev);
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

                        {isColorPalettePickerOpen && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded shadow z-20">
                                {ColorPalettes.map((palette) => (
                                    <div
                                        ref={colorPaletteInputRef}
                                        key={palette.id}
                                        onClick={() => handlePaletteSelect(palette)}
                                        className={` ${inter.className} px-2 py-1 cursor-pointer border-b last:border-0 hover:bg-gray-100 flex items-center ${selectedPalette.id === palette.id ? "bg-gray-100" : ""
                                            }`}
                                    >
                                        <span className="flex-grow">{palette.name}</span>
                                        <div className="flex space-x-1">
                                            {palette.colors.map((color, idx) => (
                                                <div
                                                    key={idx}
                                                    className="w-4 h-8 rounded"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                    {selectedNode && (
                        <Input type="text" value={selectedNode.name} readOnly className="ml-2 w-40" placeholder="Selected Node" />
                    )}
                </div>


                <div className="flex items-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="icon" className="text-white bg-red-600 hover:bg-red-400 hover:text-white">
                                <TrashIcon className="h-4 w-4" />
                                <span className="sr-only">Delete Graph</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Delete Graph
                        </TooltipContent>
                    </Tooltip>

                </div>
            </TooltipProvider >
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Graph</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <p className="text-md text-black">
                            Are you sure you want to delete this graph? This action can&apos;t be undone.
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