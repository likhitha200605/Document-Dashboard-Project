import React, { useState, useRef } from "react";
import "./Upload.css";

export default function Upload({ onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef();

  const SUPPORTED = [".pdf", ".doc", ".docx", ".txt"];

  const handleFile = async (file) => {
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!SUPPORTED.includes(ext)) {
      setError("Unsupported file type. Please upload a PDF, DOCX, DOC, or TXT file.");
      return;
    }

    setError("");
    setFileName(file.name);
    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Upload failed.");
        setUploading(false);
        return;
      }

      onSuccess({ filename: data.filename, page_count: data.page_count });
    } catch (e) {
      setError("Cannot reach backend. Is Flask running on port 5000?");
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="upload-page">
      <div className="upload-heading">
        <div className="upload-badge">AI-Powered</div>
        <h2>Upload a Document</h2>
        <p>Drop any PDF — annual reports, research, financials, government records. <br />We extract every metric and build an instant dashboard.</p>
      </div>

      <div
        className={`drop-zone ${dragging ? "dragging" : ""} ${uploading ? "disabled" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="dz-uploading">
            <div className="upload-spinner" />
            <span>Uploading <strong>{fileName}</strong>…</span>
          </div>
        ) : (
          <div className="dz-idle">
            <div className="dz-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="#fff0e9"/>
                <path d="M24 14v14m0-14l-5 5m5-5l5 5" stroke="#e85d26" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 32h20" stroke="#e85d26" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="dz-main">Drop your PDF here</p>
            <p className="dz-hint">or <span className="dz-link">click to browse</span> · PDF, DOCX, TXT · Max 50MB</p>
          </div>
        )}
      </div>

      {error && <div className="upload-error">⚠ {error}</div>}

      <div className="upload-domains">
        <p className="domains-label">Supported document types</p>
        <div className="domains-grid">
          {[
            { icon: "📊", label: "Finance", desc: "P&L, balance sheets" },
            { icon: "🎓", label: "Education", desc: "Academic reports" },
            { icon: "🏥", label: "Healthcare", desc: "Clinical data" },
            { icon: "🏛", label: "Government", desc: "Census, budgets" },
            { icon: "🌱", label: "NGO", desc: "Impact reports" },
            { icon: "💻", label: "Technology", desc: "Product metrics" },
          ].map((d) => (
            <div className="domain-card" key={d.label}>
              <span className="domain-icon">{d.icon}</span>
              <span className="domain-name">{d.label}</span>
              <span className="domain-desc">{d.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
