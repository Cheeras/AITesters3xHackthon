import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sources", () => ({ resolveRequirement: vi.fn() }));
vi.mock("@/lib/generation/openai", () => {
  class GenerationError extends Error {
    constructor(message: string, public readonly status = 502) {
      super(message);
    }
  }
  return { generateTestCases: vi.fn(), GenerationError };
});

import { generateTestCases } from "@/lib/generation/openai";
import { resolveRequirement } from "@/lib/sources";
import { GET, POST } from "@/app/api/generate/route";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.clearAllMocks();
});

describe("/api/generate", () => {
  it("returns configuration booleans without returning secret values", async () => {
    process.env.GROQ_API_KEY = "groq-secret";
    process.env.JIRA_URL = "https://acme.atlassian.net";
    process.env.JIRA_EMAIL = "qa@example.com";
    process.env.JIRA_API_TOKEN = "jira-secret";
    process.env.GIT_HUB_API_TOKEN = "github-secret";

    const response = await GET();
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      llmProvider: "groq",
      groq: true,
      jira: true,
      github: true,
    });
    expect(text).not.toMatch(/groq-secret|jira-secret|github-secret/);
  });

  it("returns clarification questions without test cases", async () => {
    vi.mocked(resolveRequirement).mockResolvedValue({
      source: { type: "text", title: "User can save", reference: "Pasted requirement" },
      content: "User can save.",
    });
    vi.mocked(generateTestCases).mockResolvedValue({
      kind: "clarification",
      questions: ["What is saved?"],
    });
    const form = new FormData();
    form.set("sourceType", "text");
    form.set("sourceValue", "User can save.");

    const response = await POST(
      new Request("http://localhost/api/generate", { method: "POST", body: form }),
    );
    expect(await response.json()).toEqual({
      kind: "clarification",
      questions: ["What is saved?"],
      source: { type: "text", title: "User can save", reference: "Pasted requirement" },
    });
  });

  it("rejects unsupported source types before calling integrations", async () => {
    const form = new FormData();
    form.set("sourceType", "spreadsheet");
    const response = await POST(
      new Request("http://localhost/api/generate", { method: "POST", body: form }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Choose a supported requirement source." });
    expect(resolveRequirement).not.toHaveBeenCalled();
  });
});
