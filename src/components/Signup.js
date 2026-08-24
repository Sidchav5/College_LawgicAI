import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import Navbar from "./Navbar";
import API_BASE_URL from "../config";

function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
    userType: "user",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Save token in localStorage
        localStorage.setItem("token", data.token);
        alert("Signup successful!");
        navigate("/"); // redirect to homepage
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      alert("Something went wrong. Try again!");
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join our community today</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                required
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Date of Birth</label>
              <input
                type="date"
                name="dob"
                required
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label className="input-label">I am a</label>
              <select
                name="userType"
                onChange={handleChange}
                className="select-input"
              >
                <option value="user">User</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <button type="submit" className="auth-button">
              Create Account
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <a href="/login" className="auth-link">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

export default Signup;
