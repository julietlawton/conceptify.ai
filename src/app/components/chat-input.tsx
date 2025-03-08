import React, { useEffect, useRef } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/solid";

interface ChatInputProps {
  sendMessage: (text: string) => void;
  isLoading: boolean;
}

function ChatInput({ sendMessage, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust the textarea height to match its content
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px"; // reset to min height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Use onInput so that the height adjusts as the user types
  const handleInput = () => {
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      if (textareaRef.current) {
        const text = textareaRef.current.value;
        if (text.trim()) {
          sendMessage(text);
          textareaRef.current.value = "";
          adjustHeight();
        }
      }
    }
  };

  const handleClick = () => {
    if (textareaRef.current) {
      const text = textareaRef.current.value;
      if (text.trim() && !isLoading) {
        sendMessage(text);
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
        <button
          className={`rounded-full p-1.5 h-fit transition 
            ${!isLoading ? "bg-black text-white hover:bg-gray-600" : "bg-gray-300 text-gray-400"}`}
          disabled={isLoading}
          onClick={handleClick}
        >
          <ArrowUpIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(ChatInput);