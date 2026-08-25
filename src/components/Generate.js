// Generate.js
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
  const [expandedFields, setExpandedFields] = useState(false);

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

    const requiredFields = getRequiredFields();
    for (const field of requiredFields) {
      if (!formData[field] || !formData[field].trim()) {
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
        const newGeneration = {
          id: Date.now(),
          type: contractType,
          timestamp: new Date().toISOString(),
          contract: data.contract,
          formData: { ...formData }
        };
        setGenerationHistory(prev => [newGeneration, ...prev.slice(0, 9)]);
        showMessage("Contract generated successfully!", "success");
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const getContractTypeIcon = () => {
    const icons = {
      "Employment Agreement": "fa-user-tie",
      "Non-Disclosure Agreement (NDA)": "fa-file-signature",
      "Service Agreement": "fa-handshake",
      "Lease Agreement": "fa-home",
      "Freelancer Contract": "fa-laptop",
      "Partnership Agreement": "fa-users",
      "Consulting Agreement": "fa-chart-line",
      "Sales Agreement": "fa-shopping-cart"
    };
    return icons[contractType] || "fa-file-contract";
  };

  const renderDynamicFields = () => {
    const renderField = (name, label, type = "text", placeholder = "", required = false, rows = null) => {
      const value = formData[name] || "";
      return (
        <div className="form-group" key={name}>
          <label>
            {label} {required && <span className="required-star">*</span>}
          </label>
          {type === "textarea" ? (
            <textarea
              name={name}
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder}
              rows={rows || 3}
              required={required}
            />
          ) : type === "number" ? (
            <input
              type="number"
              name={name}
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder}
              required={required}
              min="0"
            />
          ) : type === "date" ? (
            <input
              type="date"
              name={name}
              value={value}
              onChange={handleInputChange}
              required={required}
            />
          ) : (
            <input
              type="text"
              name={name}
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder}
              required={required}
            />
          )}
        </div>
      );
    };

    switch (contractType) {
      case "Employment Agreement":
        return (
          <div className="fields-grid">
            {renderField("employer", "Employer Name", "text", "Enter employer's legal name", true)}
            {renderField("employee", "Employee Name", "text", "Enter employee's full name", true)}
            {renderField("jobTitle", "Job Title", "text", "Enter job title", true)}
            {renderField("startDate", "Start Date", "date", "", true)}
            {renderField("salary", "Salary", "text", "e.g., $50,000 annually")}
            {renderField("workLocation", "Work Location", "text", "Enter work location")}
          </div>
        );
      case "Non-Disclosure Agreement (NDA)":
        return (
          <div className="fields-grid">
            {renderField("disclosingParty", "Disclosing Party", "text", "Party sharing confidential information", true)}
            {renderField("receivingParty", "Receiving Party", "text", "Party receiving confidential information", true)}
            {renderField("purpose", "Purpose", "text", "Purpose of information sharing", true)}
            {renderField("duration", "Duration (months)", "number", "Enter duration in months", true)}
            {renderField("governingLaw", "Governing Law", "text", "e.g., State of California")}
          </div>
        );
      case "Service Agreement":
        return (
          <div className="fields-grid">
            {renderField("client", "Client Name", "text", "Enter client's legal name", true)}
            {renderField("provider", "Service Provider", "text", "Enter service provider's name", true)}
            {renderField("serviceDetails", "Service Description", "textarea", "Detailed description of services", true, 3)}
            {renderField("paymentTerms", "Payment Terms", "text", "e.g., $1000 upon completion", true)}
            {renderField("term", "Term of Agreement", "text", "e.g., 12 months from start date")}
            {renderField("termination", "Termination Clause", "textarea", "Conditions for contract termination", false, 2)}
          </div>
        );
      case "Lease Agreement":
        return (
          <div className="fields-grid">
            {renderField("landlord", "Landlord Name", "text", "Enter landlord's legal name", true)}
            {renderField("tenant", "Tenant Name", "text", "Enter tenant's full name", true)}
            {renderField("propertyAddress", "Property Address", "textarea", "Full property address", true, 2)}
            {renderField("rentAmount", "Rent Amount", "text", "e.g., $2,000 per month", true)}
            {renderField("leaseTerm", "Lease Term", "text", "e.g., 12 months", true)}
          </div>
        );
      case "Freelancer Contract":
        return (
          <div className="fields-grid">
            {renderField("client", "Client Name", "text", "Enter client's name", true)}
            {renderField("freelancer", "Freelancer Name", "text", "Enter freelancer's name", true)}
            {renderField("projectDescription", "Project Description", "textarea", "Describe the project scope", true, 3)}
            {renderField("deliverables", "Deliverables", "textarea", "List expected deliverables", true, 2)}
            {renderField("paymentAmount", "Payment Amount", "text", "e.g., $5,000", true)}
          </div>
        );
      case "Partnership Agreement":
        return (
          <div className="fields-grid">
            {renderField("partner1", "Partner 1 Name", "text", "Enter first partner's name", true)}
            {renderField("partner2", "Partner 2 Name", "text", "Enter second partner's name", true)}
            {renderField("businessName", "Business Name", "text", "Enter business name", true)}
            {renderField("profitSharing", "Profit Sharing", "text", "e.g., 50/50", true)}
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
        {/* Header */}
        <div className="generate-header">
          <div className="header-badge">
            <span>AI-Powered Generation</span>
          </div>
          <h1 className="generate-title">Generate Contract</h1>
          <p className="generate-subtitle">
            Select a contract type and fill in the required details to generate a professional draft
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="message-banner error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button className="close-btn" onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className="message-banner success">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
            <button className="close-btn" onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        {showHistory ? (
          <div className="history-panel">
            <div className="history-header">
              <h3><i className="fas fa-history"></i> Generation History</h3>
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
                        <div className="history-type">
                          <i className={`fas ${getContractTypeIcon()}`}></i>
                          {generation.type}
                        </div>
                        <div className="history-date">
                          <i className="fas fa-clock"></i>
                          {new Date(generation.timestamp).toLocaleString()}
                        </div>
                        <div className="history-preview">
                          {Object.entries(generation.formData).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="data-preview">
                              {key}: {value}
                            </span>
                          ))}
                          {Object.entries(generation.formData).length > 3 && (
                            <span className="data-preview more">+{Object.entries(generation.formData).length - 3} more</span>
                          )}
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
                <p className="empty-sub">Your generated contracts will appear here</p>
              </div>
            )}
          </div>
        ) : generatedContract ? (
          <div className="contract-result">
            <div className="result-header">
              <div>
                <h3>
                  <i className="fas fa-file-contract"></i> Generated Contract Draft
                </h3>
                <p className="result-subtitle">
                  {contractType} • {new Date().toLocaleDateString()}
                </p>
              </div>
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
                  <i className="fas fa-plus"></i> New Contract
                </button>
              </div>
            </div>
            <div className="contract-content">
              <pre className="contract-textarea">{generatedContract}</pre>
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
                    <label>
                      Contract Type <span className="required-star">*</span>
                    </label>
                    <select 
                      value={contractType} 
                      onChange={(e) => {
                        setContractType(e.target.value);
                        setFormData({});
                      }}
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