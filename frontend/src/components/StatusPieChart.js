import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function StatusPieChart({ applications }) {
  const counts = {};

  applications.forEach((app) => {
    counts[app.status] = (counts[app.status] || 0) + 1;
  });

  const data = Object.keys(counts).map((key) => ({
    name: key,
    value: counts[key],
  }));

  const STATUS_COLORS = {
    APPLIED: "#3b82f6",
    INTERVIEW: "#f59e0b",
    OA: "#8b5cf6",
    OFFER: "#10b981",
    REJECTED: "#ef4444",
  };


  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Application Status Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              outerRadius={80}
              label={renderLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    STATUS_COLORS[entry.name] ||
                    STATUS_COLORS[index % STATUS_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default StatusPieChart;
