import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AgentRecord, CallOutcome, CallRecord, SentimentLabel } from "../types";
import { EmptyState, LoadingSkeleton, Button, Chip } from "../components/ui";
import { AddCallForm } from "../components/AddCallForm";
import { highlightText, TranscriptView } from "../components/TranscriptView";

const PAGE_SIZE = 50;

type RangePreset = "7d" | "30d" | "all";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function badgeClass(prefix: string, value: string): string {
  return `${prefix} ${prefix}-${value.replace("_", "-")}`;
}

function fromDateFor(preset: RangePreset): string | undefined {
  if (preset === "all") return undefined;
  const days = preset === "7d" ? 7 : 30;
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  from.setUTCHours(0, 0, 0, 0);
  return from.toISOString();
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export default function CallsPage() {
  const { callId } = useParams<{ callId?: string }>();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [items, setItems] = useState<CallRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [agentId, setAgentId] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [sentiment, setSentiment] = useState<SentimentLabel | "">("");
  const [range, setRange] = useState<RangePreset>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listController = useRef<AbortController | null>(null);

  const fromDate = useMemo(() => fromDateFor(range), [range]);
  const hasMore = items.length < total;

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      listController.current?.abort();
      const controller = new AbortController();
      listController.current = controller;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await api.listCalls(
          {
            search: search || undefined,
            agent_id: agentId || undefined,
            outcome: outcome || undefined,
            sentiment: sentiment || undefined,
            from_date: fromDate,
            limit: PAGE_SIZE,
            offset,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setTotal(page.total);
        setItems((prev) => (append ? [...prev, ...page.items] : page.items));
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : String(err));
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [agentId, fromDate, outcome, search, sentiment],
  );

  useEffect(() => {
    api.listAgents().then(setAgents).catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetchPage(0, false);
    return () => listController.current?.abort();
  }, [fetchPage]);

  useEffect(() => {
    setDeepLinkError(null);

    if (callId) {
      const inList = items.find((item) => item.id === callId);
      if (inList) {
        setSelectedCall(inList);
        return;
      }
      if (loading) return;
      const controller = new AbortController();
      api
        .getCall(callId, controller.signal)
        .then((call) => {
          if (!controller.signal.aborted) setSelectedCall(call);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setDeepLinkError(err instanceof Error ? err.message : "Call not found");
          if (items.length > 0) {
            setSelectedCall(items[0]);
            navigate(`/calls/${items[0].id}`, { replace: true });
          } else {
            setSelectedCall(null);
          }
        });
      return () => controller.abort();
    }

    if (!loading && items.length > 0) {
      setSelectedCall(items[0]);
      navigate(`/calls/${items[0].id}`, { replace: true });
    } else if (!loading && items.length === 0) {
      setSelectedCall(null);
    }
  }, [items, callId, navigate, loading]);

  const selectCall = (call: CallRecord) => {
    setSelectedCall(call);
    setDeepLinkError(null);
    navigate(`/calls/${call.id}`);
  };

  const handleCallAdded = (newCallId: string) => {
    setShowAddForm(false);
    setSearch("");
    setSearchInput("");
    setAgentId("");
    setOutcome("");
    setSentiment("");
    setRange("all");
    navigate(`/calls/${newCallId}`);
    void fetchPage(0, false);
  };

  const applySearch = () => {
    setSearch(searchInput.trim());
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    void fetchPage(items.length, true);
  };

  const agentName =
    selectedCall != null
      ? agents.find((agent) => agent.id === selectedCall.agent_id)?.name ?? selectedCall.agent_id
      : "";

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>All Calls</h2>
          <p>Browse every conversation. Click a call to read what was said.</p>
        </div>
        <div className="header-actions">
          <Button type="button" onClick={() => setShowAddForm((open) => !open)}>
            {showAddForm ? "Hide add form" : "Add your own call"}
          </Button>
        </div>
      </header>

      {showAddForm ? (
        <AddCallForm
          agents={agents}
          onSuccess={handleCallAdded}
          onCancel={() => setShowAddForm(false)}
        />
      ) : null}

      <div className="chip-row">
        <Chip label="Last 7 days" active={range === "7d"} onClick={() => setRange("7d")} />
        <Chip label="Last 30 days" active={range === "30d"} onClick={() => setRange("30d")} />
        <Chip label="All time" active={range === "all"} onClick={() => setRange("all")} />
      </div>

      <section className="filters panel">
        <input
          type="search"
          placeholder="Search by customer name or what was said…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && applySearch()}
        />
        <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <select value={outcome} onChange={(event) => setOutcome(event.target.value as CallOutcome | "")}>
          <option value="">All outcomes</option>
          <option value="booked">Booked</option>
          <option value="not_booked">Not booked</option>
          <option value="callback">Callback</option>
          <option value="voicemail">Voicemail</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <select value={sentiment} onChange={(event) => setSentiment(event.target.value as SentimentLabel | "")}>
          <option value="">All sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
          <option value="mixed">Mixed</option>
        </select>
        <Button type="button" onClick={applySearch}>
          Apply
        </Button>
      </section>

      {error ? (
        <div className="page-state error retry-row">
          <span>{error}</span>
          <Button type="button" variant="glass" onClick={() => void fetchPage(0, false)}>
            Retry
          </Button>
        </div>
      ) : null}
      {deepLinkError ? <div className="page-state error">{deepLinkError}</div> : null}
      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading ? (
        <section className="split-layout">
          <article className="panel list-panel">
            <div className="panel-heading">
              <h3>
                Showing {items.length} of {total}
              </h3>
            </div>
            {items.length === 0 ? (
              <EmptyState
                title="No calls found"
                message="Try clearing filters, widening the date range, or load sample calls from Settings."
              />
            ) : (
              <>
                <ul className="call-list">
                  {items.map((call) => (
                    <li key={call.id}>
                      <button
                        type="button"
                        className={selectedCall?.id === call.id ? "call-item active" : "call-item"}
                        onClick={() => selectCall(call)}
                      >
                        <strong>{highlightText(call.customer_name, search)}</strong>
                        <span>{new Date(call.started_at).toLocaleString()}</span>
                        <span className={badgeClass("pill", call.sentiment)}>{call.sentiment}</span>
                        <span className={badgeClass("pill", call.outcome)}>
                          {call.outcome.replace("_", " ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {hasMore ? (
                  <div className="load-more-row">
                    <Button type="button" variant="glass" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? "Loading…" : `Load more (${total - items.length} left)`}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </article>

          <article className="panel detail-panel">
            {selectedCall ? (
              <>
                <div className="panel-heading">
                  <h3>{highlightText(selectedCall.customer_name, search)}</h3>
                  <p>{selectedCall.id}</p>
                </div>
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Agent</span>
                    <strong>
                      <Link className="inline-link" to={`/agents/${selectedCall.agent_id}`}>
                        {agentName}
                      </Link>
                    </strong>
                  </div>
                  <div>
                    <span className="detail-label">Duration</span>
                    <strong>{formatDuration(selectedCall.duration_seconds)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Sentiment Score</span>
                    <strong>{selectedCall.sentiment_score.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Booking Intent</span>
                    <strong>{selectedCall.booking_intent ? "Yes" : "No"}</strong>
                  </div>
                </div>
                <p className="summary">{highlightText(selectedCall.summary, search)}</p>
                <h4>Keywords</h4>
                <div className="tag-row">
                  {selectedCall.keywords.map((keyword) => (
                    <span key={keyword.term} className="tag">
                      {keyword.term} ({keyword.count})
                    </span>
                  ))}
                </div>
                <h4>Transcript</h4>
                <TranscriptView text={selectedCall.transcript} highlight={search || undefined} />
              </>
            ) : (
              <EmptyState title="No call selected" message="No calls match the current filters." />
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
}
