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

    // const graph_prompt = (existingGraph && existingGraph.nodes.length > 0)  ? 
    //     `You are updating an existing knowledge graph. 
    //     The graph consists of **nodes (concepts)** and **edges (relationships between concepts)**.

    //     **Your task**:
    //     - Update the existing graph with new concepts and relationships based on the latest message.
    //     - Concept descriptions should be detailed and educative.
    //     - Define relationships between concepts (source -> target).
    //     - Provide a markdown-formatted high quality description for each node.
    //     - Code and LaTex formatting are supported.
    //     - **If a concept involves mathematical notation, provide it in the info and use LaTeX for clarity. If a programming example is applicable, include it in a code block.**
    //     - Ensure that all edges connect valid nodes.
    //     - If a concept already exists, do not duplicate it.
    //     - **Try your best to not overload nodes with too many edges/relationships. You can always add additional nodes for clarity.**
    //     - Format the response strictly as JSON with two keys: "nodes" and "links".
    //     - Do **not** generate numerical IDs or use numbers as references.
    //     - The "source" and "target" fields must always be node names (not numbers).

    //     **Existing Graph:**  
    //     \`\`\`json
    //     ${JSON.stringify(existingGraph, null, 2)}
    //     \`\`\`

    //     **New message to analyze:**  
    //     "${assistantMessage}"

    //     **Return updated graph JSON ONLY—NO explanation.**`
    //             : `You are building a structured knowledge graph based on the last message.
    //     Extract important concepts as **nodes** and the relationships between concepts as **edges**.

    //     **Your task**:
    //     - Identify key concepts from the message.
    //     - Concept descriptions should be detailed and educative.
    //     - Make sure to include a central concept.
    //     - Define relationships between concepts (source -> target).
    //     - Provide a markdown-formatted high quality description for each node.
    //     - Code and LaTex formatting are supported.
    //     - **If a concept involves mathematical notation, provide it in the info and use LaTeX for clarity. If a programming example is applicable, include it in a code block.**
    //     - **Try your best to not overload nodes with too many edges/relationships. You can always add additional nodes for clarity.**
    //     - Format the response strictly as JSON with two keys: "nodes" and "links".
    //     - Do **not** generate numerical IDs or use numbers as references.
    //     - The "source" and "target" fields must always be node names (not numbers).

    //     **Message:**  
    //     "${assistantMessage}"

    //     **Example Response Format:**  
    //     \`\`\`json
    //     {
    //         "nodes": [
    //         { "name": "MFCCs", "info": "**Mel-Frequency Cepstral Coefficients (MFCCs)** capture frequency characteristics of a signal in a way that aligns with human auditory perception, commonly used for speech and sound classification." },
    //         { "name": "Derivative Features", "info": "**Derivative features** capture how spectral properties change over time by computing first and second-order derivatives of frequency-based features." }
    //         ],
    //         "links": [
    //         { source: "MFCCs", target: "Time-Frequency Features", label: "are a type of" },
    //         ]
    //     }
    //     \`\`\`

    //     **Return JSON ONLY—NO explanation.**`;

    const graph_prompt = (existingGraph && existingGraph.nodes.length > 0)
        ? `You are updating an existing knowledge graph.
The graph consists of **nodes (concepts)** and **edges (relationships between concepts)**.

**Your task**:
1. Update the existing graph with new concepts and relationships based on the latest message.
2. For each new concept, provide a detailed, educative description in Markdown (up to two paragraphs).
    - If the concept involves mathematics, include the formula using LaTeX. Wrap inline math with $...$ and block math with $$...$$.
    - If a programming example is attached to the concept, include it in a code block.
3. Define relationships between concepts using "source" and "target" fields (these must be the concept names).
4. **Do not generate numerical IDs or use numbers as references.**
5. If a concept already exists, do not duplicate it.
6. **You MUST limit each node to a maximum of 5 edges/relationships.** If more relationships are needed for clarity, create additional nodes.
7. **You MUST make sure each node has an edge connecting it to the rest of the graph.**
8. Format the response strictly as JSON with exactly two keys: "nodes" and "links".

**Existing Graph:**
\`\`\`json
${JSON.stringify(existingGraph, null, 2)}
\`\`\`

**New message to analyze:**
"${assistantMessage}"

**Return updated graph JSON ONLY—NO explanation.**`
        : `You are building a structured knowledge graph based on the latest message.
Extract important concepts as **nodes** and the relationships between them as **edges**.

**Your task**:
1. Identify key concepts from the message and generate as many nodes as needed.
2. Provide a detailed, educative description for each node in Markdown format (up to two paragraphs).
    - If the concept involves mathematical notation, include it in LaTeX. Wrap inline math with $...$ and block math with $$...$$.
    - If a programming example is attached to the concept, include it in a code block.
3. Define relationships between concepts using "source" and "target" fields, where the values are the concept names.
4. **Do not generate numerical IDs or use numbers as references.**
5. **You MUST limit each node to a maximum of 5 edges/relationships.** (Avoid overloading any node with too many connections; add extra nodes for clarity if necessary.)
6. **You MUST make sure each node has an edge connecting it to the rest of the graph.**
7. Format the response strictly as JSON with exactly two keys: "nodes" and "links".

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
    { "source": "MFCCs", "target": "Time-Frequency Features", "label": "are a type of" }
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