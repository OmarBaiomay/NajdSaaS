import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface RevenuePoint {
  label: string;
  value: number;
}

export type ChartShape = "area" | "bar" | "line";

export function RevenueChart({
  data,
  shape = "area",
  valueFormatter,
}: {
  data: RevenuePoint[];
  shape?: ChartShape;
  /** Formats the tooltip value — pass a currency formatter for cost/spend
   * metrics so the chart matches the cards showing the same figure. */
  valueFormatter?: (value: number) => ReactNode;
}) {
  const grid = <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />;
  const x = <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />;
  const y = <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />;
  const tooltip = (
    <Tooltip
      contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
      labelStyle={{ fontWeight: 600 }}
      formatter={valueFormatter ? (value: number) => [valueFormatter(value), ""] : undefined}
    />
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {shape === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            {x}
            {y}
            {tooltip}
            <Bar dataKey="value" fill="#1c5ff5" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : shape === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            {x}
            {y}
            {tooltip}
            <Line type="monotone" dataKey="value" stroke="#1c5ff5" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c5ff5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1c5ff5" stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            {x}
            {y}
            {tooltip}
            <Area type="monotone" dataKey="value" stroke="#1c5ff5" strokeWidth={2} fill="url(#revenueFill)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
