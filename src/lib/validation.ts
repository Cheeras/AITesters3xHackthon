import { z } from "zod";

export const INSUFFICIENT_INFORMATION =
  "Insufficient information to determine.";

const generatedTestCaseSchema = z.object({
  scenario: z.string().trim().min(1),
  testData: z.string().trim().min(1),
  description: z.string().trim().min(1),
  preCondition: z.string().trim().min(1),
  testSteps: z.string().trim().min(1),
  expectedResult: z.string().trim().min(1),
  stepsToExecute: z.string().trim().min(1),
  executionExpectedResult: z.string().trim().min(1),
  comments: z.string(),
  priority: z.string().trim().min(1),
  isAutomated: z.string().trim().min(1),
});

export const modelOutputSchema = z
  .object({
    kind: z.enum(["clarification", "success"]),
    questions: z.array(z.string().trim().min(1)).max(5),
    testCases: z.array(generatedTestCaseSchema).max(10),
  })
  .superRefine((value, context) => {
    if (
      value.kind === "clarification" &&
      (value.questions.length === 0 || value.testCases.length !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Clarification responses require questions and no test cases.",
      });
    }

    if (
      value.kind === "success" &&
      (value.testCases.length === 0 || value.questions.length !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Success responses require test cases and no questions.",
      });
    }

    const scenarios = value.testCases.map((testCase) =>
      testCase.scenario.toLocaleLowerCase(),
    );
    if (new Set(scenarios).size !== scenarios.length) {
      context.addIssue({ code: "custom", message: "Duplicate scenarios found." });
    }
  });

export type ModelOutput = z.infer<typeof modelOutputSchema>;

export function normalizeModelOutput(output: ModelOutput) {
  return output.testCases.map((testCase, index) => ({
    ...testCase,
    tid: `TC${String(index + 1).padStart(3, "0")}`,
    actualResult: "",
    executionActualResult: "",
    status: "Not Executed" as const,
    executedQaName: "",
  }));
}
