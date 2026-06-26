import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Snippet = {
  id?: string;
  path: string;
  startLine: number;
  endLine: number;
  code: string;
  language: string;
};

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const InputSchema = z.object({
  repo: z.string().min(3).max(140),
  question: z.string().min(2).max(2000),
  history: z.array(MessageSchema).max(40).optional().default([]),
});

const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export const ingestRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ repo: z.string().min(3).max(140) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`${FASTAPI_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        return { ok: false as const, error: `Backend error: ${res.status}` };
      }
      return await res.json();
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Ingestion failed" };
    }
  });

export const askRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`${FASTAPI_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        return { ok: false as const, error: `Backend error: ${res.status}` };
      }
      return await res.json();
    } catch (e) {
      console.error("askRepo error:", e);
      return { ok: false as const, error: "Unexpected error contacting Python backend." };
    }
  });
