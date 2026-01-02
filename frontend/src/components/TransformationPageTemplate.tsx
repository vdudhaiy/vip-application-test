import React, { ReactNode } from "react";
import type { PlotResponse } from "./FilterOptions";

interface TransformationPageTemplateProps {
  title: string;
  children?: ReactNode;
  onFilterUpdate?: (data: PlotResponse) => void;
}

const TransformationPageTemplate: React.FC<TransformationPageTemplateProps> = ({
  title,
  children
}) => {
  return (
    <div id="transformation-page-template" style={{ display: "flex", height: "100vh", backgroundColor: "#1e1e1e" }}>
      <div style={{ textAlign: "center", flex: 1, padding: "20px", backgroundColor: "#1e1e1e", color:"white" }}> 
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default TransformationPageTemplate;