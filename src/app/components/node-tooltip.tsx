"use client";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import { UIGraphNode, UIGraph, UIGraphLink } from "../lib/types";

export const NodeTooltip = ({ node, graphData }: { node: UIGraphNode; graphData: UIGraph; }) => {

    const relatedLinks = graphData.links.filter((link: UIGraphLink) => {
        const sourceId = typeof link.source === "object" && link.source
            ? link.source.id
            : link.source;
        const targetId = typeof link.target === "object" && link.target
            ? link.target.id
            : link.target;
        return sourceId === node.id || targetId === node.id;
    })
        .map((link: UIGraphLink) => {
            let sourceName: string;
            if (typeof link.source === "object" && link.source) {
                sourceName = link.source.name;
            } else {
                // Lookup in graphData.nodes if link.source is a string
                const found = graphData.nodes.find(n => n.id === link.source);
                sourceName = found ? found.name : String(link.source);
            }

            let targetName: string;
            if (typeof link.target === "object" && link.target) {
                targetName = link.target.name;
            } else {
                const found = graphData.nodes.find(n => n.id === link.target);
                targetName = found ? found.name : String(link.target);
            }

            const label = link.label;

            // Attach the precomputed names to the link object
            return { label, sourceName, targetName };
        });

    const showRelationshipsForNode = graphData.settings.showNodeRelationships[node.id];

    return (
        <div
            className="bg-white p-4 max-h-[75%] rounded-lg shadow-lg absolute bottom-4 left-1/2 transform -translate-x-1/2 overflow-y-auto"
            style={{ zIndex: 10 }}
        >
            <h3 className="text-lg font-semibold mb-2">{node.name}</h3>
            <div className="hover-card prose space-y-2">
                <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkBreaks]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                >
                    {node.info}
                </ReactMarkdown>
            </div>

            {showRelationshipsForNode && relatedLinks.length > 0 ? (
                <div className="mt-2">
                    <h4 className="text-md font-semibold">Relationships:</h4>
                    <ul className="list-disc list-outside pl-5 space-y-1">
                        {relatedLinks.map((rel, index) => (
                            <li key={index} className="text-gray-700">
                                <ReactMarkdown className="prose prose-sm inline">
                                    {`**${rel.sourceName}** ${rel.label} **${rel.targetName}**`}
                                </ReactMarkdown>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : showRelationshipsForNode ? (
                <p className="text-gray-500">No relationships found.</p>
            ) : null}
        </div>
    );
};
