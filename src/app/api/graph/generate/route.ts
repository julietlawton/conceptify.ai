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

export const maxDuration = 60;


export async function POST(req: Request) {
    const { assistantMessage, existingGraph }: { assistantMessage: string; existingGraph?: KnowledgeGraph } = await req.json();

const graph_prompt = (existingGraph && existingGraph.nodes.length > 0)
? `You are updating an existing knowledge graph based on the latest message in a conversation between a user and an assistant..
The graph consists of **nodes (concepts)** and **edges (relationships between concepts)**. Your goal is to create a living history of the conversation by 
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
Your goal is to create a living history of the conversation by summarizing key information and concepts as **nodes** and the relationships between them as **edges**.

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

    console.log(assistantMessage);
    console.log(graph_prompt);

    const result = await generateObject({
        model: openai("gpt-4o"),
        prompt: graph_prompt,
        schema: GraphSchema
    });

    return result.toJsonResponse();
}