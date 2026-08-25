import React, { useState, useEffect } from "react";
import "./Generate.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import API_BASE_URL from "../config";

function Generate() {
  const [contractType, setContractType] = useState("");
  const [formData, setFormData] = useState({});
  const [generatedContract, setGeneratedContract] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generationHistory, setGenerationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const contractOptions = [
    "Employment Agreement",
    "Non-Disclosure Agreement (NDA)",
    "Service Agreement",
    "Lease Agreement",
    "Freelancer Contract",
    "Partnership Agreement",
    "Consulting Agreement",
    "Sales Agreement"
  ];

  // Load generation history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("contractGenerationHistory");
    if (savedHistory) {
      setGenerationHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save generation history to localStorage
  useEffect(() => {
    if (generationHistory.length > 0) {
      localStorage.setItem("contractGenerationHistory", JSON.stringify(generationHistory));
    }
  }, [generationHistory]);

  const showMessage = (message, type = "error") => {
    if (type === "error") {
      setError(message);
      setTimeout(() => setError(""), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(""), 5000);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  const validateForm = () => {
    if (!contractType) {
      showMessage("Please select a contract type!");
      return false;
    }

    // Basic validation for required fields
    const requiredFields = getRequiredFields();
    for (const field of requiredFields) {
      if (!formData[field]) {
        showMessage(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    return true;
  };

  const getRequiredFields = () => {
    switch (contractType) {
      case "Employment Agreement":
        return ["employer", "employee", "jobTitle", "startDate"];
      case "Non-Disclosure Agreement (NDA)":
        return ["disclosingParty", "receivingParty", "purpose", "duration"];
      case "Service Agreement":
        return ["client", "provider", "serviceDetails", "paymentTerms"];
      case "Lease Agreement":
        return ["landlord", "tenant", "propertyAddress", "rentAmount", "leaseTerm"];
      case "Freelancer Contract":
        return ["client", "freelancer", "projectDescription", "deliverables", "paymentAmount"];
      case "Partnership Agreement":
        return ["partner1", "partner2", "businessName", "profitSharing"];
      default:
        return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setGeneratedContract("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/generate-contract`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ contractType, formData }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedContract(data.contract);
        // Add to history
        const newGeneration = {
          id: Date.now(),
          type: contractType,
          timestamp: new Date().toISOString(),
          contract: data.contract,
          formData: { ...formData }
        };
        setGenerationHistory(prev => [newGeneration, ...prev.slice(0, 9)]); // Keep last 10
        showMessage("Contract generated successfully!", "success");
      } else {
        showMessage(data.error || "Failed to generate contract");
      }
    } catch (error) {
      console.error("Error generating contract:", error);
      showMessage("Failed to connect to generation service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContractType("");
    setFormData({});
    setGeneratedContract("");
    setError("");
    setSuccess("");
  };

  const loadFromHistory = (generation) => {
    setContractType(generation.type);
    setFormData(generation.formData);
    setGeneratedContract(generation.contract);
    setShowHistory(false);
    showMessage("Contract loaded from history", "success");
  };

  const clearHistory = () => {
    setGenerationHistory([]);
    localStorage.removeItem("contractGenerationHistory");
    showMessage("Generation history cleared", "success");
  };

  const downloadContract = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedContract], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${contractType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showMessage("Contract downloaded successfully!", "success");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContract);
      showMessage("Contract copied to clipboard!", "success");
    } catch (err) {
      showMessage("Failed to copy to clipboard");
    }
  };

  const renderDynamicFields = () => {
    switch (contractType) {
      case "Employment Agreement":
        return (
          <div className="fields-grid">
            <div className="form-group">
              <label>Employer Name *</label>
              <input 
                type="text" 
                name="employer" 
                value={formData.employer || ""}
                onChange={handleInputChange} 
                placeholder="Enter employer's legal name"
                required 
              />
            </div>
            <div className="form-group">
              <label>Employee Name *</label>
              <input 
                type="text" 
                name="employee" 
                value={formData.employee || ""}
                onChange={handleInputChange} 
                placeholder="Enter employee's full name"
                required 
              />
            </div>
            <div className="form-group">
              <label>Job Title *</label>
              <input 
                type="text" 
                name="jobTitle" 
                value={formData.jobTitle || ""}
                onChange={handleInputChange} 
                placeholder="Enter job title"
                required 
              />
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input 
                type="date" 
                name="startDate" 
                value={formData.startDate || ""}
                onChange={handleInputChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Salary</label>
              <input 
                type="text" 
                name="salary" 
                value={formData.salary || ""}
                onChange={handleInputChange} 
                placeholder="e.g., $50,000 annually"
              />
            </div>
            <div className="form-group">
              <label>Work Location</label>
              <input 
                type="text" 
                name="workLocation" 
                value={formData.workLocation || ""}
                onChange={handleInputChange} 
                placeholder="Enter work location"
              />
            </div>
          </div>
        );
      case "Non-Disclosure Agreement (NDA)":
        return (
          <div className="fields-grid">
            <div className="form-group">
              <label>Disclosing Party *</label>
              <input 
                type="text" 
                name="disclosingParty" 
                value={formData.disclosingParty || ""}
                onChange={handleInputChange} 
                placeholder="Party sharing confidential information"
                required 
              />
            </div>
            <div className="form-group">
              <label>Receiving Party *</label>
              <input 
                type="text" 
                name="receivingParty" 
                value={formData.receivingParty || ""}
                onChange={handleInputChange} 
                placeholder="Party receiving confidential information"
                required 
              />
            </div>
            <div className="form-group">
              <label>Purpose *</label>
              <input 
                type="text" 
                name="purpose" 
                value={formData.purpose || ""}
                onChange={handleInputChange} 
                placeholder="Purpose of information sharing"
                required 
              />
            </div>
            <div className="form-group">
              <label>Duration (months) *</label>
              <input 
                type="number" 
                name="duration" 
                value={formData.duration || ""}
                onChange={handleInputChange} 
                min="1"
                max="120"
                required 
              />
            </div>
            <div className="form-group">
              <label>Governing Law</label>
              <input 
                type="text" 
                name="governingLaw" 
                value={formData.governingLaw || ""}
                onChange={handleInputChange} 
                placeholder="e.g., State of California"
              />
            </div>
          </div>
        );
      case "Service Agreement":
        return (
          <div className="fields-grid">
            <div className="form-group">
              <label>Client Name *</label>
              <input 
                type="text" 
                name="client" 
                value={formData.client || ""}
                onChange={handleInputChange} 
                placeholder="Enter client's legal name"
                required 
              />
            </div>
            <div className="form-group">
              <label>Service Provider *</label>
              <input 
                type="text" 
                name="provider" 
                value={formData.provider || ""}
                onChange={handleInputChange} 
                placeholder="Enter service provider's name"
                required 
              />
            </div>
            <div className="form-group">
              <label>Service Description *</label>
              <textarea 
                name="serviceDetails" 
                value={formData.serviceDetails || ""}
                onChange={handleInputChange} 
                placeholder="Detailed description of services to be provided"
                rows="3"
                required 
              />
            </div>
            <div className="form-group">
              <label>Payment Terms *</label>
              <input 
                type="text" 
                name="paymentTerms" 
                value={formData.paymentTerms || ""}
                onChange={handleInputChange} 
                placeholder="e.g., $1000 upon completion, net 30"
                required 
              />
            </div>
            <div className="form-group">
              <label>Term of Agreement</label>
              <input 
                type="text" 
                name="term" 
                value={formData.term || ""}
                onChange={handleInputChange} 
                placeholder="e.g., 12 months from start date"
              />
            </div>
            <div className="form-group">
              <label>Termination Clause</label>
              <textarea 
                name="termination" 
                value={formData.termination || ""}
                onChange={handleInputChange} 
                placeholder="Conditions for contract termination"
                rows="2"
              />
            </div>
          </div>
        );
      case "Lease Agreement":
        return (
          <div className="fields-grid">
            <div className="form-group">
              <label>Landlord Name *</label>
              <input type="text" name="landlord" onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Tenant Name *</label>
              <input type="text" name="tenant" onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Property Address *</label>
              <textarea name="propertyAddress" onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Rent Amount *</label>
              <input type="text" name="rentAmount" onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Lease Term *</label>
              <input type="text" name="leaseTerm" onChange={handleInputChange} required />
            </div>
          </div>
        );
      default:
        return (
          <div className="empty-state">
            <i className="fas fa-file-contract"></i>
            <p>Select a contract type to see required fields</p>
          </div>
        );
    }
  };

  return (
    <>
      <Navbar />
      <div className="generate-container">
        <div className="generate-header">
          <h1 className="generate-title">Generate Contract</h1>
          <p className="generate-subtitle">
            Select a contract type and fill in the required details to generate a professional draft
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

        {showHistory ? (
          <div className="history-panel">
            <div className="history-header">
              <h3>Generation History</h3>
              <button className="btn secondary" onClick={() => setShowHistory(false)}>
                <i className="fas fa-arrow-left"></i> Back to Generator
              </button>
            </div>
            {generationHistory.length > 0 ? (
              <>
                <div className="history-actions">
                  <button className="btn secondary" onClick={clearHistory}>
                    <i className="fas fa-trash"></i> Clear History
                  </button>
                </div>
                <div className="history-list">
                  {generationHistory.map((generation) => (
                    <div key={generation.id} className="history-item">
                      <div className="history-info">
                        <div className="history-type">{generation.type}</div>
                        <div className="history-date">
                          {new Date(generation.timestamp).toLocaleString()}
                        </div>
                        <div className="history-preview">
                          {Object.entries(generation.formData).slice(0, 2).map(([key, value]) => (
                            <span key={key} className="data-preview">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button 
                        className="btn secondary"
                        onClick={() => loadFromHistory(generation)}
                      >
                        <i className="fas fa-eye"></i> Load
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-history">
                <i className="fas fa-history"></i>
                <p>No generation history yet</p>
              </div>
            )}
          </div>
        ) : generatedContract ? (
          <div className="contract-result">
            <div className="result-header">
              <h3>
                <i className="fas fa-file-contract"></i> Generated Contract Draft
              </h3>
              <div className="result-actions">
                <button className="btn secondary" onClick={copyToClipboard}>
                  <i className="fas fa-copy"></i> Copy
                </button>
                <button className="btn secondary" onClick={downloadContract}>
                  <i className="fas fa-download"></i> Download
                </button>
                <button className="btn secondary" onClick={() => setShowHistory(true)}>
                  <i className="fas fa-history"></i> History
                </button>
                <button className="btn primary" onClick={resetForm}>
                  <i className="fas fa-plus"></i> Generate New
                </button>
              </div>
            </div>
            <div className="contract-content">
              <textarea 
                value={generatedContract} 
                readOnly 
                rows="25"
                className="contract-textarea"
              ></textarea>
            </div>
          </div>
        ) : (
          <div className="generate-content">
            <div className="form-section">
              <form className="generate-form" onSubmit={handleSubmit}>
                <div className="form-card">
                  <div className="card-header">
                    <h3>
                      <i className="fas fa-edit"></i> Contract Details
                    </h3>
                    {generationHistory.length > 0 && (
                      <button 
                        type="button"
                        className="btn secondary"
                        onClick={() => setShowHistory(true)}
                      >
                        <i className="fas fa-history"></i> History ({generationHistory.length})
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Contract Type *</label>
                    <select 
                      value={contractType} 
                      onChange={(e) => setContractType(e.target.value)}
                      className="form-select"
                    >
                      <option value="">-- Select Contract Type --</option>
                      {contractOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="dynamic-fields">
                    {renderDynamicFields()}
                  </div>

                  <button 
                    type="submit" 
                    className="btn primary generate-btn" 
                    disabled={loading || !contractType}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Generating Contract...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic"></i> Generate Contract
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Tips */}
            <div className="quick-tips">
              <h4>
                <i className="fas fa-lightbulb"></i> Tips for Better Contracts
              </h4>
              <div className="tips-grid">
                <div className="tip">
                  <i className="fas fa-check-circle"></i>
                  <span>Fill all required fields accurately</span>
                </div>
                <div className="tip">
                  <i className="fas fa-balance-scale"></i>
                  <span>Review generated contract with legal counsel</span>
                </div>
                <div className="tip">
                  <i className="fas fa-file-signature"></i>
                  <span>Ensure all parties sign the final document</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default Generate;