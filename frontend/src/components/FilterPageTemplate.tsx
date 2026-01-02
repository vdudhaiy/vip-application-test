import React, { ReactNode, useState } from "react";
import type { FilterState, PlotResponse } from "./FilterOptions";
import API_ENDPOINTS from '../config/api';

interface FilterPageTemplateProps {
  title: string;
  filters: React.ReactNode;
  children?: ReactNode;
  onFilterUpdate?: (data: PlotResponse) => void;
}

const FilterPageTemplate: React.FC<FilterPageTemplateProps> = ({
  title,
  filters,
  children,
  onFilterUpdate
}) => {
  const [filterState, setFilterState] = useState<FilterState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyFilters = async () => {
    console.log("Frontend: Starting filter application...");
    if (!filterState) return;

    setIsLoading(true);
    try {
      console.log("Frontend: Building filter parameters...");
      const params = {
          filteroption: filterState.filterType,
          applyin: filterState.subOption,
          value: filterState.filterType === 'percentage'
            ? filterState.percentageValue
            : filterState.numberValue
      };

      console.log("Frontend: Making API request...");
      const token = localStorage.getItem('token')
      const dataset_id = localStorage.getItem('selectedDatasetId')
      const response = await fetch(`${API_ENDPOINTS.FILTER}?dataset_id=${dataset_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`
        },
        body: JSON.stringify(params)
      });
      if (!response.ok) {
        throw new Error('Failed to apply filters');
      }

      const data = await response.json();
      
      if (data && data.data) {  
        console.log("Frontend: Processing response data...");
        const filteredData: PlotResponse = {
          density_patient: {
            plots: data.data.density_patient.plots || [],
            limits: data.data.density_patient.limits || { lower: 0, upper: 500 }
          },
          density_case: {
            plots: data.data.density_case.plots || [],
            limits: data.data.density_case.limits || { lower: 0, upper: 500 }
          }
        };

        if (onFilterUpdate) {
          console.log("Frontend: Updating filter state...");
          onFilterUpdate(filteredData);
        }
      }
    } catch (error) {
      console.error('Frontend: Error applying filters:', error);
    } finally {
      console.log("Frontend: Filter process completed");
      setIsLoading(false);
    }
  };

  return (
    <div id="filter-page-template" style={{ 
      display: "flex", 
      height: "calc(100vh - 45px)", 
      backgroundColor: "#1e1e1e",
      position: "relative"
    }}>
      {/* Main Content */}
      <div style={{ 
        textAlign: "center", 
        flex: 1, 
        padding: "0px 220px 0px 0px",
        backgroundColor: "#1e1e1e", 
        color: "white",
        overflow: "auto"
      }}> 
        <h2>{title}</h2>
        {children}
      </div>

      {/* Filter Sidebar (Right) */}
      <div style={{ 
        width: "200px", 
        backgroundColor: "#1e1e1e",
        padding: "10px",
        position: "fixed",
        right: "0", // Position at the very right edge
        top: "45px", // Fixed position below the navbar
        height: "calc(100vh - 45px)", // Full height minus navbar
        overflow: "auto"
      }}>
        {React.cloneElement(filters as React.ReactElement, {
          onFilterChange: setFilterState
        })}

        <button
          style={{
            marginTop: "10px",
            padding: "6px 10px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
            fontSize: "10px"
          }}
          onClick={handleApplyFilters}
          disabled={isLoading}
        >
          {isLoading ? "Applying..." : "Apply Filters"}
        </button>
      </div>
    </div>
  );
};
export default FilterPageTemplate;
