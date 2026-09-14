import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

/** A tiny 2-slice donut used as a "progress ring" for percentage/rate-style
 * metrics (CTR and similar) — the same donut shape as the bigger completion
 * breakdowns, just sized to sit in a stat card footer. */
export function MiniProgressDonut({
  value,
  max = 100,
  color = "#14b8a6",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const filled = Math.max(0, Math.min(max, value));
  const data = [
    { name: "filled", v: filled },
    { name: "rest", v: Math.max(max - filled, 0) },
  ];

  return (
    <div className="mx-auto h-14 w-14">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="v"
            innerRadius="65%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="rgba(148,163,184,0.18)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
