import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DailyTotal } from '../types';

interface ComparisonChartProps {
  dataA: DailyTotal[];
  dataB: DailyTotal[];
  nameA: string;
  nameB: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value);

const ComparisonChart: React.FC<ComparisonChartProps> = ({ dataA, dataB, nameA, nameB }) => {
  const maxDays = Math.max(dataA.length, dataB.length, 28);
  const chartData = Array.from({ length: maxDays }, (_, i) => {
    const day = i + 1;
    const totalA = dataA.find(d => d.day === day)?.total ?? 0;
    const totalB = dataB.find(d => d.day === day)?.total ?? 0;
    return {
      name: `Ngày ${day}`,
      [nameA]: totalA,
      [nameB]: totalB,
    };
  });

  return (
    <div className="w-full h-96 bg-white p-4 rounded-lg shadow-md">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: 40,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(value) => typeof value === 'number' ? formatCurrency(value) : ''}
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            formatter={(value, name) => [`${typeof value === 'number' ? formatCurrency(value) : value} VNĐ`, name]}
            cursor={{ fill: 'rgba(210, 230, 255, 0.4)' }}
          />
          <Legend wrapperStyle={{fontSize: "14px"}} />
          <Bar dataKey={nameA} fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey={nameB} fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonChart;
