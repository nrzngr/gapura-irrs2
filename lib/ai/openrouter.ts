import { OpenRouter } from "@openrouter/sdk";

// Initialize OpenRouter client
// Ensure OPENROUTER_API_KEY is set in your .env file
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Calls OpenRouter AI with streaming response handling to capture reasoning tokens.
 * Returns the full accumulated response string.
 */
export async function callAI(
  messages: AIMessage[],
  model: string = "openai/gpt-oss-20b:free"
): Promise<string> {
  try {
    console.log(`[OpenRouter] Calling model: ${model}`);
    
    // Stream the response to get reasoning tokens in usage
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: model,
        messages: messages,
        stream: true,
      }
    } as any) as any;

    let response = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        response += content;
      }
      
      // Usage information comes in the final chunk
      if (chunk.usage) {
        console.log(`[OpenRouter] Usage for ${model}:`, JSON.stringify(chunk.usage));
        const usage = chunk.usage as any;
        if (usage.reasoningTokens) {
            console.log(`[OpenRouter] Reasoning tokens:`, usage.reasoningTokens);
        }
      }
    }

    return response;
  } catch (error) {
    console.error("[OpenRouter] Error calling AI:", error);
    throw error;
  }
}
