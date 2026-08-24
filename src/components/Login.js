import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import Navbar from "./Navbar";
import API_BASE_URL from "../config";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        alert("Login successful!");
        navigate("/");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Something went wrong. Try again!");
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="auth-form">
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

            <button type="submit" className="auth-button">
              Sign In
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account?{" "}
            <a href="/signup" className="auth-link">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

export default Login;
