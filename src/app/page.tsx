"use client"
import { useState, useEffect, useCallback } from "react"
import Chat from "./components/chat"
import SideNav from "@/app/components/side-nav";
import NetworkGraph from "./components/network-graph"
import { Button } from "@/components/ui/button"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bars3Icon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { useChat } from "./context/ChatContext";
import { useApiKey } from "./context/APIContext";
import { GraphIcon } from "./ui/icons";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import FeedbackDialog from "./components/feedback-dialog";
import { Input } from "@/components/ui/input";
import { DialogDescription } from "@radix-ui/react-dialog";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(true)
  const [isSideNavOpen, setIsSideNavOpen] = useState(true)
  const [isGraphFullScreen, setIsGraphFullScreen] = useState(false)
  const [isSendFeedbackOpen, setIsSendFeedbackOpen] = useState(false)
  const { currentConversationId, conversations, coldStartGraph } = useChat();
  const { passphrase, setPassphrase, decryptApiKey } = useApiKey();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const [passwordInput, setPasswordInput] = useState("");
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const graphData = currentConversationId ? conversations[currentConversationId]?.graphData || null : null;
  const [graphVisible, setGraphVisible] = useState(true);

  const handleResize = useCallback(() => {
    window.dispatchEvent(new Event("resize"))
  }, [])

  useEffect(() => {
    const storedKey = localStorage.getItem("apiKey");
    const encrypted = localStorage.getItem("isApiKeyEncrypted") === "true";

    if (storedKey && encrypted && !passphrase) {
      setShowPasswordDialog(true);
    }
  }, [passphrase]);

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

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileDevices = ["android", "iphone"];
      setIsMobile(mobileDevices.some(device => userAgent.includes(device)));
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen text-center bg-gray-500 text-white font-bold mt-[-50px]">
        <ExclamationCircleIcon className="w-14 h-14 text-white mb-4" />
        <p className="text-xl">Hey there! This app was designed for bigger screens - come back on a desktop or tablet.</p>
      </div>
    );
  }

  const handleUnlock = () => {
    setIsUnlocking(true);
    setPassphrase(passwordInput);
    const success = decryptApiKey(passwordInput.trim());
    console.log(success)

    setTimeout(() => {
      if (!success) {
        setInvalidPassword(true);
        setPassphrase(null);
      }
      setIsUnlocking(false);
      setShowPasswordDialog(false);
    }, 150);
  };


  // Forgot password clears key
  const handleForgotPassword = () => {
    localStorage.removeItem("apiKey");
    localStorage.setItem("isApiKeyEncrypted", "false");
    window.location.reload();
  };


  return (
    <main className="flex h-screen overflow-hidden">
      {!isGraphFullScreen && isSideNavOpen && <SideNav />}

      <div className={`flex-grow transition-all duration-300 ease-in-out ${isVisualizerOpen && !isGraphFullScreen ? "w-1/2" : "w-full"}`} onTransitionEnd={() => setGraphVisible(true)}>
        <div className="relative h-full">
          <Chat />
          <Dialog open={showPasswordDialog}>
          <DialogContent className="[&>button]:hidden">
              <DialogHeader>
                <DialogTitle>Enter Password</DialogTitle>
                <DialogDescription>Enter your password to unlock your API key.</DialogDescription>
              </DialogHeader>
              <div className="p-4 space-y-2">
                <Input
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setInvalidPassword(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isUnlocking && passwordInput.trim() !== "") {
                      handleUnlock();
                    }
                  }}
                  placeholder="Password"
                  type="password"
                  disabled={isUnlocking}
                />
                {invalidPassword && (
                  <p className="text-sm text-red-500 pl-2">Incorrect password. Please try again.</p>
                )}
              </div>

              <DialogFooter className="flex justify-between items-center mt-2 gap-1">
                <button
                  className="text-sm text-gray-500 underline hover:text-black transition"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>

                <Button onClick={handleUnlock} disabled={isUnlocking || passwordInput.trim() === ""}>
                  {isUnlocking ? "Unlocking..." : "Unlock"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!isGraphFullScreen && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 left-2 z-10 text-gray-600"
                    onClick={() => {
                      setIsSideNavOpen(!isSideNavOpen);
                      setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
                    }}
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
                    className="absolute top-2 right-3 z-10 text-gray-600"
                    onClick={() => setIsVisualizerOpen(!isVisualizerOpen)}
                  >
                    <GraphIcon />
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
            >
              <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
                <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 p-10 border border-gray-200 rounded-xl shadow-sm bg-white text-gray-500 text-lg space-y-3 text-center">
                  <GraphIcon className="w-12 h-12 text-gray-500 mx-auto" />
                  <p className="font-medium">Nothing here yet</p>
                  <p className="text-sm text-gray-400 pb-1">Start chatting to get started, or create an empty graph.</p>
                  <button
                    className="px-4 py-2 text-sm text-white rounded-md 
                      bg-gradient-to-r from-gray-500 to-gray-500
                      hover:from-purple-500 hover:to-blue-500 transition"
                    onClick={() => {
                      if (currentConversationId) {
                        coldStartGraph(currentConversationId);
                      } else {
                        console.warn("No active conversation yet");
                      }
                    }}
                  >
                    Create Empty Graph
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsSendFeedbackOpen(true)}
              className="fixed bottom-6 right-6 bg-gray-500 text-white p-2 rounded-full shadow-lg hover:bg-black transition"
            >
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
              <span className="sr-only">Leave Feedback</span>
            </button>

          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" className="text-center">Leave <br /> Feedback</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <FeedbackDialog isSendFeedbackOpen={isSendFeedbackOpen} setIsSendFeedbackOpen={setIsSendFeedbackOpen} />
    </main>
  );
}