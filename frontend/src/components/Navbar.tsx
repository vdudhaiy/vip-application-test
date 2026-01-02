import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/UserAuth";

interface NavbarProps {
  activeSection: string;
}

const Navbar: React.FC<NavbarProps> = ({ activeSection }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sections = [
    { name: "Home", path: "/" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "About", path: "/about" },
    { name: "Feedback", path: "/feedback" }
  ];

  return (
    <div
      style={{
        backgroundColor: "#2C2C2C",
        padding: "8px 16px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
      }}
    >
      <ul style={{ 
        listStyleType: "none", 
        padding: 0,
        margin: 0,
        display: "flex",
        gap: "20px"
      }}>
        {sections.map((section, index) => (
          <li
            key={index}
            onClick={() => navigate(section.path)}
            style={{
              color: activeSection === section.name ? "#E0E0E0" : "#A0A0A0",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "color 0.3s"
            }}
            onMouseEnter={(e) => {
              if (activeSection !== section.name) {
                e.currentTarget.style.color = "#E0E0E0";
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== section.name) {
                e.currentTarget.style.color = "#A0A0A0";
              }
            }}
          >
            {section.name}
          </li>
        ))}
      </ul>
      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <div
            onClick={() => navigate("/profile")}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#E0E0E0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "#2C2C2C",
              cursor: "pointer"
            }}
            title={user.username}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={{
              backgroundColor: "#444",
              color: "#E0E0E0",
              border: "none",
              borderRadius: "4px",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Login / Signup
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;