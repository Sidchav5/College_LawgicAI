// src/components/HeroSection.js
import React from 'react';
import Navbar from './Navbar';

function HeroSection() {
  return (
    <header>
      <div className="hero-section">
        <Navbar />
        <div className="poster">
          <p className="poster-name">Welcome to AI Contract Risk Platform</p>
        </div>
        <div className="poster-info">
          <p>
            "GuardPass AI Contract Risk Platform is an intelligent solution for analyzing contracts and legal documents. Users can assess risks, identify contradictions, and get AI-driven insights for safer, more informed decision-making. Designed for legal teams and professionals, it ensures contracts are clear, compliant, and risk-free."
          </p>
        </div>
      </div>
    </header>
  );
}

export default HeroSection;
