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

interface GraphToolbarProps {
    onAddNode: () => void
    onEditNode: () => void
    onDeleteNode: () => void
    onResetView: () => void
    onToggleFullScreen: () => void
    selectedNode: any | null
    isFullScreen: boolean
    onDeleteGraph: () => void
}

export function GraphToolbar({
    onAddNode,
    onEditNode,
    onDeleteNode,
    onResetView,
    onToggleFullScreen,
    selectedNode,
    isFullScreen,
    onDeleteGraph
}: GraphToolbarProps) {
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

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={onResetView} variant="outline" size="icon">
                                <MagnifyingGlassIcon className="h-4 w-4" />
                                <span className="sr-only">Search Nodes</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Search Nodes
                        </TooltipContent>
                    </Tooltip>
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
    // return (
    //     <div className="flex items-center justify-between p-2 bg-gray-100">
    //         <div className="flex overflow-x-auto whitespace-nowrap items-center space-x-2">
    //             {/* Left side buttons */}
    //             <TooltipProvider>
    //                 <Tooltip>
    //                     <TooltipTrigger asChild>
    //                         <Button onClick={onAddNode} variant="outline" size="icon" className="text-gray-600">
    //                             <PlusIcon className="h-4 w-4" />
    //                             <span className="sr-only">Add Node</span>
    //                         </Button>
    //                     </TooltipTrigger>
    //                     <TooltipContent>
    //                         Add Node
    //                     </TooltipContent>
    //                 </Tooltip>
    //             </TooltipProvider>
    //         </div>
    //         <div className="flex items-center">
    //             <button
    //                 className="flex items-center gap-1 px-2 py-1 text-white text-sm bg-red-600 rounded-md border hover:bg-red-400"
    //                 onClick={onDeleteGraph}
    //             >
    //                 <span>Delete graph</span>
    //             </button>
    //             {selectedNode && (
    //                 <Input type="text" value={selectedNode.name} readOnly className="ml-2 w-40" placeholder="Selected Node" />
    //             )}
    //         </div>
    //     </div>
    // )
}