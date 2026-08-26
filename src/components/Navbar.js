import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsMobileSidebarOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/login");
  };

  // Condition to show vertical sidebar: logged in AND not on landing/login/signup
  const isLandingOrAuth = pathname === "/" || pathname === "/login" || pathname === "/signup";
  const showSidebar = token && !isLandingOrAuth;

  if (showSidebar) {
    return (
      <>
        {/* Mobile Top Header (Visible only on screens <= 768px) */}
        <div className="mobile-header-bar">
          <button 
            className="sidebar-toggle-btn" 
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <span className="mobile-brand">
            <i className="fa-solid fa-scale-balanced"></i> Lawgic
          </span>
          <div className="mobile-profile-trigger" onClick={() => navigate("/profile")}>
            <i className="fa-solid fa-circle-user"></i>
          </div>
        </div>

        {/* Backdrop overlay for mobile drawer */}
        {isMobileSidebarOpen && (
          <div 
            className="sidebar-backdrop" 
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
        )}

        {/* Vertical Sidebar Navigation */}
        <nav className={`sidebar-nav ${isMobileSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <i className="fa-solid fa-scale-balanced"></i> Lawgic
            </div>
            <button 
              className="sidebar-close-btn" 
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="sidebar-menu">
            <Link 
              to="/analyse" 
              className={`sidebar-item ${pathname === "/analyse" ? "active" : ""}`} 
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <i className="fa-solid fa-magnifying-glass"></i> Analyze Contract
            </Link>
            <Link 
              to="/generate" 
              className={`sidebar-item ${pathname === "/generate" ? "active" : ""}`} 
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <i className="fa-solid fa-pen-nib"></i> Generate Contract
            </Link>
            <Link 
              to="/Community" 
              className={`sidebar-item ${pathname === "/Community" ? "active" : ""}`} 
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <i className="fa-solid fa-users"></i> Community Support
            </Link>
            <Link 
              to="/profile" 
              className={`sidebar-item ${pathname === "/profile" ? "active" : ""}`} 
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <i className="fa-solid fa-circle-user"></i> User Profile
            </Link>
            <Link 
              to="/about" 
              className={`sidebar-item ${pathname === "/about" ? "active" : ""}`} 
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <i className="fa-solid fa-circle-info"></i> About Us
            </Link>
            
            <div className="sidebar-separator"></div>

            <Link 
              to="/" 
              className="sidebar-item home-link" 
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <i className="fa-solid fa-house"></i> Main Page
            </Link>
          </div>

          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </div>
        </nav>
      </>
    );
  }

  // Horizontal Navigation (for main landing / login / signup pages)
  return (
    <nav className="nav-bar">
      <div className="nav-brand-container">
        <Link to="/" className="nav-name-text">
          <i className="fa-solid fa-scale-balanced"></i> Lawgic
        </Link>
        <button 
          className="nav-toggle-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation links"
        >
          <i className={`fa-solid ${isMobileMenuOpen ? "fa-xmark" : "fa-bars"}`}></i>
        </button>
      </div>

      <div className={`nav-menu-links ${isMobileMenuOpen ? "open" : ""}`}>
        <Link 
          to="/about" 
          className="nav-link-item" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          About Us
        </Link>
        
        {token ? (
          <>
            <Link 
              to="/analyse" 
              className="nav-link-item dashboard-btn" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard <i className="fa-solid fa-arrow-right"></i>
            </Link>
            <div className="nav-profile-wrapper">
              <span className="P" onClick={() => setShowDropdown(!showDropdown)}>
                Profile <i className="fa-solid fa-caret-down"></i>
              </span>
              {showDropdown && (
                <div className="profile-dropdown">
                  <Link 
                    to="/profile" 
                    onClick={() => { setShowDropdown(false); setIsMobileMenuOpen(false); }}
                  >
                    User Profile
                  </Link>
                  <p 
                    onClick={handleLogout} 
                    style={{ color: "#ef4444", cursor: "pointer", margin: "10px 0 0", fontSize: "0.95rem" }}
                  >
                    Logout
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link 
              to="/signup" 
              className="nav-link-item" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              SignUp
            </Link>
            <Link 
              to="/login" 
              className="nav-link-item login-btn" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
