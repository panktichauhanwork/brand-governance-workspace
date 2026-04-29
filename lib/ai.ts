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

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");
  return text.trim();
}

export async function evaluateContent(
  content: string,
  brand: BrandContext
): Promise<ComplianceResult> {
  const client = getClient();
  const prompt = buildEvaluationPrompt(content, brand);

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");
  return JSON.parse(text) as ComplianceResult;
}
