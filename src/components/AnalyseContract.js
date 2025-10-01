import React, { useState, useRef } from "react";
import "./AnalyseContract.css";
import Navbar from "./Navbar";

function AnalyseContract() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Please enter some contract text to analyze!");
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/api/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok) setAnalysisResult(data);
      else alert(data.error || "Analysis failed");
    } catch (error) {
      console.error("Error analyzing text:", error);
      alert("Something went wrong while analyzing text.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a PDF file first!");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/api/analyze-pdf", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) setAnalysisResult(data);
      else alert(data.error || "PDF analysis failed");
    } catch (error) {
      console.error("Error analyzing PDF:", error);
      alert("Something went wrong while analyzing PDF.");
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
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setFileName(droppedFile.name);
    } else {
      alert("Please upload a PDF file only.");
    }
  };

  const handleBrowseClick = () => fileInputRef.current.click();

  const resetAnalysis = () => {
    setAnalysisResult(null);
    if (activeTab === "text") setText("");
    else {
      setFile(null);
      setFileName("");
    }
  };

  // FIXED: This function now matches the Python backend's risk levels
  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {  // Added optional chaining and toLowerCase()
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

  return (
    <>
      <Navbar />
      <div className="analyse-container">
        <h2 className="analyse-title">Analyze Contract</h2>
        <p className="analyse-subtitle">
          Upload a contract or paste text to identify potential issues and
          receive improvement suggestions
        </p>

        {analysisResult ? (
          <div className="analysis-results">
            <div className="results-header">
              <h3>Analysis Results</h3>
              <button className="analyse-btn secondary" onClick={resetAnalysis}>
                Analyze Another Contract
              </button>
            </div>

            <div className="results-summary">
              <h4>Result Summary</h4>
              <p>Total clauses analyzed: {analysisResult.results.length}</p>
              <p>
                High risk:{" "}
                {
                  analysisResult.results.filter(
                    (c) => c.risk_model === "High"
                  ).length
                }
              </p>
              <p>
                Medium risk:{" "}
                {
                  analysisResult.results.filter(
                    (c) => c.risk_model === "Medium"
                  ).length
                }
              </p>
              <p>
                Low risk:{" "}
                {
                  analysisResult.results.filter(
                    (c) => c.risk_model === "Low"
                  ).length
                }
              </p>
            </div>

            <div className="issues-found">
              <h4>Clause-wise Analysis</h4>
              {analysisResult.results.map((clause, index) => (
                <div
                  key={index}
                  className={`clause-detail ${getSeverityClass(
                    clause.risk_model
                  )}`}
                >
                  <h5>Clause ID: {clause.clause_no}</h5>
                  <p>
                    <strong>Clause Statement:</strong> {clause.statement}
                  </p>
                  <p>
                    <strong>Risk according to our model:</strong>{" "}
                    {clause.risk_model}
                  </p>
                  <p>
                    <strong>Risk according to BERT model:</strong>{" "}
                    {clause.risk_bert} 
                    {/* FIXED: Display confidence properly */}
                    {clause.confidence && (
                      <span> (Confidence: {(clause.confidence * 100).toFixed(1)}%)</span>
                    )}
                  </p>
                  {clause.description && (
                    <p>
                      <strong>Description:</strong> {clause.description}
                    </p>
                  )}
                  {clause.suggestions && clause.suggestions.length > 0 && (
                    <>
                      <p><strong>Suggestions:</strong></p>
                      <ul>
                        {clause.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
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
            </div>

            <div className="analyse-options">
              {activeTab === "text" ? (
                <div className="analyse-card">
                  <div className="card-header">
                    <h3>
                      <i className="fas fa-font"></i> Enter Contract Text
                    </h3>
                    <span className="char-count">{text.length} characters</span>
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
                      className="analyse-btn"
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
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="analyse-btn"
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
          </>
        )}
      </div>
    </>
  );
}

export default AnalyseContract;