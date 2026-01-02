import React from 'react';

interface TransformationOptionsProps {
  onTransformationChange: (type: string) => void;
  onLambdaChange: (value: string) => void;
}

const TransformationOptions: React.FC<TransformationOptionsProps> = ({
  onTransformationChange,
  onLambdaChange
}) => {
  return (
    <>
      <label htmlFor="transformationType" style={{ color: "#CCCCCC" }}>
        Transformation Type:
      </label>
      <select
        id="transformationType"
        onChange={(e) => onTransformationChange(e.target.value)}
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
        <option value="log">Log Transformation</option>
        <option value="sqrt">Square Root Transformation</option>
        <option value="boxcox">Box-Cox Transformation</option>
      </select>

      <label htmlFor="lambdaValue" style={{ color: "#CCCCCC" }}>
        Lambda Value (if applicable):
      </label>
      <input
        type="number"
        id="lambdaValue"
        onChange={(e) => onLambdaChange(e.target.value)}
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
      />
    </>
  );
};


export default TransformationOptions;