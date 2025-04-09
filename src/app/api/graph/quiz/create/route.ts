import { APICallError, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { KnowledgeGraph } from '@/app/lib/types';
import { NextResponse } from 'next/server';
import { Redis } from "@upstash/redis";

// Set redis credentials
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const maxDuration = 60;

// API route for sending a structured object generation request to an AI SDK provider model
export async function POST(req: Request) {
    try {
        const {
            graphData,
            difficulty,
            numQuestions,
            selectedProvider,
            selectedGraphModel,
            isDemoActive,
            apiKey,
            fingerprintId,
        }: {
            graphData: KnowledgeGraph;
            difficulty: string;
            numQuestions: number;
            selectedProvider: string;
            selectedGraphModel: string;
            isDemoActive: boolean;
            apiKey: string | null;
            fingerprintId?: string;
        } = await req.json();

        let modelFunction;
        // If the demo is active, validate fingerprint before sending
        if (isDemoActive) {

            // Handle missing fingerprint
            if (!fingerprintId) {
                return new NextResponse(JSON.stringify({ error: "Fingerprint ID missing." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Handle fingerprint not in db (must be initialized by this point)
            const exists = await redis.exists(fingerprintId);
            if (!exists) {
                return new NextResponse(JSON.stringify({ error: "Fingerprint not initialized." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Handle usage exceeded for this fingerprint
            const usageCount = await redis.incr(fingerprintId);
            const maxUsage = 5;
            if (usageCount > maxUsage) {
                return new NextResponse(JSON.stringify({ error: "Demo usage limit exceeded." }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // If fingerprint was verified, set the model function for demo
            modelFunction = openai("gpt-4o");
        }
        // If not in demo mode, use the user's provided API key for the request
        else {
            if (!apiKey) {
                return new NextResponse(JSON.stringify({ error: "API key is missing." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
            // Set API key for OpenAI
            if (selectedProvider === "openai") {
                process.env.OPENAI_API_KEY = apiKey;
                modelFunction = openai(selectedGraphModel);
            }
            // Set API key for Anthropic
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

        // Zod schema for validating structured object response
        const QuizSchema = z.object({
            questions: z.array(
                z.object({
                    question: z.string().describe("The quiz question."),
                    hint: z.string().describe("A helpful hint for answering this question."),
                    exampleAnswer: z.string().describe("An example of a correct answer to this question."),
                })
            ).length(numQuestions, "Exactly this many questions required.")
        });

        // Quiz creation prompt
        const quizPrompt = `
        You are creating a closed-book quiz with a ${difficulty} difficulty level based on the following concept map. 
        The concept map is represented as JSON, where "nodes" are concepts and "links" describe relationships between concepts:

        ${JSON.stringify(graphData)}

        **Your task:**
        - Generate exactly ${numQuestions} questions that test meaningful understanding of the concepts and their relationships.

        **Question guidelines:**
        - Questions must be clear, specific, and unambiguous.
        - Questions must clearly state what the user should do: 
        - Example: "List two advantages of..." / "Explain how X relates to Y" / "Compare A and B"
        - Avoid broad, vague prompts like "Describe" or "Explain" without direction.
        - The answer must not ask the user to look at external sources, including the concept map.
        - Target meaningful thinking, not trivia memorization.

        **Hint guidelines:**
        - Write a helpful hint for each question that would assist a stuck user.
        - Hints must be specific and targeted.
        - Hints must not reveal the answer directly.
        - Hints must not tell the user to "look at the concept map" or use external resources.
        - Hints should guide thinking, not state facts.

        **Example Answer guidelines:**
        - Provide a concise example of a correct answer.
        - Answers can differ in wording, but must meaningfully address the question.

        **Difficulty settings:**
        - "Easy" → Recall simple facts, definitions, or direct relationships.
        - "Medium" → Apply knowledge to examples or explain straightforward connections.
        - "Hard" → Analyze, synthesize, or compare multiple concepts.
        - "Expert" → Critical thinking, edge cases, or deeper reasoning tasks.

        **Avoid:**
        - Duplicated questions
        - Trivial questions
        - Repeating the same concept multiple times

        **Output Format (strict):**
        \`\`\`json
        {
        "questions": [
            {
            "question": "string",
            "hint": "string",
            "exampleAnswer": "string"
            }
        ]
        }
        \`\`\`
        `;

        // Send request for quiz generation
        // Will validate against quiz schema and fail if response violates the schema
        const result = await generateObject({
            model: modelFunction,
            prompt: quizPrompt,
            schema: QuizSchema
        });

        return result.toJsonResponse();
    } catch (error) {
        console.error("API Error caught in route.ts:", error);

        // If there was an error related to the API call, set a detialed error message for the UI
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