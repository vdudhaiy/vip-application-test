import React, { useState, useEffect, useRef, useMemo } from "react";

// Define the shape of a heatmap data row; each gene row has multiple patient values
export interface HeatMapRow {
  name: string;
  [patient: string]: number | string;
}

interface HeatmapPayload {
  data: HeatMapRow[];
  columnLabels: string[];
  rowLabels: string[];
  colGroupLabels: string[];
}

interface StatHeatMapProps {
  payload: HeatmapPayload;
}

/**
 * Set2 palette colors - 8 colors from the Set2 palette (Qualitative - similar to Python's sns.color_palette("Set2"))
 */
const SET2_PALETTE = [
  "#66c2a5", // teal
  "#fc8d62", // orange
  "#8da0cb", // purple
  "#e78ac3", // pink
  "#a6d854", // green
  "#ffd92f", // yellow
  "#e5c494", // beige
  "#b3b3b3", // gray
];

/**
 * Diverging colormap similar to "vlag" from matplotlib
 * Maps values from -1 to 1 to appropriate colors
 * Dark Red (negative) -> White (zero) -> Dark Blue (positive)
 */
const getVlagColor = (normalizedValue: number): string => {
  // Clamp to [-1, 1]
  const n = Math.max(-1, Math.min(1, normalizedValue));

  if (n < 0) {
    // Negative values: Dark Red (#8B0000) to White (#FFFFFF)
    const t = -n; // 0 at 0, 1 at -1 (intensity of red)
    const r = Math.round(139 * t + 255 * (1 - t));
    const g = Math.round(0 * t + 255 * (1 - t));
    const b = Math.round(0 * t + 255 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  } else if (n > 0) {
    // Positive values: White (#FFFFFF) to Dark Blue (#00008B)
    const t = n; // 0 at 0, 1 at 1 (intensity of blue)
    const r = Math.round(255 * (1 - t) + 0 * t);
    const g = Math.round(255 * (1 - t) + 0 * t);
    const b = Math.round(255 * (1 - t) + 139 * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Zero: White
    return "rgb(255, 255, 255)";
  }
};

/**
 * StatHeatMap component
 * Renders a clustered heatmap with group color bars and legend, matching the Python visualization.
 * Features:
 * - Symmetric color limits based on 99.5th percentile
 * - Diverging colormap (vlag-like)
 * - Group color bar above the heatmap
 * - Group legend with Set2 palette colors
 * - Interactive tooltips
 * - Expandable fullscreen modal
 */
const StatHeatMap: React.FC<StatHeatMapProps> = ({ payload }) => {
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Calculate color limits based on 99.5th percentile for symmetric scaling
  const colorLimits = useMemo(() => {
    const values: number[] = [];
    payload.data.forEach((row) => {
      payload.columnLabels.forEach((col) => {
        const val = typeof row[col] === "number" ? row[col] : Number(row[col]);
        if (!isNaN(val)) {
          values.push(Math.abs(val));
        }
      });
    });

    if (values.length === 0) {
      return { min: -1, max: 1 };
    }

    // Sort for percentile calculation
    values.sort((a, b) => a - b);
    const idx = Math.ceil(values.length * 0.995) - 1;
    const maxAbs = Math.max(values[idx], 1e-6);

    return { min: -maxAbs, max: maxAbs };
  }, [payload]);

  // Group information: create unique groups with assigned colors
  const groupInfo = useMemo(() => {
    const groups = [...new Set(payload.colGroupLabels)];
    const groupColorMap: { [key: string]: string } = {};
    groups.forEach((group, idx) => {
      groupColorMap[group] = SET2_PALETTE[idx % SET2_PALETTE.length];
    });
    return { groups, groupColorMap };
  }, [payload.colGroupLabels]);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const handleExpand = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleMouseEnter = (
    e: React.MouseEvent,
    rowName: string,
    colName: string,
    value: number
  ) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: `${rowName} - ${colName}: ${isNaN(value) ? "N/A" : value.toFixed(2)}`,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  const handleModalMouseEnter = (
    e: React.MouseEvent,
    rowName: string,
    colName: string,
    value: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setModalTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: `${rowName} - ${colName}: ${isNaN(value) ? "N/A" : value.toFixed(2)}`,
    });
  };

  const handleModalMouseLeave = () => {
    setModalTooltip({ ...modalTooltip, visible: false });
  };

  // Calculate cell dimensions for responsive layout
  const calculateDimensions = (scale: number = 1) => {
    if (dimensions.width === 0 || payload.columnLabels.length === 0) {
      return {
        cellWidth: 30 * scale,
        cellHeight: 15 * scale,
        headerHeight: 100 * scale,
        groupBarHeight: 15 * scale,
      };
    }

    const availableWidth = (dimensions.width / 1.2) * scale;
    const numCols = payload.columnLabels.length;
    const cellWidth = Math.max(15 * scale, Math.min(40 * scale, availableWidth / numCols));
    const cellHeight = Math.max(12 * scale, cellWidth * 0.5);
    const headerHeight = cellHeight * 3.5 * scale;
    const groupBarHeight = cellHeight * 0.6 * scale;

    return { cellWidth, cellHeight, headerHeight, groupBarHeight };
  };

  const dims = calculateDimensions();
  const svgWidth = payload.columnLabels.length * dims.cellWidth + 100;
  const svgHeight = dims.groupBarHeight + dims.headerHeight + payload.data.length * dims.cellHeight + 60;

  if (payload.data.length === 0) {
    return (
      <div style={{ padding: "20px", color: "#999" }}>
        No data available for heatmap
      </div>
    );
  }

  // Renderer function for the heatmap grid
  const renderHeatmapGrid = (scale: number = 1, isModal: boolean = false) => {
    const scaledDims = calculateDimensions(scale);
    const scaledSvgWidth = payload.columnLabels.length * scaledDims.cellWidth + 100;
    const scaledSvgHeight =
      scaledDims.groupBarHeight + scaledDims.headerHeight + payload.data.length * scaledDims.cellHeight + 100;

    const rowLabelWidth = 70;
    const startX = rowLabelWidth + 10;

    return (
      <svg key={`heatmap-${isModal}`} width={scaledSvgWidth} height={scaledSvgHeight}>
        <defs>
          {/* Gradient for colorbar */}
          <linearGradient id="colorbar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#8B0000", stopOpacity: 1 }} />
            <stop offset="25%" style={{ stopColor: "#FF6B6B", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#FFFFFF", stopOpacity: 1 }} />
            <stop offset="75%" style={{ stopColor: "#87CEEB", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#00008B", stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Title */}
        <text
          x={scaledSvgWidth / 2}
          y={20}
          fontSize={Math.max(12, scaledDims.cellHeight * 1.2) * (isModal ? 1.3 : 1)}
          fill="#ffffff"
          textAnchor="middle"
          fontWeight="bold"
        >
          Clustered Expression Matrix
        </text>

        {/* Group Color Bar */}
        <g key="group-bar">
          <text
            x={startX}
            y={35 + scaledDims.cellHeight * 0.3}
            fontSize={Math.min(9, scaledDims.cellHeight * 0.6)}
            fill="#aaa"
            textAnchor="end"
          >
            Group:
          </text>
          {payload.columnLabels.map((col, colIdx) => {
            const group = payload.colGroupLabels[colIdx];
            const color = groupInfo.groupColorMap[group] || "#666";
            const x = startX + colIdx * scaledDims.cellWidth;

            return (
              <rect
                key={`group-${colIdx}`}
                x={x}
                y={35}
                width={scaledDims.cellWidth}
                height={scaledDims.groupBarHeight}
                fill={color}
                stroke="#444"
                strokeWidth={0.5}
              />
            );
          })}
        </g>

        {/* Column Headers (Patient/Sample names) */}
        <g key="column-headers">
          {payload.columnLabels.map((col, colIdx) => {
            const x = startX + colIdx * scaledDims.cellWidth;
            const y = 35 + scaledDims.groupBarHeight + scaledDims.cellHeight * 3;

            return (
              <g key={`header-${colIdx}`}>
                <text
                  x={x + scaledDims.cellWidth / 2}
                  y={y}
                  fontSize={Math.min(8, scaledDims.cellHeight * 0.6)}
                  fill="#ffffff"
                  textAnchor="middle"
                  transform={`rotate(-45, ${x + scaledDims.cellWidth / 2}, ${y})`}
                  onMouseEnter={(e) => {
                    const content = `${col} (${payload.colGroupLabels[colIdx]})`;
                    if (isModal) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setModalTooltip({
                        visible: true,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10,
                        content,
                      });
                    } else {
                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        content,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    if (isModal) {
                      setModalTooltip({ ...modalTooltip, visible: false });
                    } else {
                      setTooltip({ ...tooltip, visible: false });
                    }
                  }}
                >
                  {col.substring(0, 10)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Heatmap cells */}
        <g key="heatmap-cells">
          {payload.data.map((row, rowIdx) => {
            const y = 35 + scaledDims.groupBarHeight + scaledDims.headerHeight + rowIdx * scaledDims.cellHeight;

            return (
              <g key={`row-${rowIdx}`}>
                {/* Row label */}
                <text
                  x={startX - 5}
                  y={y + scaledDims.cellHeight / 2}
                  fontSize={Math.min(9, scaledDims.cellHeight * 0.7)}
                  fill="#ffffff"
                  textAnchor="end"
                  dominantBaseline="middle"
                  title={row.name}
                >
                  {row.name.substring(0, 12)}
                </text>

                {/* Cells */}
                {payload.columnLabels.map((col, colIdx) => {
                  const rawValue = row[col];
                  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
                  const x = startX + colIdx * scaledDims.cellWidth;

                  // Normalize value to [-1, 1] for color mapping
                  const normalizedValue = (value - colorLimits.min) / (colorLimits.max - colorLimits.min) * 2 - 1;
                  const cellColor = isNaN(value) ? "#333" : getVlagColor(normalizedValue);

                  return (
                    <rect
                      key={`cell-${rowIdx}-${colIdx}`}
                      x={x}
                      y={y}
                      width={scaledDims.cellWidth}
                      height={scaledDims.cellHeight}
                      fill={cellColor}
                      stroke="#555"
                      strokeWidth={0.3}
                      strokeOpacity={0.5}
                      onMouseEnter={(e) => {
                        if (isModal) {
                          handleModalMouseEnter(e, row.name, col, value);
                        } else {
                          handleMouseEnter(e, row.name, col, value);
                        }
                      }}
                      onMouseLeave={() => {
                        if (isModal) {
                          handleModalMouseLeave();
                        } else {
                          handleMouseLeave();
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#1e1e1e",
        padding: "10px",
        borderRadius: "8px",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Expand Button */}
      <button
        onClick={handleExpand}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          color: "#EEEEEE",
          cursor: "pointer",
          fontSize: "14px",
          padding: "5px 10px",
          borderRadius: "4px",
          zIndex: 10,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
        }}
        title="Expand to full screen"
      >
        ⛶
      </button>

      {/* Main heatmap */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", overflow: "auto", padding: "0", minHeight: 0 }}>
          {renderHeatmapGrid(1, false)}
        </div>
        
        {/* Legend below the heatmap */}
        {groupInfo.groups.length > 0 && (
          <div
            style={{
              padding: "8px 0px",
              borderTop: "1px solid #444",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              fontSize: "12px",
              color: "#fff",
              flexWrap: "wrap",
              margin: "0px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: "bold" }}>Groups:</span>
            {groupInfo.groups.map((group, idx) => (
              <div
                key={`legend-item-${idx}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: groupInfo.groupColorMap[group],
                    border: "1px solid #aaa",
                    borderRadius: "2px",
                  }}
                />
                <span>{group}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Color scale legend */}
        <div
          style={{
            marginTop: "4px",
            marginBottom: "0px",
            padding: "8px 0",
            borderTop: "1px solid #444",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            color: "#aaa",
            margin: 0,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ flexShrink: 0 }}>Color scale:</span>
          <div
            style={{
              width: "150px",
              height: "15px",
              background:
                "linear-gradient(to right, #8B0000 0%, #FF6B6B 25%, #FFFFFF 50%, #87CEEB 75%, #00008B 100%)",
              borderRadius: "2px",
              border: "1px solid #555",
              flexShrink: 0,
            }}
          />
          <span style={{ flexShrink: 0 }}>
            {colorLimits.min.toFixed(2)} to {colorLimits.max.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y + 10,
            left: tooltip.x + 10,
            backgroundColor: "#333",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 1000,
            pointerEvents: "none",
            border: "1px solid #666",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "20px",
            overflow: "auto",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
              paddingBottom: "10px",
              paddingRight: "5px",
              borderBottom: "1px solid #444",
              color: "#fff",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px" }}>Heatmap - Fullscreen View</h2>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "12px", color: "#999", whiteSpace: "nowrap" }}>
                {payload.data.length} rows × {payload.columnLabels.length} columns
              </span>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "#EEEEEE",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  flexShrink: 0,
                  minWidth: "40px",
                  textAlign: "center",
                }}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div
            style={{
              flex: 1,
              width: "100%",
              overflowY: "auto",
              overflowX: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "0",
            }}
          >
            <div style={{ padding: "10px" }}>{renderHeatmapGrid(1.5, true)}</div>
            
            {/* Color scale legend */}
            <div
              style={{
                width: "100%",
                padding: "8px 10px",
                borderTop: "1px solid #444",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "#aaa",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ flexShrink: 0 }}>Color scale:</span>
              <div
                style={{
                  width: "200px",
                  height: "20px",
                  background:
                    "linear-gradient(to right, #8B0000 0%, #FF6B6B 25%, #FFFFFF 50%, #87CEEB 75%, #00008B 100%)",
                  borderRadius: "2px",
                  border: "1px solid #555",
                  flexShrink: 0,
                }}
              />
              <span style={{ minWidth: "130px", flexShrink: 0 }}>
                {colorLimits.min.toFixed(2)} to {colorLimits.max.toFixed(2)}
              </span>
            </div>
            
            {/* Legend below the modal heatmap */}
            {groupInfo.groups.length > 0 && (
              <div
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderTop: "1px solid #444",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  fontSize: "13px",
                  color: "#fff",
                  flexWrap: "wrap",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontWeight: "bold" }}>Groups:</span>
                {groupInfo.groups.map((group, idx) => (
                  <div
                    key={`legend-item-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: groupInfo.groupColorMap[group],
                        border: "1px solid #aaa",
                        borderRadius: "2px",
                      }}
                    />
                    <span>{group}</span>
                  </div>
                ))}
              </div>
            )}
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
                padding: "6px 10px",
                borderRadius: "4px",
                fontSize: "12px",
                zIndex: 1001,
                pointerEvents: "none",
                border: "1px solid #666",
                transform: "translateX(-50%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {modalTooltip.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatHeatMap;