export const LLM_PROVIDERS = ["groq"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const SOURCE_TYPES = ["jira", "github", "file", "text"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export interface SourceMetadata {
  type: SourceType;
  reference: string;
  title: string;
}

export interface TestCase {
  scenario: string;
  tid: string;
  testData: string;
  description: string;
  preCondition: string;
  testSteps: string;
  expectedResult: string;
  actualResult: string;
  stepsToExecute: string;
  executionExpectedResult: string;
  executionActualResult: string;
  status: "Not Executed";
  executedQaName: string;
  comments: string;
  priority: string;
  isAutomated: string;
}

export interface ClarificationResponse {
  kind: "clarification";
  source: SourceMetadata;
  questions: string[];
}

export interface SuccessResponse {
  kind: "success";
  source: SourceMetadata;
  testCases: TestCase[];
}

export type GenerationResponse = ClarificationResponse | SuccessResponse;

export interface ConfigurationStatus {
  llmProvider: LlmProvider;
  groq: boolean;
  jira: boolean;
  github: boolean;
}

export interface ConnectionDetail {
  name: string;
  key: "groq" | "jira" | "github";
  configured: boolean;
  reachable: boolean | null;
  message: string;
}

export interface VerifyResult {
  service: "groq" | "jira" | "github";
  reachable: boolean;
  message: string;
}
