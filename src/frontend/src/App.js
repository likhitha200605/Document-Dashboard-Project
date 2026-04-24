import React, { useState } from "react";
import Upload from "./components/Upload";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [stage, setStage] = useState("upload");
  const [uploadMeta, setUploadMeta] = useState(null);  // { filename, page_count }
  const [dashboardData, setDashboardData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleUploadSuccess = async (meta) => {
    setUploadMeta(meta);
    setStage("analyzing");
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:5000/analyze");
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Analysis failed.");
        setStage("error");
        return;
      }

      setDashboardData(data);
      setStage("done");
    } catch (e) {
      setErrorMsg("Could not connect to backend. Make sure Flask is running on port 5000.");
      setStage("error");
    }
  };

  const handleReset = async () => {
    try { await fetch("http://localhost:5000/reset", { method: "POST" }); } catch (_) {}
    setStage("upload");
    setDashboardData(null);
    setUploadMeta(null);
    setErrorMsg("");
  };

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="header-inner">
          <span className="header-logo">⬡</span>
          <h1 className="header-title">DocDash</h1>
          <span className="header-sep">·</span>
          <span className="header-sub">Document → Dashboard</span>
        </div>
        {stage === "done" && (
          <button className="header-btn" onClick={handleReset}>
            ＋ New Document
          </button>
        )}
      </header>

      <main className="app-main">
        {stage === "upload" && (
          <Upload onSuccess={handleUploadSuccess} />
        )}

        {stage === "analyzing" && (
          <div className="center-state">
            <div className="pulse-ring">
              <div className="spinner" />
            </div>
            <p className="analyzing-text">Analyzing document…</p>
            {uploadMeta && (
              <p className="analyzing-sub">
                <span className="file-pill">📄 {uploadMeta.filename}</span>
                <span className="file-pill">📑 {uploadMeta.page_count} page{uploadMeta.page_count !== 1 ? "s" : ""}</span>
              </p>
            )}
            <p className="analyzing-hint">Extracting metrics · Detecting domain · Generating summary</p>
          </div>
        )}

        {stage === "error" && (
          <div className="center-state">
            <div className="error-icon">✕</div>
            <p className="error-text">{errorMsg}</p>
            <button className="btn-reset" onClick={handleReset}>← Try Again</button>
          </div>
        )}

        {stage === "done" && dashboardData && (
          <Dashboard data={dashboardData} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
