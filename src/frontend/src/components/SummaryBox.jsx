import React from "react";
import "./SummaryBox.css";

const DOMAIN_ICONS = {
  finance: "📊", education: "🎓", healthcare: "🏥",
  ngo: "🌱", government: "🏛", technology: "💻", general: "📄",
};

export default function SummaryBox({ summary, domain }) {
  if (!summary) return null;
  return (
    <div className="summary-box">
      <div className="summary-header">
        <span className="summary-icon">✦</span>
        <span className="summary-title">AI Summary</span>
        {domain && (
          <span className="summary-domain">
            {DOMAIN_ICONS[domain] || "📄"} {domain} document
          </span>
        )}
      </div>
      <p className="summary-text">{summary}</p>
    </div>
  );
}
