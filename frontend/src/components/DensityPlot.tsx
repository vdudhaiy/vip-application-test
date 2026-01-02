// src/components/DensityPlot.tsx
import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface DensityPoint {
  x: number;
  y: number;
}

interface PlotData {
  group?: string;
  patient?: string;
  case?: string;
  density: DensityPoint[];
  limits?: { lower: number; upper: number };
  raw_data_count?: number;
}

interface DensityPlotProps {
  data: PlotData;
  limits: { lower: number; upper: number };
  color?: string;
}

const DensityPlot: React.FC<DensityPlotProps> = ({ 
  data, 
  limits,
  color = '#8884d8' 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log('DensityPlot created/updated with props:', {
    data: data,
    limits: limits,
    color: color
  });

  // Check if data is valid
  if (!data || !data.density || !Array.isArray(data.density)) {
    console.error('Invalid data structure in DensityPlot:', data);
    return null;
  }

  const title = data.group || data.patient || data.case || 'Data';

  const handleExpand = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  return (
    <div style={{ 
      margin: '0px', 
      padding: '0px', 
      border: '1px solid #eee', 
      borderRadius: '8px',
      width: '100%',
      fontSize: '10px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0px 10px'
      }}>
        <h3 style={{ 
          color: '#EEEEEE',
          whiteSpace: 'nowrap', 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          maxWidth: '85%',
          fontSize: '10px',
          margin: '0px'
        }}>{title}</h3>
        <button
          onClick={handleExpand}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#EEEEEE',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px'
          }}
          title="Expand to full screen"
        >
          ⛶
        </button>
      </div>
      <div style={{ 
        color: '#999', 
        fontSize: '9px', 
        textAlign: 'right',
        padding: '2px 20px'
      }}>
        {data.raw_data_count || data.density.length} data points
      </div>
      <div style={{ height: 120}}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.density}
            margin={{ top: 0, right: 20, left: -12, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              type="number"
              domain={[limits.lower, limits.upper]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(4), 'Density']}
              labelFormatter={(value) => `Value: ${Number(value).toFixed(2)}`}
              contentStyle={{
                backgroundColor: '#1e1e1e',
                color: '#EEEEEE',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '0px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="y" 
              stroke={color} 
              fill={color} 
              fillOpacity={0.7}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          

          {/* Modal Content */}
          <div style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '10px',
            padding: '20px',
            width: '90%',
            height: '90%',
            maxWidth: '1200px',
            maxHeight: '800px',
            border: '1px solid #444',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '1px solid #444'
            }}>
              <h2 style={{ 
                color: '#EEEEEE',
                fontSize: '18px',
                margin: '0px'
              }}>
                {title} 
              </h2>
                 <div style={{ 
                   color: '#999', 
                   fontSize: '12px',
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   padding: '0px 10px',
                   gap: '15px'
                   }}>
                     {data.raw_data_count || data.density.length} data points
                     {/* Close Button */}
                   <button
                     onClick={handleCloseModal}  
                     style={{
                       background: 'rgba(255, 255, 255, 0.1)',
                       border: '1px solid rgba(255, 255, 255, 0.3)',
                       color: '#EEEEEE',
                       cursor: 'pointer',
                       fontSize: '24px',
                       padding: '10px 15px',
                       borderRadius: '5px',
                       zIndex: 1001
                     }}
                     title="Close"
                   >
                     ×
                   </button>
                 </div>
              
            </div>

            {/* Modal Chart */}
            <div style={{ 
              flex: 1,
              minHeight: '400px'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.density}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="x" 
                    type="number"
                    domain={[limits.lower, limits.upper]}
                    tickFormatter={(value) => value.toFixed(1)}
                    stroke="#EEEEEE"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#EEEEEE"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(4), 'Density']}
                    labelFormatter={(value) => `Value: ${Number(value).toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: '#1e1e1e',
                      color: '#EEEEEE',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="y" 
                    stroke={color} 
                    fill={color} 
                    fillOpacity={0.7}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DensityPlot, (prevProps, nextProps) => {
  // Only update if the data or limits have changed
  return (
    prevProps.data === nextProps.data &&
    prevProps.limits?.lower === nextProps.limits?.lower &&
    prevProps.limits?.upper === nextProps.limits?.upper
  );
});