import React from "react";
import DataUpload from "../components/DataUpload";
import GroupingDataTxt from "../components/GroupingDataTxt";
import API_ENDPOINTS from "../config/api";

const dataset_id = localStorage.getItem('selectedDatasetId');
const data_url = `${API_ENDPOINTS.UPLOAD_RAWDATA}?dataset_id=${dataset_id}`;
const group_url = `${API_ENDPOINTS.UPLOAD_GROUP}?dataset_id=${dataset_id}`;

const DataUploadPage: React.FC = () => {
  return (
    <div style={{ textAlign: "left", backgroundColor: "#1E1E1E", color: "#E0E0E0", padding: "20px", minHeight: "100vh" }}>
      <h2>Data Upload</h2>
      {/* Only one table for Mass Spec data */}
      <DataUpload
        title="Mass Spectrometry Data"
        uploadEndpoint={data_url}
      />

      {/* Grouping Data: .txt file only */}
      <GroupingDataTxt
        title="Grouping Data (.txt)"
        uploadEndpoint={group_url}
      />
    </div>
  );
};

export default DataUploadPage;
