import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export type HealthStatus = "ready" | "degraded" | "offline";

export interface SystemHealth {
  status: HealthStatus;
  label: string;
  detail: string;
  refresh: () => void;
}

function deriveHealth(integrations: Record<string, unknown> | undefined): Omit<SystemHealth, "refresh"> {
  const rag = integrations?.rag as { reachable?: boolean; detail?: string } | undefined;
  if (rag && rag.reachable === false) {
    return {
      status: "degraded",
      label: "Coaching offline",
      detail: rag.detail || "RAG service unreachable",
    };
  }
  return {
    status: "ready",
    label: "All systems ready",
    detail: rag?.reachable ? "API and coaching connected" : "API healthy",
  };
}

export function useSystemHealth(pollMs = 30000): SystemHealth {
  const [status, setStatus] = useState<HealthStatus>("ready");
  const [label, setLabel] = useState("Checking…");
  const [detail, setDetail] = useState("");

  const refresh = useCallback(() => {
    api
      .health()
      .then((body) => {
        const next = deriveHealth(body.integrations);
        setStatus(next.status);
        setLabel(next.label);
        setDetail(next.detail);
      })
      .catch(() => {
        setStatus("offline");
        setLabel("API unreachable");
        setDetail("Could not reach Talksmith API");
      });
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

  return { status, label, detail, refresh };
}
