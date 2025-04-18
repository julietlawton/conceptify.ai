"use client"
import { useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from "rehype-highlight";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { mdxComponents } from "@/app/lib/mdxComponents";

// Graph summary card component 
export default function SummaryCard({
    isSummaryLoading,
    setIsSummaryCardVisible,
    summaryTitle,
    summaryContent
}: {
    isSummaryLoading: boolean,
    setIsSummaryCardVisible: (open: boolean) => void;
    summaryTitle: string;
    summaryContent: string[];
}) {

    // Define react to print function and content ref for exporting summary card as a PDF
    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({
        contentRef,
        documentTitle: "conversation_summary"
    });

    // Download function for exporting summary card content as a text file
    const downloadAsText = (summary: string, title: string) => {
        const trimmedTitle = title.trim();
        const fileSafeTitle = trimmedTitle.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
        const summaryWithTitle = `### ${trimmedTitle}\n\n${summary}`;

        const blob = new Blob([summaryWithTitle], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileSafeTitle}_summary.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <Card className="relative w-full max-w-3xl max-h-[80vh] flex flex-col">
                {/* Display summary title */}
                <CardHeader>
                    <div className="w-full flex justify-center">
                        <CardTitle className="text-2xl text-center">
                            {summaryTitle}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSummaryCardVisible(false)}
                            className="absolute top-5 right-4 z-10"
                        >
                            <XMarkIcon className="w-5 h-5 text-gray-500" />
                        </Button>
                    </div>
                </CardHeader>

                {/* Summary content */}
                <div className="relative flex-1 overflow-hidden">
                    <CardContent className="overflow-y-auto px-6 space-y-4 h-full pr-2 mr-2" style={{ maxHeight: "calc(80vh - 150px)" }}>
                        {/* Show loading spinner while content loads */}
                        {isSummaryLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
                            </div>
                        ) : (
                            // Add each node summary to the card content and render it
                            // Content is split into blocks to allow for page breaks between content when printing as a PDF
                            <div ref={contentRef} className="print px-4">
                                {summaryContent.map((block, index) => (
                                    <div key={index} className="summary-block">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                            className="prose prose-sm space-y-4"
                                            components={mdxComponents}
                                        >
                                            {block}
                                        </ReactMarkdown>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white to-transparent mr-5" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent mr-5" />
                </div>
                {/* Download buttons */}
                <CardFooter className="flex justify-center space-x-4 px-6 pb-4 pt-2">
                    <Button
                        onClick={() => downloadAsText(
                            summaryContent.join("\n\n"),
                            summaryTitle
                        )}
                    >
                        Download as .txt
                    </Button>

                    <Button onClick={() => reactToPrintFn()}>
                        Download as PDF
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}