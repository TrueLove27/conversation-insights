async function api(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

async function loadMetrics() {
  const m = await api("/api/metrics/summary");
  document.getElementById("metrics").innerHTML = `
    <div class="card"><div class="label">Total Calls</div><div class="value">${m.total_calls}</div></div>
    <div class="card"><div class="label">Avg Duration</div><div class="value">${m.avg_duration_sec}s</div></div>
    <div class="card"><div class="label">Avg Sentiment</div><div class="value">${m.avg_sentiment_score}</div></div>
    <div class="card"><div class="label">Booking Rate</div><div class="value">${(m.avg_booking_rate * 100).toFixed(0)}%</div></div>
  `;
}

async function loadCalls() {
  const calls = await api("/api/calls?limit=6");
  document.getElementById("call-list").innerHTML = calls.map(c => `
    <div class="call-item">
      <strong>${c.id}</strong> · ${c.agent}
      <span class="badge ${c.sentiment}">${c.sentiment}</span>
      <div class="meta">${c.duration_sec}s · booking ${(c.booking_rate * 100).toFixed(0)}% · ${c.keywords.join(", ")}</div>
      <div>${c.summary}</div>
    </div>
  `).join("");
}

document.getElementById("analyze-btn").addEventListener("click", async () => {
  const transcript = document.getElementById("transcript").value;
  const result = await api("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  document.getElementById("analysis-result").textContent = JSON.stringify(result, null, 2);
});

loadMetrics();
loadCalls();
