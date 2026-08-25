import React from 'react';
import './About.css';

// ─── Team Members ─────────────────────────────────────────────────────────────
// Add your name, role, and a short bio below. Photo is optional (leave as "").
const teamMembers = [
  {
    name: 'Your Name Here',
    role: 'Full Stack Developer',
    bio: 'Short bio about this team member. What they worked on, their skills, etc.',
    photo: '', // paste image URL or leave blank for initials avatar
    linkedin: '#',
    github: '#',
  },
  {
    name: 'Your Name Here',
    role: 'ML Engineer',
    bio: 'Short bio about this team member. What they worked on, their skills, etc.',
    photo: '',
    linkedin: '#',
    github: '#',
  },
  {
    name: 'Your Name Here',
    role: 'Backend Developer',
    bio: 'Short bio about this team member. What they worked on, their skills, etc.',
    photo: '',
    linkedin: '#',
    github: '#',
  },
  {
    name: 'Your Name Here',
    role: 'UI/UX Designer',
    bio: 'Short bio about this team member. What they worked on, their skills, etc.',
    photo: '',
    linkedin: '#',
    github: '#',
  },
];

// ─── Core Features ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: '🔍',
    title: 'Contract Analysis',
    description:
      'Upload any legal contract (PDF or text) and get an instant AI-powered breakdown of clauses, risk levels, and plain-English summaries — no legal degree required.',
  },
  {
    icon: '⚡',
    title: 'Contract Generation',
    description:
      'Describe your requirements and let Lawgic draft a professional contract for you in seconds. Choose from NDAs, employment agreements, service contracts, and more.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Intelligence',
    description:
      'Powered by state-of-the-art NLP models fine-tuned on legal corpora to detect hidden risks, ambiguous clauses, and unfair terms automatically.',
  },
  {
    icon: '🏷️',
    title: 'Keyword Extraction',
    description:
      'Automatically identify and highlight critical legal keywords, obligations, deadlines, parties, and jurisdiction clauses inside any document.',
  },
  {
    icon: '👥',
    title: 'Community Support',
    description:
      'Ask legal questions, share experiences, and get guidance from a growing community of users and verified legal professionals.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description:
      'Your documents are processed securely and never stored or shared. End-to-end privacy is a core principle, not an afterthought.',
  },
];

// ─── Tech Stack ────────────────────────────────────────────────────────────────
const techStack = [
  { label: 'React.js', category: 'Frontend' },
  { label: 'Python / Flask', category: 'Backend' },
  { label: 'Hugging Face Transformers', category: 'ML / NLP' },
  { label: 'MongoDB', category: 'Database' },
  { label: 'Docker', category: 'DevOps' },
  { label: 'AWS EC2', category: 'Cloud' },
];

// ─── Helper: Initials Avatar ───────────────────────────────────────────────────
function InitialsAvatar({ name }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return <div className="avatar-initials">{initials}</div>;
}

// ─── Component ────────────────────────────────────────────────────────────────
function About() {
  return (
    <div className="about-page">
      {/* ── Ambient background blobs ── */}
      <div className="about-bg">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      {/* ── Hero Banner ── */}
      <section className="about-hero">
        <div className="about-badge">About Lawgic</div>
        <h1 className="about-title">
          Making Legal Intelligence
          <span className="gradient-text"> Accessible to Everyone</span>
        </h1>
        <p className="about-subtitle">
          Lawgic is an AI-driven legal contract assistant built to democratise
          access to legal understanding. Whether you're a startup founder, a
          freelancer, or simply someone signing a rental agreement — Lawgic
          helps you understand what you're agreeing to.
        </p>
      </section>

      {/* ── Problem & Solution ── */}
      <section className="about-section problem-solution">
        <div className="ps-card ps-problem">
          <div className="ps-icon">⚠️</div>
          <h2>The Problem</h2>
          <p>
            Legal contracts are intentionally complex. Millions of people sign
            documents every day without truly understanding the obligations,
            penalties, or risks buried inside. Hiring a lawyer for every
            contract is expensive and inaccessible for most people.
          </p>
        </div>
        <div className="ps-divider">→</div>
        <div className="ps-card ps-solution">
          <div className="ps-icon">✅</div>
          <h2>Our Solution</h2>
          <p>
            Lawgic uses advanced Natural Language Processing to read contracts
            the way a lawyer would — identifying risk clauses, extracting key
            terms, flagging ambiguities, and summarising everything in plain
            language. We also generate professionally structured contracts
            from plain descriptions.
          </p>
        </div>
      </section>

      {/* ── Core Features ── */}
      <section className="about-section">
        <div className="section-header">
          <h2>What Lawgic Can Do</h2>
          <p>A complete toolkit for legal document intelligence</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="about-section">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Three simple steps to legal clarity</p>
        </div>
        <div className="how-steps">
          <div className="step">
            <div className="step-number">01</div>
            <div className="step-content">
              <h3>Upload or Describe</h3>
              <p>
                Upload a PDF/text contract for analysis, or describe the type
                of contract you need in plain English.
              </p>
            </div>
          </div>
          <div className="step-connector" />
          <div className="step">
            <div className="step-number">02</div>
            <div className="step-content">
              <h3>AI Processes It</h3>
              <p>
                Our NLP pipeline reads the document, classifies clauses by
                risk, extracts key entities, and generates structured insights.
              </p>
            </div>
          </div>
          <div className="step-connector" />
          <div className="step">
            <div className="step-number">03</div>
            <div className="step-content">
              <h3>Get Your Results</h3>
              <p>
                Receive a colour-coded risk report, plain-English summaries,
                keyword highlights, or a ready-to-use generated contract.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="about-section">
        <div className="section-header">
          <h2>Built With</h2>
          <p>Modern technologies for a robust, scalable platform</p>
        </div>
        <div className="tech-grid">
          {techStack.map((t, i) => (
            <div className="tech-chip" key={i}>
              <span className="tech-category">{t.category}</span>
              <span className="tech-label">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ── */}
      <section className="about-section team-section">
        <div className="section-header">
          <h2>Meet the Team</h2>
          <p>The people who built Lawgic</p>
        </div>
        <div className="team-grid">
          {teamMembers.map((member, i) => (
            <div className="team-card" key={i}>
              <div className="team-photo">
                {member.photo ? (
                  <img src={member.photo} alt={member.name} />
                ) : (
                  <InitialsAvatar name={member.name} />
                )}
              </div>
              <div className="team-info">
                <h3 className="team-name">{member.name}</h3>
                <span className="team-role">{member.role}</span>
                <p className="team-bio">{member.bio}</p>
                <div className="team-links">
                  {member.linkedin !== '#' && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="team-link"
                      title="LinkedIn"
                    >
                      <i className="fa-brands fa-linkedin" />
                    </a>
                  )}
                  {member.github !== '#' && (
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noreferrer"
                      className="team-link"
                      title="GitHub"
                    >
                      <i className="fa-brands fa-github" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta">
        <h2>Ready to understand your contracts?</h2>
        <p>Join Lawgic and never sign blindly again.</p>
        <div className="cta-buttons">
          <a href="/signup" className="cta-btn cta-primary">Get Started Free</a>
          <a href="/analyse" className="cta-btn cta-secondary">Try Contract Analysis</a>
        </div>
      </section>
    </div>
  );
}

export default About;
