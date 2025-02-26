import { Message } from "ai";

export async function getModelResponse(messages: Message[]) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, stream: false }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch response";
      switch (response.status) {
        case 504:
          errorMessage = "Request timed out";
          break;
        case 500:
          errorMessage = "Internal server error";
          break;
        default:
          errorMessage = `Error: ${response.status}`;
          break;
      }
      throw new Error(errorMessage);
    }

    const { text } = await response.json();

    return text;

  } catch (error) {
    console.error("Error generating response.", error);
  }
}

export async function* streamModelResponse(messages: Message[]) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, stream: true }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch response";
      switch (response.status) {
        case 504:
          errorMessage = "Request timed out. Please try again.";
          break;
        case 500:
          errorMessage = "Internal server error. Please try again.";
          break;
        default:
          errorMessage = `Error: ${response.status}`;
          break;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No readable stream found");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  } catch (error) {
    console.error("Error streaming text:", error);
    yield error instanceof Error ? error.message : "Error generating response.";
  }
}