// src/components/NormalizationOptions.tsx
import React from 'react';

const NormalizationOptions: React.FC = () => {
  return (
    <>
      <label htmlFor="normalizationMethod" style={{ color: "#CCCCCC" }}>Normalization Method:</label>
      <select
        id="normalizationMethod"
        style={{ 
          width: "100%", 
          padding: "5px", 
          marginTop: "2px",
          marginBottom: "30px",
          backgroundColor: "#1e1e1e",
          color: "#FFFFFF",
          border: "1px solid #4A4A4A",
          borderRadius: "4px",
        }}
      >
        <option>Min-Max Scaling</option>
        <option>Standardization</option>
        <option>Robust Scaling</option>
      </select>

      <label htmlFor="featureRange" style={{ color: "#CCCCCC" }}>Feature Range:</label>
      <div style={{ display: "flex", gap: "4px", marginTop: "2px", marginBottom: "30px" }}>
        <input
          type="number"
          placeholder="Min Value"
          style={{ 
            flex: 1,
            padding: "5px",
            backgroundColor: "#1e1e1e",
            color: "#FFFFFF",
            border: "1px solid #4A4A4A",
            borderRadius: "4px",
          }}
        />
        <input
          type="number"
          placeholder="Max Value"
          style={{ 
            flex: 1,
            padding: "5px",
            backgroundColor: "#1e1e1e",
            color: "#FFFFFF",
            border: "1px solid #4A4A4A",
            borderRadius: "4px",
          }}
        />
      </div>
    </>
  );
};

export default NormalizationOptions;