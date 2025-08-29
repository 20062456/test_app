
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DailyTotal } from '../types';

interface RevenueChartProps {
  data: DailyTotal[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value);

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    name: `Ngày ${item.day}`,
    'Doanh thu': item.total,
  }));

  return (
    <div className="w-full h-80 bg-white p-4 rounded-lg shadow-md">
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
            formatter={(value) => typeof value === 'number' ? `${formatCurrency(value)} VNĐ` : value}
            cursor={{ fill: 'rgba(210, 230, 255, 0.4)' }}
          />
          <Legend wrapperStyle={{fontSize: "14px"}} />
          <Bar dataKey="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
