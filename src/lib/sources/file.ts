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
    try {
      // pdfjs-dist (used by pdf-parse) needs DOMMatrix which isn't available
      // in serverless runtimes like Vercel. Polyfill it before importing.
      if (typeof globalThis.DOMMatrix === "undefined") {
        globalThis.DOMMatrix = class {
          a = 1; d = 1; b = 0; c = 0; e = 0; f = 0;
          multiply() { return this; }
          translate() { return this; }
          scale() { return this; }
          rotate() { return this; }
          skewX() { return this; }
          skewY() { return this; }
          inverse() { return this; }
          toString() { return "matrix(1,0,0,1,0,0)"; }
        } as unknown as typeof DOMMatrix;
      }
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      text = (await parser.getText()).text;
      await parser.destroy();
    } catch {
      // Fallback: extract text directly from raw bytes
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      // Remove non-text garbage for PDF binary content
      text = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      if (!text || text.length < 10) {
        throw new SourceError("The PDF could not be read. It may be encrypted or damaged.");
      }
    }
  } else {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  return {
    source: { type: "file", reference: file.name, title: file.name },
    content: ensureUsableContent(text),
  };
}
