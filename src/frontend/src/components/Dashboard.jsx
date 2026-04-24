import React, { useState, useMemo } from "react";
import ChartComponent from "./ChartComponent";
import SummaryBox from "./SummaryBox";
import "./Dashboard.css";

const CATEGORY_COLORS = {
  financial:   { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  people:      { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  performance: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  volume:      { bg: "#faf5ff", text: "#7e22ce", dot: "#a855f7" },
  other:       { bg: "#f9fafb", text: "#374151", dot: "#9ca3af" },
};

const DOMAIN_ICONS = {
  finance: "📊", education: "🎓", healthcare: "🏥",
  ngo: "🌱", government: "🏛", technology: "💻", general: "📄",
};

function formatValue(val, unit) {
  let formatted;
  if (val >= 1_000_000_000) formatted = (val / 1_000_000_000).toFixed(2) + "B";
  else if (val >= 1_000_000)  formatted = (val / 1_000_000).toFixed(2) + "M";
  else if (val >= 1_000)      formatted = (val / 1_000).toFixed(1) + "K";
  else formatted = val % 1 === 0 ? val.toString() : val.toFixed(2);
  return unit ? `${unit}${formatted}` : formatted;
}

function formatLabel(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ConfidenceBar({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#f87171";
  return (
    <div className="conf-bar-wrap" title={`Confidence: ${pct}%`}>
      <div className="conf-bar-bg">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="conf-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function Dashboard({ data }) {
  const { rich_metrics = [], metrics = {}, summary, domain, categories = [], page_count, filename } = data;

  const [activeCategory, setActiveCategory] = useState("all");
  const [chartType, setChartType] = useState("bar");
  const [sortBy, setSortBy] = useState("confidence");

  const allCategories = useMemo(() => {
    const seen = new Set();
    rich_metrics.forEach(m => seen.add(m.category));
    return ["all", ...Array.from(seen)];
  }, [rich_metrics]);

  const filtered = useMemo(() => {
    let list = activeCategory === "all" ? rich_metrics : rich_metrics.filter(m => m.category === activeCategory);
    if (sortBy === "value")      list = [...list].sort((a, b) => b.value - a.value);
    if (sortBy === "confidence") list = [...list].sort((a, b) => b.confidence - a.confidence);
    if (sortBy === "alpha")      list = [...list].sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [rich_metrics, activeCategory, sortBy]);

  const exportCSV = () => {
    const header = "Metric,Value,Unit,Category,Confidence\n";
    const rows = rich_metrics.map(m =>
      `"${m.label}",${m.value},"${m.unit}","${m.category}",${m.confidence}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `docdash_${(filename || "export").replace(".pdf","")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const isEmpty = rich_metrics.length === 0;

  return (
    <div className="dashboard">

      {/* Doc metadata bar */}
      <div className="doc-meta-bar">
        <div className="doc-meta-left">
          <span className="doc-icon">📄</span>
          <span className="doc-filename">{filename || "Document"}</span>
          {page_count > 0 && <span className="doc-pill">{page_count} pages</span>}
          <span className="doc-pill domain-pill">
            {DOMAIN_ICONS[domain] || "📄"} {domain}
          </span>
          <span className="doc-pill">{rich_metrics.length} metrics found</span>
        </div>
        <button className="btn-export" onClick={exportCSV} title="Export CSV">
          ↓ CSV
        </button>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>No numeric metrics were found in this document.</p>
          <p className="empty-sub">Try a document with tables, financial figures, or statistical data.</p>
        </div>
      ) : (
        <>
          {/* Category filter tabs */}
          <div className="filter-bar">
            <div className="filter-tabs">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  className={`filter-tab ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                  style={activeCategory === cat && cat !== "all"
                    ? { background: CATEGORY_COLORS[cat]?.bg, color: CATEGORY_COLORS[cat]?.text, borderColor: CATEGORY_COLORS[cat]?.dot }
                    : {}}
                >
                  {cat === "all" ? `All (${rich_metrics.length})` : `${formatLabel(cat)} (${rich_metrics.filter(m => m.category === cat).length})`}
                </button>
              ))}
            </div>
            <div className="sort-row">
              <label className="sort-label">Sort:</label>
              <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="confidence">Confidence</option>
                <option value="value">Value</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <section className="section">
            <h3 className="section-label">Key Metrics</h3>
            <div className="kpi-grid">
              {filtered.slice(0, 12).map((m) => {
                const colors = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other;
                return (
                  <div className="kpi-card" key={m.key}>
                    <div className="kpi-top">
                      <span className="kpi-cat-dot" style={{ background: colors.dot }} />
                      <span className="kpi-label">{m.label}</span>
                    </div>
                    <span className="kpi-value">{formatValue(m.value, m.unit)}</span>
                    <ConfidenceBar score={m.confidence} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chart */}
          <section className="section">
            <div className="section-header">
              <h3 className="section-label">Visual Overview</h3>
              <div className="chart-toggle">
                {["bar", "line", "pie"].map(t => (
                  <button
                    key={t}
                    className={`toggle-btn ${chartType === t ? "active" : ""}`}
                    onClick={() => setChartType(t)}
                  >
                    {t === "bar" ? "▊" : t === "line" ? "╱" : "◕"} {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <ChartComponent metrics={metrics} richMetrics={filtered} chartType={chartType} />
            </div>
          </section>

          {/* Table */}
          <section className="section">
            <h3 className="section-label">Full Data Table ({filtered.length} rows)</h3>
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Category</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const colors = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other;
                    return (
                      <tr key={m.key}>
                        <td>{m.label}</td>
                        <td className="td-value">{formatValue(m.value, m.unit)}</td>
                        <td>
                          <span className="cat-badge" style={{ background: colors.bg, color: colors.text }}>
                            {m.category}
                          </span>
                        </td>
                        <td><ConfidenceBar score={m.confidence} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Summary */}
      <section className="section">
        <SummaryBox summary={summary} domain={domain} />
      </section>
    </div>
  );
}
