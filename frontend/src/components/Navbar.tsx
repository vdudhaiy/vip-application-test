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
    { name: "Feedback", path: "/feedback" }
  ];

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #161b22 0%, #0d1117 100%)",
        padding: "12px 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid #30363d",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
      }}
    >
      <div style={{
        fontSize: "18px",
        fontWeight: "bold",
        color: "#58a6ff",
        marginRight: "40px",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
      onClick={() => navigate("/")}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#79c0ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#58a6ff";
      }}>
        VIP
      </div>
      <ul style={{ 
        listStyleType: "none", 
        padding: 0,
        margin: 0,
        display: "flex",
        gap: "32px"
      }}>
        {sections.map((section, index) => (
          <li
            key={index}
            onClick={() => navigate(section.path)}
            style={{
              color: activeSection === section.name ? "#79c0ff" : "#8b949e",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              padding: "6px 0",
              borderBottom: activeSection === section.name ? "2px solid #58a6ff" : "2px solid transparent"
            }}
            onMouseEnter={(e) => {
              if (activeSection !== section.name) {
                e.currentTarget.style.color = "#e6edf3";
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== section.name) {
                e.currentTarget.style.color = "#8b949e";
              }
            }}
          >
            {section.name}
          </li>
        ))}
      </ul>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px" }}>
        {user ? (
          <div
            onClick={() => navigate("/profile")}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #58a6ff 0%, #388bfd 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "#0d1117",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "16px",
              border: "2px solid #30363d"
            }}
            title={user.username}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(88, 166, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)",
              color: "#e6edf3",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #388bfd 0%, #79c0ff 100%)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(88, 166, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.3)";
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