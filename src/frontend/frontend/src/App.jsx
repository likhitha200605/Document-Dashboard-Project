import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  UploadCloud, FileText, TrendingUp, TrendingDown, Minus,
  RefreshCw, CheckCircle2, ChevronRight, Download
} from 'lucide-react';
import './index.css';

const PIE_COLORS = ['#58a6ff', '#2ea043', '#d2a8ff', '#f85149'];

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/msword': ['.doc']
    },
    multiple: false
  });

  const handleUpload = async (selectedFile) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed. Please ensure backend is running.');
      
      const response = await res.json();
      // Add fake latency to show off the cool UI loading animation
      setTimeout(() => {
          setDashboardData(response.data);
          setLoading(false);
      }, 1500);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setDashboardData(null);
    setError(null);
  };

  const renderTrendIcon = (trend) => {
    if (trend.includes('+')) return <TrendingUp size={16} className="trend-up" />;
    if (trend.includes('-')) return <TrendingDown size={16} className="trend-down" />;
    return <Minus size={16} className="trend-neutral" />;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Report Intelligence Dashboard</h1>
        <p>Transform unstructured PDFs and Word documents into actionable insights instantly.</p>
      </header>

      {!dashboardData && !loading && (
        <div {...getRootProps()} className={`dropzone glass-panel ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <UploadCloud className="drop-icon" />
          {isDragActive ? (
            <h3>Drop your report here...</h3>
          ) : (
            <>
              <h3>Drag & Drop your report</h3>
              <p style={{ color: "var(--text-secondary)"}}>Supports .PDF, .DOC, .DOCX</p>
            </>
          )}
          <button className="btn">Select File <ChevronRight size={18}/></button>
          {error && <p style={{ color: 'var(--danger-color)', marginTop: '10px' }}>{error}</p>}
        </div>
      )}

      {loading && (
        <div className="glass-panel fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading-spinner"></div>
          <h3>AI is reading your document...</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Extracting tables, layout semantics, and KPIs.</p>
        </div>
      )}

      {dashboardData && (
        <div className="dashboard-content fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 color="var(--success-color)" />
                    <h2 style={{ margin: 0 }}>Extraction Complete</h2>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }} onClick={resetState}>
                        <RefreshCw size={18} /> Upload New
                    </button>
                    <button className="btn" onClick={() => window.print()}>
                        <Download size={18} /> Export
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                {dashboardData.kpis.map((kpi, idx) => (
                    <div key={idx} className="glass-panel kpi-card fade-in" style={{ animationDelay: `${idx * 0.1}s`}}>
                        <span className="kpi-label">{kpi.label}</span>
                        <span className="kpi-value">{kpi.value}</span>
                        <span className="kpi-trend">
                            {renderTrendIcon(kpi.trend)}
                            <span className={kpi.trend.includes('+') ? 'trend-up' : kpi.trend.includes('-') ? 'trend-down' : 'trend-neutral'}>
                                {kpi.trend} vs last period
                            </span>
                        </span>
                    </div>
                ))}
            </div>

            <div className="charts-grid">
                <div className="glass-panel fade-in chart-full-width" style={{ animationDelay: '0.4s' }}>
                    <h3>Revenue vs Cost Trend (Area)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboardData.barChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f85149" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f85149" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                                <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: '#8b949e' }} />
                                <YAxis stroke="#8b949e" tick={{ fill: '#8b949e' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0d1117', borderColor: '#30363d', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#58a6ff" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                                <Area type="monotone" dataKey="cost" name="Cost" stroke="#f85149" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel fade-in" style={{ animationDelay: '0.45s' }}>
                    <h3>Revenue vs Cost Comparison</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.barChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                                <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: '#8b949e' }} />
                                <YAxis stroke="#8b949e" tick={{ fill: '#8b949e' }} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0d1117', borderColor: '#30363d', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                <Legend />
                                <Bar dataKey="revenue" name="Revenue" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="cost" name="Cost" fill="#f85149" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel fade-in" style={{ animationDelay: '0.5s' }}>
                    <h3>Resource Allocation (Pie)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={dashboardData.pieChart} 
                                    cx="50%" cy="50%" 
                                    innerRadius={70} outerRadius={90} 
                                    paddingAngle={5} dataKey="value"
                                >
                                    {dashboardData.pieChart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0d1117', borderColor: '#30363d', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="glass-panel fade-in" style={{ animationDelay: '0.6s', marginBottom: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} color="var(--accent-color)" /> Extracted Financial Data Breakdowns
                </h3>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Category / Domain</th>
                                <th>Revenue Component</th>
                                <th>Cost Factor</th>
                                <th>Calculated Margin</th>
                                <th>Health</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.tableData && dashboardData.tableData.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 500 }}>{row.category}</td>
                                    <td>{row.revenue}</td>
                                    <td>{row.cost}</td>
                                    <td style={{ color: row.status === 'positive' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                        {row.margin}
                                    </td>
                                    <td>
                                        <span className={`pill ${row.status}`}>
                                            {row.status === 'positive' ? 'Healthy' : 'Review Needed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass-panel summary-box fade-in" style={{ animationDelay: '0.7s' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} color="var(--accent-color)" /> AI Executive Summary
                </h3>
                <p>{dashboardData.summary}</p>
            </div>
        </div>
      )}
    </div>
  );
}
