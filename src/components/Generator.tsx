"use client";

import { useEffect, useRef, useState } from "react";
import { CSV_HEADERS, testCasesToCsv } from "@/lib/csv";
import type {
  ConfigurationStatus,
  GenerationResponse,
  LlmProvider,
  SourceType,
  TestCase,
} from "@/lib/types";
import { Settings } from "@/components/Settings";

const SOURCES: Array<{
  id: SourceType;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "jira",
    label: "Jira story",
    shortLabel: "JI",
    description: "Retrieve a configured Jira Cloud issue.",
  },
  {
    id: "github",
    label: "GitHub issue",
    shortLabel: "GH",
    description: "Load a public or token-authorized issue.",
  },
  {
    id: "file",
    label: "PRD upload",
    shortLabel: "UP",
    description: "Extract requirements from PDF or TXT.",
  },
  {
    id: "text",
    label: "Paste text",
    shortLabel: "TX",
    description: "Paste a PRD, story, or acceptance criteria.",
  },
];

const TABLE_VALUES: Array<(testCase: TestCase) => string> = [
  (value) => value.scenario,
  (value) => value.tid,
  (value) => value.testData,
  (value) => value.description,
  (value) => value.preCondition,
  (value) => value.testSteps,
  (value) => value.expectedResult,
  (value) => value.actualResult,
  (value) => value.stepsToExecute,
  (value) => value.executionExpectedResult,
  (value) => value.executionActualResult,
  (value) => value.status,
  (value) => value.executedQaName,
  (value) => value.comments,
  (value) => value.priority,
  (value) => value.isAutomated,
];

export function Generator() {
  const [sourceType, setSourceType] = useState<SourceType>("jira");
  const [sourceValue, setSourceValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ConfigurationStatus | null>(null);
  const [llmProvider, setLlmProvider] = useState<LlmProvider>("groq");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/generate")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((status: ConfigurationStatus) => {
        setConfig(status);
        setLlmProvider(status.llmProvider);
      })
      .catch(() => setConfig(null));
  }, []);

  function chooseSource(source: SourceType) {
    setSourceType(source);
    setSourceValue("");
    setFile(null);
    setResult(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("sourceType", sourceType);
      formData.set("sourceValue", sourceValue);
      formData.set("llmProvider", llmProvider);
      if (file) formData.set("file", file);

      const response = await fetch("/api/generate", { method: "POST", body: formData });
      const body = (await response.json()) as GenerationResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Generation failed.");
      }
      if (!("kind" in body)) throw new Error("The server returned an invalid result.");
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!result || result.kind !== "success") return;
    const blob = new Blob(["\uFEFF", testCasesToCsv(result.testCases)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `test-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const selectedSource = SOURCES.find((source) => source.id === sourceType)!;

  return (
    <div className="app-shell">
      <Settings
        currentProvider={llmProvider}
        onProviderChange={setLlmProvider}
        config={config}
      />

      <main className="main-area">
        <header className="page-header">
          <h1>AI Testcase Generator for JIRA,Git Hub issue and PRD</h1>
        </header>

        <div className="source-grid" role="tablist" aria-label="Requirement source">
          {SOURCES.map((source) => (
            <button
              className={`source-card ${sourceType === source.id ? "selected" : ""}`}
              key={source.id}
              onClick={() => chooseSource(source.id)}
              role="tab"
              aria-selected={sourceType === source.id}
              type="button"
            >
              <span className="source-icon">{source.shortLabel}</span>
              <strong>{source.label}</strong>
              <small>{source.description}</small>
              <span className="select-indicator" aria-hidden="true" />
            </button>
          ))}
        </div>

        <form className="input-panel" onSubmit={submit}>
          {sourceType === "jira" && (
            <label className="field">
              <span>Jira issue key</span>
              <input
                value={sourceValue}
                onChange={(event) => setSourceValue(event.target.value)}
                placeholder="PROJECT-123"
                autoComplete="off"
                required
              />
              <small>Uses the Jira Cloud account configured by the deployer.</small>
            </label>
          )}

          {sourceType === "github" && (
            <label className="field">
              <span>GitHub issue</span>
              <input
                value={sourceValue}
                onChange={(event) => setSourceValue(event.target.value)}
                placeholder="owner/repository#123 or full issue URL"
                autoComplete="off"
                required
              />
              <small>Public issues work without a token; private repositories require one.</small>
            </label>
          )}

          {sourceType === "file" && (
            <label className={`dropzone ${file ? "has-file" : ""}`}>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
              <span className="upload-symbol">↑</span>
              <strong>{file ? file.name : "Drop a PRD here or browse"}</strong>
              <small>{file ? `${(file.size / 1024).toFixed(1)} KB selected` : "PDF or TXT · maximum 5 MB"}</small>
            </label>
          )}

          {sourceType === "text" && (
            <label className="field">
              <span>Requirement, user story, or acceptance criteria</span>
              <textarea
                value={sourceValue}
                onChange={(event) => setSourceValue(event.target.value)}
                placeholder="Paste the complete requirement here…"
                maxLength={200_000}
                required
              />
              <small>{sourceValue.length.toLocaleString()} / 200,000 characters</small>
            </label>
          )}

          {error && <div className="alert error" role="alert"><strong>Couldn&rsquo;t generate test cases.</strong>{error}</div>}

          <div className="form-actions">
            <p><span className="shield">✓</span> Inputs are processed for this request and are not stored.</p>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Analyzing requirement…</> : <>Generate test cases <span>→</span></>}
            </button>
          </div>
        </form>

        {result?.kind === "clarification" && (
          <section className="result-section clarification" aria-live="polite">
            <div className="result-kicker">Clarification needed</div>
            <h2>A few details would make these tests deterministic.</h2>
            <p>Update the original requirement with answers to these questions, then generate again.</p>
            <ol>{result.questions.map((question) => <li key={question}>{question}</li>)}</ol>
          </section>
        )}

        {result?.kind === "success" && (
          <section className="result-section" aria-live="polite">
            <div className="results-header">
              <div>
                <div className="result-kicker">Generation complete</div>
                <h2>{result.testCases.length} traceable test {result.testCases.length === 1 ? "case" : "cases"}</h2>
                <p>{result.source.title} · {result.source.reference}</p>
              </div>
              <button className="download-button" onClick={downloadCsv} type="button">
                Download CSV <span>↓</span>
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>{CSV_HEADERS.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead>
                <tbody>
                  {result.testCases.map((testCase) => (
                    <tr key={testCase.tid}>
                      {TABLE_VALUES.map((readValue, index) => (
                        <td key={`${testCase.tid}-${index}`}>{readValue(testCase) || <span className="empty">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
