import type { NormalizedRequirement } from "@/lib/sources/types";
import { ensureUsableContent } from "@/lib/sources/types";

export function fromPastedText(value: string): NormalizedRequirement {
  const content = ensureUsableContent(value);
  return {
    source: {
      type: "text",
      reference: "Pasted requirement",
      title: content.split("\n")[0].slice(0, 100),
    },
    content,
  };
}
