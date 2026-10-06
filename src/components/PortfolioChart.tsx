"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function PortfolioChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex items-center justify-center text-gray-500">
        Chargement du graphique...
      </div>
    );
  }

  // Calculate min and max for YAxis to make the chart look better
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domainMin = Math.max(0, min - (max - min) * 0.1); // Add 10% padding
  const domainMax = max + (max - min) * 0.1;

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} minTickGap={30} />
          <YAxis 
            domain={[domainMin, domainMax]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(val) => `${Math.round(val)}€`} 
            width={60}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: any) => [Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }), 'Valeur']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
