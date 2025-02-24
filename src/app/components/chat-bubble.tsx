import { SparklesIcon, ArrowRightEndOnRectangleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { Message } from "ai";
import ReactMarkdown, { type Components } from 'react-markdown';
import Link from 'next/link';
import remarkGfm from "remark-gfm";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from "rehype-highlight";
import { CognitionIcon } from "../ui/icons";

const components: Partial<Components> = {
    ol: ({ node, children, ...props }) => {
        return (
            <ol className="list-decimal list-outside ml-4" {...props}>
                {children}
            </ol>
        );
    },
    li: ({ node, children, ...props }) => {
        return (
            <li className="py-1" {...props}>
                {children}
            </li>
        );
    },
    ul: ({ node, children, ...props }) => {
        return (
            <ul className="list-decimal list-outside ml-4" {...props}>
                {children}
            </ul>
        );
    },
    strong: ({ node, children, ...props }) => {
        return (
            <span className="font-semibold" {...props}>
                {children}
            </span>
        );
    },
    a: ({ node, children, ...props }) => {
        return (
            // @ts-expect-error
            <Link
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noreferrer"
                {...props}
            >
                {children}
            </Link>
        );
    },
    h1: ({ node, children, ...props }) => {
        return (
            <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h1>
        );
    },
    h2: ({ node, children, ...props }) => {
        return (
            <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h2>
        );
    },
    h3: ({ node, children, ...props }) => {
        return (
            <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h3>
        );
    },
    h4: ({ node, children, ...props }) => {
        return (
            <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
                {children}
            </h4>
        );
    },
    h5: ({ node, children, ...props }) => {
        return (
            <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
                {children}
            </h5>
        );
    },
    h6: ({ node, children, ...props }) => {
        return (
            <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
                {children}
            </h6>
        );
    },
};

export function ChatBubble({
    index,
    msg,
    isLoading,
    onAddToGraph,
    loadingMessageId
}: {
    index: number;
    msg: Message;
    isLoading: boolean;
    onAddToGraph: () => Promise<void>;
    loadingMessageId: string | null;
}) {

    const isButtonLoading = loadingMessageId === msg.id;
    const isButtonDisabled = loadingMessageId !== null;

    return (
        <div
            key={index}
            className={`p-3 rounded-lg ${msg.role === "user"
                ? "max-w-xs md:max-w-md bg-gray-200 text-black self-end"
                : "text-gray-900"
                }`}
        >
            <div className="flex items-start gap-4">
                {msg.role === "assistant" && (
                    <div className="size-8 p-1 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0">
                        <CognitionIcon />
                    </div>
                )}

                {/* Message Content */}
                <div className="space-y-4">
                    {msg.role === "user" ? (
                        <span>{msg.content}</span>
                    ) : (
                        // <Markdown>{msg.content}</Markdown>
                        <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            className="prose prose-sm space-y-4"
                            components={components}
                        >

                            {msg.content}
                        </ReactMarkdown>
                    )}

                    {/* Show button only when message has fully streamed (isLoading is false) */}
                    {msg.role === "assistant" && !isLoading && (
                        <button className={`mt-2 flex items-center gap-1 px-2 py-1 text-black text-sm bg-white rounded-md 
                            ${isButtonDisabled ? "cursor-not-allowed opacity-50" : "border hover:bg-gray-100"}`}
                            onClick={onAddToGraph}
                            disabled={isButtonDisabled}
                        >
                            {loadingMessageId === msg.id ? (  // Show spinner only on clicked button
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
                                    <span>Add to graph</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}