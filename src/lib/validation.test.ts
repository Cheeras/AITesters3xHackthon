import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { modelOutputSchema, normalizeModelOutput } from "@/lib/validation";

function generatedCase(scenario: string) {
  return {
    scenario,
    testData: "Insufficient information to determine.",
    description: "Validate the stated behavior.",
    preCondition: "Insufficient information to determine.",
    testSteps: "1. Perform the stated behavior.",
    expectedResult: "The stated outcome occurs.",
    stepsToExecute: "1. Perform the stated behavior.",
    executionExpectedResult: "The stated outcome occurs.",
    comments: "",
    priority: "Insufficient information to determine.",
    isAutomated: "Insufficient information to determine.",
  };
}

describe("modelOutputSchema", () => {
  it("can be converted to an OpenAI strict structured-output format", () => {
    expect(zodTextFormat(modelOutputSchema, "test_case_generation").type).toBe("json_schema");
  });

  it("accepts focused clarification responses", () => {
    expect(
      modelOutputSchema.parse({
        kind: "clarification",
        questions: ["What outcome is expected?"],
        testCases: [],
      }).kind,
    ).toBe("clarification");
  });

  it("rejects empty success, duplicate scenarios, and more than ten cases", () => {
    expect(() =>
      modelOutputSchema.parse({ kind: "success", questions: [], testCases: [] }),
    ).toThrow();
    expect(() =>
      modelOutputSchema.parse({
        kind: "success",
        questions: [],
        testCases: [generatedCase("Save"), generatedCase("save")],
      }),
    ).toThrow();
    expect(() =>
      modelOutputSchema.parse({
        kind: "success",
        questions: [],
        testCases: Array.from({ length: 11 }, (_, index) => generatedCase(`Case ${index}`)),
      }),
    ).toThrow();
  });

  it("assigns deterministic IDs and execution placeholders", () => {
    const parsed = modelOutputSchema.parse({
      kind: "success",
      questions: [],
      testCases: [generatedCase("One"), generatedCase("Two")],
    });
    const normalized = normalizeModelOutput(parsed);
    expect(normalized.map((testCase) => testCase.tid)).toEqual(["TC001", "TC002"]);
    expect(normalized[0]).toMatchObject({
      actualResult: "",
      executionActualResult: "",
      status: "Not Executed",
      executedQaName: "",
    });
  });
});
