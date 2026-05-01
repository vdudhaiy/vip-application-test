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

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

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

  const handleSelectDataset = (id: number, name: string) => {
    setSelectedDatasetId(id);
    localStorage.setItem('selectedDatasetId', id.toString());
    alert(`Dataset "${name}" selected.`);
  };

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

  return (
    <div className="page-container">
      <h2>My Datasets</h2>

      {/* Create dataset */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 24px' }}>
        <input
          type="text"
          placeholder="New dataset name"
          value={newDatasetName}
          onChange={(e) => setNewDatasetName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateDataset()}
          style={{ flex: 1, maxWidth: '320px' }}
        />
        <button onClick={handleCreateDataset}>
          Create Dataset
        </button>
      </div>

      {/* Dataset list */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Created At</th>
            <th>Updated At</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => (
            <tr key={dataset.id}>
              <td>{dataset.name}</td>
              <td>{new Date(dataset.created_at).toLocaleString()}</td>
              <td>{new Date(dataset.updated_at).toLocaleString()}</td>
              <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleSelectDataset(dataset.id, dataset.name)}
                  className={`btn-sm${selectedDatasetId === dataset.id ? ' btn-success' : ''}`}
                >
                  {selectedDatasetId === dataset.id ? 'Selected' : 'Select'}
                </button>
                <button
                  onClick={() => handleDeleteDataset(dataset.id, dataset.name)}
                  className="btn-sm btn-danger"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {datasets.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>
                No datasets yet. Create one above to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Conditionally show upload section */}
      {selectedDatasetId && (
        <div style={{ paddingBottom: '32px' }}>
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
