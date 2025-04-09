import { Message } from "ai";
import { KnowledgeGraph } from "@/app/lib/types";
import { MODEL_PROVIDERS } from "@/app/lib/modelConfig";

// Helper function for calling api/chat route (non-streaming) from the client
// Used for title generation (does not count against demo use)
export async function getModelResponse(messages: Message[], isDemoActive: boolean, apiKey: string | null) {
  // Get user settings for model provider and model selection from storage
  const selectedProvider = localStorage.getItem("selectedProvider");
  const selectedChatModel = localStorage.getItem("selectedChatModel");

  // Await response from the route
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

  // Get text from model response
  const { text } = await response.json();

  return text;

}

// Helper function for calling api/chat route (streaming) from the client
// Used for send message
export async function* streamModelResponse(messages: Message[], isDemoActive: boolean, apiKey: string | null, fingerprintId: string | null) {
  // Get user settings for model provider and model selection from storage
  const selectedProvider = localStorage.getItem("selectedProvider");
  const selectedChatModel = localStorage.getItem("selectedChatModel");

  // Await response from the route, include fingerprint if in demo mode
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
        apiKey: isDemoActive ? null : apiKey,
        fingerprintId: fingerprintId
      }),
    });


    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errorMsg = body?.error || `Unexpected error: ${response.status}`;
      console.error("Response not OK:", errorMsg);
      throw new Error(errorMsg);
    }

    // Construct a stream reader from the response
    const reader = response.body?.getReader();
    if (!reader) {
      console.error("No reader found");
      throw new Error("No readable stream found");
    }

    // The response will always come back 200 ok, but if there is an error the stream will close right away
    // Check to see if the first chunk has content - if so, the stream is ok but otherwise there was an error
    const decoder = new TextDecoder();
    const firstResult = await reader.read();
    if (firstResult.done) {
      // The stream ended immediately with no data
      throw new Error("Error generating response.");
    }
    const firstChunk = decoder.decode(firstResult.value, { stream: true });

    // Attempt to parse the first chunk as JSON
    try {
      const parsed = JSON.parse(firstChunk);
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // If parsing fails, assume the chunk is normal text
      // (If the first chunk isn’t valid JSON, it's likely a regular message)
    }

    // Yield the first chunk and continue with the rest of the stream
    yield firstChunk;

    // Yield each chunk in the streaming response
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

// Helper function for calling api/graph/generate route for structured graph generation
export async function generateGraphFromMessage(requestBody: {
  assistantMessage: string;
  existingGraph?: {
    nodes: string[];
    links: { source: string; target: string; label: string }[];
  };
}, isDemoActive: boolean, apiKey: string | null, fingerprintId: string | null) {
  // Get model provider from saved settings
  const selectedProvider = localStorage.getItem("selectedProvider");

  // If the demo is active, use openai as the model provider otherwise use the user's preference
  let selectedGraphModel;
  if (!isDemoActive) {
    selectedGraphModel = MODEL_PROVIDERS[selectedProvider as keyof typeof MODEL_PROVIDERS].graphModel;
  }
  else {
    selectedGraphModel = MODEL_PROVIDERS["openai"].graphModel;
  }

  // Await response
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
      apiKey: isDemoActive ? null : apiKey,
      fingerprintId: fingerprintId
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMsg = body?.error || `Unexpected error: ${response.status}`;
    throw new Error(errorMsg);
  }

  // If response was ok, create a graph from it
  const newGraphData: KnowledgeGraph = await response.json();
  return newGraphData;
}

// Helper function for calling api/graph/quiz/create route for structured quiz creation
export async function generateQuizFromGraph(requestBody: {
  graphData: {
    nodes: string[];
    links: { source: string; target: string; label: string }[];
  };
  difficulty: string;
  numQuestions: number;
}, isDemoActive: boolean, apiKey: string | null, fingerprintId: string | null) {
  // Get model provider from saved settings
  const selectedProvider = localStorage.getItem("selectedProvider");

  // If the demo is active, use openai as the model provider otherwise use the user's preference
  let selectedGraphModel;
  if (!isDemoActive) {
    selectedGraphModel = MODEL_PROVIDERS[selectedProvider as keyof typeof MODEL_PROVIDERS].graphModel;
  }
  else {
    selectedGraphModel = MODEL_PROVIDERS["openai"].graphModel;
  }

  // Await response
  const response = await fetch("/api/graph/quiz/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...requestBody,
      selectedProvider,
      selectedGraphModel,
      isDemoActive: isDemoActive,
      apiKey: isDemoActive ? null : apiKey,
      fingerprintId: fingerprintId
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMsg = body?.error || `Unexpected error: ${response.status}`;
    throw new Error(errorMsg);
  }

  // If response was ok, send quiz data
  const quizData = await response.json();
  return quizData;
}


// Helper function for calling api/graph/quiz/validate route for validating quiz answer
export async function checkQuizAnswer(requestBody: {
  question: string;
  userAnswer: string;
  exampleAnswer: string;
}, isDemoActive: boolean, apiKey: string | null, fingerprintId: string | null) {
  // Get model provider from saved settings
  const selectedProvider = localStorage.getItem("selectedProvider");

  // If the demo is active, use openai as the model provider otherwise use the user's preference
  let selectedGraphModel;
  if (!isDemoActive) {
    selectedGraphModel = MODEL_PROVIDERS[selectedProvider as keyof typeof MODEL_PROVIDERS].graphModel;
  }
  else {
    selectedGraphModel = MODEL_PROVIDERS["openai"].graphModel;
  }

  // Await response
  const response = await fetch("/api/graph/quiz/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...requestBody,
      selectedProvider,
      selectedGraphModel,
      isDemoActive: isDemoActive,
      apiKey: isDemoActive ? null : apiKey,
      fingerprintId: fingerprintId
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMsg = body?.error || `Unexpected error: ${response.status}`;
    throw new Error(errorMsg);
  }

  // If response was ok, return validation result
  const validationResult = await response.json();
  return validationResult;
}