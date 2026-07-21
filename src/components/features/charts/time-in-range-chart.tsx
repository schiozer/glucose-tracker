/**
 * Time in range chart - horizontal stacked bar showing time percentages
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReadingStats } from '@/app/api/readings/stats/route';

interface TimeInRangeChartProps {
  stats: ReadingStats | null;
}

const COLORS = {
  low: '#ef4444',      // red
  target: '#22c55e',   // green
  high: '#f97316',     // orange
};

export function TimeInRangeChart({ stats }: TimeInRangeChartProps) {
  if (!stats || stats.statistics.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tempo no Alvo</CardTitle>
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
      category: 'Tempo no Alvo',
      baixa: stats.timeInRange.belowTargetPct,
      alvo: stats.timeInRange.inTargetPct,
      alta: stats.timeInRange.aboveTargetPct,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="text-sm">
              <span className="font-medium">{entry.name}:</span> {entry.value}%
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (value < 5) return null; // Don't show label if value is too small
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight="bold"
      >
        {value}%
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo no Alvo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Visual bar chart */}
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="category" hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="baixa" stackId="a" fill={COLORS.low} label={renderCustomLabel} />
              <Bar dataKey="alvo" stackId="a" fill={COLORS.target} label={renderCustomLabel} />
              <Bar dataKey="alta" stackId="a" fill={COLORS.high} label={renderCustomLabel} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend and detailed stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.low }} />
                <span className="text-sm font-medium">Abaixo do Alvo</span>
              </div>
              <span className="text-sm font-semibold">{stats.timeInRange.belowTargetPct}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.target }} />
                <span className="text-sm font-medium">No Alvo</span>
              </div>
              <span className="text-sm font-semibold text-green-600">
                {stats.timeInRange.inTargetPct}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.high }} />
                <span className="text-sm font-medium">Acima do Alvo</span>
              </div>
              <span className="text-sm font-semibold">{stats.timeInRange.aboveTargetPct}%</span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Média</p>
                <p className="text-lg font-semibold">{stats.statistics.average} mg/dL</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Medições</p>
                <p className="text-lg font-semibold">{stats.statistics.count}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
