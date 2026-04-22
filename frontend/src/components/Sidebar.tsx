import React from "react";
import { useNavigate } from "react-router-dom";


interface SidebarProps {
  onSelectSection: (section: string) => void;
  activeSection: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectSection, activeSection }) => {
  const navigate = useNavigate();

  const sections = [
    { name: "Datasets", path: "/Datasets" },
    { name: "Data Quality Check", path: "/DataQualityCheck" },
    { name: "Filter", path: "/Filter" },
    { name: "Normalization", path: "/Normalization" },
    { name: "Transformation", path: "/Transformation" },
    { name: "Imputation", path: "/Imputation" },
    { name: "Statistical Analysis", path: "/StatisticalAnalysis" },
  ];

  return (
    <div
      className="sidebar"
      style={{
        background: "linear-gradient(180deg, #161b22 0%, #0d1117 100%)",
        padding: "16px 8px",
        width: "120px",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <ul style={{ 
        listStyleType: "none", 
        padding: 0,
        margin: 0
      }}>
        {sections.map((section, index) => (
          <li
            key={index}
            onClick={() => {
              onSelectSection(section.name);
              navigate(section.path);
            }}
            style={{
              color: activeSection === section.name ? "#79c0ff" : "#8b949e",
              margin: "4px 0",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              padding: "10px 8px",
              borderRadius: "6px",
              borderLeft: activeSection === section.name ? "3px solid #58a6ff" : "3px solid transparent",
              backgroundColor: activeSection === section.name ? "rgba(88, 166, 255, 0.1)" : "transparent",
              paddingLeft: activeSection === section.name ? "8px" : "11px"
            }}
            onMouseEnter={(e) => {
              if (activeSection !== section.name) {
                e.currentTarget.style.color = "#e6edf3";
                e.currentTarget.style.backgroundColor = "rgba(88, 166, 255, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== section.name) {
                e.currentTarget.style.color = "#8b949e";
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {section.name}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default Sidebar;
