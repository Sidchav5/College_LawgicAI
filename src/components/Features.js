import React from "react";
import "./Features.css";

function Features() {
  const features = [
    {
      img: "https://cdn-icons-png.flaticon.com/512/942/942751.png",
      title: "Analyse Contract",
      text: "AI-powered risk analysis to detect contradictions, risks, and loopholes in your contracts instantly.",
      link: "/analyse"
    },
    {
      img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      title: "Generate Contract",
      text: "Easily generate legally compliant contracts tailored to your needs with AI-driven templates.",
      link: "/generate"
    },
    {
      img: "https://cdn-icons-png.flaticon.com/512/1256/1256650.png",
      title: "Community Support",
      text: "Engage with a vibrant community of legal professionals and users for insights and advice.",
      link: "/Community"
    },
    {
      img: "https://cdn-icons-png.flaticon.com/512/3135/3135714.png",
      title: "Expert Advice",
      text: "Connect with experienced legal experts for professional consultation and support.",
      link: "#"
    }
  ];

  return (
    <section className="features-section">
      <h2 className="features-title">Our Features</h2>
      <div className="features-container">
        {features.map((feature, index) => (
          <div className="feature-card" key={index}>
            <div className="card-icon-container">
              <img src={feature.img} className="card-icon" alt={feature.title} />
            </div>
            <div className="card-body">
              <h5 className="card-title">{feature.title}</h5>
              <p className="card-text">{feature.text}</p>
              <a href={feature.link} className="card-btn">
                Learn More
                <span className="btn-arrow">→</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;