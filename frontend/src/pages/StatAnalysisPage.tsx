// src/pages/StatAnalysisPage.tsx
import React, { useEffect, useState } from "react";
import StatAnalysisPageTemplate from "../components/StatAnalysisPageTemplate";
import StatDataTable from "../components/StatDataTable";
import StatVolcanoPlot from "../components/StatVolcanoPlot";
import StatHeatMap from "../components/StatHeatMap";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import API_ENDPOINTS from "../config/api";
import { downloadVolcanoPlot, downloadHeatmap } from "../utils/graphDownload";

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
  const [isDownloadingVolcano, setIsDownloadingVolcano] = useState<boolean>(false);
  const [downloadVolcanoError, setDownloadVolcanoError] = useState<string | null>(null);
  const [isDownloadingHeatmap, setIsDownloadingHeatmap] = useState<boolean>(false);
  const [downloadHeatmapError, setDownloadHeatmapError] = useState<string | null>(null);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [draggingGroup, setDraggingGroup] = useState<string | null>(null);
  const [referenceGroup, setReferenceGroup] = useState<string | null>(null);
  const [log2fcThresh, setLog2fcThresh] = useState<number>(0.58);
  const [qvalThresh, setQvalThresh] = useState<number>(0.05);
  const [pvalThresh, setPvalThresh] = useState<number>(0.05);
  const [cachedVolcanoPlotData, setCachedVolcanoPlotData] = useState<any>(null);
  const [cachedHeatmapPlotData, setCachedHeatmapPlotData] = useState<any>(null);
  const [lastCachedParams, setLastCachedParams] = useState<any>(null);
  const [volcanoReferenceGroup, setVolcanoReferenceGroup] = useState<string | null>(null);
  const [volcanoContrast, setVolcanoContrast] = useState<string>("");
  const [volcanoFcThreshold, setVolcanoFcThreshold] = useState<number>(0);
  const [volcanoPThreshold, setVolcanoPThreshold] = useState<number>(0);

  const getUniqueGroups = (labels: string[]) => {
    const seen = new Set<string>();
    return labels.filter((label) => {
      if (seen.has(label)) {
        return false;
      }
      seen.add(label);
      return true;
    });
  };

  const mergeGroupOrder = (current: string[], next: string[]) => {
    if (current.length === 0) {
      return next;
    }
    const filtered = current.filter((group) => next.includes(group));
    const missing = next.filter((group) => !filtered.includes(group));
    return [...filtered, ...missing];
  };

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
        // Step 1: Fetch cached analysis data (parameters + plot data)
        console.log('[analysis] Fetching cached analysis data...');
        const cachedUrl = `${API_ENDPOINTS.CACHED_ANALYSIS_DATA}?dataset_id=${dataset_id}`;
        const cachedResponse = await fetch(cachedUrl, {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        });

        let hasCachedVolcano = false;
        let hasCachedHeatmap = false;
        let volcanoJson: any = null;
        let heatmapJson: any = null;
        let cachedVolcanoPlotData: any = null;
        let cachedHeatmapPlotData: any = null;
        let cachedVolcanoTableData: any = null;

        if (cachedResponse.ok) {
          const cachedData = await cachedResponse.json();
          console.log('[analysis] Cached data received:', cachedData);

          // Pre-populate heatmap parameters from cache
          if (cachedData.heatmap?.parameters) {
            const heatmapParams = cachedData.heatmap.parameters;
            setTopN(heatmapParams.top_n || 20);
            setAggregateToProteinLevel(heatmapParams.aggregate_to_protein_level ?? true);
            setAggregationMethod(heatmapParams.aggregation_method || "mean");
            if (heatmapParams.group_order && heatmapParams.group_order.length > 0) {
              setGroupOrder(heatmapParams.group_order);
            }
            console.log('[analysis] Heatmap params pre-populated:', heatmapParams);

            // If cached plot data exists AND has the right structure, use it
            if (cachedData.heatmap?.plot_data && 
                cachedData.heatmap.plot_data.matrix && 
                cachedData.heatmap.plot_data.column_labels) {
              hasCachedHeatmap = true;
              cachedHeatmapPlotData = cachedData.heatmap.plot_data;
              console.log('[analysis] Using cached heatmap plot data');
            } else {
              console.log('[analysis] Heatmap cache exists but structure invalid, will fetch fresh');
            }
          }

          // Pre-populate volcano parameters from cache
          if (cachedData.volcano?.parameters) {
            const volcanoParams = cachedData.volcano.parameters;
            setReferenceGroup(volcanoParams.reference_group);
            setLog2fcThresh(volcanoParams.log2fc_thresh || 0.58);
            setQvalThresh(volcanoParams.qval_thresh || 0.05);
            setPvalThresh(volcanoParams.pval_thresh || 0.05);
            console.log('[analysis] Volcano params pre-populated:', volcanoParams);

            // Use cache only if it has volcano_data (simple volcano, not pairwise)
            // Pairwise volcanos are NOT cached since they're reference_group dependent and interactive
            if (cachedData.volcano?.plot_data?.volcano_data) {
              hasCachedVolcano = true;
              cachedVolcanoPlotData = cachedData.volcano.plot_data;
              cachedVolcanoTableData = cachedData.volcano.table_data || null;
              console.log('[analysis] Using cached volcano plot data (simple 2-group or multi-group without reference)');
            } else {
              console.log('[analysis] Volcano cache missing or contains pairwise structure, will fetch fresh');
            }
          }

          // Store cached params for later comparison
          setLastCachedParams({
            heatmap: cachedData.heatmap?.parameters,
            volcano: cachedData.volcano?.parameters,
          });
        }

        // Step 2: If we have both cached plot data, use it directly and skip fresh fetches
        if (hasCachedVolcano && hasCachedHeatmap) {
          console.log('[analysis] Both cached plots available, using cache directly');
          volcanoJson = cachedVolcanoPlotData;
          heatmapJson = cachedHeatmapPlotData;
        } else {
          // Otherwise fetch fresh data
          console.log('[analysis] Cache incomplete, fetching fresh data...');

          // Fetch fresh volcano plot data
          if (!hasCachedVolcano) {
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
            volcanoJson = await volcanoResponse.json();
          } else {
            volcanoJson = cachedVolcanoPlotData;
          }

          // Fetch fresh heatmap data
          if (!hasCachedHeatmap) {
            const heatmapUrl = new URL(API_ENDPOINTS.HEATMAP_DATA);
            heatmapUrl.searchParams.append('dataset_id', dataset_id);
            heatmapUrl.searchParams.append('top_n', '20');
            heatmapUrl.searchParams.append('aggregate_to_protein_level', 'true');
            heatmapUrl.searchParams.append('aggregation_method', 'mean');
            groupOrder.forEach((group) => heatmapUrl.searchParams.append('group_order', group));
            console.log('[analysis] GET heatmap data from', heatmapUrl);
            const heatmapResponse = await fetch(heatmapUrl.toString(), {
              headers: {
                Authorization: `Token ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (!heatmapResponse.ok) {
              throw new Error(`Heatmap fetch failed: ${heatmapResponse.statusText}`);
            }
            heatmapJson = await heatmapResponse.json();
          } else {
            heatmapJson = cachedHeatmapPlotData;
          }
        }

        // Step 3: Process the data (cached or fresh)
        const volcanoData = volcanoJson.volcano_data || [];
        
        // Use cached table data if available, otherwise construct from volcanoData
        let tableData: DataRow[];
        if (cachedVolcanoTableData && hasCachedVolcano) {
          tableData = cachedVolcanoTableData;
          console.log('[analysis] Using cached table data');
        } else {
          tableData = volcanoData.map((item: any, index: number) => ({
            id: index + 1,
            name: item.Protein,
            value: item.statistic !== null && item.statistic !== undefined ? parseFloat(item.statistic) : 0,
          }));
          console.log('[analysis] Constructed table data from volcanoData');
        }

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
          usingCache: hasCachedVolcano && hasCachedHeatmap,
        });

        // Store cached plot data in state for reference
        if (hasCachedVolcano) {
          setCachedVolcanoPlotData(cachedVolcanoPlotData);
        }
        if (hasCachedHeatmap) {
          setCachedHeatmapPlotData(cachedHeatmapPlotData);
        }
        if (cachedVolcanoTableData) {
          // Store cached table data if available
          console.log('[analysis] Storing cached table data in state');
        }

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

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextOrder = getUniqueGroups(data.heatmapPayload.colGroupLabels || []);
    setGroupOrder((prev) => mergeGroupOrder(prev, nextOrder));
  }, [data?.heatmapPayload.colGroupLabels]);

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

      const url = new URL(API_ENDPOINTS.HEATMAP_DATA);
      url.searchParams.append('dataset_id', dataset_id || '');
      url.searchParams.append('top_n', topN.toString());
      url.searchParams.append('aggregate_to_protein_level', aggregateToProteinLevel.toString());
      url.searchParams.append('aggregation_method', aggregationMethod);
      groupOrder.forEach((group) => url.searchParams.append('group_order', group));
      console.log('[heatmap] Fetching with top_n =', topN, 'aggregate_to_protein_level =', aggregateToProteinLevel, 'aggregation_method =', aggregationMethod, 'URL:', url.toString());
      const response = await fetch(url.toString(), {
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

  const handleDownloadVolcanoPlot = async () => {
    setIsDownloadingVolcano(true);
    setDownloadVolcanoError(null);
    try {
      const datasetId = localStorage.getItem("selectedDatasetId");
      if (!datasetId) {
        throw new Error("Dataset ID not found");
      }
      await downloadVolcanoPlot(datasetId, volcanoReferenceGroup ?? undefined, volcanoContrast || undefined, volcanoFcThreshold, volcanoPThreshold);
    } catch (err: any) {
      console.error("Error downloading volcano plot:", err);
      setDownloadVolcanoError(err.message || "Failed to download volcano plot");
    } finally {
      setIsDownloadingVolcano(false);
    }
  };

  const handleDownloadHeatmap = async () => {
    setIsDownloadingHeatmap(true);
    setDownloadHeatmapError(null);
    try {
      const datasetId = localStorage.getItem("selectedDatasetId");
      if (!datasetId) {
        throw new Error("Dataset ID not found");
      }
      await downloadHeatmap(datasetId, topN, aggregateToProteinLevel, aggregationMethod, groupOrder);
    } catch (err: any) {
      console.error("Error downloading heatmap:", err);
      setDownloadHeatmapError(err.message || "Failed to download heatmap");
    } finally {
      setIsDownloadingHeatmap(false);
    }
  };

  const handleDragStart = (group: string) => {
    setDraggingGroup(group);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (targetGroup: string) => {
    if (!draggingGroup || draggingGroup === targetGroup) {
      setDraggingGroup(null);
      return;
    }

    setGroupOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggingGroup);
      const toIndex = next.indexOf(targetGroup);
      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggingGroup);
      return next;
    });

    setDraggingGroup(null);
  };

  const handleResetGroupOrder = () => {
    if (!data) {
      return;
    }
    setGroupOrder(getUniqueGroups(data.heatmapPayload.colGroupLabels || []));
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0 }}>Volcano Plot</h3>
            <button
              onClick={handleDownloadVolcanoPlot}
              disabled={isDownloadingVolcano}
              style={{
                padding: "8px 16px",
                backgroundColor: isDownloadingVolcano ? "#555" : "#4CAF50",
                color: "#fff",
                border: "1px solid #45a049",
                borderRadius: "4px",
                cursor: isDownloadingVolcano ? "default" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                opacity: isDownloadingVolcano ? 0.6 : 1,
              }}
            >
              {isDownloadingVolcano ? "⬇ Downloading..." : "⬇ Download as Image"}
            </button>
          </div>
          {downloadVolcanoError && (
            <ErrorMessage message={downloadVolcanoError} type="error" />
          )}
          <div 
            style={{ 
              flex: 1,
              width: "100%",
              padding: 0,
              margin: 0,
              borderRadius: "8px",
              minHeight: 0,
            }}>
            <StatVolcanoPlot
              data={data.volcanoData}
              groups={data.groups}
              datasetId={localStorage.getItem("selectedDatasetId") || ""}
              onReferenceGroupChange={setVolcanoReferenceGroup}
              onContrastChange={setVolcanoContrast}
              onThresholdChange={(fc, p) => { setVolcanoFcThreshold(fc); setVolcanoPThreshold(p); }}
            />
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ margin: 0 }}>Heat Map</h3>
              <button
                onClick={handleDownloadHeatmap}
                disabled={isDownloadingHeatmap}
                style={{
                  padding: "6px 12px",
                  backgroundColor: isDownloadingHeatmap ? "#555" : "#4CAF50",
                  color: "#fff",
                  border: "1px solid #45a049",
                  borderRadius: "4px",
                  cursor: isDownloadingHeatmap ? "default" : "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                  opacity: isDownloadingHeatmap ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isDownloadingHeatmap ? "⬇ Downloading..." : "⬇ Download as Image"}
              </button>
            </div>
            {downloadHeatmapError && (
              <ErrorMessage message={downloadHeatmapError} type="error" />
            )}
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
              {groupOrder.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginLeft: "10px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#aaa", whiteSpace: "nowrap" }}>
                    Group order (left to right):
                  </span>
                  {groupOrder.map((group) => (
                    <div
                      key={`group-order-${group}`}
                      draggable
                      onDragStart={() => handleDragStart(group)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(group)}
                      onDragEnd={() => setDraggingGroup(null)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: draggingGroup === group ? "#3a3a3a" : "#2b2b2b",
                        border: "1px solid #555",
                        borderRadius: "4px",
                        fontSize: "11px",
                        color: "#eee",
                        cursor: "grab",
                        userSelect: "none",
                      }}
                      title="Drag to reorder"
                    >
                      {group}
                    </div>
                  ))}
                  <button
                    onClick={handleResetGroupOrder}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#444",
                      color: "#fff",
                      border: "1px solid #666",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    Reset order
                  </button>
                </div>
              )}
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
            <StatHeatMap payload={data.heatmapPayload} groupOrder={groupOrder} />
          </div>
        </div>
      </div>
    </StatAnalysisPageTemplate>
  );
};

export default StatAnalysisPage;