import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const CATEGORY_COLORS = {
  financial:   "rgba(249,115,22,0.8)",
  people:      "rgba(59,130,246,0.8)",
  performance: "rgba(34,197,94,0.8)",
  volume:      "rgba(168,85,247,0.8)",
  other:       "rgba(156,163,175,0.8)",
};

function formatLabel(str) {
  return str.length > 18 ? str.slice(0, 16) + "…" : str;
}

export default function ChartComponent({ richMetrics = [], chartType = "bar" }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const items = richMetrics.slice(0, 14);
    if (!items.length) return;

    if (chartRef.current) chartRef.current.destroy();

    const labels = items.map(m => formatLabel(m.label));
    const values = items.map(m => m.value);
    const colors = items.map(m => CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other);

    const ctx = canvasRef.current.getContext("2d");
    const isBar  = chartType === "bar";
    const isLine = chartType === "line";
    const isPie  = chartType === "pie";

    const dataset = isPie
      ? { data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }
      : isLine
      ? { label: "Value", data: values, borderColor: "#e85d26", backgroundColor: "rgba(232,93,38,0.08)",
          borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: "#e85d26",
          pointBorderColor: "#fff", pointBorderWidth: 2, tension: 0.35, fill: true }
      : { label: "Value", data: values, backgroundColor: colors,
          borderColor: colors.map(c => c.replace("0.8", "1")),
          borderWidth: 1.5, borderRadius: 6, borderSkipped: false };

    chartRef.current = new Chart(ctx, {
      type: isPie ? "doughnut" : isLine ? "line" : "bar",
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: isPie, position: "right",
            labels: { font: { family: "'DM Mono', monospace", size: 11 }, boxWidth: 12, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const m = items[ctx.dataIndex];
                const v = ctx.parsed.y ?? ctx.parsed;
                const val = typeof v === "number" ? v : ctx.raw;
                const unit = m?.unit || "";
                return ` ${unit}${Number(val).toLocaleString()}`;
              },
            },
          },
        },
        scales: isPie ? {} : {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'DM Mono', monospace", size: 10 }, color: "#888", maxRotation: 35 },
          },
          y: {
            grid: { color: "#eeece8" },
            ticks: {
              font: { family: "'DM Mono', monospace", size: 10 }, color: "#888",
              callback: (v) =>
                v >= 1_000_000_000 ? (v / 1_000_000_000).toFixed(1) + "B" :
                v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" :
                v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : v,
            },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [richMetrics, chartType]);

  return <canvas ref={canvasRef} style={{ maxHeight: "340px" }} />;
}
