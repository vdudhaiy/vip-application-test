import React, { useState, useEffect } from "react";
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
  const [fileContent, setFileContent] = useState<string>("");
  const [lineCount, setLineCount] = useState<number>(0);

  // Clear state when switching datasets
  useEffect(() => {
    setSelectedFile(null);
    setUploadedFile(null);
    setFileContent("");
    setLineCount(0);
  }, [uploadEndpoint]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      
      // Read file content for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
        const lines = content.split('\n').filter(line => line.trim());
        setLineCount(lines.length);
      };
      reader.readAsText(file);
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
          <h2 style={{ fontWeight: "bold", margin: 0, color: "#e6edf3" }}>{title}</h2>
          <input 
            type="file" 
            accept=".txt" 
            onChange={handleFileChange}
            style={{
              cursor: "pointer",
              fontSize: "13px"
            }}
          />
          <span style={{ fontSize: "12px", color: "#8b949e" }}>(.txt only)</span>
        </div>
        <button
          onClick={handleUpload}
          style={{
            padding: "8px 16px",
            background: uploading ? "#4a5568" : "linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)",
            color: "#e6edf3",
            border: "1px solid #30363d",
            borderRadius: "6px",
            cursor: uploading ? "default" : "pointer",
            fontWeight: "500",
            fontSize: "14px",
            transition: "all 0.2s ease",
            opacity: uploading ? 0.7 : 1
          }}
          disabled={uploading}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = "linear-gradient(135deg, #388bfd 0%, #79c0ff 100%)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = "linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {uploading ? "Uploading..." : uploadedFile ? "Update" : "Upload"}
        </button>
      </div>

      {/* File info when content is loaded */}
      {fileContent && (
        <div style={{ marginTop: '10px', color: '#8b949e', fontSize: '12px', textAlign: 'left' }}>
          {lineCount} lines
        </div>
      )}

      {/* Show a fallback message if no file is selected */}
      {!fileContent && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "#6e7681",
            fontSize: "14px",
            backgroundColor: "#161b22",
            borderRadius: "8px",
            border: "1px solid #30363d",
            marginTop: "16px"
          }}
        >
          No grouping data uploaded yet. Please upload a TXT file to display.
        </div>
      )}

      {/* Display file content */}
      {fileContent && (
        <div
          style={{
            backgroundColor: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "8px",
            marginTop: "16px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
          }}
        >
          <div
            style={{
              backgroundColor: "#161b22",
              padding: "12px 16px",
              borderBottom: "1px solid #30363d",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ color: "#79c0ff", fontWeight: "600", fontSize: "13px" }}>
              📄 {selectedFile?.name || uploadedFile}
            </span>
          </div>
          <div
            style={{
              padding: "16px",
              backgroundColor: "#0d1117",
              maxHeight: "400px",
              overflowY: "auto",
              fontFamily: "'Courier New', monospace",
              fontSize: "12px",
              color: "#e6edf3",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              borderRadius: "0 0 8px 8px"
            }}
          >
            {fileContent.split('\n').map((line, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  marginBottom: "2px"
                }}
              >
                <span
                  style={{
                    color: "#6e7681",
                    marginRight: "12px",
                    minWidth: "40px",
                    textAlign: "right",
                    fontSize: "11px",
                    userSelect: "none"
                  }}
                >
                  {index + 1}
                </span>
                <span style={{ color: line.trim() ? "#e6edf3" : "#6e7681" }}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupingDataTxt;
