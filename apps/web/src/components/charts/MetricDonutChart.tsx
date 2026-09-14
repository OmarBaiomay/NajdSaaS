import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutSlice {
  label: string;
  value: number;
}

const COLORS = ["#1c5ff5", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#0ea5e9", "#ec4899", "#84cc16"];

export function MetricDonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="85%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
          />
          <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
          {centerValue && <span className="text-lg font-bold text-slate-900 dark:text-white">{centerValue}</span>}
          {centerLabel && <span className="max-w-[70%] truncate text-[10px] text-slate-400">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
