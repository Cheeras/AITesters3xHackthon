import type { NormalizedRequirement } from "@/lib/sources/types";
import {
  ensureUsableContent,
  MAX_FILE_BYTES,
  SourceError,
} from "@/lib/sources/types";

const SUPPORTED_TYPES = new Set(["application/pdf", "text/plain"]);

export function validateFileInput(file: Pick<File, "name" | "size" | "type">) {
  const extension = file.name.toLocaleLowerCase().split(".").pop();
  const supportedExtension = extension === "pdf" || extension === "txt";
  if (!SUPPORTED_TYPES.has(file.type) && !supportedExtension) {
    throw new SourceError("Upload a PDF or TXT document.");
  }
  if (file.size === 0) throw new SourceError("The uploaded file is empty.");
  if (file.size > MAX_FILE_BYTES) {
    throw new SourceError("The uploaded file exceeds the 5 MB limit.", 413);
  }
  return extension === "pdf" || file.type === "application/pdf" ? "pdf" : "txt";
}

export async function fromUploadedFile(file: File): Promise<NormalizedRequirement> {
  const kind = validateFileInput(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;

  if (kind === "pdf") {
    // Dynamic import to avoid loading pdfjs on Vercel for non-PDF requests
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      text = (await parser.getText()).text;
    } catch {
      throw new SourceError("The PDF could not be read. It may be encrypted or damaged.");
    } finally {
      await parser.destroy();
    }
  } else {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  return {
    source: { type: "file", reference: file.name, title: file.name },
    content: ensureUsableContent(text),
  };
}
