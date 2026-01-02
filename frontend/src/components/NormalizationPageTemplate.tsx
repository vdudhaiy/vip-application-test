import React, { ReactNode } from "react";
import type { PlotResponse } from "./FilterOptions";
// import API_ENDPOINTS from '../config/api';

interface NormalizationPageTemplateProps {
  title: string;
  children?: ReactNode;
  onFilterUpdate?: (data: PlotResponse) => void;
}

const NormalizationPageTemplate: React.FC<NormalizationPageTemplateProps> = ({
  title,
  children,
  onFilterUpdate
}) => {
  // Unused function - commented out
  // const [isLoading, setIsLoading] = React.useState(false);
  // const handleApplyFilters = async () => { ... };

  // Suppress unused parameter warning
  void onFilterUpdate;

  return (
    <div id="normalization-page-template" style={{ display: "flex", height: "100vh", backgroundColor: "#1e1e1e" }}>
      <div style={{ textAlign: "center", flex: 1, padding: "20px", backgroundColor: "#1e1e1e", color:"white" }}> 
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default NormalizationPageTemplate;