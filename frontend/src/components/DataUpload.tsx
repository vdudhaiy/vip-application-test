import React, { useState, useEffect } from "react";
// import { useAuth } from '../components/UserAuth';
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { openDB } from "idb";
import axios from "axios";
import "./DataUpload.css";

const DB_NAME = "CSVStorage";
const STORE_NAME = "csvData";
// const { user } = useAuth();

interface DataUploadProps {
  title: string;         // Section title (e.g. "Mass Spectrometry Data")
  uploadEndpoint: string; // API endpoint for uploading files
}

// Open the IndexedDB database (create if needed)
async function openDatabase() {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2 && !db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

// Helper: ensure each row has the same number of columns
function uniformColumnSizes(data: string[][]): string[][] {
  const maxColumns = Math.max(...data.map((row) => row.length));
  return data.map((row) => [
    ...row,
    ...Array(maxColumns - row.length).fill(""),
  ]);
}

const DataUpload: React.FC<DataUploadProps> = ({ title, uploadEndpoint }) => {
  const [tableData, setTableData] = useState<string[][]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Load CSV/XLSX Data from IndexedDB on component mount
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const db = await openDatabase();
        const storedData = await db.get(STORE_NAME, uploadEndpoint);
        if (storedData) {
          setTableData(storedData);
        }
      } catch (error) {
        console.error("IndexedDB Load Error:", error);
      }
    };
    loadFromDB();
  }, [uploadEndpoint]);

  // Store parsed data in IndexedDB
  async function storeData(csvData: string[][]) {
    const db = await openDatabase();
    await db.put(STORE_NAME, csvData, uploadEndpoint);
  }

  // Handle file selection (CSV or XLSX)
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    setSelectedFile(file);

    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        // Parse CSV with Papa Parse
        Papa.parse(file, {
          complete: async (result: Papa.ParseResult<string[]>) => {
            let csvData = result.data as string[][];
            csvData = uniformColumnSizes(csvData);
            await storeData(csvData);
            setTableData(csvData);
          },
          header: false,
          skipEmptyLines: true,
          delimiter: ",",
          transform: (value: string) => value.trim(),
        });
      } else if (ext === "xlsx") {
        // Parse XLSX with ExcelJS
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          alert("No worksheets found in this XLSX file.");
          return;
        }

        // Convert each row to a string[] (like CSV)
        const sheetData: string[][] = [];
        worksheet.eachRow((row) => {
          // row.values often looks like [undefined, col1, col2, ...]
          // so we slice off the first index
          const rowValues = (row.values as any[]).slice(1).map((cellVal: any) =>
            cellVal == null ? "" : String(cellVal)
          );
          sheetData.push(rowValues);
        });

        let csvData = uniformColumnSizes(sheetData);
        await storeData(csvData);
        setTableData(csvData);
      } else {
        alert("Please upload a .csv or .xlsx file.");
      }
    } catch (error) {
      console.error("File parse error:", error);
      alert("Failed to parse file.");
    }
  };

  // Upload the selected file to the backend API
  const handleFileUploadToBackend = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(uploadEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data",
        Authorization: `Token ${token}` },
      }
    );
      alert(
        response.status === 200
          ? "File uploaded successfully."
          : "Error uploading file."
      );
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
  
    <div style={{ marginBottom: "20px" }}>
      {/* Title + File input + Upload button */}
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
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
          />
        </div>

        <button
          onClick={handleFileUploadToBackend}
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
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
      <div style={{ marginTop: '10px', color: '#999', fontSize: '12px',  textAlign: 'left'}}>
      {tableData.length > 0 ? tableData.length - 1 : 0} rows x {tableData.length > 0 ? tableData[0].length : 0} columns
     </div>
      {/* Table Container */}
      {tableData.length === 0 ? (
      <div
        style={{
          textAlign: "center",
          padding: "120px 0", // Increased vertical padding
          color: "#555",
          fontSize: "14px",
        }}
      >
        No data uploaded yet. Please upload a CSV or XLSX file to display.
      </div>
    ) : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {tableData[0].map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    </div>
    </div>
  );
};

export default DataUpload;
