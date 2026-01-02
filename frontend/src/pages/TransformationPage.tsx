import React from "react";
import TransformationPageTemplate from "../components/TransformationPageTemplate";
import DensityPlot from "../components/DensityPlot";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import axios from 'axios';
import API_ENDPOINTS from '../config/api';

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

const TransformationPage: React.FC = () => {
  const [plotData, setPlotData] = React.useState<PlotResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // Note: Transformation controls are not currently used on this page. Cleaned unused state/handlers.

  React.useEffect(() => {
    setLoading(true);
    const dataset_id = localStorage.getItem('selectedDatasetId')
    const token = localStorage.getItem('token')
    axios.get(`${API_ENDPOINTS.TRANSFORM}?dataset_id=${dataset_id}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then(response => {
        console.log("TRANSFORMATION PAGE RESPONSE:", response.data);
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
        console.error('Error fetching transformation data:', err);
        setError('Failed to load transformation data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <TransformationPageTemplate title="Data Transformation">
        <LoadingSpinner 
          message="Transforming Data"
          subMessage="Applying transformations to your dataset..."
        />
      </TransformationPageTemplate>
    );
  }

  if (error) {
    return (
      <TransformationPageTemplate
        title="Data Transformation"
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
        title="Data Transformation"
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
      title="Data Transformation"
    >
      <div style={{ padding: '20px' }}>
        <div>
          <h3 style={{ color: '#EEEEEE' }}>Transformed Distribution by Patient</h3>
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
          <h3 style={{ color: '#EEEEEE' }}>Transformed Distribution by Case/Control</h3>
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

export default TransformationPage;