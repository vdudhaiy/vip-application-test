import React from "react";

// Define the shape of a data row for the table
interface DataRow {
  id: number;
  name: string;
  value: number;
}

interface StatDataTableProps {
  data: DataRow[];
}

/**
 * StatDataTable component
 * Renders a simple table displaying a list of data rows in dark mode.
 * The table is wrapped in a fixed-height container to allow scrolling.
 */
const StatDataTable: React.FC<StatDataTableProps> = ({ data }) => {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        color: "#ffffff",
        fontSize: "14px",
        tableLayout: "fixed",
      }}
    >
      <colgroup>
        <col style={{ width: "10%" }} />
        <col style={{ width: "60%" }} />
        <col style={{ width: "30%" }} />
      </colgroup>
      <thead>
        <tr>
          <th
            style={{
              border: "1px solid #444",
              padding: "8px",
              backgroundColor: "#333",
            }}
          >
            ID
          </th>
          <th
            style={{
              border: "1px solid #444",
              padding: "8px",
              backgroundColor: "#333",
            }}
          >
            Name
          </th>
          <th
            style={{
              border: "1px solid #444",
              padding: "8px",
              backgroundColor: "#333",
            }}
          >
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            <td style={{ border: "1px solid #444", padding: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.id}
            </td>
            <td style={{ border: "1px solid #444", padding: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.name}
            </td>
            <td style={{ border: "1px solid #444", padding: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

  );
};

export default StatDataTable;