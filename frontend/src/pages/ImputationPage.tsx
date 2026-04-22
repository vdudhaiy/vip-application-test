import React from "react";
import TransformationPageTemplate from "../components/TransformationPageTemplate";
import DensityPlot from "../components/DensityPlot";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import axios from 'axios';
import API_ENDPOINTS from '../config/api';
import { useGraphDownload } from "../utils/graphDownload";

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

const ImputationPage: React.FC = () => {
  const [plotData, setPlotData] = React.useState<PlotResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadingPatient, setDownloadingPatient] = React.useState(false);
  const [downloadingCase, setDownloadingCase] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const { downloadPatientGraphs, downloadCaseGraphs } = useGraphDownload();

  React.useEffect(() => {
    setLoading(true);
    const dataset_id = localStorage.getItem('selectedDatasetId')
    const token = localStorage.getItem('token')
    axios.get(`${API_ENDPOINTS.IMPUTE}?dataset_id=${dataset_id}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then(response => {
        console.log("IMPUTATION PAGE RESPONSE:", response.data);
        if (response.data.error) {
          setError(response.data.error);
          return;
        }

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
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching imputation data:', err);
        setError('Failed to load imputation data');
        setLoading(false);
      });
  }, []);

  const handleDownloadPatientGraphs = async () => {
    setDownloadingPatient(true);
    setDownloadError(null);
    try {
      const datasetId = localStorage.getItem('selectedDatasetId');
      if (!datasetId) throw new Error('Dataset ID not found');
      await downloadPatientGraphs(datasetId, 'impute');
    } catch (err) {
      console.error('Error downloading patient graphs:', err);
      setDownloadError(err instanceof Error ? err.message : 'Failed to download patient graphs');
    } finally {
      setDownloadingPatient(false);
    }
  };

  const handleDownloadCaseGraphs = async () => {
    setDownloadingCase(true);
    setDownloadError(null);
    try {
      const datasetId = localStorage.getItem('selectedDatasetId');
      if (!datasetId) throw new Error('Dataset ID not found');
      await downloadCaseGraphs(datasetId, 'impute');
    } catch (err) {
      console.error('Error downloading case graphs:', err);
      setDownloadError(err instanceof Error ? err.message : 'Failed to download case graphs');
    } finally {
      setDownloadingCase(false);
    }
  };

  if (loading) {
    return (
      <TransformationPageTemplate title="Data Imputation">
        <LoadingSpinner 
          message="Processing Data Imputation"
          subMessage="Handling missing values in your dataset..."
        />
      </TransformationPageTemplate>
    );
  }

  if (error) {
    return (
      <TransformationPageTemplate
        title="Data Imputation"
      >
        <ErrorMessage 
          message={error.includes('Failed to load') ?
            'No data selected. Please upload and select a dataset first.' : error}
          type="error"
        />
      </TransformationPageTemplate>
    );
  }

  if (!plotData) {
    return (
      <TransformationPageTemplate
        title="Data Imputation"
      >
        <ErrorMessage 
          message="No data selected. Please upload and select a dataset first."
          type="info"
        />
      </TransformationPageTemplate>
    );
  }

  return (
    <TransformationPageTemplate
      title="Data Imputation"
    >
      <div style={{ padding: '20px' }}>
        {downloadError && (
          <ErrorMessage message={downloadError} type="error" />
        )}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#EEEEEE', margin: 0 }}>Imputed Distribution by Patient</h3>
            <button
              onClick={handleDownloadPatientGraphs}
              disabled={downloadingPatient}
              style={{
                padding: '8px 16px',
                backgroundColor: downloadingPatient ? '#555' : '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: downloadingPatient ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {downloadingPatient ? 'Downloading...' : '⬇ Download as Image'}
            </button>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#EEEEEE', margin: 0 }}>Imputed Distribution by Case/Control</h3>
            <button
              onClick={handleDownloadCaseGraphs}
              disabled={downloadingCase}
              style={{
                padding: '8px 16px',
                backgroundColor: downloadingCase ? '#555' : '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: downloadingCase ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {downloadingCase ? 'Downloading...' : '⬇ Download as Image'}
            </button>
          </div>
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
      </div>
    </TransformationPageTemplate>
  );
};

export default ImputationPage;