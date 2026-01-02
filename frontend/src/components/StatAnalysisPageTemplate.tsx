import React, { ReactNode } from "react";

interface StatAnalysisPageTemplateProps {
  title: string;
  children?: ReactNode;
}

const StatAnalysisPageTemplate: React.FC<StatAnalysisPageTemplateProps> = ({
  title,
  children
}) => {
  return (
    <div id="stat-analysis-page-template" style={{ 
      display: "flex", 
      height: "100vh", 
      backgroundColor: "#1e1e1e",
      color: "#ffffff",
      boxSizing: "border-box"
    }}>
      <div style={{ 
        textAlign: "center", 
        flex: 1, 
        padding: "20px", 
        backgroundColor: "#1e1e1e", 
        color: "white",
        overflow: "auto"
      }}> 
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default StatAnalysisPageTemplate;
