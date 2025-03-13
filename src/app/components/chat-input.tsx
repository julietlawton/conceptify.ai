import React, { useRef, useState } from "react";
import { ArrowUpIcon, StopIcon } from "@heroicons/react/24/solid";

interface ChatInputProps {
    sendMessage: (text: string) => void;
    isLoading: boolean;
    handleStopGeneration: () => void;
}

function ChatInput({ sendMessage, isLoading, handleStopGeneration }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState("");

    // Adjust the textarea height to match its content
    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "40px"; // reset to min height
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    // Use onInput so that the height adjusts as the user types
    const handleInput = () => {
        if (textareaRef.current) {
            setInputValue(textareaRef.current.value);
            adjustHeight();
        }
    };

    // Handle Enter key submission
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !isLoading) {
            e.preventDefault();
            if (inputValue.trim()) {
                sendMessage(inputValue.trim());
                setInputValue(""); // Clear state
                if (textareaRef.current) {
                    textareaRef.current.value = "";
                    adjustHeight();
                }
            }
        }
    };

    // Handle button click
    const handleClick = () => {
        if (inputValue.trim() && !isLoading) {
            sendMessage(inputValue.trim());
            setInputValue(""); // Clear state
            if (textareaRef.current) {
                textareaRef.current.value = "";
                adjustHeight();
            }
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex items-center p-3 bg-gray-100 border-gray-300 rounded-xl shadow-md sticky bottom-0">
            <textarea
                ref={textareaRef}
                id="chatInput"
                defaultValue=""
                className="flex-grow py-3 px-3 bg-gray-100 rounded-xl resize-none overflow-hidden overflow-y-auto outline-none"
                placeholder="Send a message..."
                rows={1}
                style={{ minHeight: "40px", maxHeight: "150px" }}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
            />
            <div className="px-2">
                {isLoading ? (
                    <button
                        className="rounded-full p-1.5 h-fit transition bg-black text-white hover:bg-gray-600"
                        onClick={handleStopGeneration}
                    >
                        <StopIcon className="w-6 h-6" />
                    </button>
                ) : (
                    <button
                        className={`rounded-full p-1.5 h-fit transition 
            ${inputValue.trim() ? "bg-black text-white hover:bg-gray-600" : "bg-gray-300 text-gray-400"}`}
                        disabled={!inputValue.trim()}
                        onClick={handleClick}
                    >
                        <ArrowUpIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default React.memo(ChatInput);