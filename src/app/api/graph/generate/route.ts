import { APICallError, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { KnowledgeGraph } from '@/app/lib/types';
import { NextResponse } from 'next/server';

const GraphSchema = z.object({
    nodes: z.array(
        z.object({
            name: z.string().min(2).describe("The name of the concept (not an ID)."),
            info: z.string().describe("Markdown-formatted description of the concept."),
        })
    ),
    links: z.array(
        z.object({
            source: z.string().min(2).describe("The name of the target concept (not an ID)."),
            target: z.string().min(2).describe("The name of the target concept (not an ID)."),
            label: z.string().describe("How source is related to target."),
        })
    ),
});

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { assistantMessage, existingGraph, selectedProvider, selectedGraphModel, isDemoActive, apiKey }:
            { assistantMessage: string; existingGraph?: KnowledgeGraph; selectedProvider: string; selectedGraphModel: string; isDemoActive: boolean; apiKey: string | null }
            = await req.json();

        let modelFunction;
        if (isDemoActive) {
            modelFunction = openai("gpt-4o");
        }
        else {
            if (!apiKey) {
                return new NextResponse(JSON.stringify({ error: "API key is missing." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
            if (selectedProvider === "openai") {
                process.env.OPENAI_API_KEY = apiKey;
                modelFunction = openai(selectedGraphModel);
            }
            else if (selectedProvider === "anthropic") {
                process.env.ANTHROPIC_API_KEY = apiKey;
                modelFunction = anthropic(selectedGraphModel);
            }
            else {
                return new NextResponse(JSON.stringify({ error: "Invalid provider." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        const graph_prompt = (existingGraph && existingGraph.nodes.length > 0)
            ? `You are updating an existing knowledge graph based on the latest message in a conversation between a user and an assistant..
The graph consists of an array of **nodes (concepts)** and an array of **edges (relationships between concepts)**. Your goal is to create a living history of the conversation by 
summarizing key information and concepts and the relationships between them.

**Your task**:
1. Update the existing graph with new concepts and relationships derived from the latest message.
2. For each new node, provide a detailed description in Markdown (using multiple paragraphs followed by newlines for clarity, if needed) that captures the unique, relevant information from the message.
    - **Avoid generic or obvious information that would not be helpful to the user. For example, if the user asks for a visualization using matplotlib, it is not helpful to create a node that defines what matplotlib is.**
    - For every example provided in the message (such as a code snippet or math problem) that you reference, include the exact text for that example in your node description. Do not generate or modify examples that are not explicitly given in the message.
    - If the concept involves mathematical notation or formulas, YOU MUST include them using LaTeX (wrap inline math with $...$ and block math with $$...$$).
    - If a programming example is relevant, YOU MUST include it in a fenced code block.
3. Define relationships between concepts using "source" and "target" fields (using the concept names).
4. **Do not generate numerical IDs or use numbers as references.**
5. If a concept already exists, do not duplicate it.
6. **Limit each node to a maximum of 5 edges/relationships.** If further clarity is needed, create additional nodes.
7. **Ensure every node is connected to the graph by an edge.**
8. Format your response strictly as JSON with exactly two keys: "nodes" and "links".

**Existing Graph:**
\`\`\`json
${JSON.stringify(existingGraph, null, 2)}
\`\`\`

**New message to analyze:**
"${assistantMessage}"

**Return updated graph JSON ONLY—NO explanation.**`
            : `You are building a structured knowledge graph based on the latest message in a conversation between a user and an assistant.
Your goal is to create a living history of the conversation by summarizing key information and concepts **nodes** and the relationships between them **edges**.

**Your task**:
1. Identify the most important information from the message and generate as many nodes as needed.
2. For each new node, provide a detailed description in Markdown (using multiple paragraphs followed by newlines for clarity, if needed) that captures the unique, relevant information from the message.
    - **Avoid generic or obvious information that would not be helpful to the user. For example, if the user asks for a visualization using matplotlib, it is not helpful to create a node that defines what matplotlib is.**
    - For every example provided in the message (such as a code snippet or math problem) that you reference, include the exact text for that example in your node description. Do not generate or modify examples that are not explicitly given in the message.
    - If the concept involves mathematical notation or formulas, YOU MUST include them using LaTeX (wrap inline math with $...$ and block math with $$...$$).
    - If a programming example is relevant, YOU MUST include it in a fenced code block.
3. Define relationships between concepts using "source" and "target" fields (using the concept names).
4. **Do not generate numerical IDs or use numbers as references.**
5. **Ensure every node is connected to the graph by an edge.**
6. **Limit each node to a maximum of 5 edges/relationships.** (If necessary for clarity, create additional nodes.)
7. Format your response strictly as JSON with exactly two keys: "nodes" and "links".


**Message:**
"${assistantMessage}"

**Example Response Format:**
\`\`\`json
{
"nodes": [
  { "name": "Concept A", "info": "A detailed summary focusing on the specific aspects mentioned in the message." },
  { "name": "Concept B", "info": "Another context-specific summary with relevant code or formulas if needed." }
],
"links": [
  { "source": "Concept A", "target": "Concept B", "label": "relates to" }
]
}
\`\`\`

**Return JSON ONLY—NO explanation.**`;

        const result = await generateObject({
            model: modelFunction,
            prompt: graph_prompt,
            schema: GraphSchema
        });

        return result.toJsonResponse();
    } catch (error) {
        console.error("API Error caught in route.ts:", error);

        if (APICallError.isInstance(error)) {
            const status = error.statusCode;

            let message = "An error occurred.";
            if (status === 401) message = "Invalid API key.";
            else if (status === 403) message = "Permission denied.";
            else if (status === 429) message = "Rate limit exceeded.";
            else if (status === 400) message = "Bad request.";
            else if (status && status >= 500) message = "Server error.";

            return new NextResponse(message, { status });
        }

        return new NextResponse("Unexpected error occurred.", { status: 500 });
    }
}