/**
 * Cost Breakdown Pie Chart Component
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CostBreakdownProps {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  currency?: string;
}

export default function CostBreakdownChart({ 
  materialCost, 
  laborCost, 
  overheadCost,
  currency = '' 
}: CostBreakdownProps) {
  
  const totalCost = materialCost + laborCost + overheadCost;
  
  if (totalCost === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No cost data available
      </div>
    );
  }

  const data = [
    {
      name: 'Material Cost',
      value: materialCost,
      percentage: ((materialCost / totalCost) * 100).toFixed(1),
      color: '#3B82F6', // Blue
    },
    {
      name: 'Labor Cost',
      value: laborCost,
      percentage: ((laborCost / totalCost) * 100).toFixed(1),
      color: '#10B981', // Green
    },
    {
      name: 'Overhead Cost',
      value: overheadCost,
      percentage: ((overheadCost / totalCost) * 100).toFixed(1),
      color: '#F59E0B', // Amber
    },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-blue-600">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
            }).format(data.value)}
          </p>
          <p className="text-gray-600">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}