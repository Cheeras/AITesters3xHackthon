import type { SourceType } from "@/lib/types";
import { fetchGitHubIssue } from "@/lib/sources/github";
import { fetchJiraIssue } from "@/lib/sources/jira";
import { SourceError } from "@/lib/sources/types";
import { fromPastedText } from "@/lib/sources/text";

export async function resolveRequirement(
  sourceType: SourceType,
  sourceValue: string,
) {
  switch (sourceType) {
    case "jira":
      return fetchJiraIssue(sourceValue);
    case "github":
      return fetchGitHubIssue(sourceValue);
    case "text":
      return fromPastedText(sourceValue);
    default:
      throw new SourceError("Choose a supported requirement source.");
  }
}
