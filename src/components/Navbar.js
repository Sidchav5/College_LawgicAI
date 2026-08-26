import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    // Close offcanvas if open
    const offcanvasEl = document.getElementById("lawgicSidebar");
    if (offcanvasEl) {
      const bsOffcanvas = window.bootstrap?.Offcanvas?.getInstance(offcanvasEl);
      bsOffcanvas?.hide();
    }
  };

  const closeSidebar = () => {
    const offcanvasEl = document.getElementById("lawgicSidebar");
    if (offcanvasEl) {
      const bsOffcanvas = window.bootstrap?.Offcanvas?.getInstance(offcanvasEl);
      bsOffcanvas?.hide();
    }
  };

  // Pages that use the sidebar (logged-in service pages)
  const isLandingOrAuth = pathname === "/" || pathname === "/login" || pathname === "/signup";
  const showSidebar = token && !isLandingOrAuth;
  // On main landing page always show signup/login
  const isMainLanding = pathname === "/";

  /* ── SIDEBAR LAYOUT (service pages when logged in) ── */
  if (showSidebar) {
    return (
      <>
        {/* ── Fixed top bar with hamburger ── */}
        <nav className="lawgic-topbar">
          <button
            className="lawgic-hamburger"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#lawgicSidebar"
            aria-controls="lawgicSidebar"
            aria-label="Open navigation menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <span className="lawgic-topbar-brand">
            <i className="fa-solid fa-scale-balanced"></i> Lawgic
          </span>
          <div
            className="lawgic-topbar-avatar"
            onClick={() => navigate("/profile")}
            title="Profile"
          >
            <i className="fa-solid fa-circle-user"></i>
          </div>
        </nav>

        {/* ── Bootstrap Offcanvas Sidebar ── */}
        <div
          className="offcanvas offcanvas-start lawgic-offcanvas"
          tabIndex="-1"
          id="lawgicSidebar"
          aria-labelledby="lawgicSidebarLabel"
        >
          {/* Offcanvas Header */}
          <div className="offcanvas-header lawgic-offcanvas-header">
            <h5 className="offcanvas-title lawgic-offcanvas-title" id="lawgicSidebarLabel">
              <i className="fa-solid fa-scale-balanced"></i> Lawgic
            </h5>
            <button
              type="button"
              className="lawgic-close-btn"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Offcanvas Body (Nav Links) */}
          <div className="offcanvas-body lawgic-offcanvas-body">
            <nav className="lawgic-sidebar-menu">
              <Link
                to="/analyse"
                className={`lawgic-sidebar-item ${pathname === "/analyse" ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-magnifying-glass"></i>
                <span>Analyze Contract</span>
              </Link>
              <Link
                to="/generate"
                className={`lawgic-sidebar-item ${pathname === "/generate" ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-pen-nib"></i>
                <span>Generate Contract</span>
              </Link>
              <Link
                to="/Community"
                className={`lawgic-sidebar-item ${pathname === "/Community" ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-users"></i>
                <span>Community Support</span>
              </Link>
              <Link
                to="/profile"
                className={`lawgic-sidebar-item ${pathname === "/profile" ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-circle-user"></i>
                <span>User Profile</span>
              </Link>
              <Link
                to="/about"
                className={`lawgic-sidebar-item ${pathname === "/about" ? "active" : ""}`}
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-circle-info"></i>
                <span>About Us</span>
              </Link>

              <div className="lawgic-sidebar-divider"></div>

              <Link
                to="/"
                className="lawgic-sidebar-item home-link"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-house"></i>
                <span>Main Page</span>
              </Link>
            </nav>

            {/* Logout at bottom */}
            <div className="lawgic-sidebar-footer">
              <button className="lawgic-logout-btn" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── HORIZONTAL NAVBAR (landing / login / signup) ── */
  return (
    <nav className="navbar navbar-expand-md lawgic-navbar">
      <div className="container-fluid px-4">
        {/* Brand */}
        <Link to="/" className="navbar-brand lawgic-brand">
          <i className="fa-solid fa-scale-balanced"></i> Lawgic
        </Link>

        {/* Mobile Toggle */}
        <button
          className="navbar-toggler lawgic-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavMenu"
          aria-controls="mainNavMenu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        {/* Nav Links */}
        <div className="collapse navbar-collapse" id="mainNavMenu">
          <ul className="navbar-nav ms-auto align-items-md-center gap-md-2">
            <li className="nav-item">
              <Link to="/about" className="nav-link lawgic-nav-link">About Us</Link>
            </li>

            {(token && !isMainLanding) ? (
              <>
                <li className="nav-item">
                  <Link to="/analyse" className="nav-link lawgic-nav-link lawgic-dashboard-btn">
                    Dashboard <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                </li>
                <li className="nav-item dropdown">
                  <span
                    className="nav-link lawgic-nav-link dropdown-toggle"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    Profile
                  </span>
                  {showDropdown && (
                    <ul className="dropdown-menu dropdown-menu-end lawgic-dropdown show">
                      <li>
                        <Link
                          className="dropdown-item lawgic-dropdown-item"
                          to="/profile"
                          onClick={() => setShowDropdown(false)}
                        >
                          User Profile
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <span
                          className="dropdown-item lawgic-dropdown-item text-danger"
                          style={{ cursor: "pointer" }}
                          onClick={handleLogout}
                        >
                          Logout
                        </span>
                      </li>
                    </ul>
                  )}
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link to="/signup" className="nav-link lawgic-nav-link">SignUp</Link>
                </li>
                <li className="nav-item">
                  <Link to="/login" className="nav-link lawgic-nav-link lawgic-login-btn">Login</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
