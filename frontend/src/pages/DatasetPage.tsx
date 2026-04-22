import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/UserAuth';
import { useNavigate } from 'react-router-dom';
import DataUpload from '../components/DataUpload';
import GroupingDataTxt from '../components/GroupingDataTxt';
import API_ENDPOINTS from '../config/api';

type Dataset = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

const DatasetUploadPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(() => {
    const storedId = localStorage.getItem('selectedDatasetId');
    return storedId ? parseInt(storedId) : null;
  });
  const [newDatasetName, setNewDatasetName] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Fetch datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(API_ENDPOINTS.DATASET, {
          headers: { Authorization: `Token ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setDatasets(data);
        } else {
          console.error('Failed to fetch datasets');
        }
      } catch (err) {
        console.error('Error:', err);
      }
    };

    fetchDatasets();
  }, []);

  // Handle dataset selection
  const handleSelectDataset = (id: number, name: string) => {
    setSelectedDatasetId(id);
    localStorage.setItem('selectedDatasetId', id.toString());
    alert(`Dataset "${name}" selected.`);
  };

  // Create new dataset
  const handleCreateDataset = async () => {
    const token = localStorage.getItem('token');
    if (!token || !newDatasetName.trim()) return;

    try {
      const res = await fetch(API_ENDPOINTS.DATASET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ name: newDatasetName }),
      });

      if (res.ok) {
        const newDataset = await res.json();
        setDatasets((prev) => [...prev, newDataset]);
        handleSelectDataset(newDataset.id, newDataset.name);
        setNewDatasetName('');
      } else {
        alert('Failed to create dataset.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete dataset
  const handleDeleteDataset = async (datasetId: number, datasetName: string) => {
    if (!window.confirm(`Are you sure you want to delete the dataset "${datasetName}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_ENDPOINTS.DATASET}?dataset_id=${datasetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (res.ok || res.status === 204) {
        setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
        // If the deleted dataset was selected, clear the selection
        if (selectedDatasetId === datasetId) {
          setSelectedDatasetId(null);
          localStorage.removeItem('selectedDatasetId');
        }
        alert(`Dataset "${datasetName}" deleted successfully.`);
      } else {
        const errorData = await res.json();
        alert(`Failed to delete dataset: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deleting dataset:', err);
      alert('An error occurred while deleting the dataset.');
    }
  };

  const headerStyle: React.CSSProperties = {
    color: '#79c0ff',
    textAlign: 'left',
    padding: '14px 16px',
    backgroundColor: '#21262d',
    borderBottom: '2px solid #58a6ff',
    fontWeight: '600',
    letterSpacing: '0.5px'
  };

  const cellStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid #30363d',
    color: '#e6edf3',
  };

  return (
    <div
      style={{
        backgroundColor: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        color: '#e6edf3',
        fontFamily: 'sans-serif',
        width: '100%',
        gap: '24px'
      }}
    >
      <h2 style={{ color: '#e6edf3', margin: '0 0 16px 0' }}>My Datasets</h2>

      {/* Create dataset */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Dataset name"
          value={newDatasetName}
          onChange={(e) => setNewDatasetName(e.target.value)}
          style={{
            padding: '8px 12px',
            marginRight: '10px',
            borderRadius: '6px',
            border: '1px solid #30363d',
            backgroundColor: '#161b22',
            color: '#e6edf3',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
        />
        <button
          onClick={handleCreateDataset}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)',
            border: '1px solid #30363d',
            borderRadius: '6px',
            color: '#e6edf3',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #388bfd 0%, #79c0ff 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Create Dataset
        </button>
      </div>

      {/* Dataset list */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
        <thead>
          <tr>
            <th style={headerStyle}>Name</th>
            <th style={headerStyle}>Created At</th>
            <th style={headerStyle}>Updated At</th>
            <th style={headerStyle}></th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => (
            <tr key={dataset.id} style={{ backgroundColor: '#161b22' }}>
              <td style={cellStyle}>{dataset.name}</td>
              <td style={cellStyle}>{new Date(dataset.created_at).toLocaleString()}</td>
              <td style={cellStyle}>{new Date(dataset.updated_at).toLocaleString()}</td>
              <td style={cellStyle}>
                <button
                  onClick={() => handleSelectDataset(dataset.id, dataset.name)}
                  style={{
                    padding: '8px 12px',
                    background: selectedDatasetId === dataset.id 
                      ? 'linear-gradient(135deg, #3fb950 0%, #5cb85f 100%)'
                      : 'linear-gradient(135deg, #58a6ff 0%, #79c0ff 100%)',
                    color: '#e6edf3',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginRight: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    const isSelected = selectedDatasetId === dataset.id;
                    e.currentTarget.style.background = isSelected
                      ? 'linear-gradient(135deg, #5cb85f 0%, #6ecf70 100%)'
                      : 'linear-gradient(135deg, #79c0ff 0%, #a0d4ff 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    const isSelected = selectedDatasetId === dataset.id;
                    e.currentTarget.style.background = isSelected
                      ? 'linear-gradient(135deg, #3fb950 0%, #5cb85f 100%)'
                      : 'linear-gradient(135deg, #58a6ff 0%, #79c0ff 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {selectedDatasetId === dataset.id ? 'Selected' : 'Select'}
                </button>
                <button
                  onClick={() => handleDeleteDataset(dataset.id, dataset.name)}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #f85149 0%, #ff6b6b 100%)',
                    color: '#e6edf3',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff8080 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f85149 0%, #ff6b6b 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Conditionally show upload section */}
      {selectedDatasetId && (
        <div style={{ marginTop: '16px', paddingBottom: '32px' }}>
          <DataUpload
            title="Mass Spectrometry Data"
            uploadEndpoint={`${API_ENDPOINTS.UPLOAD_RAWDATA}?dataset_id=${selectedDatasetId}`}
          />
          <GroupingDataTxt
            title="Grouping Data (.txt)"
            uploadEndpoint={`${API_ENDPOINTS.UPLOAD_GROUP}?dataset_id=${selectedDatasetId}`}
          />
        </div>
      )}
    </div>
  );
};

export default DatasetUploadPage;
