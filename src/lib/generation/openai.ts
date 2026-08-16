import OpenAI from "openai";
import { buildRequirementInput, GENERATION_INSTRUCTIONS } from "@/lib/generation/prompt";
import {
  modelOutputSchema,
  normalizeModelOutput,
  type ModelOutput,
} from "@/lib/validation";
import type { LlmProvider } from "@/lib/types";

export class GenerationError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "GenerationError";
  }
}

function buildClient(): OpenAI {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new GenerationError("Groq is not configured (GROQ_API_KEY missing).", 503);
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function getModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

function rethrowApiError(error: unknown, provider: string): void {
  if (!(error instanceof OpenAI.APIError)) return;
  if (error.status === 429) {
    throw new GenerationError(`${provider} rate-limited the request. Try again later.`, 429);
  }
  if (error.status === 401 || error.status === 403) {
    throw new GenerationError(`${provider} rejected the configured API key.`, 502);
  }
  // Log details for debugging
  if (error.status) {
    console.error(`Groq API error (${error.status}):`, error.message);
  }
  throw new GenerationError(`${provider} could not process the request.`, 502);
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
  client: OpenAI,
  model: string,
  content: string,
  retryFeedback?: string,
): Promise<ModelOutput> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: retryFeedback ? `${SYSTEM_PROMPT}\n\nPrevious attempt feedback: ${retryFeedback}` : SYSTEM_PROMPT },
    { role: "user", content: buildRequirementInput(content) },
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.1,
  });

  let text = response.choices?.[0]?.message?.content ?? "";
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

export async function generateTestCases(content: string, _provider?: LlmProvider) {
  const client = buildClient();
  const model = getModel();
  let firstError: unknown;

  try {
    const output = await requestGeneration(client, model, content);
    return output.kind === "clarification"
      ? { kind: "clarification" as const, questions: output.questions }
      : { kind: "success" as const, testCases: normalizeModelOutput(output) };
  } catch (error) {
    rethrowApiError(error, "Groq");
    firstError = error;
  }

  try {
    const feedback = firstError instanceof Error ? firstError.message : "Malformed output";
    const output = await requestGeneration(client, model, content, feedback.slice(0, 300));
    return output.kind === "clarification"
      ? { kind: "clarification" as const, questions: output.questions }
      : { kind: "success" as const, testCases: normalizeModelOutput(output) };
  } catch (error) {
    rethrowApiError(error, "Groq");
    throw new GenerationError(
      "The AI response was invalid after two attempts. Please try again.",
    );
  }
}
