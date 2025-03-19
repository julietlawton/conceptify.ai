import { NextResponse } from "next/server";
import { APICallError, generateText, Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages, stream, selectedProvider, selectedChatModel, isDemoActive, apiKey }:
            { messages: Message[]; stream?: boolean; selectedProvider: string; selectedChatModel: string; isDemoActive: boolean; apiKey: string | null }
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
                modelFunction = openai(selectedChatModel);
            }
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

        if (stream) {
            const result = streamText({
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
        } else {
            const { text } = await generateText({
                model: modelFunction,
                messages,
            });

            return NextResponse.json({ text });
        }
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