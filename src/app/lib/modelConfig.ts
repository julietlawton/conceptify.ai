export const MODEL_PROVIDERS: Record<
  "openai" | "anthropic",
  { displayName: string; models: string[]; graphModel: string }> = {
  openai: {
    displayName: "OpenAI",
    models: [
        "gpt-4o",
        "gpt-4-turbo",
        "gpt-4o-mini",
        "o1",
        "o1-mini",
        "o3-mini"
    ],
    graphModel: "gpt-4o"
  },
  anthropic: {
    displayName: "Anthropic",
    models: [
        "claude-3-5-haiku-latest", 
        "cluade-3-5-sonnet-latest",
        "claude-3-opus-latest",
    ],
    graphModel: "claude-3-5-haiku-latest"
  },
};