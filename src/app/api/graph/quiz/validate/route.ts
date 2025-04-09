import { APICallError, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
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
            question,
            userAnswer,
            exampleAnswer,
            selectedProvider,
            selectedGraphModel,
            isDemoActive,
            apiKey,
            fingerprintId,
        }: {
            question: string;
            userAnswer: string;
            exampleAnswer: string;
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
        const QuizAnswerSchema = z.object({
            evaluation: z.enum(["correct", "partiallyCorrect", "incorrect"]).describe(
                "The evaluation this answer received. Must be one of: correct, partiallyCorrect, incorrect."
            ),
            explanation: z.string().describe(
                "A helpful explanation for why this answer received this evaluation."
            ),
        });

        // Quiz answer validation prompt
        const quizAnswerValidationPrompt = `
        You are evaluating a user's answer to a quiz question.
        
        **Question:**  
        ${question}
        
        **User's Answer:**  
        ${userAnswer}
        
        **Your task:**
        - Classify the user's answer as exactly one of: **"correct"**, **"partiallyCorrect"**, or **"incorrect"**.
          - **Correct**: Accurately and meaningfully answers the question, even if phrasing, examples, or structure differ.
          - **PartiallyCorrect**: Shows understanding but has minor inaccuracies or misunderstandings of concepts.
          - **Incorrect**: Major misunderstandings, factual errors, off-topic, or fails to meaningfully answer.
        
        **Grading rules:**
        - Do not be punative, grade fairly.
        - Completeness is not required unless explicitly asked for.
        - Do not invent extra requirements beyond what is implied.
        - Favor "correct" for reasonable answers even if they are short, concise, or use different wording.
        
        After grading:
        - Provide a helpful, constructive explanation for your evaluation addressed directly to the user.
        - If the answer is correct, you may still suggest ways make it even stronger.
        
        **Output format (strict):**
        \`\`\`json
        {
          "evaluation": "correct | partiallyCorrect | incorrect",
          "explanation": "string"
        }
        \`\`\`
        `;

        // Send request for quiz answer validation
        // Will validate against schema and fail if response violates the schema
        const result = await generateObject({
            model: modelFunction,
            prompt: quizAnswerValidationPrompt,
            schema: QuizAnswerSchema
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