import { NextResponse } from "next/server";
import { APICallError, generateText, Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { Redis } from "@upstash/redis";

// Set redis credentials
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const maxDuration = 60;

// API route for sending a message to an AI SDK provider model
export async function POST(req: Request) {
    try {
        const {
            messages,
            stream,
            selectedProvider,
            selectedChatModel,
            isDemoActive,
            apiKey,
            fingerprintId
        }: {
            messages: Message[];
            stream?: boolean;
            selectedProvider: string;
            selectedChatModel: string;
            isDemoActive: boolean;
            apiKey: string | null;
            fingerprintId?: string;
        } = await req.json();

        let modelFunction;
        // If the demo is active and this is a stream text request, validate fingerprint before sending
        if (isDemoActive && stream) {

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
        // For chat title generation, don't increment demo uses
        else if (isDemoActive) {
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
                modelFunction = openai(selectedChatModel);
            }
            // Ser API key for Anthropic
            else if (selectedProvider === "anthropic") {
                process.env.ANTHROPIC_API_KEY = apiKey;
                modelFunction = anthropic(selectedChatModel);
            }
            else {
                return new NextResponse(JSON.stringify({ error: "Invalid provider." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        // Streaming request
        if (stream) {
            const result = streamText({
                // System prompt for chat messages
                system: `
            You MUST strictly follow these formatting rules:
            - Always use LaTeX for mathematical expressions. Wrap inline math with $...$ and block math with $$...$$.
            - Always use fenced code blocks (\`\`\`) for programming code.
            - Never use LaTeX for code, and never use code blocks for math.
            - If you fail to follow these rules, your response will be invalid.
            `,
                model: modelFunction,
                messages,
            });

            return result.toTextStreamResponse();
        // Static text request (for title generation)
        } else {
            const { text } = await generateText({
                model: modelFunction,
                messages,
            });

            return NextResponse.json({ text });
        }
    } catch (error) {
        console.error("API Error caught in route.ts:", error);

        // If there was an error related to the API call, set a detialed error message for the UI
        // NOTE: this will only trigger for title generation because streaming requests always return 200 OK
        if (APICallError.isInstance(error)) {
            const status = error.statusCode;

            let message = "An error occurred.";
            if (status === 401) message = "Invalid API key.";
            else if (status === 403) message = "Permission denied.";
            else if (status === 429) message = "Rate limit exceeded.";
            else if (status === 400) message = "Bad request.";
            else if (status && status >= 500) message = "Server error.";

            return new NextResponse(JSON.stringify({ error: message }), {
                status,
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }

        return new NextResponse(JSON.stringify({ error: "Unexpected error occured." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}