"use client";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import { UIGraphNode, UIGraph, UIGraphLink } from "@/app/lib/types";

// Node tooltip/hover card component
export const NodeTooltip = ({ node, graphData }: { node: UIGraphNode; graphData: UIGraph; }) => {

    // Get all of the relations for this node
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
            // If the source is a node and not a string, get the name directly from the object
            if (typeof link.source === "object" && link.source) {
                sourceName = link.source.name;
            // Otherwise, look up string id in graphData
            } else {
                const found = graphData.nodes.find(n => n.id === link.source);
                sourceName = found ? found.name : String(link.source);
            }
            
            let targetName: string;
            // If the target is a node and not a string, get the name directly from the object
            if (typeof link.target === "object" && link.target) {
                targetName = link.target.name;
            // Otherwise, look up string id in graphData
            } else {
                const found = graphData.nodes.find(n => n.id === link.target);
                targetName = found ? found.name : String(link.target);
            }

            // Get relationship label
            const label = link.label;

            // Attach the precomputed names to the link object
            return { label, sourceName, targetName };
        });

    // Determine whether to show relationships on this card based on graph settings
    const showRelationshipsForNode = graphData.settings.showNodeRelationships[node.id];

    return (
        <div
            className="bg-white p-4 max-h-[75%] rounded-lg shadow-lg absolute bottom-4 left-1/2 transform -translate-x-1/2 overflow-y-auto"
            style={{ zIndex: 10 }}
        >   
            {/* Node name */}
            <h3 className="text-lg font-semibold mb-2">{node.name}</h3>

            {/* Render node info */}
            <div className="hover-card prose space-y-2">
                <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkBreaks]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                >
                    {node.info}
                </ReactMarkdown>
            </div>

            {/* If show relationships is enabled, show the computed relations on the card */}
            {showRelationshipsForNode && relatedLinks.length > 0 ? (
                <div className="mt-2">
                    <h4 className="text-md font-semibold">Relationships:</h4>
                    <ul className="list-disc list-outside pl-5 space-y-1">
                        {/* For each relationship, display source + label + target */}
                        {relatedLinks.map((rel, index) => (
                            <li key={index} className="text-gray-700">
                                <ReactMarkdown className="prose prose-sm inline">
                                    {`**${rel.sourceName}** ${rel.label} **${rel.targetName}**`}
                                </ReactMarkdown>
                            </li>
                        ))}
                    </ul>
                </div>
            // If show relationships is on but there are no relations, display placeholder text
            ) : showRelationshipsForNode ? (
                <p className="text-gray-500">No relationships found.</p>
            ) : null}
        </div>
    );
};
