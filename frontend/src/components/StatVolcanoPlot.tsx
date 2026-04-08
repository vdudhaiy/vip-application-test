import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  ReferenceLine,
} from "recharts";
import API_ENDPOINTS from "../config/api";

// Define the shape of a volcano plot data point
export interface VolcanoPoint {
  id: number;
  logFC: number;
  negLogP: number;
  label: string;
}

interface StatVolcanoPlotProps {
  data: VolcanoPoint[];
  groups?: string[];
  datasetId?: string;
  referenceGroup?: string | null;
}

interface PairwiseVolcanoData {
  [contrast: string]: {
    volcano_data: VolcanoPoint[];
    thresholds: { log2fc: number; qval: number; pval: number };
  };
}

/**
 * StatVolcanoPlot component
 * Uses Recharts to render an interactive volcano plot in dark mode.
 * Handles both single and pairwise volcano plots based on number of groups.
 */
const StatVolcanoPlot: React.FC<StatVolcanoPlotProps> = ({ data, groups = [], datasetId = "", referenceGroup = null }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentData, setCurrentData] = useState<VolcanoPoint[]>(data);
  
  // Reference group selection and pairwise volcanos
  const [selectedReferenceGroup, setSelectedReferenceGroup] = useState<string | null>(null);
  const [appliedReferenceGroup, setAppliedReferenceGroup] = useState<string | null>(null);
  const [pairwiseVolcanos, setPairwiseVolcanos] = useState<PairwiseVolcanoData>({});
  const [currentContrast, setCurrentContrast] = useState<string>("");
  const [isLoadingPairwise, setIsLoadingPairwise] = useState<boolean>(false);
  
  // Default thresholds
  const [fcThreshold, setFcThreshold] = useState<number>(0);
  const [pThreshold, setPThreshold] = useState<number>(0);

  // Axis domains with padding
  const [xDomain, setXDomain] = useState<[number, number]>([-1, 1]);
  const [yDomain, setYDomain] = useState<[number, number]>([0, 2]);

  // Format number to 4 decimal places
  const formatToFourDecimals = (value: number) => {
    return value.toFixed(4);
  };

  const handleExpand = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Initialize reference group selector when groups change
  useEffect(() => {
    if (groups.length > 0 && !selectedReferenceGroup) {
      setSelectedReferenceGroup(groups[0]);
    }
  }, [groups, selectedReferenceGroup]);

  // Update current data when incoming data changes
  useEffect(() => {
    console.log('[volcano] Incoming data prop changed:', data.length, 'points');
    setCurrentData(data);
  }, [data]);

  // Fetch pairwise volcanos when reference group is applied
  useEffect(() => {
    if (appliedReferenceGroup && groups.length > 2 && datasetId) {
      fetchPairwiseVolcanos();
    }
  }, [appliedReferenceGroup]);

  // Fetch pairwise volcano plots for multi-group comparisons
  const fetchPairwiseVolcanos = async () => {
    setIsLoadingPairwise(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${API_ENDPOINTS.VOLCANO_PLOT_DATA}?dataset_id=${datasetId}&reference_group=${appliedReferenceGroup}`;
      console.log('[volcano] Fetching pairwise volcanos from:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pairwise volcanos: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('[volcano] Pairwise volcanos response:', responseData);
      
      if (responseData.pairwise_volcanos) {
        const pairwiseData: PairwiseVolcanoData = {};
        
        // Transform pairwise volcano data to match VolcanoPoint format
        for (const [contrastLabel, contrastData] of Object.entries(responseData.pairwise_volcanos)) {
          const volcanoDataRaw = (contrastData as any).volcano_data || [];
          const transformedVolcanoData: VolcanoPoint[] = volcanoDataRaw.map((item: any, index: number) => ({
            id: index + 1,
            logFC: parseFloat(item.log2FC) || 0,
            negLogP: parseFloat(item.neg_log10_p_value) || 0,
            label: item.Protein || `Protein_${index}`,
          }));
          
          pairwiseData[contrastLabel] = {
            volcano_data: transformedVolcanoData,
            thresholds: (contrastData as any).thresholds || { log2fc: 0.58, qval: 0.05, pval: 0.05 }
          };
        }
        
        console.log('[volcano] Transformed pairwise data keys:', Object.keys(pairwiseData));
        setPairwiseVolcanos(pairwiseData);
        
        const firstContrast = Object.keys(pairwiseData)[0];
        if (firstContrast) {
          console.log('[volcano] First contrast:', firstContrast);
          const volcanoDataPoints = pairwiseData[firstContrast].volcano_data;
          console.log('[volcano] Volcano data points for first contrast:', volcanoDataPoints);
          setCurrentContrast(firstContrast);
          setCurrentData(volcanoDataPoints || []);
        }
      } else {
        console.warn('[volcano] No pairwise_volcanos in response');
      }
    } catch (error) {
      console.error('[volcano] Error fetching pairwise volcanos:', error);
    } finally {
      setIsLoadingPairwise(false);
    }
  };

  // Handle applying a reference group
  const handleApplyReferenceGroup = () => {
    if (selectedReferenceGroup) {
      setAppliedReferenceGroup(selectedReferenceGroup);
    }
  };

  // Calculate axis domains with 10% padding
  useEffect(() => {
    if (currentData.length > 0) {
      // Find max absolute x value
      let maxAbsX = 0;
      currentData.forEach(point => {
        maxAbsX = Math.max(maxAbsX, Math.abs(point.logFC));
      });
      
      // Add 10% padding to x-axis (symmetrically)
      const paddedX = maxAbsX * 1.1;
      
      // Find max y value
      let maxY = 0;
      currentData.forEach(point => {
        maxY = Math.max(maxY, point.negLogP);
      });
      
      // Add 10% padding to y-axis
      const paddedY = maxY * 1.1;
      
      setXDomain([-paddedX, paddedX]);
      setYDomain([0, paddedY]);
    }
  }, [currentData]);

  // Group data points based on thresholds
  const categorizePoints = () => {
    const upRegulated: VolcanoPoint[] = [];
    const downRegulated: VolcanoPoint[] = [];
    const notSignificant: VolcanoPoint[] = [];

    currentData.forEach(point => {
      // Skip invalid points but allow negLogP = 0
      if (isNaN(point.negLogP) || isNaN(point.logFC)) {
        return;
      }
      
      // Ensure negLogP is always non-negative
      const safeNegLogP = Math.max(point.negLogP, 0);
      const pointWithSafeValues = {
        ...point,
        negLogP: safeNegLogP
      };
      
      // Significant points above horizontal line and outside vertical lines
      if (safeNegLogP >= pThreshold) {
        if (point.logFC >= fcThreshold) {
          upRegulated.push(pointWithSafeValues);
        } else if (point.logFC <= -fcThreshold) {
          downRegulated.push(pointWithSafeValues);
        } else {
          notSignificant.push(pointWithSafeValues);
        }
      } else {
        notSignificant.push(pointWithSafeValues);
      }
    });

    return { upRegulated, downRegulated, notSignificant };
  };

  const { upRegulated, downRegulated, notSignificant } = categorizePoints();

  useEffect(() => {
    console.log('[volcano] data categorization:', {
      dataLength: currentData.length,
      upRegulated: upRegulated.length,
      downRegulated: downRegulated.length,
      notSignificant: notSignificant.length,
      fcThreshold,
      pThreshold,
      sample: currentData.length > 0 ? {
        first: currentData[0],
        hasValidValues: !isNaN(currentData[0].logFC) && !isNaN(currentData[0].negLogP)
      } : null
    });
  }, [currentData, upRegulated, downRegulated, notSignificant]);

  return (
    <div
      style={{
        border: "1px solid #444",
        // borderRadius removed to defer rounding to parent container
        padding: "0px",
        backgroundColor: "#2b2b2b",
        overflow: "auto", 
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}
    >
      {/* Group Information and Reference Group Selector */}
      {groups.length > 0 && (
        <div
          style={{
            padding: "12px 15px",
            borderBottom: "1px solid #444",
            backgroundColor: "#1e1e1e",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#aaa", fontSize: "13px", fontWeight: "600" }}>
              Groups: {groups.length}
            </span>
            <span style={{ color: "#888", fontSize: "12px" }}>
              ({groups.join(", ")})
            </span>
          </div>

          {groups.length > 2 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                htmlFor="reference-group-select"
                style={{
                  color: "#aaa",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: 0
                }}
              >
                Reference Group:
              </label>
              <select
                id="reference-group-select"
                value={selectedReferenceGroup || ""}
                onChange={(e) => setSelectedReferenceGroup(e.target.value)}
                style={{
                  padding: "6px 10px",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
                disabled={isLoadingPairwise}
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyReferenceGroup}
                disabled={!selectedReferenceGroup || isLoadingPairwise}
                style={{
                  padding: "6px 14px",
                  backgroundColor: selectedReferenceGroup ? "#0078d4" : "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: selectedReferenceGroup && !isLoadingPairwise ? "pointer" : "not-allowed",
                  opacity: isLoadingPairwise ? 0.7 : 1
                }}
              >
                {isLoadingPairwise ? "Applying..." : "Apply"}
              </button>
            </div>
          )}

          {Object.keys(pairwiseVolcanos).length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                htmlFor="pairwise-contrast-select"
                style={{
                  color: "#aaa",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: 0
                }}
              >
                Comparison:
              </label>
              <select
                id="pairwise-contrast-select"
                value={currentContrast}
                onChange={(e) => {
                  const contrast = e.target.value;
                  console.log('[volcano] Switching to contrast:', contrast);
                  setCurrentContrast(contrast);
                  const contrastData = pairwiseVolcanos[contrast];
                  if (contrastData && contrastData.volcano_data) {
                    console.log('[volcano] Setting currentData for', contrast, ':', contrastData.volcano_data.length, 'points');
                    setCurrentData(contrastData.volcano_data);
                  } else {
                    console.warn('[volcano] No data found for contrast:', contrast);
                  }
                }}
                style={{
                  padding: "6px 10px",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {Object.keys(pairwiseVolcanos).map((contrast) => (
                  <option key={contrast} value={contrast}>
                    {contrast}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Expand Button */}
      <button
        onClick={handleExpand}
        style={{
          position: "absolute",
          top: groups.length > 0 ? "60px" : "10px",
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
      
      {groups.length > 2 && !appliedReferenceGroup ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "15px",
            color: "#888",
            minHeight: 0
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: "500" }}>Please select and apply a reference group to view volcano plot</div>
        </div>
      ) : (
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 15, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#666" />
            <XAxis
              dataKey="logFC"
              name="Log Fold Change"
              type="number"
              domain={xDomain}
              stroke="#ffffff"
              tickFormatter={formatToFourDecimals}
              label={{ value: "Log FC (Fold Change)", position: "insideBottomRight", offset: -10, fill: "#ffffff" }}
            />
            <YAxis
              dataKey="negLogP"
              name="-Log P-value"
              type="number"
              domain={yDomain}
              stroke="#ffffff"
              tickFormatter={formatToFourDecimals}
              label={{ value: "-Log P-value", angle: -90, position: "insideLeft", fill: "#ffffff" }}
            />
            
            {/* Boundary lines */}
            <ReferenceLine 
              x={fcThreshold} 
              stroke="#ffffff" 
              strokeWidth={2}
              label={{ value: `x=${fcThreshold}`, position: 'top', fill: '#ffffff' }} 
            />
            <ReferenceLine 
              x={-fcThreshold} 
              stroke="#ffffff" 
              strokeWidth={2}
              label={{ value: `x=${-fcThreshold}`, position: 'top', fill: '#ffffff' }} 
            />
            <ReferenceLine 
              y={pThreshold} 
              stroke="#ffffff" 
              strokeWidth={2}
              label={{ value: `y=${pThreshold}`, position: 'right', fill: '#ffffff' }} 
            />
            
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{ backgroundColor: "#333", border: "1px solid #666", padding: "8px" }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#fff" }}
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ color: "#fff" }}>
                      <p style={{ margin: "2px 0" }}>
                        <strong>{data.label}</strong>
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        Log FC (X): {Number(data.logFC).toFixed(4)}
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        -Log P (Y): {Number(data.negLogP).toFixed(4)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Scatter plots with different colors */}
            <Scatter 
              name="Not Significant" 
              data={notSignificant} 
              fill="#8884d8"
              isAnimationActive={false}
              shape={(props: any) => {
                const { cx, cy } = props;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={2}
                    fill="#8884d8"
                  />
                );
              }}
            />
            <Scatter 
              name="Up Regulated" 
              data={upRegulated} 
              fill="#ff5252"
              isAnimationActive={false}
              shape={(props: any) => {
                const { cx, cy } = props;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={2}
                    fill="#ff5252"
                  />
                );
              }}
            />
            <Scatter 
              name="Down Regulated" 
              data={downRegulated} 
              fill="#4caf50"
              isAnimationActive={false}
              shape={(props: any) => {
                const { cx, cy } = props;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={2}
                    fill="#4caf50"
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      )}
      
      {/* Threshold inputs - only show when plot is visible */}
      {(groups.length <= 2 || appliedReferenceGroup) && (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "8px",
          backgroundColor: "#2b2b2b",
          borderTop: "1px solid #444",
        }}
      >
        <div style={{ marginRight: "20px" }}>
          <label style={{ color: "#fff", fontSize: "12px", marginRight: "5px" }}>
            Log FC (Horizontal) Threshold:
          </label>
          <input
            type="number"
            step="0.1"
            value={fcThreshold}
            onChange={(e) => setFcThreshold(Number(e.target.value))}
            style={{
              width: "60px",
              backgroundColor: "#333",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "2px 5px",
            }}
          />
        </div>
        <div>
          <label style={{ color: "#fff", fontSize: "12px", marginRight: "5px" }}>
            -Log P (Vertical) Threshold:
          </label>
          <input
            type="number"
            step="0.1"
            value={pThreshold}
            onChange={(e) => setPThreshold(Number(e.target.value))}
            style={{
              width: "60px",
              backgroundColor: "#333",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "2px 5px",
            }}
          />
        </div>
      </div>
      )}

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
                Volcano Plot - Full Screen View
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
                {data.length} data points
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

            {/* Modal Chart */}
            <div style={{ 
              flex: 1,
              minHeight: '400px'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" />
                  <XAxis
                    dataKey="logFC"
                    name="Log Fold Change"
                    type="number"
                    domain={xDomain}
                    stroke="#ffffff"
                    tickFormatter={formatToFourDecimals}
                    fontSize={14}
                    label={{ value: "Log FC (Fold Change)", position: "insideBottomRight", offset: -10, fill: "#ffffff" }}
                  />
                  <YAxis
                    dataKey="negLogP"
                    name="-Log P-value"
                    type="number"
                    domain={yDomain}
                    stroke="#ffffff"
                    tickFormatter={formatToFourDecimals}
                    fontSize={14}
                    label={{ value: "-Log P-value", angle: -90, position: "insideLeft", fill: "#ffffff" }}
                  />
                  
                  {/* Boundary lines */}
                  <ReferenceLine 
                    x={fcThreshold} 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    label={{ value: `x=${fcThreshold}`, position: 'top', fill: '#ffffff' }} 
                  />
                  <ReferenceLine 
                    x={-fcThreshold} 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    label={{ value: `x=${-fcThreshold}`, position: 'top', fill: '#ffffff' }} 
                  />
                  <ReferenceLine 
                    y={pThreshold} 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    label={{ value: `y=${pThreshold}`, position: 'right', fill: '#ffffff' }} 
                  />
                  
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: "#333", border: "1px solid #666", padding: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ color: "#fff" }}>
                            <p style={{ margin: "2px 0" }}>
                              <strong>{data.label}</strong>
                            </p>
                            <p style={{ margin: "2px 0" }}>
                              Log FC (X): {Number(data.logFC).toFixed(4)}
                            </p>
                            <p style={{ margin: "2px 0" }}>
                              -Log P (Y): {Number(data.negLogP).toFixed(4)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Scatter plots with different colors */}
                  <Scatter 
                    name="Not Significant" 
                    data={notSignificant} 
                    fill="#8884d8"
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={3}
                          fill="#8884d8"
                        />
                      );
                    }}
                  />
                  <Scatter 
                    name="Up Regulated" 
                    data={upRegulated} 
                    fill="#ff5252"
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={3}
                          fill="#ff5252"
                        />
                      );
                    }}
                  />
                  <Scatter 
                    name="Down Regulated" 
                    data={downRegulated} 
                    fill="#4caf50"
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={3}
                          fill="#4caf50"
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Threshold inputs */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "8px",
                backgroundColor: "#2b2b2b",
                borderTop: "1px solid #444",
                marginTop: "10px"
              }}
            >
              <div style={{ marginRight: "20px" }}>
                <label style={{ color: "#fff", fontSize: "12px", marginRight: "5px" }}>
                  Log FC (Horizontal) Threshold:
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={fcThreshold}
                  onChange={(e) => setFcThreshold(Number(e.target.value))}
                  style={{
                    width: "60px",
                    backgroundColor: "#333",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    padding: "2px 5px",
                  }}
                />
              </div>
              <div>
                <label style={{ color: "#fff", fontSize: "12px", marginRight: "5px" }}>
                  -Log P (Vertical) Threshold:
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pThreshold}
                  onChange={(e) => setPThreshold(Number(e.target.value))}
                  style={{
                    width: "60px",
                    backgroundColor: "#333",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    padding: "2px 5px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatVolcanoPlot;