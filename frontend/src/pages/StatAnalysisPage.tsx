// src/pages/StatAnalysisPage.tsx
import React, { useEffect, useState } from "react";
import StatAnalysisPageTemplate from "../components/StatAnalysisPageTemplate";
import StatDataTable from "../components/StatDataTable";
import StatVolcanoPlot from "../components/StatVolcanoPlot";
import StatHeatMap from "../components/StatHeatMap";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import API_ENDPOINTS from "../config/api";

interface DataRow {
  id: number;
  name: string;
  value: number;
}

interface VolcanoPoint {
  id: number;
  logFC: number;
  negLogP: number;
  label: string;
}

interface HeatMapRow {
  name: string;
  [patient: string]: number | string;
}

interface HeatmapPayload {
  data: HeatMapRow[];
  columnLabels: string[];
  rowLabels: string[];
  colGroupLabels: string[];
  totalProteins?: number;
  currentTopN?: number;
  aggregate_to_protein_level?: boolean;
  aggregation_method?: string;
}

interface StatisticalData {
  tableData: DataRow[];
  volcanoData: VolcanoPoint[];
  heatmapPayload: HeatmapPayload;
  groups: string[];
}

const StatAnalysisPage: React.FC = () => {
  const [data, setData] = useState<StatisticalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(20);
  const [topN, setTopN] = useState<number>(20);
  const [aggregateToProteinLevel, setAggregateToProteinLevel] = useState<boolean>(true);
  const [aggregationMethod, setAggregationMethod] = useState<string>("mean");
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState<boolean>(false);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      const dataset_id = localStorage.getItem("selectedDatasetId");
      const token = localStorage.getItem("token");

      console.log('[analysis] start dataset_id=', dataset_id, 'token?', Boolean(token));
      if (!dataset_id) {
        setError("No dataset_id found in localStorage.");
        return;
      }

      try {
        // Fetch volcano plot data
        const volcanoUrl = `${API_ENDPOINTS.VOLCANO_PLOT_DATA}?dataset_id=${dataset_id}`;
        console.log('[analysis] GET volcano plot data from', volcanoUrl);
        const volcanoResponse = await fetch(volcanoUrl, {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!volcanoResponse.ok) {
          throw new Error(`Volcano plot fetch failed: ${volcanoResponse.statusText}`);
        }

        const volcanoJson = await volcanoResponse.json();

        // Fetch heatmap data
        const heatmapUrl = `${API_ENDPOINTS.HEATMAP_DATA}?dataset_id=${dataset_id}&top_n=20&aggregate_to_protein_level=true&aggregation_method=mean`;
        console.log('[analysis] GET heatmap data from', heatmapUrl);
        const heatmapResponse = await fetch(heatmapUrl, {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!heatmapResponse.ok) {
          throw new Error(`Heatmap fetch failed: ${heatmapResponse.statusText}`);
        }

        const heatmapJson = await heatmapResponse.json();
        
        // For backward compatibility, create a results array from the volcano data
        // The volcano endpoint returns the raw statistical results
        const volcanoData = volcanoJson.volcano_data || [];
        const tableData: DataRow[] = volcanoData.map((item: any, index: number) => ({
          id: index + 1,
          name: item.Protein,
          value: item.statistic !== null && item.statistic !== undefined ? parseFloat(item.statistic) : 0,
        }));

        // Extract groups from volcano response
        const groups: string[] = volcanoJson.groups || [];

        const volcanoPoints: VolcanoPoint[] = volcanoData.map(
          (item: any, index: number) => ({
            id: index + 1,
            logFC: item.log2FC,
            negLogP: item.neg_log10_p_value,
            label: item.Protein,
          })
        );

        console.log('[analysis] volcano data sample:', {
          totalPoints: volcanoPoints.length,
          firstPoint: volcanoPoints[0],
          hasValidData: volcanoPoints.some(p => !isNaN(p.negLogP) && !isNaN(p.logFC)),
          groups: groups
        });

        const heatmapData: HeatMapRow[] = heatmapJson.matrix.map(
          (row: number[], rowIndex: number) => {
            const rowObj: HeatMapRow = { name: heatmapJson.row_labels[rowIndex] };
            heatmapJson.column_labels.forEach((patient: string, colIndex: number) => {
              rowObj[patient] = row[colIndex];
            });
            return rowObj;
          }
        );

        const heatmapPayload: HeatmapPayload = {
          data: heatmapData,
          columnLabels: heatmapJson.column_labels || [],
          rowLabels: heatmapJson.row_labels || [],
          colGroupLabels: heatmapJson.col_group_labels || [],
          totalProteins: heatmapJson.total_proteins,
          currentTopN: heatmapJson.current_top_n,
          aggregate_to_protein_level: heatmapJson.aggregate_to_protein_level || true,
          aggregation_method: heatmapJson.aggregation_method || 'mean',
        };

        console.log('[analysis] parsed counts', {
          table: tableData.length,
          volcano: volcanoPoints.length,
          heatmapRows: heatmapData.length,
          groups: new Set(heatmapJson.col_group_labels || []).size,
        });
        setData({ tableData, volcanoData: volcanoPoints, heatmapPayload, groups });
      } catch (err: any) {
        console.error("Error fetching analysis data:", err);
        setError(err.message || "Unexpected error occurred");
      }
    };

    fetchAnalysisData();
  }, []);

  // Initialize topN from data when it's first loaded
  useEffect(() => {
    if (data && data.heatmapPayload.currentTopN) {
      setTopN(data.heatmapPayload.currentTopN);
    }
  }, [data?.heatmapPayload.currentTopN]);

  // Initialize aggregateToProteinLevel from data when it's updated
  useEffect(() => {
    if (data && data.heatmapPayload.aggregate_to_protein_level !== undefined) {
      setAggregateToProteinLevel(data.heatmapPayload.aggregate_to_protein_level);
    }
  }, [data?.heatmapPayload.aggregate_to_protein_level]);

  // Initialize aggregationMethod from data when it's updated
  useEffect(() => {
    if (data && data.heatmapPayload.aggregation_method) {
      setAggregationMethod(data.heatmapPayload.aggregation_method);
    }
  }, [data?.heatmapPayload.aggregation_method]);

  const handleApplyTopN = async () => {
    console.log('[heatmap] handleApplyTopN called with topN =', topN, 'aggregateToProteinLevel =', aggregateToProteinLevel, 'aggregationMethod =', aggregationMethod);
    if (!data) {
      console.error('[heatmap] No data available');
      return;
    }
    
    console.log('[heatmap] Starting heatmap fetch...');
    setIsLoadingHeatmap(true);
    try {
      const dataset_id = localStorage.getItem("selectedDatasetId");
      const token = localStorage.getItem("token");

      const url = `${API_ENDPOINTS.HEATMAP_DATA}?dataset_id=${dataset_id}&top_n=${topN}&aggregate_to_protein_level=${aggregateToProteinLevel}&aggregation_method=${aggregationMethod}`;
      console.log('[heatmap] Fetching with top_n =', topN, 'aggregate_to_protein_level =', aggregateToProteinLevel, 'aggregation_method =', aggregationMethod, 'URL:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Heatmap fetch failed: ${response.statusText}`);
      }

      const json = await response.json();
      
      console.log('[heatmap] Response received with', json.matrix?.length || 0, 'rows');

      // Extract heatmap data
      const heatmapData: HeatMapRow[] = json.matrix.map(
        (row: number[], rowIndex: number) => {
          const rowObj: HeatMapRow = { name: json.row_labels[rowIndex] };
          json.column_labels.forEach((patient: string, colIndex: number) => {
            rowObj[patient] = row[colIndex];
          });
          return rowObj;
        }
      );

      console.log('[heatmap] Heatmap data mapped, rows:', heatmapData.length);

      const heatmapPayload: HeatmapPayload = {
        data: heatmapData,
        columnLabels: json.column_labels || [],
        rowLabels: json.row_labels || [],
        colGroupLabels: json.col_group_labels || [],
        totalProteins: json.total_proteins,
        currentTopN: json.current_top_n,
        aggregate_to_protein_level: json.aggregate_to_protein_level || false,
        aggregation_method: json.aggregation_method || 'mean',
      };

      setData({
        ...data,
        heatmapPayload,
      });
    } catch (err: any) {
      console.error("Error fetching heatmap data:", err);
      setError("Failed to update heatmap");
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

  if (error) {
    return (
      <StatAnalysisPageTemplate title="Statistical Analysis">
        <ErrorMessage
          message={error.includes('API error') || error.includes('No dataset')
            ? 'No analysis data available. Please upload and select a dataset first.'
            : error}
          type="error"
        />
      </StatAnalysisPageTemplate>
    );
  }

  if (!data) {
    return (
      <StatAnalysisPageTemplate title="Statistical Analysis">
        <LoadingSpinner 
          message="Performing Statistical Analysis"
          subMessage="Crunching the numbers..."
        />
      </StatAnalysisPageTemplate>
    );
  }

  return (
    <StatAnalysisPageTemplate title="Statistical Analysis">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "auto",
          marginTop: "20px",
          overflow: "visible",
        }}
      >
        {/* Data Table */}
        <div
          style={{
            height: "250px",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            paddingBottom: "10px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0 }}>Data Table ({Math.min(rowsToShow, data.tableData.length)} / {data.tableData.length})</h3>
            {rowsToShow < data.tableData.length && (
              <button
                onClick={() => setRowsToShow(prev => Math.min(prev + 5, data.tableData.length))}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#444",
                  color: "#fff",
                  border: "1px solid #666",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Load More (5 rows)
              </button>
            )}
          </div>
          <div
            style={{
              flex: 1,
              border: "1px solid #444",
              borderRadius: "8px",
              backgroundColor: "#2b2b2b",
            }}
          >
            <StatDataTable data={data.tableData.slice(0, rowsToShow)} />
          </div>
        </div>

        {/* Volcano Plot */}
        <div
          style={{
            height: "600px",
            borderRadius: "8px",
            backgroundColor: "#1e1e1e",
            padding: "10px",
            overflow: "hidden",
            marginBottom: "10px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>Volcano Plot</h3>
          <div 
            style={{ 
              flex: 1,
              width: "100%",
              padding: 0,
              margin: 0,
              borderRadius: "8px",
              minHeight: 0,
            }}>
            <StatVolcanoPlot data={data.volcanoData} groups={data.groups} datasetId={localStorage.getItem("selectedDatasetId") || ""} />
          </div>
        </div>

        {/* Heatmap */}
        <div
          style={{
            height: "600px",
            backgroundColor: "#1e1e1e",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 10px 0 10px", gap: "15px" }}>
            <h3 style={{ margin: 0 }}>Heat Map</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ fontSize: "12px", color: "#aaa", whiteSpace: "nowrap" }}>
                Top N Proteins:
              </label>
              <span style={{ fontSize: "11px", color: "#999", whiteSpace: "nowrap" }}>
                (Currently showing: {data.heatmapPayload.currentTopN || 0} / Total: {data.heatmapPayload.totalProteins || 0})
              </span>
              <input
                type="number"
                min="1"
                max={data.heatmapPayload.totalProteins || 20}
                value={topN}
                onChange={(e) => setTopN(Math.max(1, parseInt(e.target.value) || 20))}
                style={{
                  width: "70px",
                  padding: "4px 8px",
                  backgroundColor: "#2b2b2b",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              />
              <button
                onClick={() => {
                  console.log('[heatmap] Applying top N:', topN);
                  handleApplyTopN();
                }}
                disabled={isLoadingHeatmap || (topN === data.heatmapPayload.currentTopN && aggregateToProteinLevel === (data.heatmapPayload.aggregate_to_protein_level ?? true) && aggregationMethod === (data.heatmapPayload.aggregation_method || 'mean'))}
                style={{
                  padding: "4px 12px",
                  backgroundColor: isLoadingHeatmap || (topN === data.heatmapPayload.currentTopN && aggregateToProteinLevel === (data.heatmapPayload.aggregate_to_protein_level ?? true) && aggregationMethod === (data.heatmapPayload.aggregation_method || 'mean')) ? "#555" : "#007BFF",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  cursor: isLoadingHeatmap || (topN === data.heatmapPayload.currentTopN && aggregateToProteinLevel === (data.heatmapPayload.aggregate_to_protein_level ?? true) && aggregationMethod === (data.heatmapPayload.aggregation_method || 'mean')) ? "default" : "pointer",
                  fontSize: "12px",
                  opacity: isLoadingHeatmap || (topN === data.heatmapPayload.currentTopN && aggregateToProteinLevel === (data.heatmapPayload.aggregate_to_protein_level ?? true) && aggregationMethod === (data.heatmapPayload.aggregation_method || 'mean')) ? 0.6 : 1,
                }}
              >
                {isLoadingHeatmap ? "Applying..." : "Apply"}
              </button>
              <label style={{ fontSize: "12px", color: "#aaa", whiteSpace: "nowrap", marginLeft: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="checkbox"
                  checked={aggregateToProteinLevel}
                  onChange={(e) => setAggregateToProteinLevel(e.target.checked)}
                  style={{
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                  }}
                />
                Aggregate to Protein Level
              </label>
              {aggregateToProteinLevel && (
                <label style={{ fontSize: "12px", color: "#aaa", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                  Method:
                  <select
                    value={aggregationMethod}
                    onChange={(e) => setAggregationMethod(e.target.value)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#2b2b2b",
                      color: "#fff",
                      border: "1px solid #444",
                      borderRadius: "4px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="mean">Mean</option>
                    <option value="median">Median</option>
                  </select>
                </label>
              )}
            </div>
          </div>
          <div style={{ 
            flex: 1,
            position: "relative",
            borderRadius: "8px",
            minHeight: 0,
          }}>
            <StatHeatMap payload={data.heatmapPayload} />
          </div>
        </div>
      </div>
    </StatAnalysisPageTemplate>
  );
};

export default StatAnalysisPage;