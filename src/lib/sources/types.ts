import type { SourceMetadata } from "@/lib/types";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_REQUIREMENT_CHARACTERS = 50_000;

export interface NormalizedRequirement {
  source: SourceMetadata;
  content: string;
}

export class SourceError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export function ensureUsableContent(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new SourceError("The selected source did not contain readable requirement text.");
  }
  if (normalized.length > MAX_REQUIREMENT_CHARACTERS) {
    throw new SourceError(
      `Requirement text exceeds the ${MAX_REQUIREMENT_CHARACTERS.toLocaleString()} character limit.`,
      413,
    );
  }
  return normalized;
}
