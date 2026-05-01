import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/UserAuth";
import "./Navbar.css";

interface NavbarProps {
  activeSection: string;
}

const Navbar: React.FC<NavbarProps> = ({ activeSection }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sections = [
    { name: "Home", path: "/" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Feedback", path: "/feedback" }
  ];

  return (
    <div className="navbar">
      <div className="navbar-brand" onClick={() => navigate("/")}>
        VIP
      </div>

      <ul className="navbar-links">
        {sections.map((section, index) => (
          <li
            key={index}
            onClick={() => navigate(section.path)}
            className={`nav-link${activeSection === section.name ? " nav-link--active" : ""}`}
          >
            {section.name}
          </li>
        ))}
      </ul>

      <div className="navbar-actions">
        {user ? (
          <div
            className="navbar-avatar"
            onClick={() => navigate("/profile")}
            title={user.username}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        ) : (
          <button onClick={() => navigate("/login")}>
            Login / Signup
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
