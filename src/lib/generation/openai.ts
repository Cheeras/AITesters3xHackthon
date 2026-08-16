import { buildRequirementInput, GENERATION_INSTRUCTIONS } from "@/lib/generation/prompt";
import {
  modelOutputSchema,
  normalizeModelOutput,
  type ModelOutput,
} from "@/lib/validation";

export class GenerationError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "GenerationError";
  }
}

function getModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

const SYSTEM_PROMPT = `You are a senior QA functional tester. You MUST respond with valid JSON only, no markdown, no code fences.

${GENERATION_INSTRUCTIONS}

Your response must be a JSON object matching exactly this schema:
{
  "kind": "clarification" | "success",
  "questions": string[],
  "testCases": Array<{
    "scenario": string,
    "testData": string,
    "description": string,
    "preCondition": string,
    "testSteps": string,
    "expectedResult": string,
    "stepsToExecute": string,
    "executionExpectedResult": string,
    "comments": string,
    "priority": string,
    "isAutomated": string
  }>
}`;

async function requestGeneration(
  model: string,
  content: string,
  retryFeedback?: string,
): Promise<ModelOutput> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new GenerationError("Groq is not configured (GROQ_API_KEY missing).", 503);

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: retryFeedback
      ? `${SYSTEM_PROMPT}\n\nPrevious attempt feedback: ${retryFeedback}`
      : SYSTEM_PROMPT },
    { role: "user", content: buildRequirementInput(content) },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new GenerationError("Groq rate-limited the request. Try again later.", 429);
    }
    if (response.status === 401 || response.status === 403) {
      throw new GenerationError("Groq rejected the configured API key.", 502);
    }
    if (errorBody) {
      console.error(`Groq API error (${response.status}):`, errorBody);
    }
    throw new GenerationError("Groq could not process the request.", 502);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  let text = data.choices?.[0]?.message?.content ?? "";
  text = text.trim();
  if (!text) {
    throw new GenerationError("The AI service returned an empty response.");
  }

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GenerationError("The AI response was not valid JSON.");
  }

  return modelOutputSchema.parse(parsed);
}

export async function generateTestCases(content: string) {
  const model = getModel();
  let firstError: unknown;

  try {
    const output = await requestGeneration(model, content);
    return output.kind === "clarification"
      ? { kind: "clarification" as const, questions: output.questions }
      : { kind: "success" as const, testCases: normalizeModelOutput(output) };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    firstError = error;
  }

  try {
    const feedback = firstError instanceof Error ? firstError.message : "Malformed output";
    const output = await requestGeneration(model, content, feedback.slice(0, 300));
    return output.kind === "clarification"
      ? { kind: "clarification" as const, questions: output.questions }
      : { kind: "success" as const, testCases: normalizeModelOutput(output) };
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(
      "The AI response was invalid after two attempts. Please try again.",
    );
  }
}
