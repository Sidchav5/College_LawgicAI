import React, { useState, useRef, useEffect } from "react";
import "./AnalyseContract.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import API_BASE_URL from "../config";

function AnalyseContract() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Load analysis history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("contractAnalysisHistory");
    if (savedHistory) {
      setAnalysisHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save analysis history to localStorage whenever it changes
  useEffect(() => {
    if (analysisHistory.length > 0) {
      localStorage.setItem("contractAnalysisHistory", JSON.stringify(analysisHistory));
    }
  }, [analysisHistory]);

  const showMessage = (message, type = "error") => {
    if (type === "error") {
      setError(message);
      setTimeout(() => setError(""), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(""), 5000);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      showMessage("Please enter some contract text to analyze!");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/analyze-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAnalysisResult(data);
        // Add to history
        const newAnalysis = {
          id: Date.now(),
          type: "text",
          timestamp: new Date().toISOString(),
          result: data,
          preview: text.substring(0, 100) + "..."
        };
        setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 9)]); // Keep last 10
        showMessage("Analysis completed successfully!", "success");
      } else {
        showMessage(data.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing text:", error);
      showMessage("Failed to connect to analysis service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
          showMessage("File size must be less than 10MB");
          return;
        }
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setError("");
      } else {
        showMessage("Please upload a PDF file only.");
      }
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      showMessage("Please upload a PDF file first!");
      return;
    }
    
    setIsLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/analyze-pdf`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAnalysisResult(data);
        // Add to history
        const newAnalysis = {
          id: Date.now(),
          type: "pdf",
          timestamp: new Date().toISOString(),
          result: data,
          fileName: fileName
        };
        setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 9)]);
        showMessage("PDF analysis completed successfully!", "success");
      } else {
        showMessage(data.error || "PDF analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing PDF:", error);
      showMessage("Failed to upload and analyze PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === "application/pdf") {
        if (droppedFile.size > 10 * 1024 * 1024) {
          showMessage("File size must be less than 10MB");
          return;
        }
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setError("");
      } else {
        showMessage("Please upload a PDF file only.");
      }
    }
  };

  const handleBrowseClick = () => fileInputRef.current?.click();

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setError("");
    setSuccess("");
    if (activeTab === "text") {
      setText("");
    } else {
      setFile(null);
      setFileName("");
    }
  };

  const loadFromHistory = (analysis) => {
    setAnalysisResult(analysis.result);
    setShowHistory(false);
    showMessage("Analysis loaded from history", "success");
  };

  const clearHistory = () => {
    setAnalysisHistory([]);
    localStorage.removeItem("contractAnalysisHistory");
    showMessage("Analysis history cleared", "success");
  };

  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "severity-high";
      case "medium":
        return "severity-medium";
      case "low":
        return "severity-low";
      default:
        return "";
    }
  };

  const getRiskStats = () => {
    if (!analysisResult?.results) return { high: 0, medium: 0, low: 0, total: 0 };
    
    const results = analysisResult.results;
    return {
      high: results.filter((c) => c.risk_model === "High").length,
      medium: results.filter((c) => c.risk_model === "Medium").length,
      low: results.filter((c) => c.risk_model === "Low").length,
      total: results.length
    };
  };

  const riskStats = getRiskStats();

  const exportResults = () => {
    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contract-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage("Results exported successfully!", "success");
  };

  return (
    <>
      <Navbar />
      <div className="analyse-container">
        <div className="analyse-header">
          <h2 className="analyse-title">Analyze Contract</h2>
          <p className="analyse-subtitle">
            Upload a contract or paste text to identify potential issues and
            receive improvement suggestions
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="message-banner error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}
        {success && (
          <div className="message-banner success">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {analysisResult ? (
          <div className="analysis-results">
            <div className="results-header">
              <div>
                <h3>Analysis Results</h3>
                <p className="results-subtitle">
                  Analyzed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="results-actions">
                <button className="analyse-btn secondary" onClick={exportResults}>
                  <i className="fas fa-download"></i> Export Results
                </button>
                <button className="analyse-btn secondary" onClick={() => setShowHistory(true)}>
                  <i className="fas fa-history"></i> History
                </button>
                <button className="analyse-btn primary" onClick={resetAnalysis}>
                  <i className="fas fa-plus"></i> Analyze Another
                </button>
              </div>
            </div>

            {/* Risk Summary Cards */}
            <div className="risk-summary-cards">
              <div className="risk-card total">
                <div className="risk-icon">
                  <i className="fas fa-file-contract"></i>
                </div>
                <div className="risk-info">
                  <span className="risk-count">{riskStats.total}</span>
                  <span className="risk-label">Total Clauses</span>
                </div>
              </div>
              <div className="risk-card high">
                <div className="risk-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="risk-info">
                  <span className="risk-count">{riskStats.high}</span>
                  <span className="risk-label">High Risk</span>
                </div>
              </div>
              <div className="risk-card medium">
                <div className="risk-icon">
                  <i className="fas fa-exclamation-circle"></i>
                </div>
                <div className="risk-info">
                  <span className="risk-count">{riskStats.medium}</span>
                  <span className="risk-label">Medium Risk</span>
                </div>
              </div>
              <div className="risk-card low">
                <div className="risk-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="risk-info">
                  <span className="risk-count">{riskStats.low}</span>
                  <span className="risk-label">Low Risk</span>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="results-summary">
              <h4>Result Summary</h4>
              <p>Total clauses analyzed: {riskStats.total}</p>
              <p>High risk: {riskStats.high}</p>
              <p>Medium risk: {riskStats.medium}</p>
              <p>Low risk: {riskStats.low}</p>
            </div>

            {/* Detailed Analysis */}
            <div className="issues-found">
              <div className="section-header">
                <h4>Clause-wise Analysis</h4>
                <span className="section-badge">{analysisResult.results.length} clauses</span>
              </div>
              {analysisResult.results.map((clause, index) => (
                <div
                  key={index}
                  className={`clause-detail ${getSeverityClass(clause.risk_model)}`}
                >
                  <div className="clause-header">
                    <h5>Clause {clause.clause_no}</h5>
                    <div className="risk-badges">
                      <span className={`risk-badge model ${getSeverityClass(clause.risk_model)}`}>
                        Final: {clause.risk_model}
                        {clause.confidence && (
                          <span className="confidence"> ({(clause.confidence * 100).toFixed(1)}%)</span>
                        )}
                      </span>
                      {clause.risk_bert && (
                        <span className={`risk-badge bert ${getSeverityClass(clause.risk_bert)}`}>
                          ML Base: {clause.risk_bert}
                        </span>
                      )}
                      {clause.risk_llm && clause.risk_llm !== "N/A" && clause.risk_llm !== "Error" && (
                        <span className={`risk-badge llm ${getSeverityClass(clause.risk_llm)}`} style={{backgroundColor: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', border: '1px solid rgba(124, 58, 237, 0.4)'}}>
                          LLM Judge: {clause.risk_llm}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="clause-content">
                    <p className="clause-statement">
                      <strong>Clause Statement:</strong> {clause.statement}
                    </p>
                    
                    {/* Fusion Note */}
                    {clause.fusion_note && (
                      <div className="fusion-note" style={{marginBottom: '15px', padding: '10px 14px', backgroundColor: 'rgba(96,165,250,0.08)', borderRadius: '8px', borderLeft: '3px solid #60a5fa', fontSize: '0.9rem', color: '#94a3b8'}}>
                        <strong style={{color: '#60a5fa'}}><i className="fas fa-code-branch"></i> Ensemble Fusion:</strong> {clause.fusion_note}
                      </div>
                    )}
                    
                    {/* Description from LLM */}
                    {clause.description && clause.description !== "Enable LLM analysis for detailed explanation" && (
                      <p className="clause-description">
                        <strong>📋 Description:</strong> {clause.description}
                      </p>
                    )}

                    {/* Fallback when LLM is disabled */}
                    {clause.description === "Enable LLM analysis for detailed explanation" && (
                      <p className="llm-disabled-notice">
                        <em>⚠️ LLM analysis not available. Set GEMINI_API_KEY to enable detailed explanations.</em>
                      </p>
                    )}

                    {/* Suggestions from LLM */}
                    {clause.suggestions && clause.suggestions.length > 0 && (
                      <div className="suggestions">
                        <strong>💡 Suggestions:</strong>
                        <ul>
                          {clause.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : showHistory ? (
          <div className="analysis-history">
            <div className="history-header">
              <h3>Analysis History</h3>
              <button className="analyse-btn secondary" onClick={() => setShowHistory(false)}>
                <i className="fas fa-arrow-left"></i> Back to Analysis
              </button>
            </div>
            {analysisHistory.length > 0 ? (
              <>
                <div className="history-actions">
                  <button className="analyse-btn secondary" onClick={clearHistory}>
                    <i className="fas fa-trash"></i> Clear History
                  </button>
                </div>
                <div className="history-list">
                  {analysisHistory.map((analysis) => (
                    <div key={analysis.id} className="history-item">
                      <div className="history-info">
                        <div className="history-type">
                          <i className={`fas ${analysis.type === "pdf" ? "fa-file-pdf" : "fa-font"}`}></i>
                          {analysis.type.toUpperCase()} Analysis
                        </div>
                        <div className="history-preview">
                          {analysis.fileName || analysis.preview}
                        </div>
                        <div className="history-date">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button 
                        className="analyse-btn secondary"
                        onClick={() => loadFromHistory(analysis)}
                      >
                        <i className="fas fa-eye"></i> View
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-history">
                <i className="fas fa-history"></i>
                <p>No analysis history yet</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="tab-container">
              <button
                className={`tab-button ${activeTab === "text" ? "active" : ""}`}
                onClick={() => setActiveTab("text")}
              >
                <i className="fas fa-font"></i> Text Input
              </button>
              <button
                className={`tab-button ${activeTab === "file" ? "active" : ""}`}
                onClick={() => setActiveTab("file")}
              >
                <i className="fas fa-file-pdf"></i> PDF Upload
              </button>
              {analysisHistory.length > 0 && (
                <button
                  className="tab-button history-tab"
                  onClick={() => setShowHistory(true)}
                >
                  <i className="fas fa-history"></i> History ({analysisHistory.length})
                </button>
              )}
            </div>

            <div className="analyse-options">
              {activeTab === "text" ? (
                <div className="analyse-card">
                  <div className="card-header">
                    <h3>
                      <i className="fas fa-font"></i> Enter Contract Text
                    </h3>
                    <div className="text-stats">
                      <span className="char-count">{text.length} characters</span>
                      <span className="word-count">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
                    </div>
                  </div>
                  <form onSubmit={handleTextSubmit}>
                    <textarea
                      className="analyse-textarea"
                      rows="8"
                      placeholder="Paste or type your contract text here..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="analyse-btn primary"
                      disabled={isLoading || !text.trim()}
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Analyzing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search"></i> Analyze Text
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="analyse-card">
                  <div className="card-header">
                    <h3>
                      <i className="fas fa-file-pdf"></i> Upload PDF Contract
                    </h3>
                    <span className="file-size-limit">Max 10MB</span>
                  </div>
                  <form onSubmit={handleFileSubmit}>
                    <div
                      className={`file-drop-zone ${
                        isDragging ? "dragging" : ""
                      } ${fileName ? "has-file" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={handleBrowseClick}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="analyse-file-input"
                      />
                      <div className="drop-content">
                        <i className="fas fa-cloud-upload-alt"></i>
                        {fileName ? (
                          <>
                            <p className="file-name">{fileName}</p>
                            <p className="click-to-change">
                              Click or drag to change file
                            </p>
                          </>
                        ) : (
                          <>
                            <p>Drag & Drop your PDF file here</p>
                            <p>or click to browse</p>
                            <p className="file-hint">Supported: PDF files up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="analyse-btn primary"
                      disabled={isLoading || !file}
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Analyzing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search"></i> Analyze PDF
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="quick-tips">
              <h4>
                <i className="fas fa-lightbulb"></i> Tips for Better Analysis
              </h4>
              <div className="tips-grid">
                <div className="tip">
                  <i className="fas fa-text-width"></i>
                  <span>Ensure text is clear and properly formatted</span>
                </div>
                <div className="tip">
                  <i className="fas fa-file-alt"></i>
                  <span>Use high-quality PDF scans for best results</span>
                </div>
                <div className="tip">
                  <i className="fas fa-clipboard-check"></i>
                  <span>Include all relevant clauses and sections</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer/>
    </>
  );
}

export default AnalyseContract;