import { NextResponse } from "next/server";
import { generateText, Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
    const { messages, stream }: { messages: Message[]; stream?: boolean } = await req.json();

    if (stream) {
        const result = streamText({
            system: `
            You MUST strictly follow these formatting rules:
            - Always use LaTeX for mathematical expressions. Wrap inline math with $...$ and block math with $$...$$.
            - Always use fenced code blocks (\`\`\`) for programming code.
            - Never use LaTeX for code, and never use code blocks for math.
            - If you fail to follow these rules, your response will be invalid.
            `,
            model: openai("gpt-4o"),
            messages,
        });

        return result.toTextStreamResponse();
    } else {
        const { text } = await generateText({
            model: openai("gpt-4o"),
            messages,
        });

        return NextResponse.json({ text });
    }
}