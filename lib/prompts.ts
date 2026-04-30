export type BrandContext = {
  tone: string;
  dos: string[];
  donts: string[];
  writingSamples: string[];
};

export type GenerationInput = {
  channel: string;
  audience: string;
  topic: string;
  brand: BrandContext;
};

export function buildGenerationPrompt(input: GenerationInput): string {
  const { channel, audience, topic, brand } = input;

  const samplesBlock =
    brand.writingSamples.length > 0
      ? brand.writingSamples
          .map((s: string, i: number) => `Sample ${i + 1}:\n${s}`)
          .join("\n\n")
      : "No samples provided.";

  return `You are a professional brand copywriter. Write content that strictly follows the brand guidelines below.

## Brand Guidelines

**Tone:** ${brand.tone}

**Do's:**
${brand.dos.map((d: string) => `- ${d}`).join("\n")}

**Don'ts:**
${brand.donts.map((d: string) => `- ${d}`).join("\n")}

**Writing Style Examples:**
${samplesBlock}

## Content Brief

- **Channel:** ${channel}
- **Target Audience:** ${audience}
- **Topic:** ${topic}

## Task

Write a complete, publish-ready piece of content for the channel and audience specified above.
- Match the tone and style of the writing examples exactly.
- Follow all Do's and Don'ts without exception.
- Optimize for the ${channel} platform (appropriate length, formatting, and style).
- Do NOT include any meta-commentary, explanations, or headings like "Here is the content:".
- Output ONLY the final content, ready to copy and publish.`;
}

export function buildEvaluationPrompt(
  content: string,
  brand: BrandContext
): string {
  return `You are a brand compliance evaluator. Analyze the content below against the brand guidelines and return a strict JSON evaluation.

## Brand Guidelines

**Tone:** ${brand.tone}

**Do's:**
${brand.dos.map((d: string) => `- ${d}`).join("\n")}

**Don'ts:**
${brand.donts.map((d: string) => `- ${d}`).join("\n")}

## Content to Evaluate

${content}

## Required Output

Return ONLY valid JSON with no markdown, no explanation, no code fences. Exactly this structure:
{
  "score": <number 0-100>,
  "tone_match": "<Excellent|Good|Fair|Poor>",
  "violations": ["<violation description>", ...],
  "suggestions": ["<improvement suggestion>", ...]
}

Scoring guide:
- 90-100: Perfect brand alignment
- 70-89: Good, minor issues
- 50-69: Several violations, needs revision
- 0-49: Major violations, reject

Be strict and specific in violations and suggestions.`;
}
