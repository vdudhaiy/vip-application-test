import React, { useState } from "react";

export interface FilterState {
  filterType: "percentage" | "number";
  subOption: "inTotal" | "inEach" | "inEither";
  percentageValue: number;
  numberValue: number | "";
}

export interface PlotResponse {
  density_patient: {
    plots: PlotData[];
    limits: { lower: number; upper: number };
  };
  density_case: {
    plots: PlotData[];
    limits?: { lower: number; upper: number };
  };
}

export interface PlotData {
  patient?: string;
  group?: string;
  case?: string;
  density: DensityPoint[];
  limits?: { lower: number; upper: number };
}

export interface DensityPoint {
  x: number;
  y: number;
}

interface FilterOptionsProps {
  onFilterChange?: (filters: FilterState) => void;
}

const FilterOptions: React.FC<FilterOptionsProps> = ({ onFilterChange }) => {
  const [filterType, setFilterType] = useState<"percentage" | "number">("percentage");
  const [subOption, setSubOption] = useState<"inTotal" | "inEach" | "inEither">("inTotal");
  const [percentageValue, setPercentageValue] = useState<number>(70);
  const [numberValue, setNumberValue] = useState<number | "">("");

  const handleFilterTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("Frontend: Filter type changed to:", event.target.value);
    setFilterType(event.target.value as "percentage" | "number");
  };

  const handleSubOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("Frontend: Sub-option changed to:", event.target.value);
    setSubOption(event.target.value as "inTotal" | "inEach" | "inEither");
  };

  const handlePercentageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    console.log("Frontend: Percentage value changed to:", value);
    setPercentageValue(value);
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === "" ? "" : parseInt(event.target.value);
    console.log("Frontend: Number value changed to:", value);
    setNumberValue(value);
  };

  React.useEffect(() => {
    console.log("Frontend: Applying filter with state:", {
      filterType,
      subOption,
      percentageValue,
      numberValue
    });
    if (onFilterChange){
      onFilterChange({
      filterType,
      subOption,
      percentageValue,
      numberValue
    });
  }
  }, [filterType, subOption, percentageValue, numberValue, onFilterChange]);

  return (
    <div style={{ color: "#1e1e1e" }}>
      <label htmlFor="filterType" style={{fontSize: "10px", color: "#CCCCCC"}}>Filter Option:</label>
      <select
        id="filterType"
        value={filterType}
        onChange={handleFilterTypeChange}
        style={{ 
          fontSize: "10px",
          width: "100%", 
          padding: "5px", 
          marginTop: "2px",
          marginBottom: "30px",
          backgroundColor: "#1e1e1e",
          color: "#FFFFFF",
          border: "1px solid #4A4A4A",
          borderRadius: "4px",
          fontFamily: "Times New Roman, serif",
        }}
      >
        <option value="percentage">By Percentage</option>
        <option value="number">By Number</option>
      </select>

      <label htmlFor="subOption" style={{ color: "#CCCCCC" }}>Apply In:</label>
      <select
        id="subOption"
        value={subOption}
        onChange={handleSubOptionChange}
        style={{ 
          fontSize: "10px",
          width: "100%", 
          marginTop: "2px",
          padding: "5px", 
          marginBottom: "30px",
          backgroundColor: "#1e1e1e",
          color: "#FFFFFF",
          border: "1px solid #4A4A4A",
          borderRadius: "4px",
          fontFamily: "Times New Roman, serif" 
        }}
      >
        <option value="inTotal">In total (both groups)</option>
        <option value="inEach">In each group</option>
        <option value="inEither">In either group</option>
      </select>

      {filterType === "percentage" && (
        <div>
          <label style={{ color: "#CCCCCC" }}>Percentage:</label>
          <input
            type="range"
            min="1"
            max="100"
            value={percentageValue}
            onChange={handlePercentageChange}
            style={{ width: "100%", height:"3px", marginTop: "7px" }}
            
          />
          <div style={{ color: "#FFFFFF", padding: "3px" }}>{percentageValue}%</div>
        </div>
      )}

      {filterType === "number" && (
        <div>
          <label style={{ color: "#CCCCCC" }}>Number:</label>
          <input
            type="number"
            value={numberValue}
            onChange={handleNumberChange}
            style={{ 
              width: "100%", 
              marginBottom: "10px",
              backgroundColor: "#333333",
              color: "#FFFFFF",
              border: "1px solid #4A4A4A",
              borderRadius: "4px",
              padding: "5px",
              fontFamily: "Times New Roman, serif",
              fontSize: "10px"
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FilterOptions;
