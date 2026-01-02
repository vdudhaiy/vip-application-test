// src/pages/DataQualityCheckPage.tsx
import React, { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';
import axios from 'axios';
import DensityPlot from '../components/DensityPlot';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

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

  if (loading) {
    return (
      <div style={{ backgroundColor: 'rgb(30, 30, 30)', minHeight: '100vh', padding: '20px' }}>
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
      <div style={{ backgroundColor: 'rgb(30, 30, 30)', minHeight: '100vh', padding: '20px' }}>
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
      <div style={{ backgroundColor: 'rgb(30, 30, 30)', minHeight: '100vh', padding: '20px' }}>
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

      <div>
        <h3 style={{ color: '#EEEEEE' }}>Distribution by Patient</h3>
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
        <h3 style={{ color: '#EEEEEE' }}>Distribution by Case/Control</h3>
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
