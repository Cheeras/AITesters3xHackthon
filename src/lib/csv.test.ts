import { describe, expect, it } from "vitest";
import { CSV_HEADERS, testCasesToCsv } from "@/lib/csv";
import type { TestCase } from "@/lib/types";

const testCase: TestCase = {
  scenario: "Save a value, including a comma",
  tid: "TC001",
  testData: 'A "quoted" value',
  description: "First line\nSecond line",
  preCondition: "Insufficient information to determine.",
  testSteps: "1. Supply the value 2. Save it",
  expectedResult: "The supplied value is saved.",
  actualResult: "",
  stepsToExecute: "1. Supply the value 2. Save it",
  executionExpectedResult: "The supplied value is saved.",
  executionActualResult: "",
  status: "Not Executed",
  executedQaName: "",
  comments: "Source: Acceptance Criteria 1",
  priority: "Insufficient information to determine.",
  isAutomated: "Insufficient information to determine.",
};

describe("testCasesToCsv", () => {
  it("keeps the exact 16-column schema including duplicate headings", () => {
    expect(CSV_HEADERS).toHaveLength(16);
    expect(CSV_HEADERS.filter((header) => header === "Expected Result")).toHaveLength(2);
    expect(CSV_HEADERS.filter((header) => header === "Actual Result")).toHaveLength(2);
  });

  it("escapes commas, quotes, and multiline fields", () => {
    const csv = testCasesToCsv([testCase]);
    expect(csv).toContain('"Save a value, including a comma"');
    expect(csv).toContain('"A ""quoted"" value"');
    expect(csv).toContain('"First line\nSecond line"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
