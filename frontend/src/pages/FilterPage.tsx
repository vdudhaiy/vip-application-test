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
  const [filtersApplied, setFiltersApplied] = React.useState<boolean>(false);

  // Handle filter updates through callback
  const handleFilterUpdate = (newData: PlotResponse) => {
    console.log('Before state update:', plotData);
    console.log('New data received:', newData);
    setPlotData(newData);
  };

  // Handle when filters have been applied
  const handleFiltersApplied = (applied: boolean) => {
    setFiltersApplied(applied);
  };

  React.useEffect(() => {
    console.log('Plot data changed:', plotData);
  }, [plotData]);

  React.useEffect(() => {
    setLoading(true);
    const dataset_id = localStorage.getItem('selectedDatasetId')
    const token = localStorage.getItem('token')
    
    // First, check if there are existing filter parameters
    axios.get(`${API_ENDPOINTS.FILTER}?dataset_id=${dataset_id}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then(response => {
        // Filter data exists - this means filters were previously applied
        setPlotData(response.data);
        setFiltersApplied(true);
        setLoading(false);
      })
      .catch(err => {
        // No filter data exists, fetch the original unfiltered density data
        axios.get(`${API_ENDPOINTS.DATA}?dataset_id=${dataset_id}`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        })
          .then(response => {
            setPlotData(response.data);
            setFiltersApplied(false);
            setLoading(false);
          })
          .catch(err => {
            console.error('Error fetching density data:', err);
            setError('Failed to load density data');
            setLoading(false);
          });
      });
  }, []);

  if (loading) {
    return (
      <FilterPageTemplate
        title="Data Filtering"
        filters={<FilterOptions />}
        onFilterUpdate={handleFilterUpdate}
        onFiltersApplied={handleFiltersApplied}
        initialFiltersApplied={filtersApplied}
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
        onFiltersApplied={handleFiltersApplied}
        initialFiltersApplied={filtersApplied}
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
        onFiltersApplied={handleFiltersApplied}
        initialFiltersApplied={filtersApplied}
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
      onFiltersApplied={handleFiltersApplied}
      initialFiltersApplied={filtersApplied}
    >
      {!filtersApplied ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: 'calc(100vh - 150px)',
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
              Ready to Explore Your Data
            </h3>
            <p style={{ 
              fontSize: '14px',
              color: '#AAAAAA',
              lineHeight: '1.6',
              marginBottom: '10px'
            }}>
              Select your filter options from the panel on the right and click <strong>"Apply Filters"</strong> to visualize the distributions of your data.
            </p>
            <p style={{ 
              fontSize: '12px',
              color: '#777777',
              fontStyle: 'italic',
              marginTop: '30px'
            }}>
              Choose your filtering criteria to get started
            </p>
          </div>
        </div>
      ) : (
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
      )}
    </FilterPageTemplate>
  );
};

export default FilterPage;