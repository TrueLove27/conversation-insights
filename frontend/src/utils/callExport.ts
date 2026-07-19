import type { CallRecord } from "../types";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatCallSummaryText(call: CallRecord, agentName?: string): string {
  const keywords =
    call.keywords.length > 0
      ? call.keywords.map((k) => `${k.term} (${k.count})`).join(", ")
      : "None";
  const started = new Date(call.started_at).toLocaleString();
  const agent = agentName || call.agent_id;

  return [
    "Talksmith Call Summary",
    "======================",
    "",
    `Call ID: ${call.id}`,
    `Customer: ${call.customer_name}`,
    `Phone: ${call.phone_number}`,
    `Agent: ${agent}`,
    `Started: ${started}`,
    `Duration: ${formatDuration(call.duration_seconds)}`,
    `Outcome: ${call.outcome.replace("_", " ")}`,
    `Sentiment: ${call.sentiment} (${call.sentiment_score.toFixed(2)})`,
    `Booking intent: ${call.booking_intent ? "Yes" : "No"}`,
    `Language: ${call.language}`,
    "",
    "Summary",
    "-------",
    call.summary?.trim() || "(No summary)",
    "",
    "Keywords",
    "--------",
    keywords,
    "",
    "Transcript",
    "----------",
    call.transcript.trim() || "(No transcript)",
    "",
  ].join("\n");
}

export function downloadCallSummary(call: CallRecord, agentName?: string): void {
  const text = formatCallSummaryText(call, agentName);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `talksmith-call-${call.id}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  window.dispatchEvent(new CustomEvent("talksmith:toast", { detail: "Summary downloaded" }));
}

export function printCallSummary(call: CallRecord, agentName?: string): void {
  const text = formatCallSummaryText(call, agentName);
  const title = `Talksmith — ${call.customer_name} (${call.id})`;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!popup) {
    window.dispatchEvent(
      new CustomEvent("talksmith:toast", { detail: "Allow pop-ups to print" }),
    );
    return;
  }
  popup.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 2rem; line-height: 1.45; }
    h1 { font-size: 1.35rem; margin: 0 0 1rem; }
    pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 0.95rem; }
    @media print { body { margin: 0.75in; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <pre>${escapeHtml(text)}</pre>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`);
  popup.document.close();
}
