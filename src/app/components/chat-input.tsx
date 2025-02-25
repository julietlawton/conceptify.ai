import { useEffect, useRef } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/solid";

export default function ChatInput({ sendMessage, input, setInput, isLoading }:{
    sendMessage: () => void,
    input: string,
    setInput: (input: string) => void,
    isLoading: boolean,
}) {
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "40px"; // Reset height
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Adjust to content
        }
    }, [input]);

    return (
        <div className="w-full max-w-5xl mx-auto flex items-center p-3 bg-gray-100 border-gray-300 rounded-xl shadow-md sticky bottom-0">
            {/* <div className="flex items-center p-3 bg-gray-100 border-gray-300 rounded-xl shadow-md"> */}
            <textarea
                ref={textareaRef}
                id="chatInput"
                className="flex-grow py-3 px-3 bg-gray-100 rounded-xl resize-none overflow-hidden overflow-y-auto outline-none"
                placeholder="Send a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                style={{ minHeight: "40px", maxHeight: "150px" }}
                onKeyDown={async (e) => {
                    if (e.key === "Enter" && !e.shiftKey && input.trim() && !isLoading) {
                        e.preventDefault();
                        sendMessage();
                    }
                }}
            />
            <div className="px-2">
                <button
                    className={`rounded-full p-1.5 h-fit transition 
       ${(input.trim() && !isLoading) ? "bg-black text-white hover:bg-gray-600" : "bg-gray-300 text-gray-400"}`}
                    disabled={isLoading || !input.trim()} // Disable when input is empty
                    onClick={async () => {
                        if (input.trim() && !isLoading) sendMessage();
                    }}
                >
                    <ArrowUpIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}