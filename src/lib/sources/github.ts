import type { NormalizedRequirement } from "@/lib/sources/types";
import { ensureUsableContent, SourceError } from "@/lib/sources/types";

export interface GitHubIssueReference {
  owner: string;
  repository: string;
  issueNumber: number;
}

export function parseGitHubIssueReference(value: string): GitHubIssueReference {
  const input = value.trim();
  const urlMatch = input.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/i,
  );
  const shortMatch = input.match(/^([^/\s]+)\/([^#\s]+)#(\d+)$/);
  const match = urlMatch ?? shortMatch;

  if (!match) {
    throw new SourceError(
      "Enter a GitHub issue as owner/repository#123 or a full GitHub issue URL.",
    );
  }

  return {
    owner: match[1],
    repository: match[2],
    issueNumber: Number(match[3]),
  };
}

export async function fetchGitHubIssue(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<NormalizedRequirement> {
  const reference = parseGitHubIssueReference(value);
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GIT_HUB_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GIT_HUB_API_TOKEN}`;
  }

  const response = await fetcher(
    `https://api.github.com/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repository)}/issues/${reference.issueNumber}`,
    { headers, cache: "no-store" },
  );

  if (response.status === 404) {
    throw new SourceError("The GitHub issue was not found or is not accessible.", 404);
  }
  if (response.status === 403 || response.status === 429) {
    throw new SourceError("GitHub rate-limited the request. Try again later.", 429);
  }
  if (!response.ok) {
    throw new SourceError("GitHub could not retrieve this issue.", 502);
  }

  const issue = (await response.json()) as {
    title?: string;
    body?: string | null;
    html_url?: string;
    labels?: Array<{ name?: string }>;
    state?: string;
  };
  const title = issue.title?.trim() || `Issue #${reference.issueNumber}`;
  const labels = issue.labels?.map((label) => label.name).filter(Boolean).join(", ");
  const content = ensureUsableContent(
    [
      `Title: ${title}`,
      issue.body ? `Body:\n${issue.body}` : "",
      issue.state ? `State: ${issue.state}` : "",
      labels ? `Labels: ${labels}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  return {
    source: {
      type: "github",
      reference:
        issue.html_url ??
        `${reference.owner}/${reference.repository}#${reference.issueNumber}`,
      title,
    },
    content,
  };
}
