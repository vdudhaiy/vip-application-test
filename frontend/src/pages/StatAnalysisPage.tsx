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

interface StatisticalData {
  tableData: DataRow[];
  volcanoData: VolcanoPoint[];
  heatmapData: HeatMapRow[];
}

const StatAnalysisPage: React.FC = () => {
  const [data, setData] = useState<StatisticalData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const url = `${API_ENDPOINTS.ANALYSIS}?dataset_id=${dataset_id}`;
        console.log('[analysis] GET', url);
        const response = await fetch(url, {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        });

        const json = await response.json();

        const tableData: DataRow[] = json.results.map((item: any, index: number) => ({
          id: index + 1,
          name: item.Protein,
          value: parseFloat(item.mean_difference?.toFixed(2)) || 0,
        }));

        const volcanoData: VolcanoPoint[] = json.volcano.volcano_data.map(
          (item: any, index: number) => ({
            id: index + 1,
            logFC: item.log2fd,
            negLogP: item["-log10(q_value)"],
            label: item.Protein,
          })
        );

        const heatmapData: HeatMapRow[] = json.heatmap.matrix.map(
          (row: number[], rowIndex: number) => {
            const rowObj: HeatMapRow = { name: json.heatmap.row_labels[rowIndex] };
            json.heatmap.column_labels.forEach((patient: string, colIndex: number) => {
              rowObj[patient] = row[colIndex];
            });
            return rowObj;
          }
        );

        console.log('[analysis] parsed counts', {
          table: tableData.length,
          volcano: volcanoData.length,
          heatmapRows: heatmapData.length,
        });
        setData({ tableData, volcanoData, heatmapData });
      } catch (err: any) {
        console.error("Error fetching analysis data:", err);
        setError(err.message || "Unexpected error occurred");
      }
    };

    fetchAnalysisData();
  }, []);

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
          width: "100%",
          height: "calc(100vh - 120px)", // Account for template padding and title
          marginTop: "20px",
          overflow: "auto",
        }}
      >
        {/* Data Table */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            paddingRight: "10px",
            boxSizing: "border-box",
          }}
        >
          <h3>Data Table</h3>
          <div
            style={{
              flex: 1,
              border: "1px solid #444",
              borderRadius: "8px",
              backgroundColor: "#2b2b2b",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <StatDataTable data={data.tableData} />
          </div>
        </div>

        {/* Volcano Plot + Heatmap */}
        <div
          style={{
            width: "60%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            // paddingLeft: "10px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: "8px",
              backgroundColor: "#1e1e1e",
              padding: "10px",
              overflow: "hidden",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0" }}>Volcano Plot</h3>
            <div 
              style={{ 
                width: "100%", 
                height: "calc(100% - 50px)",
                padding: 0,
                margin: 0,
                overflow: "auto",
                borderRadius: "8px"
              }}>
              <StatVolcanoPlot data={data.volcanoData} />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: "#1e1e1e",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ margin: "10px 0 10px 10px" }}>Heat Map</h3>
            <div style={{ 
              flex: 1,
              height: "calc(100% - 40px)", 
              position: "relative",
              overflow: "auto" ,
              borderRadius: "8px"
            }}>
              <StatHeatMap data={data.heatmapData} />
            </div>
          </div>
        </div>
      </div>
    </StatAnalysisPageTemplate>
  );
};

export default StatAnalysisPage;