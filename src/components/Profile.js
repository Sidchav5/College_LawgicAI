// src/components/ProfilePage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css"
import Navbar from "./Navbar"
function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsLoading(true);
    fetch("http://127.0.0.1:5000/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setFormData(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        navigate("/login");
      });
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (formData.dob) {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (dobDate >= today) {
        newErrors.dob = "Date of birth must be in the past";
      }
    }
    
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    const token = localStorage.getItem("token");
    fetch("http://127.0.0.1:5000/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        setSuccessMessage(data.message || "Profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        setIsSaving(false);
      })
      .catch((err) => {
        console.error(err);
        setErrors({ general: "Failed to update profile. Please try again." });
        setIsSaving(false);
      });
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <>
    <Navbar />
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>User Profile</h1>
          <div className="user-type-badge">{user.userType}</div>
        </div>
        
        <div className="profile-info">
          <div className="info-item">
            <span className="info-label">Name:</span>
            <span className="info-value">{user.name}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}
          
          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              id="dob"
              type="date"
              name="dob"
              value={formData.dob || ""}
              onChange={handleChange}
              className={errors.dob ? "error" : ""}
            />
            {errors.dob && <span className="field-error">{errors.dob}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">New Password (leave blank to keep current)</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter new password"
              onChange={handleChange}
              className={errors.password ? "error" : ""}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button 
            type="submit" 
            className={`save-btn ${isSaving ? "saving" : ""}`}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="btn-spinner"></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

export default Profile;