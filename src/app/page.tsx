"use client"

import { useState, useEffect, useCallback } from "react"
import Chat from "./components/chat"
import SideNav from "@/app/components/side-nav";
import NetworkGraph from "./components/network-graph"
import { Button } from "@/components/ui/button"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ViewColumnsIcon, Bars3Icon, Squares2X2Icon } from "@heroicons/react/24/solid";
import { useChat } from "./context/ChatContext";

export default function Home() {
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false)
  const [isSideNavOpen, setIsSideNavOpen] = useState(true)
  const [isGraphFullScreen, setIsGraphFullScreen] = useState(false)
  const { currentConversationId, conversations } = useChat();

  const currentConversation = currentConversationId ? conversations[currentConversationId] : null;
  const graphData = currentConversationId ? conversations[currentConversationId]?.graphData || null : null;
  const [graphKey, setGraphKey] = useState(0);

  const handleResize = useCallback(() => {
    window.dispatchEvent(new Event("resize"))
  }, [])

  useEffect(() => {
    if (isVisualizerOpen || isGraphFullScreen) {
      const timer = setTimeout(handleResize, 310);
      return () => clearTimeout(timer);
    }
  }, [isVisualizerOpen, isGraphFullScreen, handleResize]);

  const toggleFullScreen = () => {
    setIsGraphFullScreen(prev => !prev);
    setTimeout(handleResize, 310);
  };

  useEffect(() => {
    if (isVisualizerOpen) {
      setGraphKey((old) => old + 1);
      console.log("graphkey", graphKey);
    }
  }, [isVisualizerOpen]);


  return (
    <main className="flex h-screen overflow-hidden">
      {/* Sidebar (Hidden in Fullscreen Mode) */}
      {!isGraphFullScreen && isSideNavOpen && <SideNav />}

      {/* Chat Section */}
      <div className={`flex-grow transition-all duration-300 ease-in-out ${isVisualizerOpen && !isGraphFullScreen ? "w-1/2" : "w-full"}`}>
        <div className="relative h-full">
          <Chat />

          {/* UI Controls */}
          {!isGraphFullScreen && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 left-2 z-10 text-gray-600"
                    onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                  >
                    <Bars3Icon className="h-4 w-4" />
                    <span className="sr-only">Toggle Sidebar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Sidebar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-12 left-2 z-10 text-gray-600"
                    onClick={() => setIsVisualizerOpen(!isVisualizerOpen)}
                  >
                    <ViewColumnsIcon className="h-4 w-4" />
                    <span className="sr-only">Toggle Visualizer</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">Toggle Graph</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Graph Section (Fullscreen Applies Here) */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden border 
          ${isGraphFullScreen ? "fixed inset-0 bg-white z-50" : isVisualizerOpen ? "w-1/2 opacity-100" : "w-0 opacity-0"}`}
      >
        {isVisualizerOpen && graphData ? (
          <NetworkGraph isFullScreen={isGraphFullScreen} onToggleFullScreen={toggleFullScreen} key={graphKey} />
        ) : (
          isVisualizerOpen && (
            <div
              className="flex items-center justify-center h-full w-full bg-gray-100 bg-center bg-no-repeat bg-contain"
              style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url('/graph-placeholder.svg')`,
              }}
            >
              <p className="text-gray-500 text-lg bg-opacity-70 p-4 rounded-lg">
                Nothing here yet. Add a message to get started.
              </p>
            </div>
          )
        )}
      </div>
    </main>
  );
}