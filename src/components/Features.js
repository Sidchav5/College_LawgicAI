// Features.js
import React from "react";
import { Link } from "react-router-dom";
import "./Features.css";

function Features() {
  const features = [
    {
      id: 1,
      icon: "fa-file-contract",
      title: "Analyse Contract",
      text: "AI-powered risk analysis to detect contradictions, risks, and loopholes in your contracts instantly.",
      link: "/analyse",
      gradient: "blue",
      badge: "AI Powered"
    },
    {
      id: 2,
      icon: "fa-pen-fancy",
      title: "Generate Contract",
      text: "Easily generate legally compliant contracts tailored to your needs with AI-driven templates.",
      link: "/generate",
      gradient: "green",
      badge: "Smart"
    },
    {
      id: 3,
      icon: "fa-users",
      title: "Community Support",
      text: "Engage with a vibrant community of legal professionals and users for insights and advice.",
      link: "/Community",
      gradient: "purple",
      badge: "Active"
    },
    {
      id: 4,
      icon: "fa-user-tie",
      title: "Expert Advice",
      text: "Connect with experienced legal experts for professional consultation and support.",
      link: "#",
      gradient: "orange",
      badge: "Premium"
    }
  ];

  const getGradientStyles = (gradient) => {
    const styles = {
      blue: {
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(59, 130, 246, 0.05))',
        borderColor: 'rgba(37, 99, 235, 0.3)',
        iconBg: 'rgba(37, 99, 235, 0.15)',
        iconColor: '#60a5fa'
      },
      green: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(52, 211, 153, 0.05))',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#34d399'
      },
      purple: {
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(167, 139, 250, 0.05))',
        borderColor: 'rgba(124, 58, 237, 0.3)',
        iconBg: 'rgba(124, 58, 237, 0.15)',
        iconColor: '#a78bfa'
      },
      orange: {
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.05))',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        iconBg: 'rgba(245, 158, 11, 0.15)',
        iconColor: '#fbbf24'
      }
    };
    return styles[gradient] || styles.blue;
  };

  return (
    <section className="features-section">
      {/* Background Effects */}
      <div className="features-bg-effects">
        <div className="features-glow-orb orb-1"></div>
        <div className="features-glow-orb orb-2"></div>
        <div className="features-glow-orb orb-3"></div>
      </div>

      <div className="features-header">
        <span className="features-badge">What We Offer</span>
        <h2 className="features-title">
          Powerful <span className="gradient-text">AI Features</span>
        </h2>
        <p className="features-subtitle">
          Discover our suite of AI-powered tools designed to streamline your legal workflow
        </p>
      </div>

      <div className="features-container">
        {features.map((feature, index) => {
          const styles = getGradientStyles(feature.gradient);
          return (
            <div 
              key={feature.id} 
              className="feature-card"
              style={{ 
                background: styles.background,
                borderColor: styles.borderColor,
                animationDelay: `${index * 0.15}s`
              }}
            >
              <div className="feature-card-glow"></div>
              
              <div className="card-header">
                <div 
                  className="card-icon-container"
                  style={{ background: styles.iconBg }}
                >
                  <i className={`fas ${feature.icon}`} style={{ color: styles.iconColor }}></i>
                </div>
                <span className={`card-badge ${feature.gradient}`}>
                  {feature.badge}
                </span>
              </div>

              <div className="card-body">
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-text">{feature.text}</p>
                <Link to={feature.link} className="card-btn">
                  <span>Learn More</span>
                  <i className="fas fa-arrow-right btn-arrow"></i>
                </Link>
              </div>

              <div className="card-number">{String(feature.id).padStart(2, '0')}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Features;