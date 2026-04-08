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
    color: '#E0E0E0',
    textAlign: 'left',
    padding: '10px',
    backgroundColor: '#1E1E1E',
    borderBottom: '1px solid #555',
  };

  const cellStyle: React.CSSProperties = {
    padding: '10px',
    borderBottom: '1px solid #444',
    color: '#E0E0E0',
  };

  return (
    <div
      style={{
        backgroundColor: 'rgb(30, 30, 30)',
        minHeight: '100vh',
        padding: '20px',
        color: '#E0E0E0',
        fontFamily: 'sans-serif',
      }}
    >
      <h2>My Datasets</h2>

      {/* Create dataset */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Dataset name"
          value={newDatasetName}
          onChange={(e) => setNewDatasetName(e.target.value)}
          style={{
            padding: '6px',
            marginRight: '10px',
            borderRadius: '4px',
            border: '1px solid #555',
            backgroundColor: '#2C2C2C',
            color: '#E0E0E0',
          }}
        />
        <button
          onClick={handleCreateDataset}
          style={{
            padding: '6px 12px',
            backgroundColor: '#444',
            border: 'none',
            borderRadius: '4px',
            color: '#E0E0E0',
            cursor: 'pointer',
          }}
        >
          Create Dataset
        </button>
      </div>

      {/* Dataset list */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
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
            <tr key={dataset.id} style={{ backgroundColor: '#2C2C2C' }}>
              <td style={cellStyle}>{dataset.name}</td>
              <td style={cellStyle}>{new Date(dataset.created_at).toLocaleString()}</td>
              <td style={cellStyle}>{new Date(dataset.updated_at).toLocaleString()}</td>
              <td style={cellStyle}>
                <button
                  onClick={() => handleSelectDataset(dataset.id, dataset.name)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: selectedDatasetId === dataset.id ? '#888' : '#444',
                    color: '#E0E0E0',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '8px',
                  }}
                >
                  {selectedDatasetId === dataset.id ? 'Selected' : 'Select'}
                </button>
                <button
                  onClick={() => handleDeleteDataset(dataset.id, dataset.name)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#CC6655',
                    color: '#E0E0E0',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
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
        <div>
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
