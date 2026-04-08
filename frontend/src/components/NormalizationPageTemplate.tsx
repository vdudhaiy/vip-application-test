import React, { ReactNode } from "react";
import type { PlotResponse } from "./FilterOptions";
// import API_ENDPOINTS from '../config/api';

interface NormalizationPageTemplateProps {
  title: string;
  children?: ReactNode;
  onFilterUpdate?: (data: PlotResponse) => void;
  onNormalizationApplied?: (applied: boolean) => void;
  initialNormalizationApplied?: boolean;
}

const NormalizationPageTemplate: React.FC<NormalizationPageTemplateProps> = ({
  title,
  children,
  onFilterUpdate,
  onNormalizationApplied,
  initialNormalizationApplied = false
}) => {
  // Unused function - commented out
  // const [isLoading, setIsLoading] = React.useState(false);
  // const handleApplyFilters = async () => { ... };

  // Suppress unused parameter warning
  void onFilterUpdate;
  void onNormalizationApplied;

  return (
    <div id="normalization-page-template" style={{ display: "flex", height: "100vh", backgroundColor: "#1e1e1e", overflow: "hidden" }}>
      <div style={{ textAlign: "center", flex: 1, padding: "20px", backgroundColor: "#1e1e1e", color:"white", overflow: "auto", overflowX: "hidden" }}> 
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default NormalizationPageTemplate;