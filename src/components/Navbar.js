import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css"
function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="nav-bar">
    <div className="nav-name">
  <Link to="/" className="nav-name-text">
    <i className="fa-solid fa-utensils"></i> Lawgic
  </Link>
</div>
      <div className="nav-main"><Link to="/blogs">About Us</Link></div>
      <div className="nav-signUp"><Link to="/signup">SignUp</Link></div>
      <div className="nav-login"><Link to="/login">Login</Link></div>

      {/* Profile dropdown */}
      <div
        className="nav-profile"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ position: "relative", cursor: "pointer" }}
      >
        <span className="P">Profile ⬇</span>
        {showDropdown && (
          <div
            className="profile-dropdown"
            style={{
              position: "absolute",
              top: "40px",
              right: "0",
              background: "#0e0d0dff",
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "10px",
              zIndex: 100,
            }}
          >
            <p><Link to="/profile">User Profile</Link></p>
            <p onClick={handleLogout} style={{ color: "red", cursor: "pointer" }}>
              Logout
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
