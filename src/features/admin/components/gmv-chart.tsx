'use client';

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatMinorCompact, toMajor } from '@/lib/money';
import { formatDateShort } from '@/lib/dates';

/**
 * 30-day GMV area chart.
 *
 * Single series, muted brand colour, no gradients beyond a subtle fill —
 * it is a business metric, not decoration.
 */
export function GmvChart({ data }: { data: { date: string; gmvMinor: number }[] }) {
  const points = data.map((d) => ({ date: d.date, value: toMajor(d.gmvMinor), minor: d.gmvMinor }));
  const hasData = points.some((p) => p.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-ink-50 text-sm text-ink-500">
        No confirmed events in the last 30 days yet.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="gmv-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9b1c45" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#9b1c45" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ebebeb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(8)}
            tick={{ fontSize: 11, fill: '#6a6a6a' }}
            tickLine={false}
            axisLine={{ stroke: '#dddddd' }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6a6a6a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatMinorCompact(Math.round(Number(value) * 100))}
            width={64}
          />
          <Tooltip
            cursor={{ stroke: '#dddddd' }}
            contentStyle={{
              borderRadius: 12, border: '1px solid #dddddd',
              fontSize: 12, boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
            }}
            labelFormatter={(label) => formatDateShort(String(label))}
            formatter={(value) => [formatMinorCompact(Math.round(Number(value) * 100)), 'GMV']}
          />
          <Area
            type="monotone" dataKey="value" stroke="#9b1c45" strokeWidth={2}
            fill="url(#gmv-fill)" dot={false} activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
