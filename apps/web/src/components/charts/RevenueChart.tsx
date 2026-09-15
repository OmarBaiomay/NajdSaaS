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

const AXES = {
  grid: <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />,
  x: <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />,
  y: <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />,
  tooltip: (
    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} labelStyle={{ fontWeight: 600 }} />
  ),
};

export function RevenueChart({ data, shape = "area" }: { data: RevenuePoint[]; shape?: ChartShape }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {shape === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {AXES.grid}
            {AXES.x}
            {AXES.y}
            {AXES.tooltip}
            <Bar dataKey="value" fill="#1c5ff5" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : shape === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {AXES.grid}
            {AXES.x}
            {AXES.y}
            {AXES.tooltip}
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
            {AXES.grid}
            {AXES.x}
            {AXES.y}
            {AXES.tooltip}
            <Area type="monotone" dataKey="value" stroke="#1c5ff5" strokeWidth={2} fill="url(#revenueFill)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
