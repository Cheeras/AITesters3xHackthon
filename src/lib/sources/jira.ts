import type { NormalizedRequirement } from "@/lib/sources/types";
import { ensureUsableContent, SourceError } from "@/lib/sources/types";

export function parseJiraKey(value: string): string {
  const trimmed = value.trim();

  // Support full Jira URLs: https://*.atlassian.net/browse/PROJECT-123
  const urlMatch = trimmed.match(
    /\/browse\/([A-Za-z][A-Za-z0-9_]+-\d+)/i,
  );
  if (urlMatch) return urlMatch[1].toUpperCase();

  const key = trimmed.toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) {
    throw new SourceError(
      "Enter a valid Jira issue key (e.g. PROJECT-123) or full URL (e.g. https://your-domain.atlassian.net/browse/PROJECT-123).",
    );
  }
  return key;
}

function adfToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const node = value as { text?: unknown; type?: unknown; content?: unknown };
  const ownText = typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content)
    ? node.content.map(adfToText).filter(Boolean)
    : [];
  const separator = node.type === "doc" || node.type === "paragraph" ? "\n" : " ";
  return [ownText, ...children].filter(Boolean).join(separator).trim();
}

export async function fetchJiraIssue(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<NormalizedRequirement> {
  const key = parseJiraKey(value);
  const baseUrl = process.env.JIRA_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !token) {
    throw new SourceError("Jira is not configured on this deployment.", 503);
  }

  const response = await fetcher(
    `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}?expand=names`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      },
      cache: "no-store",
    },
  );

  if (response.status === 401 || response.status === 403) {
    throw new SourceError("Jira rejected the configured credentials.", 502);
  }
  if (response.status === 404) {
    throw new SourceError("The Jira issue was not found or is not accessible.", 404);
  }
  if (response.status === 429) {
    throw new SourceError("Jira rate-limited the request. Try again later.", 429);
  }
  if (!response.ok) {
    throw new SourceError("Jira could not retrieve this issue.", 502);
  }

  const issue = (await response.json()) as {
    key?: string;
    names?: Record<string, string>;
    fields?: Record<string, unknown> & {
      summary?: string;
      description?: unknown;
      labels?: string[];
      priority?: { name?: string } | null;
      status?: { name?: string } | null;
      issuetype?: { name?: string } | null;
    };
  };
  const fields = issue.fields ?? {};
  const title = fields.summary?.trim() || key;
  const description = adfToText(fields.description);
  const acceptanceCriteria = Object.entries(issue.names ?? {})
    .filter(([, name]) => /acceptance criteria/i.test(name))
    .map(([fieldId, name]) => {
      const value = adfToText(fields[fieldId]);
      return value ? `${name}:\n${value}` : "";
    })
    .filter(Boolean);
  const content = ensureUsableContent(
    [
      `Key: ${issue.key ?? key}`,
      `Title: ${title}`,
      description ? `Description:\n${description}` : "",
      ...acceptanceCriteria,
      fields.issuetype?.name ? `Issue type: ${fields.issuetype.name}` : "",
      fields.status?.name ? `Status: ${fields.status.name}` : "",
      fields.priority?.name ? `Priority: ${fields.priority.name}` : "",
      fields.labels?.length ? `Labels: ${fields.labels.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  return {
    source: { type: "jira", reference: issue.key ?? key, title },
    content,
  };
}
