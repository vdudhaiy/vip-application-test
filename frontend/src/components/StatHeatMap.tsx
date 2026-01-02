import React, { useState, useEffect, useRef, useMemo } from "react";

// Define the shape of a heatmap data row; each gene row has multiple patient values
export interface HeatMapRow {
  name: string;
  [patient: string]: number | string;
}

interface StatHeatMapProps {
  data: HeatMapRow[];
}

/**
 * StatHeatMap component
 * Renders a responsive interactive heatmap in dark mode using an SVG grid layout.
 * The heatmap is designed to be contained within a scrollable container.
 */
const StatHeatMap: React.FC<StatHeatMapProps> = ({ data }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });

  const [modalTooltip, setModalTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });

  const handleExpand = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  const [dataRange, setDataRange] = useState<{min: number; max: number}>({min: -10, max: 10});
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Determine the patient keys (all keys except "name") and memoize to preserve identity
  const patientKeys = useMemo(() => {
    return data.length > 0 ? Object.keys(data[0]).filter((key) => key !== "name") : [];
  }, [data]);
    
  // Calculate min and max values for dynamic color scaling
  useEffect(() => {
    if (data.length > 0) {
      let min = Infinity;
      let max = -Infinity;
      
      data.forEach(row => {
        patientKeys.forEach(key => {
          const value = typeof row[key] === "number" ? row[key] as number : Number(row[key]);
          if (!isNaN(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        });
      });
      
      // If we have valid min/max, update state only when values actually change
      if (min !== Infinity && max !== -Infinity) {
        setDataRange((prev) => {
          if (prev.min === min && prev.max === max) return prev;
          return { min, max };
        });
      }
    }
  }, [data, patientKeys]);
  
  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    // Initial update
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Helper function to determine fill color for a given value
  const getColor = (value: number) => {
    if (isNaN(value)) {
      return '#333'; // Return gray for NaN values
    }
    
    const { min, max } = dataRange;
    const maxAbs = Math.max(Math.abs(min), Math.abs(max));
    
    // Avoid division by zero: if all values are the same, color by sign
    if (maxAbs === 0) {
      return 'rgb(255, 255, 255)'; // all zeros
    }
    
    // Normalize to [-1, 1]
    const n = Math.max(-1, Math.min(1, value / maxAbs));
    
    // Two-color diverging palette with white at 0:
    // negative -> red (255,0,0) blending to white (255,255,255) at 0
    // positive -> white (255,255,255) blending to green (0,255,0)
    if (n < 0) {
      const t = -n; // 0 at 0, 1 at most negative
      const r = 255;
      const g = Math.round(255 * (1 - t));
      const b = Math.round(255 * (1 - t));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = n; // 0 at 0, 1 at most positive
      const r = Math.round(255 * (1 - t));
      const g = 255;
      const b = Math.round(255 * (1 - t));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Handle showing tooltip
  const handleMouseEnter = (
    e: React.MouseEvent,
    rowName: string,
    key: string,
    value: number
  ) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: `${rowName} - ${key}: ${isNaN(value) ? "N/A" : value.toFixed(2)}`
    });
  };
  
  // Handle showing header tooltip
  const handleHeaderMouseEnter = (
    e: React.MouseEvent,
    label: string
  ) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: label
    });
  };

  // Handle hiding tooltip
  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  // Handle showing modal tooltip
  const handleModalMouseEnter = (
    e: React.MouseEvent,
    rowName: string,
    key: string,
    value: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setModalTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: `${rowName} - ${key}: ${isNaN(value) ? "N/A" : value.toFixed(2)}`
    });
  };
  
  // Handle showing modal header tooltip
  const handleModalHeaderMouseEnter = (
    e: React.MouseEvent,
    label: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setModalTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: label
    });
  };

  // Handle hiding modal tooltip
  const handleModalMouseLeave = () => {
    setModalTooltip({ ...modalTooltip, visible: false });
  };

  // Calculate adaptive cell dimensions based on container size and data volume
  const calculateCellDimensions = () => {
    if (dimensions.width === 0 || patientKeys.length === 0) {
      return { cellWidth: 60, cellHeight: 25 }; // Default - smaller size
    }
    
    // // Use smaller fixed cell dimensions to fit better in the container
    // const cellWidth = 20; // Reduced width for better fit
    // const cellHeight = 10; // Reduced height for better fit
    const availableWidth = dimensions.width/4;
    const numCols = patientKeys.length + 1; // +1 for row headers
    
    const calculatedWidth = Math.max(22, availableWidth / numCols);
    const calculatedHeight = Math.min(15, calculatedWidth * 0.6);
    return {
      cellWidth: calculatedWidth,
      cellHeight: calculatedHeight
      // cellWidth: cellWidth,
      // cellHeight: cellHeight
    };
  };

  const { cellWidth, cellHeight } = calculateCellDimensions();
  
  // Add extra vertical space for rotated headers
  const headerHeight = cellHeight * 6; // More space for rotated headers
  const svgWidth = Math.max((patientKeys.length + 1) * cellWidth + 30, 300); // Smaller margins and minimum width
  const svgHeight = headerHeight + (data.length) * cellHeight +4; // Smaller bottom margin

  // No data handling
  if (data.length === 0) {
    return <div className="no-data">No data available for heatmap</div>;
  }

  // Function to truncate text safely (handles null/undefined)
  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (text === null || text === undefined) return "";
    const str = String(text);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "fit-content",
        minWidth: "100%",
        // height: "fit-content",
        minHeight: "100%",
        position: "relative",
        border: "1px solid #444",
        // borderRadius removed to defer rounding to parent container
        padding: "3px",
        backgroundColor: "#2b2b2b",
        overflow: "visible"
      }}
    >
      {/* Expand Button */}
      <button
        onClick={handleExpand}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "transparent",
          border: "none",
          color: "#EEEEEE",
          cursor: "pointer",
          fontSize: "14px",
          padding: "2px",
          borderRadius: "3px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          zIndex: 10
        }}
        title="Expand to full screen"
      >
        ⛶
      </button>
      <svg width={svgWidth} height={svgHeight}>
        {/* Header Row: First cell for row labels */}
        {patientKeys.map((key, colIndex) => (
          <g key={`header-${key}-${colIndex}`}>
            {/* Background for better visibility */}
            <rect
              x={(colIndex + 1) * cellWidth}
              y={0}
              width={cellWidth}
              height={headerHeight}
              fill="#2b2b2b"
              rx={3}
            />
            {/* Rotated text */}
            <text
              x={(colIndex + 1) * cellWidth + cellWidth / 2}
              y={headerHeight / 2}
               fontSize={`${Math.min(9, cellHeight * 0.6)}px`}
              fill="#ffffff"
              textAnchor="end"
              transform={`rotate(-65, ${(colIndex + 1) * cellWidth + cellWidth / 2}, ${headerHeight / 3})`}
              onMouseEnter={(e) => handleHeaderMouseEnter(e, key)}
              onMouseLeave={handleMouseLeave}
            >
              {truncateText(key, 12)}
            </text>
          </g>
        ))}
        {/* Heatmap cells */}
        {data.map((row, rowIndex) => (
          <g key={`row-${rowIndex}-${row.name}`}>
            {/* Row label */}
            <text
              x={10}
              y={headerHeight + (rowIndex + 0.5) * cellHeight}
               fontSize={`${Math.min(10, cellHeight * 0.7)}px`}
              fill="#ffffff"
              dominantBaseline="middle"
            >
              {truncateText(row.name, 15)}
            </text>
            {patientKeys.map((key, colIndex) => {
              // Ensure the cell value is a number
              const rawValue = row[key];
              const value =
                typeof rawValue === "number"
                  ? rawValue
                  : rawValue === undefined || rawValue === null
                  ? NaN
                  : Number(rawValue);

              return (
                <g key={`cell-${rowIndex}-${colIndex}`}>
                  <rect
                    x={(colIndex + 1) * cellWidth}
                    y={headerHeight + rowIndex * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={getColor(value)}
                    stroke="#666"
                    strokeOpacity={0.25}
                    onMouseEnter={(e) => handleMouseEnter(e, row.name, key, value)}
                    onMouseLeave={handleMouseLeave}
                    role="cell"
                    aria-label={`${row.name} ${key} value ${isNaN(value) ? "not available" : value}`}
                  />
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y + 10,
            left: tooltip.x + 10,
            backgroundColor: "#333",
            color: "#fff",
            padding: "5px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 1000,
            pointerEvents: "none",
            border: "1px solid #555"
          }}
        >
          {tooltip.content}
        </div>
      )}
      
      {/* Color Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100px", height: "10px", background: "linear-gradient(to right, red, white, green)", marginRight: "10px" }} />
        <span style={{ fontSize: "12px", color: "#fff" }}>
          {dataRange.min.toFixed(2)} to {dataRange.max.toFixed(2)}
        </span>
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          {/* Modal Content */}
          <div style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '10px',
            padding: '20px',
            width: '90%',
            height: '90%',
            maxWidth: '1200px',
            maxHeight: '800px',
            border: '1px solid #444',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '1px solid #444'
            }}>
              <h2 style={{ 
                color: '#EEEEEE',
                fontSize: '18px',
                margin: '0px'
              }}>
                Heat Map - Full Screen View
              </h2>
              <div style={{ 
                color: '#999', 
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0px 10px',
                gap: '15px'
              }}>
                {data.length} rows × {patientKeys.length} columns
                {/* Close Button */}
                <button
                  onClick={handleCloseModal}  
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#EEEEEE',
                    cursor: 'pointer',
                    fontSize: '24px',
                    padding: '10px 15px',
                    borderRadius: '5px',
                    zIndex: 1001
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Heatmap */}
            <div style={{ 
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              paddingLeft: '20px'
            }}>
               <svg width={(svgWidth - 20) * 1.5 + 30} height={(svgHeight - 20) * 1.5 + 30}>
                {/* Header Row: First cell for row labels */}
                {patientKeys.map((key, colIndex) => (
                  <g key={`modal-header-${key}-${colIndex}`}>
                    {/* Background for better visibility */}
                    <rect
                      x={(colIndex + 1) * cellWidth * 1.5}
                      y={0}
                      width={cellWidth * 1.5}
                      height={headerHeight * 1.5}
                      fill="#2b2b2b"
                      rx={3}
                    />
                    {/* Rotated text */}
                    <text
                      x={(colIndex + 1) * cellWidth * 1.5 + (cellWidth * 1.5) / 2}
                      y={(headerHeight * 1.5) / 3}
                      fontSize={`${Math.min(14, cellHeight * 0.5)}px`}
                      fontWeight="bold"
                      fill="#ffffff"
                      textAnchor="end"
                      transform={`rotate(-45, ${(colIndex + 1) * cellWidth * 1.5 + (cellWidth * 1.5) / 2}, ${(headerHeight * 1.5) / 3})`}
                      onMouseEnter={(e) => handleModalHeaderMouseEnter(e, key)}
                      onMouseLeave={handleModalMouseLeave}
                    >
                      {truncateText(key, 15)}
                    </text>
                  </g>
                ))}
                {/* Heatmap cells */}
                {data.map((row, rowIndex) => (
                  <g key={`modal-${rowIndex}-${row.name}`}>
                    {/* Row label */}
                    <text
                      x={10}
                      y={(headerHeight * 1.5) + (rowIndex + 0.5) * (cellHeight * 1.5)}
                      fontSize={`${Math.min(14, cellHeight * 0.6)}px`}
                      fill="#ffffff"
                      dominantBaseline="middle"
                    >
                      {truncateText(row.name, 20)}
                    </text>
                    {patientKeys.map((key, colIndex) => {
                      // Ensure the cell value is a number
                      const rawValue = row[key];
                      const value =
                        typeof rawValue === "number"
                          ? rawValue
                          : rawValue === undefined || rawValue === null
                          ? NaN
                          : Number(rawValue);

                      return (
                        <g key={`modal-cell-${rowIndex}-${colIndex}`}>
                          <rect
                            x={(colIndex + 1) * cellWidth * 1.5}
                            y={(headerHeight * 1.5) + rowIndex * (cellHeight * 1.5)}
                            width={cellWidth * 1.5}
                            height={cellHeight * 1.5}
                            fill={getColor(value)}
                            stroke="#666"
                            strokeOpacity={0.25}
                            onMouseEnter={(e) => handleModalMouseEnter(e, row.name, key, value)}
                            onMouseLeave={handleModalMouseLeave}
                            role="cell"
                            aria-label={`${row.name} ${key} value ${isNaN(value) ? "not available" : value}`}
                          />
                        </g>
                      );
                    })}
                  </g>
                ))}
              </svg>
              
              {/* Color Legend */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 0",
                  marginTop: "10px"
                }}
              >
                <div style={{ width: "200px", height: "20px", background: "linear-gradient(to right, red, white, green)", marginRight: "10px" }} />
                <span style={{ fontSize: "14px", color: "#fff" }}>
                  {dataRange.min.toFixed(2)} to {dataRange.max.toFixed(2)}
                </span>
              </div>
              
              {/* Modal Tooltip */}
              {modalTooltip.visible && (
                <div
                  style={{
                    position: "fixed",
                    top: modalTooltip.y,
                    left: modalTooltip.x,
                    backgroundColor: "#333",
                    color: "#fff",
                    padding: "5px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    zIndex: 1001,
                    pointerEvents: "none",
                    border: "1px solid #555",
                    transform: "translateX(-50%)"
                  }}
                >
                  {modalTooltip.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatHeatMap;
