import { Line, LineChart, ResponsiveContainer } from "recharts";

/** Minimal axis-less trend line embedded inside a stat card. */
export function Sparkline({ data, color = "#1c5ff5" }: { data: number[]; color?: string }) {
  const points = data.map((value, i) => ({ i, value }));

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
