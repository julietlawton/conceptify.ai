"use client"

import { useState, useEffect, useCallback } from "react"
import Chat from "./components/chat"
import SideNav from "@/app/components/side-nav";
import NetworkGraph from "./components/network-graph"
import { Button } from "@/components/ui/button"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Bars3Icon } from "@heroicons/react/24/solid";
import { useChat } from "./context/ChatContext";
import { GraphIcon } from "./ui/icons";

export default function Home() {
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(true)
  const [isSideNavOpen, setIsSideNavOpen] = useState(true)
  const [isGraphFullScreen, setIsGraphFullScreen] = useState(false)
  const { currentConversationId, conversations, coldStartGraph } = useChat();

  const graphData = currentConversationId ? conversations[currentConversationId]?.graphData || null : null;
  const [graphVisible, setGraphVisible] = useState(true);

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
    setGraphVisible(false);
    setIsGraphFullScreen(prev => !prev);
    // setTimeout(handleResize, 310);
  };


  return (
    <main className="flex h-screen overflow-hidden">
      {!isGraphFullScreen && isSideNavOpen && <SideNav />}

      <div className={`flex-grow transition-all duration-300 ease-in-out ${isVisualizerOpen && !isGraphFullScreen ? "w-1/2" : "w-full"}`} onTransitionEnd={() => setGraphVisible(true)}>
        <div className="relative h-full">
          <Chat />

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
                    <GraphIcon/>
                    <span className="sr-only">Toggle Visualizer</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">Toggle Graph</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden border 
          ${isGraphFullScreen ? "fixed inset-0 bg-white z-50" : isVisualizerOpen ? "w-1/2 opacity-100" : "w-0 opacity-0"}`}
      >
        {isVisualizerOpen && graphData ? (
            <NetworkGraph
              isFullScreen={isGraphFullScreen}
              isGraphVisible={graphVisible}
              onToggleFullScreen={toggleFullScreen}
            />
        ) : (
          isVisualizerOpen && (
            <div
              className="flex items-center justify-center h-full w-full bg-gray-100 bg-center bg-no-repeat bg-contain"
              style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url('/graph-placeholder.svg')`,
              }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <p className="text-black text-lg">
                  Nothing here yet. Add a message to get started
                </p>
                <p className="text-black text-lg">or</p>
                <button
                  className="px-4 py-2 text-sm text-white bg-black rounded-md hover:bg-gray-500"
                  onClick={() => {
                    if (currentConversationId) {
                      coldStartGraph(currentConversationId);
                    } else {
                      console.warn("No active conversation yet");
                    }
                  }
                  }
                >
                  Create Empty Graph
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </main>
  );
}