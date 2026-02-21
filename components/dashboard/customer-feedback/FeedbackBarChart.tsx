'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface ChartDataItem {
  name: string;
  value: number;
}

interface FeedbackBarChartProps {
  title: string;
  data: ChartDataItem[];
  limit?: number;
  sortByValue?: boolean;
}

/**
 * Dedicated Horizontal Bar Chart for Customer Feedback dashboard.
 * Focuses on clean axes and specific branding colors.
 */
export function FeedbackBarChart({ title, data, limit = 6, sortByValue = true }: FeedbackBarChartProps) {
  // Conditional sort and limit
  const displayData = React.useMemo(() => {
    let result = [...data];
    if (sortByValue) {
      result = result.sort((a, b) => b.value - a.value);
    }
    if (limit > 0) {
      result = result.slice(0, limit);
    }
    return result;
  }, [data, limit, sortByValue]);

  const barColor = title.toLowerCase().includes('complaint') || title.toLowerCase().includes('irregularity') ? '#ef5350' : '#7cb342';
  // Complexity: Time O(n) | Space O(1)
  return (
    <div className="w-full h-full">
      <div className="w-full h-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={displayData}
            margin={{ top: 10, right: 60, left: 10, bottom: 0 }}
            barCategoryGap="35%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis 
              type="number" 
              fontSize={10} 
              fontWeight={700}
              stroke="#94a3b8" 
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => val.toLocaleString('id-ID')}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={90} 
              fontSize={10} 
              fontWeight={700}
              stroke="#64748b" 
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey="value" 
              fill={barColor} 
              radius={[0, 6, 6, 0]} 
              barSize={16}
              animationDuration={1000}
            >
              <LabelList 
                dataKey="value" 
                position="right" 
                style={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
