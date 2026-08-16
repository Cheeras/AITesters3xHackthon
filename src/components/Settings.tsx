"use client";

import { useCallback, useState } from "react";
import type { ConnectionDetail, ConfigurationStatus, LlmProvider, VerifyResult } from "@/lib/types";

interface SettingsProps {
  currentProvider: LlmProvider;
  onProviderChange: (provider: LlmProvider) => void;
  config: ConfigurationStatus | null;
}

const SERVICE_META: Array<{
  key: ConnectionDetail["key"];
  name: string;
  icon: string;
}> = [
  { key: "groq", name: "Groq", icon: "GQ" },
  { key: "jira", name: "Jira", icon: "JI" },
  { key: "github", name: "GitHub", icon: "GH" },
];

function StatusDot({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className="status-item">
      <span className={`status-dot ${ready ? "ready" : "missing"}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function Settings({ currentProvider, onProviderChange, config }: SettingsProps) {
  const [results, setResults] = useState<Record<string, VerifyResult>>({});
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const verifyAll = useCallback(async () => {
    setTesting(true);
    setError("");

    try {
      const response = await fetch("/api/settings/verify");
      if (!response.ok) throw new Error("Verification request failed.");
      const data = await response.json() as { results: VerifyResult[]; ok: boolean };
      const resultMap: Record<string, VerifyResult> = {};
      for (const r of data.results) {
        resultMap[r.service] = r;
      }
      setResults(resultMap);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed.");
    } finally {
      setTesting(false);
    }
  }, []);

  const statusIcon = (result?: VerifyResult) => {
    if (!result) return <span className="sd-dot sd-idle" />;
    return <span className={`sd-dot ${result.reachable ? "sd-ok" : "sd-err"}`} />;
  };

  return (
    <aside className="settings-sidebar" aria-label="Connection settings">
      {/* ── Quick Status ── */}
      <div className="sidebar-quick-status">
        {config ? (
          <>
            <StatusDot ready={config.groq} label={config.groq ? "Groq ready" : "LLM missing"} />
            <StatusDot ready={config.jira} label={config.jira ? "Jira ready" : "Jira missing"} />
            <StatusDot ready={config.github} label={config.github ? "GitHub ready" : "GitHub missing"} />
          </>
        ) : (
          <span className="status-item muted">Checking connections…</span>
        )}
      </div>

      {/* ── LLM Provider ── */}
      <section className="sidebar-section">
        <h3>LLM provider</h3>
        <div className="provider-cards">
          <button
            className={`provider-card ${currentProvider === "groq" ? "active" : ""}`}
            onClick={() => onProviderChange("groq")}
            type="button"
          >
            <span className="provider-name">Groq</span>
            <span className="provider-model">llama-3.3-70b-versatile</span>
          </button>
        </div>
      </section>

      <div className="sidebar-divider" />

      {/* ── Connection Status ── */}
      <section className="sidebar-section sidebar-section-grow">
        <div className="sidebar-section-header">
          <h3>Connections</h3>
          <button
            className="verify-all-btn"
            onClick={verifyAll}
            disabled={testing}
            type="button"
          >
            {testing ? "Testing…" : "Test all"}
          </button>
        </div>

        <div className="sidebar-services">
          {SERVICE_META.map((service) => {
            const result = results[service.key];
            return (
              <div className={`sidebar-service ${result ? (result.reachable ? "ok" : "err") : ""}`} key={service.key}>
                <div className="ss-left">
                  {statusIcon(result)}
                  <span className="ss-icon-text">{service.icon}</span>
                  <div className="ss-info">
                    <strong>{service.name}</strong>
                    {result ? (
                      <span className={`ss-msg ${result.reachable ? "ok" : "err"}`}>
                        {result.message}
                      </span>
                    ) : (
                      <span className="ss-msg idle">Tap &quot;Test all&quot; to check</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="ss-error">{error}</div>}
      </section>
    </aside>
  );
}