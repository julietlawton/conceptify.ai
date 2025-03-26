"use client"
import { useState, useEffect, useCallback } from "react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraphIcon } from "@/app/ui/icons";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { Bars3Icon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import Chat from "@/app/components/chat";
import SideNav from "@/app/components/side-nav";
import NetworkGraph from "@/app/components/network-graph";
import FeedbackDialog from "@/app/components/feedback-dialog";
import TutorialSplash from "@/app/components/tutorial-splash";
import { useChat } from "@/app/context/ChatContext";
import { useApiKey } from "@/app/context/APIContext";

export default function Home() {
  // Screen size state for determining if user is on mobile
  const [isMobile, setIsMobile] = useState(false);

  // UI state for layout/navigation
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(true);
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [graphVisible, setGraphVisible] = useState(true);
  const [isGraphFullScreen, setIsGraphFullScreen] = useState(false);
  const [isSendFeedbackOpen, setIsSendFeedbackOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // API key state
  const { passphrase, setPassphrase, decryptApiKey } = useApiKey();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Graph/conversation state
  const { currentConversationId, conversations, coldStartGraph } = useChat();
  const graphData = currentConversationId ? conversations[currentConversationId]?.graphData || null : null;

  // Force a resize event to trigger graph layout recalculations
  const handleResize = useCallback(() => {
    window.dispatchEvent(new Event("resize"));
  }, []);

  // Debounce resize trigger when visualizer or fullscreen state changes
  useEffect(() => {
    if (isVisualizerOpen || isGraphFullScreen) {
      const timer = setTimeout(handleResize, 310);
      return () => clearTimeout(timer);
    }
  }, [isVisualizerOpen, isGraphFullScreen, handleResize]);

  // Check the type of device the user is accessing the page with
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

  // Check whether to show the tutorial on page load
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial")
    if (!hasSeenTutorial || hasSeenTutorial === "false") {
      setShowTutorial(true);
    }
  }, []);

  // Toggle full screen view for graph visualizer
  const toggleFullScreen = () => {
    setGraphVisible(false);
    setIsGraphFullScreen(prev => !prev);
  };

  // Close tutorial and mark it as seen
  const handleCloseTutorial = () => {
    setShowTutorial(false)
    localStorage.setItem("hasSeenTutorial", "true")
  };

  // Check if the user has provided an api key already and whether or not it is encrypted (triggers password dialog)
  useEffect(() => {
    const storedKey = localStorage.getItem("apiKey");
    const encrypted = localStorage.getItem("isApiKeyEncrypted") === "true";

    if (storedKey && encrypted && !passphrase) {
      setShowPasswordDialog(true);
    }
  }, [passphrase]);

  // Add a small delay to validate password and handle success/failure in the password dialog
  const handleUnlock = () => {
    setIsUnlocking(true);
    setPassphrase(passwordInput);
    const success = decryptApiKey(passwordInput.trim());

    setTimeout(() => {
      if (!success) {
        setInvalidPassword(true);
        setPassphrase(null);
      }
      setIsUnlocking(false);
      setShowPasswordDialog(false);
    }, 150);
  };

  // If the user forgot their password, clear their key and redirect them to the settings menu
  const handleForgotPassword = () => {
    localStorage.removeItem("apiKey");
    localStorage.setItem("isApiKeyEncrypted", "false");
    localStorage.setItem("openSettingsOnLoad", "true");
    window.location.reload();
  };

  // If the user is on a mobile device, restrict access to the page
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen text-center bg-gray-500 text-white font-bold mt-[-50px]">
        <ExclamationCircleIcon className="w-14 h-14 text-white mb-4" />
        <p className="text-xl">Hey there! This app was designed for bigger screens - come back on a desktop or tablet.</p>
      </div>
    );
  }

  return (
    // Main page content
    <main className="flex h-screen overflow-hidden">

      {/* Set side navigation bar visibility - hide when graph is full screen  */}
      {!isGraphFullScreen && isSideNavOpen && <SideNav />}

      {/* Dynamically set the width of the chat and graph containers. Chat takes up full width (minus side nav) when graph is not open */}
      {/* Use short ease-in-out transition to make the resize smoother */}
      <div className={`flex-grow transition-all duration-300 ease-in-out ${isVisualizerOpen && !isGraphFullScreen ? "w-1/2" : "w-full"}`} onTransitionEnd={() => setGraphVisible(true)}>
        <div className="relative h-full">
          
          {/* Chat component. Contains chat bubble and chat input components*/}
          <Chat />

          {/* Show tutorial splash screen */}
          {showTutorial && <TutorialSplash onClose={handleCloseTutorial} />}

          {/* Password dialog for users who have turned on encryption */}
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

              {/* Forgot password and submit buttons */}
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
              {/* Side navigation bar toggle button */}
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
              
              {/* Graph visualizer toggle button */}
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
                <TooltipContent side="bottom" align="center">Toggle Concept Map</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Handle smooth transition between fullscreen graph and split screen graph */}
      <div
        className={`transition-all duration-600 ease-in-out overflow-hidden border 
          ${isGraphFullScreen ? "fixed inset-0 bg-white z-50" : isVisualizerOpen ? "w-1/2 opacity-100" : "w-0 opacity-0"}`}
      >
        {/* If the visualizer is open and there is a graph for this conversation, load it */}
        {isVisualizerOpen && graphData ? (
          <NetworkGraph
            isFullScreen={isGraphFullScreen}
            isGraphVisible={graphVisible}
            onToggleFullScreen={toggleFullScreen}
          />
        ) : (
          // If the visualizer is open and there's no graph, show the placeholder
          isVisualizerOpen && (
            <div
              className="flex items-center justify-center h-full w-full bg-gray-100 bg-center bg-no-repeat bg-contain"
            >
              <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
                <div className="absolute top-[32%] left-1/2 transform -translate-x-1/2 p-10 border border-gray-200 rounded-xl shadow-sm bg-white text-gray-500 text-lg space-y-3 text-center">
                  <GraphIcon className="w-12 h-12 text-gray-500 mx-auto" />
                  <p className="font-medium">Nothing here yet</p>
                  <p className="text-sm text-gray-400 pb-1">Start chatting to get started, or create an empty concept map.</p>
                  {/* Button for cold starting the graph (creates an empty graph) */}
                  <button
                    className="px-4 py-2 text-sm text-white rounded-md bg-gray-500 hover:bg-black"
                    onClick={() => {
                      if (currentConversationId) {
                        coldStartGraph(currentConversationId);
                      } else {
                        console.warn("No active conversation yet");
                      }
                    }}
                  >
                    Create Empty Concept Map
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
      {/* Feedback button, always fixed in the bottom right corner */}
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
      {/* Open feedback dialog */}
      <FeedbackDialog isSendFeedbackOpen={isSendFeedbackOpen} setIsSendFeedbackOpen={setIsSendFeedbackOpen} />
    </main>
  );
}