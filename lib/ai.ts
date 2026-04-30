import OpenAI from "openai";
import {
  buildGenerationPrompt,
  buildEvaluationPrompt,
  BrandContext,
  GenerationInput,
} from "@/lib/prompts";

const MODEL = "gpt-4o-mini";

const getClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
};

export type ComplianceResult = {
  score: number;
  tone_match: string;
  violations: string[];
  suggestions: string[];
};

export async function generateContent(input: GenerationInput): Promise<string> {
  const client = getClient();
  const prompt = buildGenerationPrompt(input);

  try {
    const response = await Promise.race([
      client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), 25000)
      )
    ]) as OpenAI.Chat.Completions.ChatCompletion;

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");
    return text.trim();
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new Error('AI service is taking too long. Please try again.');
    }
    throw error;
  }
}

export async function evaluateContent(
  content: string,
  brand: BrandContext
): Promise<ComplianceResult> {
  const client = getClient();
  const prompt = buildEvaluationPrompt(content, brand);

  const maxRetries = 2;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        client.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI request timeout')), 25000)
        )
      ]) as OpenAI.Chat.Completions.ChatCompletion;

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error("Empty response from OpenAI");
      return JSON.parse(text) as ComplianceResult;
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries && (error.status === 429 || error.message?.includes('timeout'))) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError!;
}
