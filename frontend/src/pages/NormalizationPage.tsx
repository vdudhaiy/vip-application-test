// src/pages/NormalizationPage.tsx
import React from "react";
import NormalizationPageTemplate from "../components/NormalizationPageTemplate";
import DensityPlot from "../components/DensityPlot";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import axios from "axios";
import API_ENDPOINTS from "../config/api";

interface PlotResponse {
  density_patient: {
    plots: PlotData[];
    limits: { lower: number; upper: number };
  };
  density_case: {
    plots: PlotData[];
  };
}

interface PlotData {
  patient?: string;
  group?: string;
  case?: string;
  density: DensityPoint[];
  limits?: { lower: number; upper: number };
}

interface DensityPoint {
  x: number;
  y: number;
}

const NormalizationPage: React.FC = () => {
  const [plotData, setPlotData] = React.useState<PlotResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [entries, setEntries] = React.useState<string[]>([]);
  const [selectedReference, setSelectedReference] =
    React.useState<string>("iRT-Kit_WR_fusion");

  const [method, setMethod] = React.useState<string>("reference");
  const [statisticOption, setStatisticOption] = React.useState<string>("mean");
  const [normalizing, setNormalizing] = React.useState(false);
  const [normalizationApplied, setNormalizationApplied] = React.useState(false);

  // Used prop for template
  const handleUpdate = (newData: PlotResponse) => {
    setPlotData(newData);
  };

  /* ---------------------- Fetch available entries ---------------------- */
  const fetchEntries = React.useCallback(() => {
    const dataset_id = localStorage.getItem("selectedDatasetId");
    const token = localStorage.getItem("token");
    if (!dataset_id || !token) return;

    axios
      .get(`${API_ENDPOINTS.NORMAL}?dataset_id=${dataset_id}&get_entries=true`, {
        headers: { Authorization: `Token ${token}` },
      })
      .then((response) => {
        const fetchedEntries = response.data.entries || [];
        setEntries(fetchedEntries);
      })
      .catch((err) => {
        console.error("Error fetching entries:", err);
      });
  }, []);

  /* --------- Enforce valid default reference once entries load --------- */
  React.useEffect(() => {
    if (!entries.length) return;

    if (!entries.includes(selectedReference)) {
      if (entries.includes("iRT-Kit_WR_fusion")) {
        setSelectedReference("iRT-Kit_WR_fusion");
      } else {
        setSelectedReference(entries[0]);
      }
    }
  }, [entries, selectedReference]);

  /* ------------------- Fetch existing normalization -------------------- */
  const fetchNormalizedData = React.useCallback(() => {
    const dataset_id = localStorage.getItem("selectedDatasetId");
    const token = localStorage.getItem("token");

    if (!dataset_id || !token) {
      setError("No dataset selected");
      setPlotData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params: any = { dataset_id, method };
    if (method === "reference" && entries.includes(selectedReference)) {
      params.reference = selectedReference;
    } else if (method === "divide" || method === "subtract") {
      params.reference = statisticOption;
    } else if (method === "z-score") {
      params.reference = "";
    }

    axios
      .get(API_ENDPOINTS.NORMAL, {
        headers: { Authorization: `Token ${token}` },
        params,
      })
      .then((response) => {
        if (response.data.error) {
          if (response.data.error.includes("normalization does not exist")) {
            setPlotData(null);
            setError(null);
          } else {
            setPlotData(null);
            setError(response.data.error);
          }
          setLoading(false);
          return;
        }

        setPlotData({
          density_patient: {
            plots: response.data.density_patient?.plots || [],
            limits:
              response.data.density_patient?.limits || { lower: 0, upper: 0 },
          },
          density_case: {
            plots: response.data.density_case?.plots || [],
          },
        });

        setError(null);
        setNormalizationApplied(true);
        setLoading(false);
      })
      .catch(() => {
        setPlotData(null);
        setError("Failed to load normalized data");
        setLoading(false);
      });
  }, [method, statisticOption, selectedReference, entries]);

  /* -------------------------- Normalize POST --------------------------- */
  const handleNormalize = () => {
    const dataset_id = localStorage.getItem("selectedDatasetId");
    const token = localStorage.getItem("token");

    if (!dataset_id || !token) {
      setError("No dataset selected");
      setPlotData(null);
      return;
    }

    if (method === "reference" && !entries.includes(selectedReference)) {
      setError("Please select a valid reference protein.");
      setPlotData(null);
      return;
    }

    setNormalizing(true);
    setError(null);

    // Prepare reference value according to method
    let referenceValue = "";
    if (method === "reference") {
      referenceValue = selectedReference;
    } else if (method === "divide" || method === "subtract") {
      referenceValue = statisticOption;
    }

    axios
      .post(
        API_ENDPOINTS.NORMAL,
        {
          dataset_id,
          method,
          reference: referenceValue,
        },
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        if (response.data.error) {
          setPlotData(null);
          setError(response.data.error);
          setNormalizing(false);
          return;
        }

        setPlotData({
          density_patient: {
            plots: response.data.density_patient?.plots || [],
            limits:
              response.data.density_patient?.limits || { lower: 0, upper: 0 },
          },
          density_case: {
            plots: response.data.density_case?.plots || [],
          },
        });

        setError(null);
        setNormalizing(false);
        setNormalizationApplied(true);
      })
      .catch((err) => {
        setPlotData(null);
        setError(err.response?.data?.error || "Failed to normalize data");
        setNormalizing(false);
      });
  };

  React.useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  React.useEffect(() => {
    if (entries.length) {
      fetchNormalizedData();
    }
  }, [fetchNormalizedData, entries]);

  const canNormalize =
    !normalizing &&
    entries.length > 0 &&
    (method !== "reference" || entries.includes(selectedReference));

  /* ----------------------------- Render ----------------------------- */

  if (loading && !entries.length) {
    return (
      <NormalizationPageTemplate
        title="Data Normalization"
        onFilterUpdate={handleUpdate}
        initialNormalizationApplied={normalizationApplied}
      >
        <LoadingSpinner
          message="Loading Normalization Data"
          subMessage="Fetching available reference entries..."
        />
      </NormalizationPageTemplate>
    );
  }

  return (
    <NormalizationPageTemplate
      title="Data Normalization"
      onFilterUpdate={handleUpdate}
      initialNormalizationApplied={normalizationApplied}
    >
      <div style={{ padding: "20px" }}>
        {/* ------------------ Selection Bar ------------------ */}
        <div
          style={{
            marginBottom: "30px",
            padding: "15px",
            backgroundColor: "#2a2a2a",
            borderRadius: "8px",
            border: "1px solid #4A4A4A",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Method select */}
            <label style={{ color: "#EEEEEE", fontSize: "14px" }}>
              Normalization Method:
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={normalizing}
              style={{
                padding: "8px",
                backgroundColor: "#1e1e1e",
                color: "#fff",
                border: "1px solid #4A4A4A",
                borderRadius: "4px",
              }}
            >
              <option value="reference">Reference</option>
              <option value="divide">Divide</option>
              <option value="subtract">Subtract</option>
              <option value="z-score">Z-Score</option>
            </select>

            {/* Statistic option for divide/subtract */}
            {(method === "divide" || method === "subtract") && (
              <>
                <label style={{ color: "#EEEEEE", fontSize: "14px" }}>
                  Statistic:
                </label>
                <select
                  value={statisticOption}
                  onChange={(e) => setStatisticOption(e.target.value)}
                  disabled={normalizing}
                  style={{
                    padding: "8px",
                    backgroundColor: "#1e1e1e",
                    color: "#fff",
                    border: "1px solid #4A4A4A",
                    borderRadius: "4px",
                  }}
                >
                  <option value="mean">Mean</option>
                  <option value="median">Median</option>
                  <option value="mode">Mode</option>
                </select>
              </>
            )}

            {/* Reference selection for reference method */}
            {method === "reference" && (
              <>
                <label style={{ color: "#EEEEEE", fontSize: "14px" }}>
                  Normalization Reference Protein:
                </label>
                <select
                  value={selectedReference}
                  onChange={(e) => setSelectedReference(e.target.value)}
                  disabled={normalizing || entries.length === 0}
                  style={{
                    padding: "8px",
                    backgroundColor: "#1e1e1e",
                    color: "#fff",
                    border: "1px solid #4A4A4A",
                    borderRadius: "4px",
                    maxWidth: "200px",
                    minWidth: "150px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {entries.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Normalize button */}
            <button
              onClick={handleNormalize}
              disabled={!canNormalize}
              style={{
                padding: "8px 20px",
                backgroundColor: canNormalize ? "#4CAF50" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: canNormalize ? "pointer" : "not-allowed",
              }}
            >
              {normalizing ? "Normalizing..." : normalizationApplied ? "Update Normalization" : "Normalize"}
            </button>
          </div>
        </div>

        {/* ------------------ Error ------------------ */}
        {error && <ErrorMessage message={error} type="error" />}

        {/* ------------------ No data - Show elegant message ------------------ */}
        {!normalizationApplied && !plotData && !error && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 'calc(100vh - 300px)',
            padding: '20px'
          }}>
            <div style={{ 
              textAlign: 'center',
              maxWidth: '500px'
            }}>
              <h3 style={{ 
                fontSize: '28px',
                color: '#EEEEEE',
                marginBottom: '15px',
                fontWeight: '300',
                letterSpacing: '0.5px'
              }}>
                Ready to Normalize Your Data
              </h3>
              <p style={{ 
                fontSize: '14px',
                color: '#AAAAAA',
                lineHeight: '1.6',
                marginBottom: '10px'
              }}>
                Select your normalization method and parameters from above, then click <strong>"Normalize"</strong> to apply the transformation to your data.
              </p>
              <p style={{ 
                fontSize: '12px',
                color: '#777777',
                fontStyle: 'italic',
                marginTop: '30px'
              }}>
                Choose your normalization settings to get started
              </p>
            </div>
          </div>
        )}

        {/* ------------------ Plots ------------------ */}
        {normalizationApplied && plotData && !error && (
          <>
            <h3 style={{ color: "#EEEEEE" }}>
              Normalized Distribution by Patient
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "15px",
              }}
            >
              {plotData.density_patient.plots.map((data, index) => (
                <DensityPlot
                  key={`patient-${index}`}
                  data={data}
                  limits={data.limits || { lower: 0, upper: 1 }}
                />
              ))}
            </div>

            <h3 style={{ color: "#EEEEEE", marginTop: "40px" }}>
              Normalized Distribution by Case/Control
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "15px",
              }}
            >
              {plotData.density_case.plots.map((data, index) => (
                <DensityPlot
                  key={`case-${index}`}
                  data={data}
                  limits={data.limits || { lower: 0, upper: 1 }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </NormalizationPageTemplate>
  );
};

export default NormalizationPage;