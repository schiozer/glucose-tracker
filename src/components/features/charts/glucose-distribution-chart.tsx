/**
 * Glucose distribution chart - shows percentage of readings by category
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReadingStats } from '@/app/api/readings/stats/route';

interface GlucoseDistributionChartProps {
  stats: ReadingStats | null;
}

const COLORS = {
  low: '#ef4444',      // red
  target: '#22c55e',   // green
  high: '#f97316',     // orange
};

const LABELS = {
  low: 'Hipoglicemia',
  target: 'No Alvo',
  high: 'Acima do Alvo',
};

export function GlucoseDistributionChart({ stats }: GlucoseDistributionChartProps) {
  if (!stats || stats.statistics.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Medições</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    {
      name: LABELS.low,
      value: stats.timeInRange.belowTargetPct,
      count: Math.round((stats.timeInRange.belowTargetPct * stats.statistics.count) / 100),
      color: COLORS.low,
    },
    {
      name: LABELS.target,
      value: stats.timeInRange.inTargetPct,
      count: Math.round((stats.timeInRange.inTargetPct * stats.statistics.count) / 100),
      color: COLORS.target,
    },
    {
      name: LABELS.high,
      value: stats.timeInRange.aboveTargetPct,
      count: Math.round((stats.timeInRange.aboveTargetPct * stats.statistics.count) / 100),
      color: COLORS.high,
    },
  ].filter((item) => item.value > 0); // Only show non-zero values

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">Percentual:</span> {data.value}%
          </p>
          <p className="text-sm">
            <span className="font-medium">Medições:</span> {data.payload.count}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    return `${entry.value}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Medições</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} ({entry.payload.count} medições)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
