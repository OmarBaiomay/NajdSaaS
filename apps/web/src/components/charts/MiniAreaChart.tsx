import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Minimal axis-less filled trend — the area-shaped sibling of Sparkline
 * and MiniBarChart, so the metric grid isn't just two alternating shapes. */
export function MiniAreaChart({ data, color = "#1c5ff5" }: { data: number[]; color?: string }) {
  const points = data.map((value, i) => ({ i, value }));
  const gradientId = `mini-area-${color.replace("#", "")}`;

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
