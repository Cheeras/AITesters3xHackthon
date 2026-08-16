import { afterEach, describe, expect, it, vi } from "vitest";
import { validateFileInput } from "@/lib/sources/file";
import { fetchGitHubIssue, parseGitHubIssueReference } from "@/lib/sources/github";
import { fetchJiraIssue, parseJiraKey } from "@/lib/sources/jira";
import { MAX_FILE_BYTES } from "@/lib/sources/types";
import { fromPastedText } from "@/lib/sources/text";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.restoreAllMocks();
});

describe("source validation", () => {
  it("parses Jira keys and rejects invalid keys", () => {
    expect(parseJiraKey(" project_2-123 ")).toBe("PROJECT_2-123");
    expect(parseJiraKey("https://acme.atlassian.net/browse/PROJ-123")).toBe("PROJ-123");
    expect(parseJiraKey("https://shankar-ch.atlassian.net/browse/KAN-7")).toBe("KAN-7");
    expect(() => parseJiraKey("123")).toThrow("valid Jira issue key");
  });

  it("parses GitHub shorthand and URLs", () => {
    expect(parseGitHubIssueReference("openai/openai-node#42")).toEqual({
      owner: "openai",
      repository: "openai-node",
      issueNumber: 42,
    });
    expect(
      parseGitHubIssueReference("https://github.com/openai/openai-node/issues/42"),
    ).toEqual({ owner: "openai", repository: "openai-node", issueNumber: 42 });
    expect(() => parseGitHubIssueReference("#42")).toThrow("owner/repository#123");
  });

  it("validates supported file types and size", () => {
    expect(validateFileInput({ name: "prd.PDF", type: "", size: 100 })).toBe("pdf");
    expect(validateFileInput({ name: "story.txt", type: "text/plain", size: 100 })).toBe("txt");
    expect(() => validateFileInput({ name: "prd.docx", type: "application/octet-stream", size: 100 })).toThrow("PDF or TXT");
    expect(() => validateFileInput({ name: "prd.pdf", type: "application/pdf", size: MAX_FILE_BYTES + 1 })).toThrow("5 MB");
  });

  it("normalizes pasted text and rejects empty input", () => {
    expect(fromPastedText("  A user can save.\r\n").content).toBe("A user can save.");
    expect(() => fromPastedText("   ")).toThrow("readable requirement text");
  });
});

describe("remote source adapters", () => {
  it("normalizes a GitHub issue returned by the API", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Search filters",
          body: "Users can filter results.",
          state: "open",
          labels: [{ name: "feature" }],
          html_url: "https://github.com/acme/web/issues/8",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const requirement = await fetchGitHubIssue("acme/web#8", fetcher);
    expect(requirement.source.title).toBe("Search filters");
    expect(requirement.content).toContain("Users can filter results.");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("normalizes Jira Atlassian Document Format without exposing credentials", async () => {
    process.env.JIRA_URL = "https://acme.atlassian.net/";
    process.env.JIRA_EMAIL = "qa@example.com";
    process.env.JIRA_API_TOKEN = "secret";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          key: "WEB-9",
          names: { customfield_10010: "Acceptance Criteria" },
          fields: {
            summary: "Save preferences",
            description: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Preferences persist." }] }],
            },
            priority: { name: "High" },
            customfield_10010: "Preference remains after signing in again.",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const requirement = await fetchJiraIssue("web-9", fetcher);
    expect(requirement.content).toContain("Preferences persist.");
    expect(requirement.content).toContain("Preference remains after signing in again.");
    const [, requestInit] = fetcher.mock.calls[0];
    expect(JSON.stringify(requestInit)).not.toContain("qa@example.com:secret");
  });
});
