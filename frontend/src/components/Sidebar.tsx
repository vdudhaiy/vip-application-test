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
        backgroundColor: "#2C2C2C",
        padding: "4px 12px 12px 12px",
        width: "120px",
        height: "100%",
        boxSizing: "border-box",
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
              color: activeSection === section.name ? "#E0E0E0" : "#A0A0A0",
              margin: "10px 0",
              fontSize: "12px",
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
    </div>
  );
};
export default Sidebar;
