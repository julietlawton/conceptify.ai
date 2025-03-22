import { ArrowRightEndOnRectangleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { Message } from "ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from "rehype-highlight";
import { CognitionIcon } from "../ui/icons";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState } from "react";
import { mdxComponents } from "../lib/mdxComponents";

export function ChatBubble({
    index,
    msg,
    onAddToGraph,
    streamingMessageId,
    addingToGraphMessageId,
}: {
    index: number;
    msg: Message;
    onAddToGraph: () => Promise<void>;
    streamingMessageId: string | null;
    addingToGraphMessageId: string | null;
}) {

    const isButtonDisabled = streamingMessageId !== null || addingToGraphMessageId != null;
    const [copiedMessageId, setCopiedMessageId] = useState("");

    return (
        <div
            key={index}
            className={`p-3 rounded-lg ${msg.role === "user"
                ? "max-w-xs md:max-w-md bg-gray-200 text-black self-end rounded-xl"
                : "text-gray-900"
                }`}
        >
            <div className="flex items-start gap-4">
                {msg.role === "assistant" && (
                    <div className="size-8 p-1 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0">
                        <CognitionIcon />
                    </div>
                )}

                <div className="space-y-4">
                    {msg.role === "user" ? (
                        <span>{msg.content}</span>
                    ) : (
                        msg.content.trim() === '' ? (
                            <div className="animate-pulse text-gray-500">Generating...</div>
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                className="prose prose-sm space-y-4"
                                components={mdxComponents}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        )
                    )}

                    {msg.role === "assistant" && streamingMessageId !== msg.id && msg.content.length > 30 && (
                        <div className="flex space-x-2 mt-2">
                            <button
                                className={`flex items-center gap-1 px-2 py-1 text-black text-sm bg-white rounded-md
                ${isButtonDisabled ? "cursor-not-allowed opacity-50" : "border hover:bg-gray-100"}`}
                                onClick={onAddToGraph}
                                disabled={isButtonDisabled}
                            >
                                {addingToGraphMessageId === msg.id ? (  // Show spinner only on clicked button
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
                                        <span>Add to Concept Map</span>
                                    </>
                                )}
                            </button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            className={`flex items-center gap-1 px-2 py-1 text-black text-sm bg-white rounded-md border hover:bg-gray-100`}
                                            onClick={() => {
                                                navigator.clipboard.writeText(msg.content);
                                                setCopiedMessageId(msg.id);
                                                setTimeout(() => setCopiedMessageId(""), 2000);
                                            }}
                                        >
                                            {copiedMessageId === msg.id ? (
                                                <>
                                                    <CheckIcon className="w-4 h-4" />
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardDocumentIcon className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Copy</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}