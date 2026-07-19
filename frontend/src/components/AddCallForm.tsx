import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getAdminApiKey } from "../api/client";
import type { AgentRecord } from "../types";
import { Button } from "./ui";

const SAMPLE =
  "Agent: Thanks for calling Talksmith. How can I help you today? " +
  "Customer: Hi, I want to book a product demo for tomorrow afternoon. " +
  "Agent: Absolutely, I can schedule that for 2 PM. Does that work? " +
  "Customer: Perfect, please confirm the appointment. " +
  "Agent: You're all set for tomorrow at 2 PM. Looking forward to it.";

export function AddCallForm({
  agents,
  onSuccess,
  onCancel,
}: {
  agents: AgentRecord[];
  onSuccess: (callId: string) => void;
  onCancel: () => void;
}) {
  const [customerName, setCustomerName] = useState("New Customer");
  const [agentId, setAgentId] = useState("");
  const [transcript, setTranscript] = useState(SAMPLE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasKey = useMemo(() => Boolean(getAdminApiKey().trim()), []);

  useEffect(() => {
    if (!agentId && agents[0]) setAgentId(agents[0].id);
  }, [agents, agentId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const key = getAdminApiKey().trim();
    if (!key) {
      setError("Save an API key in Settings first (default: dev-ingest-key-change-me).");
      return;
    }
    if (!agentId) {
      setError("Pick a team member for this call.");
      return;
    }
    if (transcript.trim().length < 20) {
      setError("Transcript must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.ingestCall(
        {
          transcript: transcript.trim(),
          agent_id: agentId,
          customer_name: customerName.trim() || "New Customer",
        },
        key,
      );
      if (!result.success || !result.call_id) {
        setError(result.error || "Ingest failed");
        return;
      }
      onSuccess(result.call_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add call";
      setError(
        /401|Unauthorized/i.test(message)
          ? "Unauthorized. Save a valid API key in Settings, then try again."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel add-call-panel">
      <div className="panel-heading">
        <div>
          <h3>Add your own call</h3>
          <p className="panel-desc">
            Paste a real conversation. Talksmith will analyze mood, booking intent, and keywords, then put it in your
            library.
          </p>
        </div>
        <Button type="button" variant="glass" onClick={onCancel}>
          Close
        </Button>
      </div>

      {!hasKey ? (
        <p className="form-note">
          No API key saved yet. Open <Link to="/integrations">Settings</Link> and save{" "}
          <code>dev-ingest-key-change-me</code> (or your real key).
        </p>
      ) : null}

      <form className="analyze-form add-call-form" onSubmit={handleSubmit}>
        <label htmlFor="add-customer">Customer name</label>
        <input
          id="add-customer"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          maxLength={120}
        />

        <label htmlFor="add-agent">Team member</label>
        <select
          id="add-agent"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          required
          disabled={agents.length === 0}
        >
          {agents.length === 0 ? <option value="">No agents loaded</option> : null}
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

        <label htmlFor="add-transcript">Transcript</label>
        <textarea
          id="add-transcript"
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          required
          minLength={20}
          placeholder="Agent: … Customer: …"
        />

        <div className="button-row">
          <Button type="submit" disabled={submitting || agents.length === 0}>
            {submitting ? "Adding & analyzing…" : "Add call to library"}
          </Button>
          <Button type="button" variant="trace" onClick={() => setTranscript(SAMPLE)}>
            Reset sample text
          </Button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </section>
  );
}
