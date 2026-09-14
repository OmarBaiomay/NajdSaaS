import { Bar, BarChart, ResponsiveContainer } from "recharts";

/** Minimal axis-less bar trend, the bar-shaped sibling of Sparkline. */
export function MiniBarChart({ data, color = "#1c5ff5" }: { data: number[]; color?: string }) {
  const points = data.map((value, i) => ({ i, value }));

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
