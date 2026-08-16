import type { TestCase } from "@/lib/types";

export const CSV_HEADERS = [
  "Scenario",
  "TID",
  "Test Data",
  "TestCase Description",
  "PreCondition",
  "TestSteps",
  "Expected Result",
  "Actual Result",
  "Steps to Execute",
  "Expected Result",
  "Actual Result",
  "Status",
  "Executed QA Name",
  "Misc (Comments)",
  "Priority",
  "Is Automated",
] as const;

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function testCasesToCsv(testCases: TestCase[]): string {
  const rows = testCases.map((testCase) => [
    testCase.scenario,
    testCase.tid,
    testCase.testData,
    testCase.description,
    testCase.preCondition,
    testCase.testSteps,
    testCase.expectedResult,
    testCase.actualResult,
    testCase.stepsToExecute,
    testCase.executionExpectedResult,
    testCase.executionActualResult,
    testCase.status,
    testCase.executedQaName,
    testCase.comments,
    testCase.priority,
    testCase.isAutomated,
  ]);

  return [CSV_HEADERS, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\r\n");
}
