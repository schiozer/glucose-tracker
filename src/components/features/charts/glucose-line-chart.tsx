/**
 * Glucose line chart - shows glucose values over time with target range
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';
import type { GlucoseReading } from '@/types/database';
import { formatDateTime } from '@/lib/utils/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DEFAULT_TARGET_MIN = 70;
const DEFAULT_TARGET_MAX = 180;

interface GlucoseLineChartProps {
  readings: GlucoseReading[];
  targetMin?: number;
  targetMax?: number;
}

export function GlucoseLineChart({
  readings,
  targetMin = DEFAULT_TARGET_MIN,
  targetMax = DEFAULT_TARGET_MAX,
}: GlucoseLineChartProps) {
  // Sort readings by date and prepare data
  const chartData = readings
    .sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime())
    .map((reading) => ({
      date: new Date(reading.reading_date).getTime(),
      value: reading.value,
      fullDate: reading.reading_date,
      context: reading.context,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Glicemia ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>Nenhuma medição disponível para o período selecionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine dot color based on glucose level
  const getDotColor = (value: number) => {
    if (value < targetMin) return '#ef4444'; // red
    if (value >= targetMin && value <= targetMax) return '#22c55e'; // green
    return '#f97316'; // orange
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{formatDateTime(data.fullDate)}</p>
          <p className="text-sm">
            <span className="font-medium">Glicemia:</span>{' '}
            <span style={{ color: getDotColor(data.value) }}>{data.value} mg/dL</span>
          </p>
          <p className="text-sm text-gray-600 capitalize">
            {data.context.replace(/_/g, ' ')}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={getDotColor(payload.value)}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  };

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Glicemia ao Longo do Tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            {/* Target range shaded area */}
            <ReferenceArea
              y1={targetMin}
              y2={targetMax}
              fill="#22c55e"
              fillOpacity={0.1}
              label={{
                value: 'Faixa alvo',
                position: 'insideTopRight',
                fill: '#22c55e',
                fontSize: 12,
              }}
            />

            <XAxis
              dataKey="date"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxis}
              stroke="#6b7280"
            />
            <YAxis
              domain={[40, 350]}
              stroke="#6b7280"
              label={{
                value: 'Glicemia (mg/dL)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280' },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              content={() => (
                <div className="flex justify-center gap-6 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Baixa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>No Alvo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>Alta</span>
                  </div>
                </div>
              )}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
