
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { addDays, subDays, format } from 'date-fns';
import { calculateBiorhythm } from '../services/biorhythmService.ts';

interface Props {
  birthDate: string;
  targetDate: Date;
}

const BiorhythmChart: React.FC<Props> = ({ birthDate, targetDate }) => {
  // Generate data for 30 days around the target date
  const data = [];
  for (let i = -15; i <= 15; i++) {
    const date = addDays(targetDate, i);
    const { physical, emotional, intellectual } = calculateBiorhythm(birthDate, date);
    data.push({
      name: format(date, 'd'),
      physical: Math.round(physical),
      emotional: Math.round(emotional),
      intellectual: Math.round(intellectual),
      isTarget: i === 0,
    });
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            interval={2}
          />
          <YAxis 
            hide 
            domain={[-100, 100]} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            labelFormatter={(label) => `${label}일`}
          />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
          <ReferenceLine x={15} stroke="#6366f1" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="physical" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={false} 
            name="신체"
          />
          <Line 
            type="monotone" 
            dataKey="emotional" 
            stroke="#ef4444" 
            strokeWidth={3} 
            dot={false} 
            name="감성"
          />
          <Line 
            type="monotone" 
            dataKey="intellectual" 
            stroke="#10b981" 
            strokeWidth={3} 
            dot={false} 
            name="지성"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BiorhythmChart;
