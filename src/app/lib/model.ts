import { Message } from "ai";
import { KnowledgeGraph } from "./types";
import { MODEL_PROVIDERS } from "./modelConfig";

export async function getModelResponse(messages: Message[], isDemoActive: boolean, apiKey: string | null) {
  const selectedProvider = localStorage.getItem("selectedProvider");
  const selectedChatModel = localStorage.getItem("selectedChatModel");

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      stream: false,
      selectedProvider,
      selectedChatModel,
      isDemoActive: isDemoActive,
      apiKey: isDemoActive ? null : apiKey
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMsg = body?.error || `Unexpected error: ${response.status}`;
    throw new Error(errorMsg);
  }


  const { text } = await response.json();

  return text;

}

export async function* streamModelResponse(messages: Message[], isDemoActive: boolean, apiKey: string | null) {
  const selectedProvider = localStorage.getItem("selectedProvider");
  const selectedChatModel = localStorage.getItem("selectedChatModel");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        stream: true,
        selectedProvider,
        selectedChatModel,
        isDemoActive: isDemoActive,
        apiKey: isDemoActive ? null : apiKey
      }),
    });


    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errorMsg = body?.error || `Unexpected error: ${response.status}`;
      console.error("Response not OK:", errorMsg);
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error("No reader found");
      throw new Error("No readable stream found");
    }

    const decoder = new TextDecoder();

    const firstResult = await reader.read();
    if (firstResult.done) {
      // The stream ended immediately with no data.
      throw new Error("Error generating response.");
    }
    const firstChunk = decoder.decode(firstResult.value, { stream: true });

    // Attempt to parse the first chunk as JSON.
    try {
      const parsed = JSON.parse(firstChunk);
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // If parsing fails, assume the chunk is normal text.
      // (If the first chunk isn’t valid JSON, it's likely a regular message.)
    }

    // Yield the first chunk and continue with the rest of the stream.
    yield firstChunk;


    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  } catch (error) {
    console.error("Error streaming text:", error);
    // This yield won't be hit if error is thrown BEFORE yield
    yield error instanceof Error ? error.message : "Error generating response.";
  }
}


export async function generateGraphFromMessage(requestBody: {
  assistantMessage: string;
  existingGraph?: {
    nodes: string[];
    links: { source: string; target: string; label: string }[];
  };
}, isDemoActive: boolean, apiKey: string | null) {
  const selectedProvider = localStorage.getItem("selectedProvider");

  let selectedGraphModel;
  if (!isDemoActive) {
    selectedGraphModel = MODEL_PROVIDERS[selectedProvider as keyof typeof MODEL_PROVIDERS].graphModel;
  }
  else {
    selectedGraphModel = MODEL_PROVIDERS["openai"].graphModel;
  }

  const response = await fetch("/api/graph/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...requestBody,
      selectedProvider,
      selectedGraphModel,
      isDemoActive: isDemoActive,
      apiKey: isDemoActive ? null : apiKey
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMsg = body?.error || `Unexpected error: ${response.status}`;
    throw new Error(errorMsg);
  }

  const newGraphData: KnowledgeGraph = await response.json();

  return newGraphData;
}