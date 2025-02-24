import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { KnowledgeGraph } from '@/app/lib/types';

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


export async function POST(req: Request) {
    const { assistantMessage, existingGraph }: { assistantMessage: string; existingGraph?: KnowledgeGraph } = await req.json();

    const graph_prompt = (existingGraph && existingGraph.nodes.length > 0)  ? 
        `You are updating an existing knowledge graph. 
        The graph consists of **nodes (concepts)** and **edges (relationships between concepts)**.
        
        **Your task**:
        - Update the existing graph with new concepts and relationships based on the latest message.
        - Define relationships between concepts (source -> target).
        - Provide a markdown-formatted high quality description for each node.
        - Code and LaTex formatting are supported.
        - **If a concept involves mathematical notation, use LaTeX for clarity. If a programming example would help explain it, include a concise code snippet.**
        - Ensure that all edges connect valid nodes.
        - If a concept already exists, do not duplicate it.
        - Format the response strictly as JSON with two keys: "nodes" and "links".
        - Do **not** generate numerical IDs or use numbers as references.
        - The "source" and "target" fields must always be node names (not numbers).

        **Existing Graph:**  
        \`\`\`json
        ${JSON.stringify(existingGraph, null, 2)}
        \`\`\`

        **New message to analyze:**  
        "${assistantMessage}"

        **Return updated graph JSON ONLY—NO explanation.**`
                : `You are building a structured knowledge graph based on the last message.
        Extract important concepts as **nodes** and the relationships between concepts as **edges**.

        **Your task**:
        - Identify key concepts from the message.
        - Make sure to include a central concept.
        - Define relationships between concepts (source -> target).
        - Provide a markdown-formatted high quality description for each node.
        - Code and LaTex formatting are supported.
        - **If a concept involves mathematical notation, use LaTeX for clarity. If a programming example would help explain it, include a concise code snippet.**
        - Format the response strictly as JSON with two keys: "nodes" and "links".
        - Do **not** generate numerical IDs or use numbers as references.
        - The "source" and "target" fields must always be node names (not numbers).

        **Message:**  
        "${assistantMessage}"

        **Example Response Format:**  
        \`\`\`json
        {
            "nodes": [
            { "name": "MFCCs", "info": "**Mel-Frequency Cepstral Coefficients (MFCCs)** capture frequency characteristics of a signal in a way that aligns with human auditory perception, commonly used for speech and sound classification." },
            { "name": "Derivative Features", "info": "**Derivative features** capture how spectral properties change over time by computing first and second-order derivatives of frequency-based features." }
            ],
            "links": [
            { source: "MFCCs", target: "Time-Frequency Features", label: "are a type of" },
            ]
        }
        \`\`\`

        **Return JSON ONLY—NO explanation.**`;

    console.log(assistantMessage);
    console.log(graph_prompt);

    // @ts-ignore
    const result = await generateObject({
        model: openai("gpt-4o"),
        prompt: graph_prompt,
        schema: GraphSchema
    });

    return result.toJsonResponse();
}