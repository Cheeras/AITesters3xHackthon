import type { SourceType } from "@/lib/types";
import { fetchGitHubIssue } from "@/lib/sources/github";
import { fetchJiraIssue } from "@/lib/sources/jira";
import { SourceError } from "@/lib/sources/types";
import { fromPastedText } from "@/lib/sources/text";

export async function resolveRequirement(
  sourceType: SourceType,
  sourceValue: string,
  file: File | null,
) {
  switch (sourceType) {
    case "jira":
      return fetchJiraIssue(sourceValue);
    case "github":
      return fetchGitHubIssue(sourceValue);
    case "file":
      if (!file) throw new SourceError("Choose a PDF or TXT document.");
      // Dynamic import to avoid loading pdf-parse on Vercel for non-PDF routes
      const { fromUploadedFile } = await import("@/lib/sources/file");
      return fromUploadedFile(file);
    case "text":
      return fromPastedText(sourceValue);
    default:
      throw new SourceError("Choose a supported requirement source.");
  }
}
