// src/pages/DataQualityCheckPage.tsx
import React, { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';
import axios from 'axios';
import DensityPlot from '../components/DensityPlot';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { useGraphDownload } from '../utils/graphDownload';

interface DensityPoint {
  x: number;
  y: number;
}

interface PlotData {
  patient?: string;
  group?: string;
  density: DensityPoint[];
  limits?: { lower: number; upper: number };
}

interface PlotResponse {
  density_patient: {
    plots: PlotData[];
    limits: { lower: number; upper: number };
  };
  density_case: {
    plots: PlotData[];
  };
}

const DataQualityCheckPage: React.FC = () => {
  const [plotData, setPlotData] = useState<PlotResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPatient, setDownloadingPatient] = useState(false);
  const [downloadingCase, setDownloadingCase] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { downloadPatientGraphs, downloadCaseGraphs } = useGraphDownload();

  useEffect(() => {
    setLoading(true);
    const dataset_id = localStorage.getItem('selectedDatasetId')
    const token = localStorage.getItem('token')
    axios.get(`${API_ENDPOINTS.DATA}?dataset_id=${dataset_id}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then(response => {
        setPlotData(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching density data:', err);
        setError('Failed to load density data');
        setLoading(false);
      });
  }, []);

  const handleDownloadPatientGraphs = async () => {
    setDownloadingPatient(true);
    setDownloadError(null);
    try {
      const datasetId = localStorage.getItem('selectedDatasetId');
      if (!datasetId) throw new Error('Dataset ID not found');
      await downloadPatientGraphs(datasetId, 'data');
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
      await downloadCaseGraphs(datasetId, 'data');
    } catch (err) {
      console.error('Error downloading case graphs:', err);
      setDownloadError(err instanceof Error ? err.message : 'Failed to download case graphs');
    } finally {
      setDownloadingCase(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: 'rgb(30, 30, 30)', padding: '20px' }}>
        <h2 style={{ 
          fontSize: '15px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#FFFFFF',
          textAlign: 'center'
        }}>
          Data Quality Check
        </h2>
        <LoadingSpinner 
          message="Analyzing Data Quality"
          subMessage="Preparing visualizations..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: 'rgb(30, 30, 30)', padding: '20px' }}>
        <h2 style={{ 
          fontSize: '15px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#FFFFFF',
          textAlign: 'center'
        }}>
          Data Quality Check
        </h2>
        <ErrorMessage 
          message={error.includes('Failed to load') ? 
            'No data selected. Please upload and select a dataset first.' : 
            error
          } 
          type="error" 
        />
      </div>
    );
  }

  if (!plotData) {
    return (
      <div style={{ backgroundColor: 'rgb(30, 30, 30)', padding: '20px' }}>
        <h2 style={{ 
          fontSize: '15px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#FFFFFF',
          textAlign: 'center'
        }}>
          Data Quality Check
        </h2>
        <ErrorMessage 
          message="No data selected. Please upload and select a dataset first." 
          type="info" 
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ 
        fontSize: '15px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#FFFFFF',
        textAlign: 'center'

      }}>
        Data Quality Check
      </h2>

      {downloadError && (
        <ErrorMessage message={downloadError} type="error" />
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#EEEEEE', margin: 0 }}>Distribution by Patient</h3>
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
          gap: '15px',
        }}>
          {plotData.density_patient.plots.map((data, index) => (
            <DensityPlot 
              key={`patient-${index}`}
              data={data}
              limits={data.limits || { lower: 0, upper: 1 }}
              color={`hsl(${(index * 30) % 360}, 70%, 50%)`}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#EEEEEE', margin: 0 }}>Distribution by Case/Control</h3>
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
          {plotData.density_case.plots.map((data, index) => (
            <DensityPlot 
              key={`case-${index}`}
              data={data}
              limits={data.limits || { lower: 0, upper: 1 }}
              color={`hsl(${(index * 30) % 360}, 70%, 50%)`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataQualityCheckPage;
