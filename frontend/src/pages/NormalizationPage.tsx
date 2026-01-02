// src/pages/NormalizationPage.tsx
import React from "react";
import NormalizationPageTemplate from "../components/NormalizationPageTemplate";
import DensityPlot from "../components/DensityPlot";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
// import NormalizationOptions from "../components/NormalizationOptions";
import axios from "axios";
import API_ENDPOINTS from "../config/api";

// Reuse the same interfaces from FilterPage
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
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<string[]>([]);
  const [selectedReference, setSelectedReference] = React.useState<string>('iRT-Kit_WR_fusion');
  const [normalizing, setNormalizing] = React.useState<boolean>(false);

  const handleUpdate = (newData: PlotResponse) => {
    setPlotData(newData);
  };

  const fetchEntries = React.useCallback(() => {
    const dataset_id = localStorage.getItem('selectedDatasetId');
    const token = localStorage.getItem('token');
    
    if (!dataset_id || !token) return;

    axios.get(`${API_ENDPOINTS.NORMAL}?dataset_id=${dataset_id}&get_entries=true`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then(response => {
        if (response.data.entries) {
          setEntries(response.data.entries);
          // Set default to iRT-Kit_WR_fusion if available, otherwise first entry
          if (response.data.entries.includes('iRT-Kit_WR_fusion')) {
            setSelectedReference('iRT-Kit_WR_fusion');
          } else if (response.data.entries.length > 0) {
            setSelectedReference(response.data.entries[0]);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching entries:', err);
      });
  }, []);

  const fetchNormalizedData = React.useCallback(() => {
    setLoading(true);
    const dataset_id = localStorage.getItem('selectedDatasetId');
    const token = localStorage.getItem('token');
    
    if (!dataset_id || !token) {
      setError('No dataset selected');
      setLoading(false);
      return;
    }

    axios.get(`${API_ENDPOINTS.NORMAL}?dataset_id=${dataset_id}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then(response => {
        console.log("NORMALIZATION PAGE RESPONSE:", response.data);
        if (response.data.error) {
          // If normalization doesn't exist yet, that's okay - user can create it
          if (response.data.error.includes('normalization does not exist')) {
            setPlotData(null);
            setError(null); // Clear error so user can see the selection bar
          } else {
            setError(response.data.error);
          }
          setLoading(false);
          return;
        }
        
        // Ensure the data is in the correct format
        const plotData = {
          density_patient: {
            plots: response.data.density_patient?.plots || [],
            limits: response.data.density_patient?.limits || { lower: 0, upper: 0 }
          },
          density_case: {
            plots: response.data.density_case?.plots || []
          }
        };
        
        setPlotData(plotData);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching normalized data:', err);
        // If it's a 400 error about normalization not existing, that's okay
        if (err.response?.status === 400 && err.response?.data?.error?.includes('normalization does not exist')) {
          setPlotData(null);
          setError(null);
        } else {
          setError('Failed to load normalized data');
        }
        setLoading(false);
      });
  }, []);

  const handleNormalize = () => {
    if (!selectedReference) {
      setError('Please select a reference entry');
      return;
    }

    setNormalizing(true);
    const dataset_id = localStorage.getItem('selectedDatasetId');
    const token = localStorage.getItem('token');

    if (!dataset_id || !token) {
      setError('No dataset selected');
      setNormalizing(false);
      return;
    }

    axios.post(
      `${API_ENDPOINTS.NORMAL}`,
      {
        dataset_id: dataset_id,
        reference_entry: selectedReference,
      },
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
      .then(response => {
        console.log("NORMALIZATION POST RESPONSE:", response.data);
        if (response.data.error) {
          setError(response.data.error);
          setNormalizing(false);
          return;
        }
        
        // Update plot data with new normalization
        const plotData = {
          density_patient: {
            plots: response.data.density_patient?.plots || [],
            limits: response.data.density_patient?.limits || { lower: 0, upper: 0 }
          },
          density_case: {
            plots: response.data.density_case?.plots || []
          }
        };
        
        setPlotData(plotData);
        setNormalizing(false);
      })
      .catch(err => {
        console.error('Error normalizing data:', err);
        setError(err.response?.data?.error || 'Failed to normalize data');
        setNormalizing(false);
      });
  };

  React.useEffect(() => {
    fetchEntries();
    fetchNormalizedData();
  }, [fetchEntries, fetchNormalizedData]);

  if (loading && entries.length === 0) return (
    <NormalizationPageTemplate title="Data Normalization" onFilterUpdate={handleUpdate}>
      <LoadingSpinner 
        message="Loading Normalization Data"
        subMessage="Fetching available reference entries..."
      />
    </NormalizationPageTemplate>
  );

  if (error && !entries.length) return (
    <NormalizationPageTemplate title="Data Normalization" onFilterUpdate={handleUpdate}>
      <ErrorMessage
        message={error.includes('Failed to load') ? 
          'No data selected. Please upload and select a dataset first.' : 
          error}
        type="error"
      />
    </NormalizationPageTemplate>
  );

  return (
    <NormalizationPageTemplate
      title="Data Normalization"
      onFilterUpdate={handleUpdate}
    >
      <div style={{ padding: '20px' }}>
        {/* Reference Selection Bar */}
        <div style={{
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #4A4A4A',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap',
          }}>
            <label htmlFor="referenceSelect" style={{ color: '#EEEEEE', fontSize: '14px' }}>
              Normalization Reference (PG.UniProtIds):
            </label>
            <select
              id="referenceSelect"
              value={selectedReference}
              onChange={(e) => setSelectedReference(e.target.value)}
              disabled={normalizing || entries.length === 0}
              style={{
                flex: '1',
                minWidth: '200px',
                maxWidth: '400px',
                padding: '8px',
                backgroundColor: '#1e1e1e',
                color: '#FFFFFF',
                border: '1px solid #4A4A4A',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'Times New Roman, serif',
              }}
            >
              {entries.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            <button
              onClick={handleNormalize}
              disabled={normalizing || !selectedReference || entries.length === 0}
              style={{
                padding: '8px 20px',
                backgroundColor: normalizing ? '#555' : '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: normalizing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'Times New Roman, serif',
                opacity: (normalizing || !selectedReference || entries.length === 0) ? 0.6 : 1,
              }}
            >
              {normalizing ? 'Normalizing...' : 'Normalize'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '20px' }}>
            <ErrorMessage message={error} type="error" />
          </div>
        )}

        {!plotData && !error && (
          <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#EEEEEE' }}>
              No normalized data available. Please select a reference entry and click "Normalize" to generate normalized plots.
            </p>
          </div>
        )}

        {plotData && (
          <>
            <div>
              <h3 style={{ color: '#EEEEEE' }}>Normalized Distribution by Patient</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '15px'
              }}>
                {plotData.density_patient?.plots?.map((data, index) => (
                  <DensityPlot 
                    key={`patient-${index}-${data.group || data.patient || data.case}-${data.limits?.lower}-${data.limits?.upper}`}
                    data={data}
                    limits={data.limits || { lower: 0, upper: 1 }}
                    color={`hsl(${(index * 30) % 360}, 70%, 50%)`}
                  />
                )) || []}
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <h3 style={{ color: '#EEEEEE' }}>Normalized Distribution by Case/Control</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '15px'
              }}>
                {plotData.density_case?.plots?.map((data, index) => (
                  <DensityPlot 
                    key={`case-${index}-${data.group || data.patient || data.case}-${data.limits?.lower}-${data.limits?.upper}`}
                    data={data}
                    limits={data.limits || { lower: 0, upper: 1 }}
                    color={`hsl(${(index * 30) % 360}, 70%, 50%)`}
                  />
                )) || []}
              </div>
            </div>
          </>
        )}
      </div>
    </NormalizationPageTemplate>
  );
};

export default NormalizationPage;