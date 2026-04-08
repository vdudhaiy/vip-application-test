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
  const [epsilon, setEpsilon] = React.useState<string>("1e-6");
  const [applyingTransform, setApplyingTransform] = React.useState(false);
  const [transformationApplied, setTransformationApplied] = React.useState(false);

  const fetchTransformationData = React.useCallback(() => {
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
          setPlotData(null);
          setTransformationApplied(false);
          setLoading(false);
          return;
        }

        // If epsilon exists and transform_data exists, show plots
        if (response.data.epsilon !== null && response.data.transform_data) {
          setEpsilon(response.data.epsilon.toExponential(1));
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
          setTransformationApplied(true);
          setError(null);
        } else {
          // Epsilon not set or no data yet
          setPlotData(null);
          setTransformationApplied(false);
          setError(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching transformation data:', err);
        setError('Failed to load transformation data');
        setPlotData(null);
        setTransformationApplied(false);
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    fetchTransformationData();
  }, [fetchTransformationData]);

  const handleApplyTransformation = async () => {
    try {
      setApplyingTransform(true);
      const dataset_id = localStorage.getItem('selectedDatasetId');
      const token = localStorage.getItem('token');
      
      const epsilonValue = parseFloat(epsilon);
      if (isNaN(epsilonValue) || epsilonValue <= 0) {
        setError('Please enter a valid epsilon value greater than 0');
        setApplyingTransform(false);
        return;
      }

      const response = await axios.post(`${API_ENDPOINTS.TRANSFORM}`, {
        dataset_id,
        epsilon: epsilonValue
      }, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      console.log("Transformation applied:", response.data);
      setError(null);
      
      // Refresh the data
      await fetchTransformationData();
    } catch (err: any) {
      console.error('Error applying transformation:', err);
      setError(err.response?.data?.error || 'Failed to apply transformation');
    } finally {
      setApplyingTransform(false);
    }
  };

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

  if (error && !transformationApplied) {
    return (
      <TransformationPageTemplate
        title="Data Transformation"
      >
        <ErrorMessage 
          message={error.includes('Failed to load') ?
            'No data selected. Please upload and select a dataset first.' : error}
          type="error"
        />
        {/* Show epsilon controls even on error so user can try again */}
        <div style={{ 
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#2d2d2d',
          borderRadius: '8px',
          border: '1px solid #404040',
          maxWidth: '500px',
          margin: '30px auto'
        }}>
          <h4 style={{ color: '#EEEEEE', marginTop: 0 }}>Log2 Transformation Settings</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label htmlFor="epsilon-input" style={{ color: '#EEEEEE', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                Epsilon Value:
              </label>
              <input 
                id="epsilon-input"
                type="text"
                value={epsilon}
                onChange={(e) => setEpsilon(e.target.value)}
                placeholder="1e-6"
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#1e1e1e',
                  color: '#EEEEEE',
                  border: '1px solid #404040',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={handleApplyTransformation}
              disabled={applyingTransform}
              style={{
                padding: '10px 20px',
                backgroundColor: applyingTransform ? '#555' : '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: applyingTransform ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {applyingTransform ? 'Applying...' : 'Apply Transformation'}
            </button>
          </div>
        </div>
      </TransformationPageTemplate>
    );
  }

  if (!transformationApplied) {
    return (
      <TransformationPageTemplate
        title="Data Transformation"
      >
        <div style={{ 
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#aaa', fontSize: '16px', marginBottom: '30px' }}>
            Please select an epsilon value for log2 transformation to continue.
          </p>
          
          <div style={{ 
            padding: '15px',
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #404040',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <h4 style={{ color: '#EEEEEE', marginTop: 0 }}>Log2 Transformation Settings</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label htmlFor="epsilon-input" style={{ color: '#EEEEEE', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                  Epsilon Value:
                </label>
                <input 
                  id="epsilon-input"
                  type="text"
                  value={epsilon}
                  onChange={(e) => setEpsilon(e.target.value)}
                  placeholder="1e-6"
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#1e1e1e',
                    color: '#EEEEEE',
                    border: '1px solid #404040',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#888', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  Use smaller epsilon (e.g., 1e-6) for better statistical power. Larger epsilon (e.g., 0.01) for conservative handling.
                </small>
              </div>
              <button
                onClick={handleApplyTransformation}
                disabled={applyingTransform}
                style={{
                  padding: '10px 20px',
                  backgroundColor: applyingTransform ? '#555' : '#007acc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: applyingTransform ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {applyingTransform ? 'Applying...' : 'Apply Transformation'}
              </button>
            </div>
          </div>
        </div>
      </TransformationPageTemplate>
    );
  }

  return (
    <TransformationPageTemplate
      title="Data Transformation"
    >
      <div style={{ padding: '20px' }}>
        {/* Epsilon Control Section */}
        <div style={{ 
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#2d2d2d',
          borderRadius: '8px',
          border: '1px solid #404040',
          maxWidth: '600px',
          margin: '0 auto 30px'
        }}>
          <h4 style={{ color: '#EEEEEE', marginTop: 0 }}>Log2 Transformation Settings</h4>
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
              <label htmlFor="epsilon-input" style={{ color: '#EEEEEE', fontSize: '14px' }}>
                Epsilon Value:
              </label>
              <input 
                id="epsilon-input"
                type="text"
                value={epsilon}
                onChange={(e) => setEpsilon(e.target.value)}
                placeholder="1e-6"
                style={{
                  padding: '8px',
                  backgroundColor: '#1e1e1e',
                  color: '#EEEEEE',
                  border: '1px solid #404040',
                  borderRadius: '4px'
                }}
              />
            </div>
            <button
              onClick={handleApplyTransformation}
              disabled={applyingTransform}
              style={{
                padding: '8px 20px',
                backgroundColor: applyingTransform ? '#555' : '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: applyingTransform ? 'not-allowed' : 'pointer'
              }}
            >
              {applyingTransform ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>

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