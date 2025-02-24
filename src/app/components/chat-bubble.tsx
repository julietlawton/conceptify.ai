import { SparklesIcon, ArrowRightEndOnRectangleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { Message } from "ai";
import ReactMarkdown, { type Components } from 'react-markdown';
import Link from 'next/link';
import remarkGfm from "remark-gfm";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from "rehype-highlight";

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
                {/* Assistant Icon */}
                {msg.role === "assistant" && (
                    //<SparklesIcon className="size-8 p-2 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0" />
                    // <div>
                    // <img 
                    //     src="/cognition.svg" 
                    //     alt="Cognition Icon"
                    //     width='24'
                    //     height="24"
                    //     className="p-1 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0" 
                    // />
                    // </div>
                    <div className="size-8 p-1 ring-gray-300 flex items-center justify-center rounded-full ring-1 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" 
                            height="24px" 
                            viewBox="0 -960 960 960" 
                            width="24px"
                            fill="#000000">
                            <path d="M491-339q70 0 119-45t49-109q0-57-36.5-96.5T534-629q-47 0-79.5 30T422-525q0 19 6.5 37.5T451-455q16 14 32 11.5t26-13.5q10-11 11.5-26.5T508-512q-2-2-4-5t-2-7q0-11 9-17.5t23-6.5q20 0 33 16.5t13 39.5q0 31-25.5 52.5T492-418q-47 0-79.5-38T380-549q0-19 4.5-37t13.5-34q8-15 8-31.5T394-680q-12-12-29-11.5T339-677q-20 28-30 60t-10 67q0 88 56 149.5T491-339Zm-251 87q-57-52-88.5-121.5T120-520q0-150 105-255t255-105q125 0 221.5 73.5T827-615l52 205q5 19-7 34.5T840-360h-80v120q0 33-23.5 56.5T680-160h-80v40q0 17-11.5 28.5T560-80q-17 0-28.5-11.5T520-120v-80q0-17 11.5-28.5T560-240h120v-160q0-17 11.5-28.5T720-440h68l-38-155q-23-91-98-148t-172-57q-116 0-198 81t-82 197q0 60 24.5 114t69.5 96l26 24v168q0 17-11.5 28.5T280-80q-17 0-28.5-11.5T240-120v-132Zm254-188Z"/>
                        </svg>
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