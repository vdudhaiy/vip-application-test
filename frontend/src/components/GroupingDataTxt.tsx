import React, { useState } from "react";
import axios from "axios";

interface GroupingDataTxtProps {
  title: string;
  uploadEndpoint: string;
}

const GroupingDataTxt: React.FC<GroupingDataTxtProps> = ({
  title,
  uploadEndpoint,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a .txt file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const token = localStorage.getItem('token');

      const response = await axios.post(uploadEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data",
        Authorization: `Token ${token}` },
      });

      alert(
        response.status === 200
          ? "File uploaded successfully."
          : "Error uploading file."
      );

      if (response.status === 200) {
        setUploadedFile(selectedFile.name);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Title, file input, and upload button in a flex container */}
      <div
        style={{
          padding: "25px 0 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ fontWeight: "bold", margin: 0 }}>{title}</h2>
          <input type="file" accept=".txt" onChange={handleFileChange} />
        </div>
        <button
          onClick={handleUpload}
          style={{
            padding: "8px 12px",
            backgroundColor: uploading ? "#ccc" : "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: uploading ? "default" : "pointer",
          }}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : uploadedFile ? "Update" : "Upload"}
        </button>
      </div>

      {/* Show a fallback message if no file is selected */}
      {!selectedFile && (
        <div
          style={{
            textAlign: "center",
            padding: "120px 0",
            color: "#555",
            fontSize: "14px",
          }}
        >
          No grouping data uploaded yet. Please upload a TXT file to display.
        </div>
      )}
    </div>
  );
};

export default GroupingDataTxt;
