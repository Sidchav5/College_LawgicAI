// Signup.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import Navbar from "./Navbar";
import API_BASE_URL from "../config";
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, Sparkles, Calendar, Users } from 'lucide-react';

function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
    userType: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    
    if (e.target.name === "password") {
      checkPasswordStrength(e.target.value);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const checkPasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const getStrengthLabel = () => {
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    return labels[passwordStrength] || '';
  };

  const getStrengthColor = () => {
    const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#10b981'];
    return colors[passwordStrength] || '#94a3b8';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => navigate("/"), 1000);
      } else {
        setError(data.message || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        {/* Floating Particles */}
        <div className="auth-particles">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="auth-particle" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${15 + Math.random() * 20}s`,
                width: `${2 + Math.random() * 4}px`,
                height: `${2 + Math.random() * 4}px`
              }}
            />
          ))}
        </div>

        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Shield />
              <div className="auth-logo-glow"></div>
            </div>
            <div className="auth-logo-text">
              <span className="auth-logo-name">AI Ergonomics</span>
              <span className="auth-logo-tagline">Monitor</span>
            </div>
          </div>

          {/* Badge */}
          <div className="auth-badge">
            <Sparkles className="auth-badge-icon" />
            <span>Free Trial</span>
          </div>

          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join thousands of users improving their ergonomic health</p>

          {/* Error Message */}
          {error && (
            <div className="auth-message error">
              <AlertCircle className="auth-message-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="auth-message success">
              <CheckCircle className="auth-message-icon" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Field */}
            <div className="input-group">
              <label className="input-label">
                <User className="input-label-icon" />
                Full Name
              </label>
              <div className="input-wrapper">
                <User className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="input-group">
              <label className="input-label">
                <Mail className="input-label-icon" />
                Email Address
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="input-group">
              <label className="input-label">
                <Lock className="input-label-icon" />
                Password
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Create a password (min 6 chars)"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar-wrapper">
                    <div 
                      className="strength-bar"
                      style={{ 
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: getStrengthColor()
                      }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: getStrengthColor() }}>
                    {getStrengthLabel()}
                  </span>
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="input-group">
              <label className="input-label">
                <Calendar className="input-label-icon" />
                Date of Birth
              </label>
              <div className="input-wrapper">
                <input
                  type="date"
                  name="dob"
                  required
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* User Type */}
            <div className="input-group">
              <label className="input-label">
                <Users className="input-label-icon" />
                I am a
              </label>
              <select
                name="userType"
                onChange={handleChange}
                className="select-input"
                value={formData.userType}
              >
                <option value="user">User</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Terms & Conditions */}
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="custom-checkbox">
                  <CheckCircle className="check-icon" />
                </span>
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="forgot-link">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="forgot-link">Privacy Policy</Link>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">or</span>
            <span className="divider-line"></span>
          </div>

          {/* Social Buttons */}
          <div className="social-buttons">
            <button className="social-btn google">
              <svg className="social-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>
          </div>

          {/* Footer */}
          <p className="auth-footer">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
              <ArrowRight className="auth-link-arrow" />
            </Link>
          </p>

          {/* Trust Badges */}
          <div className="auth-trust">
            <div className="trust-item">
              <Shield className="trust-item-icon" />
              <span>Secure & Private</span>
            </div>
            <div className="trust-item">
              <CheckCircle className="trust-item-icon" />
              <span>AI-Powered</span>
            </div>
            <div className="trust-item">
              <Sparkles className="trust-item-icon" />
              <span>Free 14-Day Trial</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Signup;