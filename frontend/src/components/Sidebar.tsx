import React from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

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
    <div className="sidebar">
      <ul className="sidebar-nav">
        {sections.map((section, index) => (
          <li
            key={index}
            onClick={() => {
              onSelectSection(section.name);
              navigate(section.path);
            }}
            className={`sidebar-item${activeSection === section.name ? " sidebar-item--active" : ""}`}
          >
            {section.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
