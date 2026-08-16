import { NextResponse } from "next/server";
import { generateTestCases, GenerationError } from "@/lib/generation/openai";
import { resolveRequirement } from "@/lib/sources";
import { SourceError } from "@/lib/sources/types";
import { SOURCE_TYPES, LLM_PROVIDERS, type ConfigurationStatus, type SourceType, type LlmProvider } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export function getConfigurationStatus(): ConfigurationStatus {
  return {
    llmProvider: "groq",
    groq: Boolean(process.env.GROQ_API_KEY),
    jira: Boolean(
      process.env.JIRA_URL &&
        process.env.JIRA_EMAIL &&
        process.env.JIRA_API_TOKEN,
    ),
    github: Boolean(process.env.GIT_HUB_API_TOKEN),
  };
}

export async function GET() {
  return NextResponse.json(getConfigurationStatus());
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawSourceType = formData.get("sourceType");
    const sourceValue = formData.get("sourceValue");
    const fileValue = formData.get("file");
    const rawProvider = formData.get("llmProvider");

    if (
      typeof rawSourceType !== "string" ||
      !SOURCE_TYPES.includes(rawSourceType as SourceType)
    ) {
      throw new SourceError("Choose a supported requirement source.");
    }
    if (sourceValue !== null && typeof sourceValue !== "string") {
      throw new SourceError("The source value is invalid.");
    }

    const provider =
      typeof rawProvider === "string" && LLM_PROVIDERS.includes(rawProvider as LlmProvider)
        ? (rawProvider as LlmProvider)
        : "groq";

    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    const requirement = await resolveRequirement(
      rawSourceType as SourceType,
      sourceValue ?? "",
      file,
    );
    const generation = await generateTestCases(requirement.content, provider);

    return NextResponse.json({ ...generation, source: requirement.source });
  } catch (error) {
    if (error instanceof SourceError || error instanceof GenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unhandled generation error", error);
    return NextResponse.json(
      { error: "The request could not be processed. Please try again." },
      { status: 500 },
    );
  }
}
