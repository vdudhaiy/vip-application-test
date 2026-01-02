// src/pages/FilterPage.tsx

import React from "react";
import FilterPageTemplate from "../components/FilterPageTemplate";
import DensityPlot from "../components/DensityPlot";
import FilterOptions from "../components/FilterOptions";
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
  raw_data_count?: number;
}

interface DensityPoint {
  x: number;
  y: number;
}

const FilterPage: React.FC = () => {
  const [plotData, setPlotData] = React.useState<PlotResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Handle filter updates through callback
  const handleFilterUpdate = (newData: PlotResponse) => {
    console.log('Before state update:', plotData);
    console.log('New data received:', newData);
    setPlotData(newData);
  };

  React.useEffect(() => {
    console.log('Plot data changed:', plotData);
  }, [plotData]);

  React.useEffect(() => {
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
      <FilterPageTemplate
        title="Data Filtering"
        filters={<FilterOptions />}
        onFilterUpdate={handleFilterUpdate}
      >
        <LoadingSpinner 
          message="Applying Filters"
          subMessage="Updating data visualizations..."
        />
      </FilterPageTemplate>
    );
  }

  if (error) {
    return (
      <FilterPageTemplate
        title="Data Filtering"
        filters={<FilterOptions />}
        onFilterUpdate={handleFilterUpdate}
      >
        <ErrorMessage
          message={error.includes('Failed to load') ?
            'No data selected. Please upload and select a dataset first.' :
            error}
          type="error"
        />
      </FilterPageTemplate>
    );
  }

  if (!plotData) {
    return (
      <FilterPageTemplate
        title="Data Filtering"
        filters={<FilterOptions />}
        onFilterUpdate={handleFilterUpdate}
      >
        <ErrorMessage
          message="No data selected. Please upload and select a dataset first."
          type="info"
        />
      </FilterPageTemplate>
    );
  }

  return (
    <FilterPageTemplate
      title="Data Filtering"
      filters={<FilterOptions />}
      onFilterUpdate={handleFilterUpdate}
    >
      <div style={{ padding: '20px' }}>
        <div>
          <h3 style={{ color: '#EEEEEE' }}>Distribution by Patient</h3>
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
          <h3 style={{ color: '#EEEEEE' }}>Distribution by Case/Control</h3>
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
    </FilterPageTemplate>
  );
};

export default FilterPage;