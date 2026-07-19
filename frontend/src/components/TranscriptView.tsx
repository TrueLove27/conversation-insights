import type { ReactNode } from "react";

export type TranscriptRole = "agent" | "customer" | "unknown";

export interface TranscriptTurn {
  role: TranscriptRole;
  label: string;
  text: string;
}

const SPEAKER_RE =
  /\b(Agent|Customer|Rep|Representative|Caller|User|Advisor|Specialist)\s*:/gi;

const ROLE_MAP: Record<string, TranscriptRole> = {
  agent: "agent",
  rep: "agent",
  representative: "agent",
  advisor: "agent",
  specialist: "agent",
  customer: "customer",
  caller: "customer",
  user: "customer",
};

function normalizeSpeaker(raw: string): { role: TranscriptRole; label: string } {
  const key = raw.trim().toLowerCase();
  const role = ROLE_MAP[key] ?? "unknown";
  const label =
    role === "agent" ? "Agent" : role === "customer" ? "Customer" : raw.trim() || "Speaker";
  return { role, label };
}

/** Parse Agent:/Customer: style transcripts into chat turns. */
export function parseTranscript(raw: string): TranscriptTurn[] {
  const text = raw.trim();
  if (!text) return [];

  const markers: { speaker: string; contentStart: number; markerStart: number }[] = [];
  const re = new RegExp(SPEAKER_RE.source, SPEAKER_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    markers.push({
      speaker: match[1],
      markerStart: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  if (markers.length === 0) {
    return [{ role: "unknown", label: "Transcript", text }];
  }

  const turns: TranscriptTurn[] = [];
  for (let i = 0; i < markers.length; i++) {
    const end = i + 1 < markers.length ? markers[i + 1].markerStart : text.length;
    const body = text.slice(markers[i].contentStart, end).trim();
    if (!body) continue;
    const { role, label } = normalizeSpeaker(markers[i].speaker);
    turns.push({ role, label, text: body });
  }

  return turns.length > 0 ? turns : [{ role: "unknown", label: "Transcript", text }];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Highlight case-insensitive occurrences of query inside text. */
export function highlightText(text: string, query?: string): ReactNode {
  const needle = query?.trim();
  if (!needle) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, "gi"));
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="search-hit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function TranscriptView({ text, highlight }: { text: string; highlight?: string }) {
  const turns = parseTranscript(text);

  if (turns.length === 1 && turns[0].role === "unknown") {
    return (
      <div className="transcript-view transcript-fallback">
        <p className="transcript-fallback-text">{highlightText(turns[0].text, highlight)}</p>
      </div>
    );
  }

  return (
    <div className="transcript-view" role="log" aria-label="Call transcript">
      {turns.map((turn, index) => (
        <div
          key={`${turn.role}-${index}`}
          className={`transcript-turn transcript-turn-${turn.role}`}
        >
          <span className="transcript-role">{turn.label}</span>
          <div className="transcript-bubble">{highlightText(turn.text, highlight)}</div>
        </div>
      ))}
    </div>
  );
}
