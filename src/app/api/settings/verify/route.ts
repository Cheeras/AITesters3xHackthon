import { NextResponse } from "next/server";
import type { VerifyResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

async function verifyGroq(): Promise<VerifyResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return { service: "groq", reachable: false, message: "GROQ_API_KEY not configured." };
  }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json() as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) ?? [];
      const hasModel = models.some((m) => m.includes("mixtral") || m.includes("mixtral-8x7b-32768"));
      return {
        service: "groq",
        reachable: true,
        message: hasModel
          ? "Connected · mixtral-8x7b-32768 available."
          : "Connected · mixtral model list may differ.",
      };
    }
    if (response.status === 401) {
      return { service: "groq", reachable: false, message: "GROQ_API_KEY is invalid or expired." };
    }
    return { service: "groq", reachable: false, message: `Groq returned status ${response.status}.` };
  } catch {
    return { service: "groq", reachable: false, message: "Could not reach the Groq API." };
  }
}

async function verifyJira(): Promise<VerifyResult> {
  const baseUrl = process.env.JIRA_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !token) {
    return { service: "jira", reachable: false, message: "Jira not fully configured. Check JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN." };
  }
  try {
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      },
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json() as { displayName?: string; emailAddress?: string };
      return { service: "jira", reachable: true, message: `Authenticated as ${data.displayName ?? data.emailAddress ?? "unknown"}.` };
    }
    if (response.status === 401 || response.status === 403) {
      return { service: "jira", reachable: false, message: "Credentials rejected by Jira." };
    }
    return { service: "jira", reachable: false, message: `Jira returned status ${response.status}.` };
  } catch {
    return { service: "jira", reachable: false, message: "Could not reach the Jira API." };
  }
}

async function verifyGitHub(): Promise<VerifyResult> {
  const token = process.env.GIT_HUB_API_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    const response = await fetch("https://api.github.com/rate_limit", {
      headers,
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json() as { rate?: { remaining?: number; limit?: number } };
      const remaining = data.rate?.remaining ?? "?";
      const limit = data.rate?.limit ?? "?";
      return {
        service: "github",
        reachable: true,
        message: token
          ? `Authenticated · ${remaining}/${limit} requests remaining.`
          : `No token configured · ${remaining}/${limit} public requests remaining.`,
      };
    }
    if (response.status === 401 || response.status === 403) {
      return { service: "github", reachable: false, message: "Token is invalid or expired." };
    }
    return { service: "github", reachable: false, message: `GitHub returned status ${response.status}.` };
  } catch {
    return { service: "github", reachable: false, message: "Could not reach the GitHub API." };
  }
}

export async function GET() {
  const results = await Promise.all([verifyGroq(), verifyJira(), verifyGitHub()]);
  const allReachable = results.every((r) => r.reachable);
  return NextResponse.json({ results, ok: allReachable });
}